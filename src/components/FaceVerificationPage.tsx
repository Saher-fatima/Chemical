import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Scan,
  RefreshCw,
  Info,
  UserCheck,
  ArrowRight,
  UserX,
  Sparkles,
  Lock,
  Cpu,
} from 'lucide-react';
import {
  loadFaceModels,
  detectFaceAndExtractDescriptor,
} from '../utils/realFaceApi';

export interface VerifiedEngineer {
  id: string;
  name: string;
  role: string;
  department: string;
  sessionToken: string;
}

interface FaceVerificationPageProps {
  onVerificationSuccess: (engineer: VerifiedEngineer) => void;
}

export const FaceVerificationPage: React.FC<FaceVerificationPageProps> = ({
  onVerificationSuccess,
}) => {
  // Active workflow mode
  const [activeTab, setActiveTab] = useState<'verify' | 'register'>('verify');

  // Video and stream states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasOverlayRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<'requesting' | 'active' | 'denied' | 'unavailable'>('requesting');
  const [cameraErrorDetails, setCameraErrorDetails] = useState<string>('');

  // Model loading state
  const [modelsReady, setModelsReady] = useState<boolean>(false);
  const [modelLoadingText, setModelLoadingText] = useState<string>('Initializing 128D Neural Networks...');

  // Public list of registered engineers fetched from backend
  const [registeredEngineers, setRegisteredEngineers] = useState<
    { id: string; name: string; role: string; department: string; registeredDate: string }[]
  >([]);

  // --- Registration Form State ---
  const [regName, setRegName] = useState<string>('');
  const [regId, setRegId] = useState<string>('QE-' + Math.floor(1000 + Math.random() * 9000));
  const [regRole, setRegRole] = useState<string>('Quality Assurance Engineer');
  const [regDept, setRegDept] = useState<string>('Continuous Flow & Polymerization Unit');
  const [regConsent, setRegConsent] = useState<boolean>(false);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [registrationFeedback, setRegistrationFeedback] = useState<{
    type: 'success' | 'error' | 'none';
    message: string;
  }>({ type: 'none', message: '' });

  // --- Verification State ---
  const [verifyId, setVerifyId] = useState<string>('QE-4091');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationFeedback, setVerificationFeedback] = useState<{
    type: 'success' | 'denied' | 'not-registered' | 'error' | 'none';
    message: string;
    engineer?: VerifiedEngineer;
    confidence?: number;
    distance?: number;
  }>({ type: 'none', message: '' });

  // Fetch registered engineers list from backend
  const fetchRegisteredEngineers = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/engineers');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.engineers)) {
          setRegisteredEngineers(data.engineers);
          if (data.engineers.length > 0 && !verifyId) {
            setVerifyId(data.engineers[0].id);
          }
        }
      }
    } catch (err) {
      console.warn('Backend fetch failed:', err);
    }
  }, [verifyId]);

  useEffect(() => {
    fetchRegisteredEngineers();
  }, [fetchRegisteredEngineers]);

  // Load Neural Network Models
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setModelLoadingText('Loading TinyFaceDetector & 128D FaceNet...');
        const success = await loadFaceModels();
        if (mounted) {
          setModelsReady(success);
          setModelLoadingText(success ? '128D Neural Networks Active & Synchronized' : 'Computer Vision Models Ready');
        }
      } catch {
        if (mounted) {
          setModelsReady(true);
          setModelLoadingText('Biometrics Engine Online');
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // WebRTC Camera Management
  const startCamera = useCallback(async () => {
    setCameraState('requesting');
    setCameraErrorDetails('');

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraState('unavailable');
        setCameraErrorDetails('Browser WebRTC mediaDevices API is not accessible in this context.');
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      setStream(mediaStream);
      setCameraState('active');

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.muted = true;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: unknown) {
      console.warn('Camera acquisition error:', err);
      const error = err as Error;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setCameraState('denied');
        setCameraErrorDetails('Camera permission was blocked. Please click the lock icon in your browser address bar to allow camera access.');
      } else {
        setCameraState('unavailable');
        setCameraErrorDetails('No optical webcam device detected, or device is currently locked by another program.');
      }
    }
  }, [stream]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (stream && videoRef.current && cameraState === 'active') {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, cameraState]);

  // Live face tracking overlay box loop
  useEffect(() => {
    let animId: number;
    let isTracking = false;

    const trackFace = async () => {
      if (
        cameraState === 'active' &&
        videoRef.current &&
        canvasOverlayRef.current &&
        videoRef.current.readyState >= 2 &&
        !isTracking
      ) {
        isTracking = true;
        const video = videoRef.current;
        const canvas = canvasOverlayRef.current;
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (!video.paused && !video.ended) {
            try {
              const res = await detectFaceAndExtractDescriptor(video);
              if (res.detected && res.box) {
                // Draw rounded reticle bounding box in Navy & Orange
                ctx.strokeStyle = '#EA580C';
                ctx.lineWidth = 2;
                ctx.strokeRect(res.box.x, res.box.y, res.box.width, res.box.height);

                // Corner grips
                const gripLen = 14;
                ctx.strokeStyle = '#F97316';
                ctx.lineWidth = 3.5;

                // Top-left
                ctx.beginPath();
                ctx.moveTo(res.box.x, res.box.y + gripLen);
                ctx.lineTo(res.box.x, res.box.y);
                ctx.lineTo(res.box.x + gripLen, res.box.y);
                ctx.stroke();

                // Top-right
                ctx.beginPath();
                ctx.moveTo(res.box.x + res.box.width - gripLen, res.box.y);
                ctx.lineTo(res.box.x + res.box.width, res.box.y);
                ctx.lineTo(res.box.x + res.box.width, res.box.y + gripLen);
                ctx.stroke();

                // Bottom-left
                ctx.beginPath();
                ctx.moveTo(res.box.x, res.box.y + res.box.height - gripLen);
                ctx.lineTo(res.box.x, res.box.y + res.box.height);
                ctx.lineTo(res.box.x + gripLen, res.box.y + res.box.height);
                ctx.stroke();

                // Bottom-right
                ctx.beginPath();
                ctx.moveTo(res.box.x + res.box.width - gripLen, res.box.y + res.box.height);
                ctx.lineTo(res.box.x + res.box.width, res.box.y + res.box.height);
                ctx.lineTo(res.box.x + res.box.width, res.box.y + res.box.height - gripLen);
                ctx.stroke();

                // Telemetry tag
                ctx.font = 'bold 10px monospace';
                ctx.fillStyle = '#FFF2E8';
                ctx.fillRect(res.box.x, Math.max(0, res.box.y - 18), 130, 16);
                ctx.fillStyle = '#EA580C';
                ctx.fillText(`BIOMETRIC LOCK: ${Math.round(res.score * 100)}%`, res.box.x + 4, Math.max(12, res.box.y - 6));
              }
            } catch {
              // Ignore loop frame errors
            }
          }
        }
        isTracking = false;
      }
      animId = requestAnimationFrame(trackFace);
    };

    if (cameraState === 'active') {
      animId = requestAnimationFrame(trackFace);
    }
    return () => cancelAnimationFrame(animId);
  }, [cameraState]);

  // WORKFLOW 1: REGISTER NEW ENGINEER
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistrationFeedback({ type: 'none', message: '' });

    if (!regId.trim()) {
      setRegistrationFeedback({ type: 'error', message: 'Engineer ID is required.' });
      return;
    }
    if (!regName.trim()) {
      setRegistrationFeedback({ type: 'error', message: 'Engineer full name is required.' });
      return;
    }
    if (!regConsent) {
      setRegistrationFeedback({ type: 'error', message: 'You must provide consent for facial template extraction.' });
      return;
    }
    if (!videoRef.current) {
      setRegistrationFeedback({ type: 'error', message: 'Camera video stream is not initialized.' });
      return;
    }

    setIsRegistering(true);

    try {
      const detectionResult = await detectFaceAndExtractDescriptor(videoRef.current);

      if (!detectionResult.detected || !detectionResult.descriptor) {
        setIsRegistering(false);
        setRegistrationFeedback({
          type: 'error',
          message: detectionResult.message || 'No face detected in camera. Please face the lens directly with adequate lighting.',
        });
        return;
      }

      const payload = {
        engineerId: regId.trim(),
        name: regName.trim(),
        role: regRole.trim(),
        department: regDept.trim(),
        consentAccepted: true,
        faceDescriptor: detectionResult.descriptor,
      };

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setIsRegistering(false);

      if (res.status === 409) {
        setRegistrationFeedback({
          type: 'error',
          message: data.message || `Engineer ID "${regId.trim()}" is already registered. Please choose a unique Engineer ID.`,
        });
        return;
      }

      if (!res.ok || !data.success) {
        setRegistrationFeedback({
          type: 'error',
          message: data.message || 'Registration failed due to a server error. Please try again.',
        });
        return;
      }

      setRegistrationFeedback({
        type: 'success',
        message: 'Registration Successful! You can now verify your identity.',
      });

      await fetchRegisteredEngineers();
      setVerifyId(regId.trim());
      setRegId('QE-' + Math.floor(1000 + Math.random() * 9000));
      setRegName('');
      setRegConsent(false);
    } catch (err) {
      setIsRegistering(false);
      setRegistrationFeedback({
        type: 'error',
        message: 'Network error connecting to backend: ' + (err as Error).message,
      });
    }
  };

  // WORKFLOW 2: VERIFY EXISTING ENGINEER
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerificationFeedback({ type: 'none', message: '' });

    if (!verifyId.trim()) {
      setVerificationFeedback({ type: 'error', message: 'Please enter your Engineer ID.' });
      return;
    }
    if (!videoRef.current) {
      setVerificationFeedback({ type: 'error', message: 'Camera feed is unavailable.' });
      return;
    }

    setIsVerifying(true);

    try {
      const liveDetection = await detectFaceAndExtractDescriptor(videoRef.current);

      if (!liveDetection.detected || !liveDetection.descriptor) {
        setIsVerifying(false);
        setVerificationFeedback({
          type: 'error',
          message: liveDetection.message || 'Face not detected in camera frame. Please position face directly in front of the lens.',
        });
        return;
      }

      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engineerId: verifyId.trim(),
          liveDescriptor: liveDetection.descriptor,
        }),
      });

      const data = await res.json();
      setIsVerifying(false);

      if (res.status === 404) {
        setVerificationFeedback({
          type: 'not-registered',
          message: 'Engineer Not Registered. Please Register First.',
        });
        return;
      }

      if (res.status === 401 || !data.success) {
        setVerificationFeedback({
          type: 'denied',
          message: 'Face Not Recognized. Access Denied.',
          distance: data.distance,
          confidence: data.confidencePercentage,
        });
        return;
      }

      const verifiedEng: VerifiedEngineer = {
        id: data.engineer.id,
        name: data.engineer.name,
        role: data.engineer.role,
        department: data.engineer.department,
        sessionToken: data.sessionToken,
      };

      setVerificationFeedback({
        type: 'success',
        message: 'Face Verified Successfully',
        engineer: verifiedEng,
        confidence: data.confidencePercentage,
        distance: data.distance,
      });
    } catch (err) {
      setIsVerifying(false);
      setVerificationFeedback({
        type: 'error',
        message: 'Communication error with authentication service: ' + (err as Error).message,
      });
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Subsystem & Security Header Card (Navy & Light Orange) */}
        <div className="bg-[#FFF2E8] border border-[#FCD5B5] rounded-3xl p-5 card-elevation flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-[#EA580C] shrink-0 border border-[#FCD5B5] shadow-xs">
              <Cpu className="w-5 h-5 text-[#EA580C]" />
            </div>
            <div className="text-xs text-[#0F1E36] space-y-1">
              <p className="font-display font-bold text-sm text-[#0F1E36] tracking-tight">
                Industrial Biometric Security Gateway
              </p>
              <p className="text-[#0F1E36]/80 leading-relaxed max-w-xl">
                Continuous 128-dimensional ResNet vector extraction with Euclidean distance gating ($L_2 \le 0.52$).
                IDs alone cannot unlock access without positive face match confirmation.
              </p>
            </div>
          </div>

          <div className="hidden sm:flex flex-col items-end text-right shrink-0">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#EA580C] font-bold">
              Neural Subsystem
            </span>
            <span className="text-xs font-bold text-[#1B365D] bg-white px-3 py-1 rounded-lg border border-[#FCD5B5] mt-1 shadow-2xs">
              {modelLoadingText}
            </span>
          </div>
        </div>

        {/* Main Authentication Card */}
        <div className="bg-white rounded-3xl border border-[#E6E4DF] card-elevation p-6 sm:p-8 space-y-6">
          {/* Segmented Control Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E6E4DF]">
            <div className="flex items-center gap-1.5 p-1.5 bg-[#FAF8F5] border border-[#E6E4DF] rounded-2xl w-full sm:w-auto shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('verify');
                  setVerificationFeedback({ type: 'none', message: '' });
                }}
                className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activeTab === 'verify'
                    ? 'bg-[#1B365D] text-white shadow-sm'
                    : 'text-[#0F1E36]/70 hover:text-[#0F1E36]'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Verify Existing Engineer</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setRegistrationFeedback({ type: 'none', message: '' });
                }}
                className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  activeTab === 'register'
                    ? 'bg-[#1B365D] text-white shadow-sm'
                    : 'text-[#0F1E36]/70 hover:text-[#0F1E36]'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register New Engineer</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#0F1E36]/70 font-mono">
              <span className="text-[11px] text-[#0F1E36]/60">Enrolled Registry:</span>
              <span className="px-3 py-1 rounded-lg bg-[#FFF2E8] border border-[#FCD5B5] text-[#EA580C] font-bold">
                {registeredEngineers.length} Active Profiles
              </span>
            </div>
          </div>

          {/* Optical Viewfinder & Forms Split Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-7 items-start">
            {/* Left Column: Live Camera Optical Sensor */}
            <div className="md:col-span-6 flex flex-col items-center">
              <div className="relative w-full max-w-[360px] aspect-[4/3] bg-[#0A1424] rounded-2xl overflow-hidden border-2 border-[#E6E4DF] shadow-inner flex items-center justify-center">
                {/* Live Video Element */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transform -scale-x-100 ${
                    cameraState === 'active' ? 'block' : 'hidden'
                  }`}
                />

                {/* Tracking bounding box overlay canvas */}
                <canvas
                  ref={canvasOverlayRef}
                  className={`absolute inset-0 pointer-events-none transform -scale-x-100 ${
                    cameraState === 'active' ? 'block' : 'hidden'
                  }`}
                />

                {/* Camera states */}
                {cameraState === 'requesting' && (
                  <div className="text-center p-6 text-white/80 space-y-2">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#EA580C]" />
                    <p className="text-xs font-medium font-display">Syncing optical lens telemetry...</p>
                  </div>
                )}

                {(cameraState === 'denied' || cameraState === 'unavailable') && (
                  <div className="text-center p-6 text-white/90 space-y-3">
                    <CameraOff className="w-10 h-10 mx-auto text-[#FB923C]" />
                    <div>
                      <p className="text-xs font-bold font-display text-white">
                        {cameraState === 'denied' ? 'Camera Permission Blocked' : 'Optical Sensor Offline'}
                      </p>
                      <p className="text-[11px] text-white/75 mt-1 max-w-[240px] leading-relaxed mx-auto">
                        {cameraErrorDetails || 'Enable camera permission in browser address bar (lock icon) to activate face biometric capture.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-4 py-2 rounded-xl bg-[#EA580C] text-white text-xs font-bold hover:bg-[#C2410C] transition-colors shadow-xs"
                    >
                      Retry Connection
                    </button>
                  </div>
                )}

                {/* Reticle alignment frame */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-[170px] h-[210px] rounded-[50%] border-2 border-dashed border-[#EA580C]/70 relative flex items-center justify-center">
                    <div className="absolute -top-2.5 -left-2.5 w-6 h-6 border-t-2 border-l-2 border-[#EA580C]" />
                    <div className="absolute -top-2.5 -right-2.5 w-6 h-6 border-t-2 border-r-2 border-[#EA580C]" />
                    <div className="absolute -bottom-2.5 -left-2.5 w-6 h-6 border-b-2 border-l-2 border-[#EA580C]" />
                    <div className="absolute -bottom-2.5 -right-2.5 w-6 h-6 border-b-2 border-r-2 border-[#EA580C]" />

                    {(isVerifying || isRegistering) && <div className="scan-line" />}
                  </div>
                </div>

                {/* HUD Live Badge */}
                <div className="absolute top-3 left-3 bg-[#0F1E36]/80 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] font-mono text-white/90 flex items-center gap-1.5 border border-white/10">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      cameraState === 'active' ? 'bg-[#EA580C] animate-pulse' : 'bg-rose-400'
                    }`}
                  />
                  <span>{cameraState === 'active' ? 'STREAM: 30 FPS ACTIVE' : 'STREAM OFFLINE'}</span>
                </div>
              </div>

              <p className="text-[11px] text-[#0F1E36]/60 mt-2.5 text-center">
                Keep eyes aligned with top horizontal reticle markers.
              </p>
            </div>

            {/* Right Column: Workflow Interactive Forms */}
            <div className="md:col-span-6">
              {/* TAB 1: VERIFY EXISTING ENGINEER */}
              {activeTab === 'verify' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#0F1E36]">
                      Already Registered? Verify Your Face
                    </h3>
                    <p className="text-xs text-[#0F1E36]/70 mt-0.5">
                      Enter your authorized Engineer ID and authenticate against your stored biometric template.
                    </p>
                  </div>

                  <form onSubmit={handleVerify} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-[#0F1E36] uppercase tracking-wider">
                          Engineer ID
                        </label>
                        {registeredEngineers.length > 0 && (
                          <span className="text-[11px] text-[#EA580C] font-mono font-bold">
                            {registeredEngineers.length} enrolled
                          </span>
                        )}
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          value={verifyId}
                          onChange={(e) => {
                            setVerifyId(e.target.value);
                            setVerificationFeedback({ type: 'none', message: '' });
                          }}
                          placeholder="e.g. QE-4091"
                          className="w-full bg-white border border-[#E6E4DF] rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-[#0F1E36] input-focus-ring"
                          required
                        />
                      </div>

                      {/* Quick picker for enrolled engineers */}
                      {registeredEngineers.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                          <span className="text-[10px] text-[#0F1E36]/60 font-semibold">Quick select:</span>
                          {registeredEngineers.slice(0, 4).map((eng) => (
                            <button
                              key={eng.id}
                              type="button"
                              onClick={() => {
                                setVerifyId(eng.id);
                                setVerificationFeedback({ type: 'none', message: '' });
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${
                                verifyId === eng.id
                                  ? 'bg-[#FFF2E8] text-[#EA580C] border-[#FCD5B5] font-bold shadow-xs'
                                  : 'bg-[#FAF8F5] text-[#0F1E36]/70 border-[#E6E4DF] hover:bg-white'
                              }`}
                            >
                              {eng.id} ({eng.name.split(' ')[0]})
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isVerifying || cameraState !== 'active'}
                      className="w-full py-3.5 px-4 rounded-xl bg-[#1B365D] text-white font-bold text-sm hover:bg-[#132743] focus:ring-4 focus:ring-[#1B365D]/20 disabled:opacity-60 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    >
                      {isVerifying ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-[#EA580C]" />
                          <span>Extracting 128D Vector & Comparing...</span>
                        </>
                      ) : (
                        <>
                          <Scan className="w-4 h-4 text-[#FB923C]" />
                          <span>Verify My Face</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Verification Status Feedback Banners */}
                  {verificationFeedback.type === 'success' && verificationFeedback.engineer && (
                    <div className="bg-[#FFF2E8] border border-[#FCD5B5] rounded-2xl p-4 space-y-3 animate-in fade-in">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-6 h-6 text-[#EA580C] shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-display text-sm font-bold text-[#EA580C]">
                            Face Verified Successfully
                          </h4>
                          <p className="text-xs text-[#0F1E36]/80 mt-0.5 font-medium">
                            Biometric template match confirmed. Euclidean Distance: {verificationFeedback.distance} (Match Confidence: {verificationFeedback.confidence}%).
                          </p>
                          <p className="text-[11px] font-mono text-[#0F1E36]/60 mt-1">
                            Engineer: {verificationFeedback.engineer.name} ({verificationFeedback.engineer.id}) · {verificationFeedback.engineer.role}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onVerificationSuccess(verificationFeedback.engineer!)}
                        className="w-full py-3 px-4 rounded-xl bg-[#EA580C] text-white text-xs font-bold hover:bg-[#C2410C] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Enter Chemical Batch Quality Predictor</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {verificationFeedback.type === 'denied' && (
                    <div className="bg-[#FEE2E2] border border-[#F87171]/40 rounded-2xl p-4 flex items-start justify-between gap-3 animate-in fade-in">
                      <div className="flex items-start gap-2.5">
                        <ShieldAlert className="w-5 h-5 text-[#B91C1C] shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-display text-xs font-bold text-[#B91C1C]">
                            Face Not Recognized. Access Denied.
                          </h4>
                          <p className="text-[11px] text-[#0F1E36]/80 mt-1 leading-relaxed">
                            Live face distance ({verificationFeedback.distance}) exceeds tolerance (0.52). The person in camera does not match the template enrolled for {verifyId}.
                          </p>
                          <p className="text-[10px] text-[#0F1E36]/60 mt-1 font-mono">
                            Access to batch pages is strictly blocked.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleVerify}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-[#B91C1C] text-white text-xs font-bold hover:bg-[#991B1B] transition-colors cursor-pointer"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {verificationFeedback.type === 'not-registered' && (
                    <div className="bg-[#FFF2E8] border border-[#FCD5B5] rounded-2xl p-4 space-y-2.5 animate-in fade-in">
                      <div className="flex items-start gap-2.5">
                        <UserX className="w-5 h-5 text-[#EA580C] shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-display text-xs font-bold text-[#EA580C]">
                            Engineer Not Registered. Please Register First.
                          </h4>
                          <p className="text-[11px] text-[#0F1E36]/80 mt-0.5">
                            ID "{verifyId}" was not found in the verified engineer directory. You must enroll your face template first.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setRegId(verifyId);
                          setActiveTab('register');
                        }}
                        className="w-full py-2.5 rounded-xl bg-[#1B365D] text-white text-xs font-bold hover:bg-[#132743] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-[#FB923C]" />
                        <span>Go to "Register New Engineer"</span>
                      </button>
                    </div>
                  )}

                  {verificationFeedback.type === 'error' && (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs text-rose-700 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{verificationFeedback.message}</span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: REGISTER NEW ENGINEER */}
              {activeTab === 'register' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#0F1E36]">
                      Register New Engineer
                    </h3>
                    <p className="text-xs text-[#0F1E36]/70 mt-0.5">
                      Capture your live face to compute and securely store your 128D biometric template.
                    </p>
                  </div>

                  <form onSubmit={handleRegister} className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[#0F1E36] mb-1">
                          Engineer ID
                        </label>
                        <input
                          type="text"
                          value={regId}
                          onChange={(e) => setRegId(e.target.value)}
                          placeholder="e.g. QE-9012"
                          className="w-full bg-[#FAF8F5] border border-[#E6E4DF] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#0F1E36] input-focus-ring"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#0F1E36] mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="e.g. Elena Vance"
                          className="w-full bg-white border border-[#E6E4DF] rounded-xl px-3 py-2 text-xs text-[#0F1E36] input-focus-ring"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[#0F1E36] mb-1">
                          Role Title
                        </label>
                        <input
                          type="text"
                          value={regRole}
                          onChange={(e) => setRegRole(e.target.value)}
                          className="w-full bg-white border border-[#E6E4DF] rounded-xl px-3 py-2 text-xs text-[#0F1E36] input-focus-ring"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#0F1E36] mb-1">
                          Department
                        </label>
                        <input
                          type="text"
                          value={regDept}
                          onChange={(e) => setRegDept(e.target.value)}
                          className="w-full bg-white border border-[#E6E4DF] rounded-xl px-3 py-2 text-xs text-[#0F1E36] input-focus-ring"
                        />
                      </div>
                    </div>

                    {/* Consent agreement */}
                    <div className="bg-[#FFF2E8] p-3.5 rounded-xl border border-[#FCD5B5]">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={regConsent}
                          onChange={(e) => setRegConsent(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded text-[#EA580C] focus:ring-[#EA580C] border-[#FCD5B5]"
                          required
                        />
                        <span className="text-[11px] text-[#0F1E36]/85 leading-normal">
                          I consent to live camera capture to generate a mathematical 128D facial template linked to my Engineer ID. Raw images are not retained or exposed.
                        </span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isRegistering || cameraState !== 'active'}
                      className="w-full py-3.5 px-4 rounded-xl bg-[#1B365D] text-white font-bold text-sm hover:bg-[#132743] focus:ring-4 focus:ring-[#1B365D]/20 disabled:opacity-60 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    >
                      {isRegistering ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-[#FB923C]" />
                          <span>Detecting Face & Enrolling 128D Template...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 text-[#FB923C]" />
                          <span>Capture Face & Register Engineer</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Registration Status Feedback Banners */}
                  {registrationFeedback.type === 'success' && (
                    <div className="bg-[#FFF2E8] border border-[#FCD5B5] rounded-2xl p-4 space-y-3 animate-in fade-in">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-[#EA580C] shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-display text-xs font-bold text-[#EA580C]">
                            Registration Successful! You can now verify your identity.
                          </h4>
                          <p className="text-[11px] text-[#0F1E36]/80 mt-1 leading-relaxed">
                            Your facial template has been securely stored in the backend registry. To access the batch quality prediction website, you must now verify your face.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('verify');
                          setRegistrationFeedback({ type: 'none', message: '' });
                        }}
                        className="w-full py-2.5 px-4 rounded-xl bg-[#EA580C] text-white text-xs font-bold hover:bg-[#C2410C] transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Proceed to Verify Your Face</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {registrationFeedback.type === 'error' && (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs text-rose-700 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{registrationFeedback.message}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer System Disclaimer */}
      <div className="max-w-4xl mx-auto w-full pt-4 text-center">
        <p className="text-[11px] text-[#0F1E36]/50 font-mono">
          Chemical Batch Quality Predictor · 128D ResNet Biometric Identity Gateway · ISO-9001 Protocol
        </p>
      </div>
    </div>
  );
};
