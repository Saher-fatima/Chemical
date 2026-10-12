import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Square,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Volume2,
  HelpCircle,
  Edit3,
  Sliders,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { ChemicalSpec } from '../types';
import {
  extractMeasurementsFromSpeech,
  ExtractedMeasurementsResult,
} from '../utils/voiceParser';

interface VoiceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  chemicalSpec: ChemicalSpec;
  currentBatchId: string;
  onApplyMeasurements: (extracted: {
    batchId?: string;
    temperature: number | null;
    pressure: number | null;
    ph: number | null;
    mixingTime: number | null;
    mixingSpeed?: number | null;
    secondary: Record<string, number | null>;
  }) => void;
}

export const VoiceInputModal: React.FC<VoiceInputModalProps> = ({
  isOpen,
  onClose,
  chemicalSpec,
  currentBatchId,
  onApplyMeasurements,
}) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Analysis result
  const [parsedResult, setParsedResult] = useState<ExtractedMeasurementsResult | null>(null);

  // Editable extracted values state
  const [editableBatchId, setEditableBatchId] = useState<string>('');
  const [editableTemp, setEditableTemp] = useState<number | ''>('');
  const [editablePressure, setEditablePressure] = useState<number | ''>('');
  const [editablePh, setEditablePh] = useState<number | ''>('');
  const [editableMixingTime, setEditableMixingTime] = useState<number | ''>('');
  const [editableMixingSpeed, setEditableMixingSpeed] = useState<number | ''>('');
  const [editableSecondary, setEditableSecondary] = useState<Record<string, number | ''>>({});

  // Web Speech API recognition instance ref
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // Check Web Speech API availability
  const isSpeechSupported =
    typeof window !== 'undefined' &&
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  // Start Voice Recording
  const startRecording = async () => {
    setSpeechError(null);
    setTranscript('');
    setInterimTranscript('');
    setParsedResult(null);

    // Request microphone stream for visual volume feedback and permission check
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;

        // Audio visualizer setup
        try {
          const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const audioCtx = new AudioContextClass();
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);
          audioContextRef.current = audioCtx;
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateAudioLevel = () => {
            if (analyserRef.current && micStreamRef.current) {
              analyserRef.current.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
              requestAnimationFrame(updateAudioLevel);
            }
          };
          updateAudioLevel();
        } catch {
          // Ignore visualizer error
        }
      }
    } catch (err: unknown) {
      console.warn('Microphone permission error:', err);
      const error = err as Error;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setSpeechError('Microphone permission was denied. Please allow microphone access in your browser address bar.');
        return;
      }
    }

    // Initialize SpeechRecognition
    if (isSpeechSupported) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let finalAccumulated = '';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalAccumulated += event.results[i][0].transcript + ' ';
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          setTranscript(finalAccumulated.trim());
          setInterimTranscript(interim.trim());
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          if (event.error === 'not-allowed') {
            setSpeechError('Microphone permission denied. Please allow microphone access.');
          } else if (event.error === 'no-speech') {
            // Keep listening, do not abort
          } else {
            setSpeechError(`Speech recognition note: ${event.error}. You can also type or use test dictations.`);
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsRecording(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        setSpeechError('Could not initialize browser speech recognition. You can type or load sample speech dictations below.');
      }
    } else {
      setIsRecording(true);
      setSpeechError('Speech recognition is not natively supported in this browser. You can enter or paste notebook speech below.');
    }
  };

  // Stop Recording and trigger extraction
  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop error
      }
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    setIsRecording(false);
    setAudioLevel(0);

    // Combine any interim transcript
    const fullText = (transcript + ' ' + interimTranscript).trim();
    if (fullText) {
      processTranscript(fullText);
    }
  };

  // Cancel Recording
  const cancelRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore abort error
      }
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    setIsRecording(false);
    setAudioLevel(0);
    setTranscript('');
    setInterimTranscript('');
    setParsedResult(null);
  };

  // Process and extract measurements from transcript
  const processTranscript = (text: string) => {
    if (!text.trim()) {
      setSpeechError('No speech was detected. Please speak clearly into your microphone.');
      return;
    }

    setIsProcessing(true);
    setSpeechError(null);

    // Run natural language parser
    const result = extractMeasurementsFromSpeech(text, chemicalSpec);
    setParsedResult(result);

    // Populate editable fields
    setEditableBatchId(result.batchId || '');
    setEditableTemp(result.temperature !== null ? result.temperature : '');
    setEditablePressure(result.pressure !== null ? result.pressure : '');
    setEditablePh(result.ph !== null ? result.ph : '');
    setEditableMixingTime(result.mixingTime !== null ? result.mixingTime : '');
    setEditableMixingSpeed(result.mixingSpeed !== null && result.mixingSpeed !== undefined ? result.mixingSpeed : '');

    const secObj: Record<string, number | ''> = {};
    chemicalSpec.suggestedThresholds.forEach((spec) => {
      secObj[spec.key] = result.secondary[spec.key] !== undefined && result.secondary[spec.key] !== null
        ? result.secondary[spec.key]!
        : '';
    });
    setEditableSecondary(secObj);

    setIsProcessing(false);
  };

  // Clean up on modal close or unmount
  useEffect(() => {
    if (!isOpen) {
      cancelRecording();
    }
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen]);

  // Load sample voice dictation (useful for testing & evaluation)
  const loadSampleDictation = (sampleText: string) => {
    cancelRecording();
    setTranscript(sampleText);
    setInterimTranscript('');
    processTranscript(sampleText);
  };

  // Apply values to main form
  const handleConfirmAndApply = () => {
    const secNumbers: Record<string, number | null> = {};
    Object.keys(editableSecondary).forEach((k) => {
      secNumbers[k] = editableSecondary[k] === '' ? null : Number(editableSecondary[k]);
    });

    onApplyMeasurements({
      batchId: editableBatchId.trim() || undefined,
      temperature: editableTemp === '' ? null : Number(editableTemp),
      pressure: editablePressure === '' ? null : Number(editablePressure),
      ph: editablePh === '' ? null : Number(editablePh),
      mixingTime: editableMixingTime === '' ? null : Number(editableMixingTime),
      mixingSpeed: editableMixingSpeed === '' ? null : Number(editableMixingSpeed),
      secondary: secNumbers,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0F1E36]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-[#E6E4DF] shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#FAF8F5] border-b border-[#E6E4DF] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FFF2E8] flex items-center justify-center text-[#EA580C] border border-[#FCD5B5] shadow-xs">
              <Mic className="w-5 h-5 text-[#EA580C]" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-[#0F1E36] leading-tight">
                Voice Input for Process Measurements
              </h3>
              <p className="text-xs text-[#0F1E36]/70 mt-0.5">
                Speak naturally from your lab notebook. Review and confirm values before applying.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#0F1E36]/60 hover:text-[#0F1E36] hover:bg-[#E6E4DF]/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Microphone Action Bar & Recording Status */}
          <div className="bg-[#FAF8F5] border border-[#E6E4DF] rounded-2xl p-5 text-center space-y-4">
            {!isRecording ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={startRecording}
                  className="px-6 py-3.5 rounded-2xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-sm transition-all flex items-center justify-center gap-2.5 mx-auto shadow-md hover:shadow-lg cursor-pointer transform hover:-translate-y-0.5"
                >
                  <Mic className="w-5 h-5" />
                  <span>Start Voice Recording</span>
                </button>
                <p className="text-xs text-[#0F1E36]/60">
                  Click to speak. You will be able to review and edit extracted measurements before applying.
                </p>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in">
                {/* Listening Pulsing Animation */}
                <div className="flex items-center justify-center gap-3">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-[#EA580C]/20 animate-ping absolute inset-0" />
                    <div className="w-16 h-16 rounded-full bg-[#EA580C] flex items-center justify-center text-white relative shadow-lg">
                      <Mic className="w-8 h-8 animate-pulse" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="font-display font-bold text-base text-[#EA580C] block animate-pulse">
                    Listening to spoken measurements...
                  </span>
                  <p className="text-xs text-[#0F1E36]/70">
                    Speak clearly: “Batch B102, temperature 85 degrees, pressure 4.5 bar, pH 7.2, mixing time 45 minutes”
                  </p>
                </div>

                {/* Audio visualizer bar */}
                <div className="w-48 mx-auto h-2 bg-[#E6E4DF] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#EA580C] transition-all duration-75"
                    style={{ width: `${Math.max(10, audioLevel)}%` }}
                  />
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-5 py-2.5 rounded-xl bg-[#1B365D] hover:bg-[#132743] text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 text-[#FB923C]" />
                    <span>Stop & Extract Values</span>
                  </button>

                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="px-4 py-2.5 rounded-xl border border-[#E6E4DF] bg-white hover:bg-gray-50 text-xs font-semibold text-[#0F1E36] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {speechError && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2 text-left">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>{speechError}</span>
              </div>
            )}
          </div>

          {/* Quick Sample Voice Dictations (Convenient testing without speaking) */}
          <div className="bg-[#FFF2E8]/60 border border-[#FCD5B5] rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#EA580C] flex items-center gap-1.5 uppercase tracking-wider font-mono">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Test Notebook Audio Dictations</span>
              </span>
              <span className="text-[11px] text-[#0F1E36]/50">Click to test instant NLP extraction</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() =>
                  loadSampleDictation(
                    'Batch B102, temperature 85 degrees Celsius, pressure 4.5 bar, pH 7.2, mixing speed 300 RPM, reaction time 45 minutes.'
                  )
                }
                className="text-left p-2.5 rounded-xl bg-white border border-[#FCD5B5] hover:bg-[#FFF2E8] transition-all text-xs text-[#0F1E36] cursor-pointer flex items-center justify-between gap-2 shadow-2xs"
              >
                <span className="italic">
                  “Batch B102, temperature 85 degrees Celsius, pressure 4.5 bar, pH 7.2, mixing speed 300 RPM, reaction time 45 minutes.”
                </span>
                <span className="text-[10px] font-bold text-[#EA580C] bg-[#FFF2E8] px-2 py-0.5 rounded shrink-0">
                  Prompt Example
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  loadSampleDictation(
                    'Batch DET-2026-904, temperature is eighty-eight point five degrees, pressure five point two bar, pH is seven point four, mixing time thirty-two minutes, active surfactant sixteen point five percent, viscosity 460 cP.'
                  )
                }
                className="text-left p-2.5 rounded-xl bg-white border border-[#FCD5B5] hover:bg-[#FFF2E8] transition-all text-xs text-[#0F1E36] cursor-pointer flex items-center justify-between gap-2 shadow-2xs"
              >
                <span className="italic">
                  “Batch DET-2026-904, temperature is eighty-eight point five degrees, pressure five point two bar, pH is seven point four, mixing time thirty-two minutes...”
                </span>
                <span className="text-[10px] font-bold text-[#1B365D] bg-[#EBF1F8] px-2 py-0.5 rounded shrink-0">
                  Full Formulation
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  loadSampleDictation(
                    'temperature is eighty-five degrees, pressure four point five bar, and pH is seven point two'
                  )
                }
                className="text-left p-2.5 rounded-xl bg-white border border-[#FCD5B5] hover:bg-[#FFF2E8] transition-all text-xs text-[#0F1E36] cursor-pointer flex items-center justify-between gap-2 shadow-2xs"
              >
                <span className="italic">
                  “temperature is eighty-five degrees, pressure four point five bar, and pH is seven point two”
                </span>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded shrink-0">
                  Missing Field Demo
                </span>
              </button>
            </div>
          </div>

          {/* Section 2: Recognized Transcript (Editable) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[#0F1E36] uppercase tracking-wider">
                Recognized Transcript (Editable)
              </label>
              {transcript && (
                <button
                  type="button"
                  onClick={() => processTranscript(transcript)}
                  className="text-xs font-bold text-[#EA580C] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Re-parse Text</span>
                </button>
              )}
            </div>

            <textarea
              rows={3}
              value={isRecording ? (transcript + ' ' + interimTranscript).trim() : transcript}
              onChange={(e) => {
                setTranscript(e.target.value);
                processTranscript(e.target.value);
              }}
              placeholder={isRecording ? 'Listening for speech...' : 'Recognized spoken words will appear here. You can also edit or paste speech text directly.'}
              className="w-full bg-[#FAF8F5] border border-[#E6E4DF] rounded-2xl p-3.5 text-xs text-[#0F1E36] input-focus-ring font-mono leading-relaxed"
            />
          </div>

          {/* Section 3: Extracted Measurements & Review Panel */}
          {parsedResult && (
            <div className="space-y-4 pt-2 border-t border-[#E6E4DF] animate-in fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-display font-bold text-sm text-[#0F1E36]">
                    Extracted Values Review
                  </h4>
                  <p className="text-xs text-[#0F1E36]/70 mt-0.5">
                    Review values below. Edit any field before applying to the quality prediction form.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-[#EBF1F8] text-[#1B365D]">
                    {parsedResult.detectedFields.length} Detected
                  </span>
                  {parsedResult.missingCoreFields.length > 0 && (
                    <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                      {parsedResult.missingCoreFields.length} Missing
                    </span>
                  )}
                </div>
              </div>

              {/* Missing Fields & Anti-Guessing Guarantee Banner */}
              <div className="space-y-2">
                {parsedResult.missingCoreFields.length > 0 && (
                  <div className="p-3 rounded-xl bg-[#FFF2E8] border border-[#FCD5B5] text-xs text-[#EA580C] flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Missing or Unclear Parameters: </span>
                      <span>
                        {parsedResult.missingCoreFields.join(', ')}. Speech was not certain or omitted these fields. Please verify or enter values manually below.
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#E6E4DF] text-[11px] text-[#0F1E36]/70">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#1B365D] shrink-0" />
                  <span>
                    <strong>Strict Validation Protocol:</strong> The system never silently guesses unstated values. Any parameter not heard clearly remains highlighted for manual confirmation.
                  </span>
                </div>
              </div>

              {/* Editable Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Batch ID */}
                <div className={`border rounded-xl p-3 space-y-1 ${editableBatchId ? 'bg-white border-[#86EFAC]' : 'bg-[#FAF8F5] border-[#E6E4DF]'}`}>
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-[#0F1E36]">Batch ID</label>
                    {editableBatchId ? (
                      <span className="text-[10px] text-[#15803D] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Detected in speech
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#0F1E36]/40">Current: {currentBatchId}</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={editableBatchId}
                    onChange={(e) => setEditableBatchId(e.target.value)}
                    placeholder={currentBatchId}
                    className="w-full bg-white border border-[#E6E4DF] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-[#0F1E36] input-focus-ring"
                  />
                </div>

                {/* Temperature */}
                <div className={`border rounded-xl p-3 space-y-1 ${editableTemp === '' ? 'bg-amber-50/60 border-amber-300' : 'bg-white border-[#86EFAC]'}`}>
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-[#0F1E36]">Temperature (°C)</label>
                    {editableTemp !== '' ? (
                      <span className="text-[10px] text-[#15803D] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Detected
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-700 font-bold flex items-center gap-1 bg-amber-100 px-1.5 py-0.5 rounded">
                        <AlertTriangle className="w-3 h-3" /> Unclear / Missing
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={editableTemp}
                      onChange={(e) => setEditableTemp(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 85.0"
                      className="w-full bg-white border border-[#E6E4DF] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-[#0F1E36] input-focus-ring"
                    />
                    <span className="absolute right-2.5 top-1.5 text-[11px] font-mono text-gray-400 font-bold">°C</span>
                  </div>
                  <div className="text-[10px] font-mono text-[#0F1E36]/60 flex justify-between">
                    <span>Target: 82–90 °C</span>
                    {editableTemp !== '' && (Number(editableTemp) < 82 || Number(editableTemp) > 90) && (
                      <span className="text-rose-600 font-bold">Outside nominal window</span>
                    )}
                  </div>
                </div>

                {/* Pressure */}
                <div className={`border rounded-xl p-3 space-y-1 ${editablePressure === '' ? 'bg-amber-50/60 border-amber-300' : 'bg-white border-[#86EFAC]'}`}>
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-[#0F1E36]">Pressure (bar)</label>
                    {editablePressure !== '' ? (
                      <span className="text-[10px] text-[#15803D] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Detected
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-700 font-bold flex items-center gap-1 bg-amber-100 px-1.5 py-0.5 rounded">
                        <AlertTriangle className="w-3 h-3" /> Unclear / Missing
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={editablePressure}
                      onChange={(e) => setEditablePressure(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 4.5"
                      className="w-full bg-white border border-[#E6E4DF] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-[#0F1E36] input-focus-ring"
                    />
                    <span className="absolute right-2.5 top-1.5 text-[11px] font-mono text-gray-400 font-bold">bar</span>
                  </div>
                  <div className="text-[10px] font-mono text-[#0F1E36]/60 flex justify-between">
                    <span>Target: 4–6 bar</span>
                    {editablePressure !== '' && (Number(editablePressure) < 4 || Number(editablePressure) > 6) && (
                      <span className="text-rose-600 font-bold">Outside nominal window</span>
                    )}
                  </div>
                </div>

                {/* pH */}
                <div className={`border rounded-xl p-3 space-y-1 ${editablePh === '' ? 'bg-amber-50/60 border-amber-300' : 'bg-white border-[#86EFAC]'}`}>
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-[#0F1E36]">pH Value</label>
                    {editablePh !== '' ? (
                      <span className="text-[10px] text-[#15803D] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Detected
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-700 font-bold flex items-center gap-1 bg-amber-100 px-1.5 py-0.5 rounded">
                        <AlertTriangle className="w-3 h-3" /> Unclear / Missing
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.05"
                      value={editablePh}
                      onChange={(e) => setEditablePh(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 7.2"
                      className="w-full bg-white border border-[#E6E4DF] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-[#0F1E36] input-focus-ring"
                    />
                    <span className="absolute right-2.5 top-1.5 text-[11px] font-mono text-gray-400 font-bold">pH</span>
                  </div>
                  <div className="text-[10px] font-mono text-[#0F1E36]/60 flex justify-between">
                    <span>Target: 6–8 pH</span>
                    {editablePh !== '' && (Number(editablePh) < 6 || Number(editablePh) > 8) && (
                      <span className="text-rose-600 font-bold">Outside nominal window</span>
                    )}
                  </div>
                </div>

                {/* Mixing Time */}
                <div className={`border rounded-xl p-3 space-y-1 ${editableMixingTime === '' ? 'bg-amber-50/60 border-amber-300' : 'bg-white border-[#86EFAC]'}`}>
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-[#0F1E36]">Mixing / Reaction Time (min)</label>
                    {editableMixingTime !== '' ? (
                      <span className="text-[10px] text-[#15803D] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Detected
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-700 font-bold flex items-center gap-1 bg-amber-100 px-1.5 py-0.5 rounded">
                        <AlertTriangle className="w-3 h-3" /> Unclear / Missing
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      value={editableMixingTime}
                      onChange={(e) => setEditableMixingTime(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 45"
                      className="w-full bg-white border border-[#E6E4DF] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-[#0F1E36] input-focus-ring"
                    />
                    <span className="absolute right-2.5 top-1.5 text-[11px] font-mono text-gray-400 font-bold">min</span>
                  </div>
                  <div className="text-[10px] font-mono text-[#0F1E36]/60 flex justify-between">
                    <span>Target: 20–40 min</span>
                    {editableMixingTime !== '' && (Number(editableMixingTime) < 20 || Number(editableMixingTime) > 40) && (
                      <span className="text-rose-600 font-bold">Outside nominal window</span>
                    )}
                  </div>
                </div>

                {/* Mixing Speed */}
                <div className={`border rounded-xl p-3 space-y-1 ${editableMixingSpeed === '' ? 'bg-[#FAF8F5] border-[#E6E4DF]' : 'bg-white border-[#86EFAC]'}`}>
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-[#0F1E36]">Mixing Speed (RPM)</label>
                    {editableMixingSpeed !== '' ? (
                      <span className="text-[10px] text-[#15803D] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Detected
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#0F1E36]/50">Optional / 300 RPM Nominal</span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="10"
                      value={editableMixingSpeed}
                      onChange={(e) => setEditableMixingSpeed(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 300"
                      className="w-full bg-white border border-[#E6E4DF] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-[#0F1E36] input-focus-ring"
                    />
                    <span className="absolute right-2.5 top-1.5 text-[11px] font-mono text-gray-400 font-bold">RPM</span>
                  </div>
                  <div className="text-[10px] font-mono text-[#0F1E36]/60">
                    <span>Agitator Impeller Speed (e.g. 300 RPM)</span>
                  </div>
                </div>

                {/* Chemical-Specific Secondary Measurements */}
                {chemicalSpec.suggestedThresholds.map((spec) => (
                  <div key={spec.key} className="bg-[#FAF8F5] border border-[#E6E4DF] rounded-xl p-3 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <label className="font-bold text-[#0F1E36]">{spec.name}</label>
                      <span className="text-[10px] font-mono text-[#0F1E36]/60">{spec.min}–{spec.max} {spec.unit}</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={editableSecondary[spec.key] !== undefined ? editableSecondary[spec.key] : ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Number(e.target.value);
                          setEditableSecondary((prev) => ({ ...prev, [spec.key]: val }));
                        }}
                        placeholder={`e.g. ${((spec.min + spec.max) / 2).toFixed(1)}`}
                        className="w-full bg-white border border-[#E6E4DF] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-[#0F1E36] input-focus-ring"
                      />
                      <span className="absolute right-2.5 top-1.5 text-[11px] font-mono text-gray-400 font-bold">{spec.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#FAF8F5] border-t border-[#E6E4DF] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#0F1E36]/60 text-center sm:text-left">
            Values are applied to the form for review. Prediction will only run when you click “Predict Quality”.
          </p>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-[#E6E4DF] bg-white text-xs font-bold text-[#0F1E36] hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!parsedResult}
              onClick={handleConfirmAndApply}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-[#1B365D] hover:bg-[#132743] disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Check className="w-4 h-4 text-[#FB923C]" />
              <span>Confirm and Apply Values</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
