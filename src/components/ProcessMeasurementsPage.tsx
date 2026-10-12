import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sparkles,
  Thermometer,
  Gauge,
  Activity,
  Clock,
  Layers,
  Mic,
  RotateCw,
  Volume2,
} from 'lucide-react';
import { BatchMeasurements, ChemicalType, EngineerProfile } from '../types';
import { CHEMICAL_DATABASE } from '../data/chemicals';
import { VoiceInputModal } from './VoiceInputModal';

interface ProcessMeasurementsPageProps {
  authenticatedEngineer: EngineerProfile;
  batchId: string;
  chemicalName: ChemicalType;
  initialMeasurements: BatchMeasurements;
  onBack: () => void;
  onPredict: (measurements: BatchMeasurements) => void;
  onUpdateBatchId?: (newId: string) => void;
}

export const ProcessMeasurementsPage: React.FC<ProcessMeasurementsPageProps> = ({
  authenticatedEngineer,
  batchId,
  chemicalName,
  initialMeasurements,
  onBack,
  onPredict,
  onUpdateBatchId,
}) => {
  const chemicalSpec = CHEMICAL_DATABASE[chemicalName];

  // Core measurements state
  const [temperature, setTemperature] = useState<number | ''>(
    initialMeasurements.temperature !== '' ? initialMeasurements.temperature : 85.5
  );
  const [pressure, setPressure] = useState<number | ''>(
    initialMeasurements.pressure !== '' ? initialMeasurements.pressure : 4.8
  );
  const [ph, setPh] = useState<number | ''>(
    initialMeasurements.ph !== '' ? initialMeasurements.ph : 7.1
  );
  const [mixingTime, setMixingTime] = useState<number | ''>(
    initialMeasurements.mixingTime !== '' ? initialMeasurements.mixingTime : 30
  );
  const [mixingSpeed, setMixingSpeed] = useState<number | ''>(
    initialMeasurements.mixingSpeed !== undefined && initialMeasurements.mixingSpeed !== ''
      ? initialMeasurements.mixingSpeed
      : 300
  );

  // Suggested secondary measurements
  const [secondary, setSecondary] = useState<Record<string, number | ''>>(() => {
    const initialSec: Record<string, number | ''> = { ...initialMeasurements.secondary };
    chemicalSpec.suggestedThresholds.forEach((spec) => {
      if (initialSec[spec.key] === undefined || initialSec[spec.key] === '') {
        initialSec[spec.key] = Number(((spec.min + spec.max) / 2).toFixed(1));
      }
    });
    return initialSec;
  });

  const [formError, setFormError] = useState<string>('');

  // Voice Input Modal state
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [voiceAppliedNotice, setVoiceAppliedNotice] = useState<string | null>(null);

  // Preset Scenario Loaders
  const loadScenario = (type: 'nominal' | 'medium' | 'critical') => {
    if (type === 'nominal') {
      setTemperature(86.0);
      setPressure(5.1);
      setPh(7.2);
      setMixingTime(32);
      setMixingSpeed(300);
      const newSec: Record<string, number | ''> = {};
      chemicalSpec.suggestedThresholds.forEach((spec) => {
        newSec[spec.key] = Number(((spec.min + spec.max) / 2).toFixed(1));
      });
      setSecondary(newSec);
    } else if (type === 'medium') {
      setTemperature(92.4); // slightly over 90°C
      setPressure(5.0);
      setPh(7.0);
      setMixingTime(28);
      setMixingSpeed(360);
      const newSec: Record<string, number | ''> = {};
      chemicalSpec.suggestedThresholds.forEach((spec) => {
        newSec[spec.key] = Number(((spec.min + spec.max) / 2).toFixed(1));
      });
      setSecondary(newSec);
    } else {
      setTemperature(96.8); // +6.8°C above
      setPressure(6.9); // +0.9 bar
      setPh(5.1); // -0.9 pH below
      setMixingTime(14); // -6 min below
      setMixingSpeed(480);
      const newSec: Record<string, number | ''> = {};
      chemicalSpec.suggestedThresholds.forEach((spec, idx) => {
        newSec[spec.key] = idx === 0 ? spec.max * 1.3 : spec.min * 0.7;
      });
      setSecondary(newSec);
    }
  };

  // Handler for voice applied measurements
  const handleApplyVoiceMeasurements = (extracted: {
    batchId?: string;
    temperature: number | null;
    pressure: number | null;
    ph: number | null;
    mixingTime: number | null;
    mixingSpeed?: number | null;
    secondary: Record<string, number | null>;
  }) => {
    if (extracted.batchId && onUpdateBatchId) {
      onUpdateBatchId(extracted.batchId);
    }

    if (extracted.temperature !== null) {
      setTemperature(extracted.temperature);
    }
    if (extracted.pressure !== null) {
      setPressure(extracted.pressure);
    }
    if (extracted.ph !== null) {
      setPh(extracted.ph);
    }
    if (extracted.mixingTime !== null) {
      setMixingTime(extracted.mixingTime);
    }
    if (extracted.mixingSpeed !== null && extracted.mixingSpeed !== undefined) {
      setMixingSpeed(extracted.mixingSpeed);
    }

    if (extracted.secondary) {
      setSecondary((prev) => {
        const updated = { ...prev };
        Object.keys(extracted.secondary).forEach((k) => {
          if (extracted.secondary[k] !== null) {
            updated[k] = extracted.secondary[k]!;
          }
        });
        return updated;
      });
    }

    setVoiceAppliedNotice(
      `Voice measurements applied successfully${extracted.batchId ? ` (Batch: ${extracted.batchId})` : ''}. Review parameters below before predicting quality.`
    );
    setTimeout(() => {
      setVoiceAppliedNotice(null);
    }, 6000);
  };

  const handlePredictSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (
      temperature === '' ||
      pressure === '' ||
      ph === '' ||
      mixingTime === ''
    ) {
      setFormError('Please enter all core process measurements.');
      return;
    }

    onPredict({
      temperature,
      pressure,
      ph,
      mixingTime,
      mixingSpeed,
      secondary,
    });
  };

  // Status badge
  const getStatusBadge = (val: number | '', min: number, max: number, unit: string) => {
    if (val === '') {
      return (
        <span className="text-[11px] text-[#0F1E36]/50 font-mono">
          Target: {min}–{max} {unit}
        </span>
      );
    }
    const num = Number(val);
    if (num >= min && num <= max) {
      return (
        <span className="text-[11px] font-bold text-[#15803D] bg-[#DCFCE7] px-2.5 py-0.5 rounded-md flex items-center gap-1 border border-[#86EFAC]/40">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>In Target Window</span>
        </span>
      );
    }
    if (num < min) {
      return (
        <span className="text-[11px] font-bold text-[#B91C1C] bg-[#FEE2E2] px-2.5 py-0.5 rounded-md flex items-center gap-1 border border-[#FCA5A5]/40">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Under Target (-{(min - num).toFixed(1)} {unit})</span>
        </span>
      );
    }
    return (
      <span className="text-[11px] font-bold text-[#B91C1C] bg-[#FEE2E2] px-2.5 py-0.5 rounded-md flex items-center gap-1 border border-[#FCA5A5]/40">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>Over Target (+{(num - max).toFixed(1)} {unit})</span>
      </span>
    );
  };

  // Live visual mini calibration gauge (Navy & Light Orange)
  const renderMiniGauge = (val: number | '', min: number, max: number) => {
    if (val === '') return null;
    const num = Number(val);
    const span = max - min;
    const padding = span * 0.4;
    const displayMin = min - padding;
    const displayMax = max + padding;
    const totalRange = displayMax - displayMin;

    const targetLeft = ((min - displayMin) / totalRange) * 100;
    const targetWidth = (span / totalRange) * 100;

    const rawPos = ((num - displayMin) / totalRange) * 100;
    const clampedPos = Math.max(3, Math.min(97, rawPos));
    const isInRange = num >= min && num <= max;

    return (
      <div className="w-full pt-1.5 space-y-1">
        <div className="relative h-2 rounded-full bg-[#E6E4DF] overflow-hidden">
          <div
            className="absolute top-0 bottom-0 bg-[#FFF2E8] border-x border-[#FCD5B5]"
            style={{ left: `${targetLeft}%`, width: `${targetWidth}%` }}
          />
          <div
            className={`absolute top-0 bottom-0 w-2.5 rounded-full -ml-1 transition-all ${
              isInRange ? 'bg-[#1B365D]' : 'bg-[#B91C1C]'
            }`}
            style={{ left: `${clampedPos}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-[#0F1E36]/50 font-mono">
          <span>{min}</span>
          <span className="font-bold text-[#EA580C]">Calibrated Band</span>
          <span>{max}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        {/* Navigation context kicker */}
        <div className="flex items-center justify-between text-xs text-[#0F1E36]/70 pb-2 border-b border-[#E6E4DF]">
          <span className="font-bold tracking-wide uppercase text-[11px] text-[#EA580C]">
            Step 2 of 3: Process Telemetry & Threshold Analysis
          </span>
          <span className="text-[#0F1E36] font-mono font-bold flex items-center gap-1.5 bg-[#FFF2E8] text-[#EA580C] px-3 py-1 rounded-lg border border-[#FCD5B5]">
            Batch: {batchId} · Engineer: {authenticatedEngineer.id}
          </span>
        </div>

        {/* Selected Batch Context Header Banner */}
        <div className="bg-white rounded-3xl border border-[#E6E4DF] p-6 card-elevation flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-xl bg-[#FAF8F5] border border-[#E6E4DF] text-[#1B365D]">
                {batchId}
              </span>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0F1E36]">
                {chemicalSpec.name}
              </h2>
            </div>
            <p className="text-xs text-[#0F1E36]/70 mt-1 font-medium">
              Product Specification: {chemicalSpec.code} · Evaluator: {authenticatedEngineer.name}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Primary Speak Measurements Button */}
            <button
              type="button"
              onClick={() => setIsVoiceModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold text-xs transition-all flex items-center gap-2 shadow-sm hover:shadow-md cursor-pointer transform hover:-translate-y-0.5"
            >
              <Mic className="w-4 h-4 text-white" />
              <span>Speak Measurements</span>
            </button>

            {/* Quick Scenario Pre-fill Tools */}
            <div className="flex flex-wrap items-center gap-1.5 pl-2 sm:border-l sm:border-[#E6E4DF]">
              <span className="text-[11px] text-[#0F1E36]/60 font-bold uppercase tracking-wider hidden lg:inline">
                Presets:
              </span>
              <button
                type="button"
                onClick={() => loadScenario('nominal')}
                className="px-2.5 py-1 text-xs font-bold rounded-xl bg-[#FAF8F5] border border-[#E6E4DF] hover:bg-[#DCFCE7] text-[#15803D] transition-all cursor-pointer shadow-2xs"
              >
                🟢 Nominal
              </button>
              <button
                type="button"
                onClick={() => loadScenario('medium')}
                className="px-2.5 py-1 text-xs font-bold rounded-xl bg-[#FAF8F5] border border-[#E6E4DF] hover:bg-[#FFF2E8] text-[#EA580C] transition-all cursor-pointer shadow-2xs"
              >
                🟡 Drift
              </button>
              <button
                type="button"
                onClick={() => loadScenario('critical')}
                className="px-2.5 py-1 text-xs font-bold rounded-xl bg-[#FAF8F5] border border-[#E6E4DF] hover:bg-[#FEE2E2] text-[#B91C1C] transition-all cursor-pointer shadow-2xs"
              >
                🔴 Excursion
              </button>
            </div>
          </div>
        </div>

        {/* Voice Input Confirmation Alert Toast */}
        {voiceAppliedNotice && (
          <div className="bg-[#DCFCE7] border border-[#86EFAC] rounded-2xl p-4 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-[#15803D] shrink-0 mt-0.5" />
              <div className="text-xs text-[#15803D] font-medium">
                <span className="font-bold">Voice Extraction Applied: </span>
                <span>{voiceAppliedNotice}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setVoiceAppliedNotice(null)}
              className="text-[#15803D] hover:text-[#0F1E36] text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Industrial Standards Disclaimer Banner */}
        <div className="bg-[#FFF2E8] border-2 border-dashed border-[#FCD5B5] rounded-2xl p-5 flex items-start gap-3.5 shadow-2xs">
          <Info className="w-5 h-5 text-[#EA580C] shrink-0 mt-0.5" />
          <div className="text-xs text-[#0F1E36] space-y-1">
            <p className="font-display font-bold text-xs uppercase tracking-wider text-[#EA580C]">
              Regulatory & Engineering Calibration Notice
            </p>
            <p className="text-[#0F1E36]/85 leading-relaxed font-medium">
              <strong>Illustrative demonstration values, not validated industrial standards.</strong> The displayed target ranges (Temperature: 82–90°C, Pressure: 4–6 bar, pH: 6–8, Mixing time: 20–40 min) serve as baseline demonstration values. In production operations, thresholds must be mathematically validated and certified against specific product formulations, vessel geometries, and QA Standard Operating Procedures.
            </p>
          </div>
        </div>

        {/* Process Entry Form */}
        <form onSubmit={handlePredictSubmit} className="space-y-6">
          {/* Section A: Core Measurements */}
          <div className="bg-white rounded-3xl border border-[#E6E4DF] card-elevation p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-[#E6E4DF] gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-[#0F1E36]">
                  1. Core In-Process Sensor Telemetry
                </h3>
                <p className="text-xs text-[#0F1E36]/70 mt-0.5">
                  Universal critical reaction controls applicable to all chemical synthesis batches.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsVoiceModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl border border-[#FCD5B5] bg-[#FFF2E8] hover:bg-[#FFE5D3] text-[#EA580C] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Mic className="w-3.5 h-3.5 text-[#EA580C]" />
                  <span>Speak Measurements</span>
                </button>

                <span className="text-xs font-mono font-bold text-[#1B365D] bg-[#EBF1F8] px-3 py-1.5 rounded-xl border border-[#1B365D]/20">
                  5 Process Sensors
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Temperature */}
              <div className="bg-[#FAF8F5] rounded-2xl border border-[#E6E4DF] p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#FFF2E8] flex items-center justify-center text-[#EA580C] border border-[#FCD5B5]">
                      <Thermometer className="w-4 h-4" />
                    </div>
                    <label className="text-xs font-bold text-[#0F1E36]">
                      Temperature (°C)
                    </label>
                  </div>
                  {getStatusBadge(temperature, 82, 90, '°C')}
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 85.5"
                    className="w-full bg-white border border-[#E6E4DF] rounded-xl px-4 py-3 text-sm font-mono font-bold text-[#0F1E36] input-focus-ring"
                    required
                  />
                  <span className="absolute right-4 top-3 text-xs font-mono text-[#0F1E36]/50 font-bold">
                    °C
                  </span>
                </div>

                {renderMiniGauge(temperature, 82, 90)}

                <div className="flex justify-between items-center text-[11px] text-[#0F1E36]/60 pt-1 border-t border-[#E6E4DF]/60">
                  <span>Target Range: <strong className="font-mono text-[#0F1E36]">82.0 – 90.0 °C</strong></span>
                  <span className="text-[10px] text-[#EA580C] font-mono font-bold">Thermocouple J1</span>
                </div>
              </div>

              {/* Pressure */}
              <div className="bg-[#FAF8F5] rounded-2xl border border-[#E6E4DF] p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#FFF2E8] flex items-center justify-center text-[#EA580C] border border-[#FCD5B5]">
                      <Gauge className="w-4 h-4" />
                    </div>
                    <label className="text-xs font-bold text-[#0F1E36]">
                      Pressure (bar)
                    </label>
                  </div>
                  {getStatusBadge(pressure, 4, 6, 'bar')}
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={pressure}
                    onChange={(e) => setPressure(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 4.8"
                    className="w-full bg-white border border-[#E6E4DF] rounded-xl px-4 py-3 text-sm font-mono font-bold text-[#0F1E36] input-focus-ring"
                    required
                  />
                  <span className="absolute right-4 top-3 text-xs font-mono text-[#0F1E36]/50 font-bold">
                    bar
                  </span>
                </div>

                {renderMiniGauge(pressure, 4, 6)}

                <div className="flex justify-between items-center text-[11px] text-[#0F1E36]/60 pt-1 border-t border-[#E6E4DF]/60">
                  <span>Target Range: <strong className="font-mono text-[#0F1E36]">4.0 – 6.0 bar</strong></span>
                  <span className="text-[10px] text-[#EA580C] font-mono font-bold">Headspace P3</span>
                </div>
              </div>

              {/* pH Value */}
              <div className="bg-[#FAF8F5] rounded-2xl border border-[#E6E4DF] p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#FFF2E8] flex items-center justify-center text-[#EA580C] border border-[#FCD5B5]">
                      <Activity className="w-4 h-4" />
                    </div>
                    <label className="text-xs font-bold text-[#0F1E36]">
                      pH Equilibrium
                    </label>
                  </div>
                  {getStatusBadge(ph, 6, 8, 'pH')}
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    value={ph}
                    onChange={(e) => setPh(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 7.1"
                    className="w-full bg-white border border-[#E6E4DF] rounded-xl px-4 py-3 text-sm font-mono font-bold text-[#0F1E36] input-focus-ring"
                    required
                  />
                  <span className="absolute right-4 top-3 text-xs font-mono text-[#0F1E36]/50 font-bold">
                    pH
                  </span>
                </div>

                {renderMiniGauge(ph, 6, 8)}

                <div className="flex justify-between items-center text-[11px] text-[#0F1E36]/60 pt-1 border-t border-[#E6E4DF]/60">
                  <span>Target Range: <strong className="font-mono text-[#0F1E36]">6.00 – 8.00 pH</strong></span>
                  <span className="text-[10px] text-[#EA580C] font-mono font-bold">Glass Probe pH-A</span>
                </div>
              </div>

              {/* Mixing Time */}
              <div className="bg-[#FAF8F5] rounded-2xl border border-[#E6E4DF] p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#FFF2E8] flex items-center justify-center text-[#EA580C] border border-[#FCD5B5]">
                      <Clock className="w-4 h-4" />
                    </div>
                    <label className="text-xs font-bold text-[#0F1E36]">
                      Mixing / Reaction Time (min)
                    </label>
                  </div>
                  {getStatusBadge(mixingTime, 20, 40, 'min')}
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    value={mixingTime}
                    onChange={(e) => setMixingTime(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 30"
                    className="w-full bg-white border border-[#E6E4DF] rounded-xl px-4 py-3 text-sm font-mono font-bold text-[#0F1E36] input-focus-ring"
                    required
                  />
                  <span className="absolute right-4 top-3 text-xs font-mono text-[#0F1E36]/50 font-bold">
                    min
                  </span>
                </div>

                {renderMiniGauge(mixingTime, 20, 40)}

                <div className="flex justify-between items-center text-[11px] text-[#0F1E36]/60 pt-1 border-t border-[#E6E4DF]/60">
                  <span>Target Range: <strong className="font-mono text-[#0F1E36]">20 – 40 min</strong></span>
                  <span className="text-[10px] text-[#EA580C] font-mono font-bold">Reaction Cycle</span>
                </div>
              </div>

              {/* Mixing Speed */}
              <div className="bg-[#FAF8F5] rounded-2xl border border-[#E6E4DF] p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#FFF2E8] flex items-center justify-center text-[#EA580C] border border-[#FCD5B5]">
                      <RotateCw className="w-4 h-4" />
                    </div>
                    <label className="text-xs font-bold text-[#0F1E36]">
                      Mixing Speed (RPM)
                    </label>
                  </div>
                  {getStatusBadge(mixingSpeed, 250, 400, 'RPM')}
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="10"
                    value={mixingSpeed}
                    onChange={(e) => setMixingSpeed(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 300"
                    className="w-full bg-white border border-[#E6E4DF] rounded-xl px-4 py-3 text-sm font-mono font-bold text-[#0F1E36] input-focus-ring"
                  />
                  <span className="absolute right-4 top-3 text-xs font-mono text-[#0F1E36]/50 font-bold">
                    RPM
                  </span>
                </div>

                {renderMiniGauge(mixingSpeed, 250, 400)}

                <div className="flex justify-between items-center text-[11px] text-[#0F1E36]/60 pt-1 border-t border-[#E6E4DF]/60">
                  <span>Target Range: <strong className="font-mono text-[#0F1E36]">250 – 400 RPM</strong></span>
                  <span className="text-[10px] text-[#EA580C] font-mono font-bold">Impeller Tachometer</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section B: Suggested Chemical-Specific Measurements */}
          <div className="bg-white rounded-3xl border border-[#E6E4DF] card-elevation p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E6E4DF]">
              <div>
                <h3 className="font-display text-lg font-bold text-[#0F1E36]">
                  2. Suggested Parameters for {chemicalSpec.name}
                </h3>
                <p className="text-xs text-[#0F1E36]/70 mt-0.5">
                  Formulation-specific physical variables configured for {chemicalSpec.category.toLowerCase()}.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-[#EA580C] bg-[#FFF2E8] px-3 py-1 rounded-lg border border-[#FCD5B5]">
                Formulation Specifics
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {chemicalSpec.suggestedThresholds.map((spec) => {
                const currentVal = secondary[spec.key];
                return (
                  <div
                    key={spec.key}
                    className="bg-[#FAF8F5] rounded-2xl border border-[#E6E4DF] p-4 sm:p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#FFF2E8] flex items-center justify-center text-[#EA580C] border border-[#FCD5B5]">
                          <Layers className="w-4 h-4" />
                        </div>
                        <label className="text-xs font-bold text-[#0F1E36]">
                          {spec.name} ({spec.unit})
                        </label>
                      </div>
                      {getStatusBadge(currentVal, spec.min, spec.max, spec.unit)}
                    </div>

                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={currentVal}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Number(e.target.value);
                          setSecondary((prev) => ({ ...prev, [spec.key]: val }));
                        }}
                        className="w-full bg-white border border-[#E6E4DF] rounded-xl px-4 py-3 text-sm font-mono font-bold text-[#0F1E36] input-focus-ring"
                      />
                      <span className="absolute right-4 top-3 text-xs font-mono text-[#0F1E36]/50 font-bold">
                        {spec.unit}
                      </span>
                    </div>

                    {renderMiniGauge(currentVal, spec.min, spec.max)}

                    <div className="flex justify-between items-center text-[11px] text-[#0F1E36]/60 pt-1 border-t border-[#E6E4DF]/60">
                      <span>Target Range: <strong className="font-mono text-[#0F1E36]">{spec.min} – {spec.max} {spec.unit}</strong></span>
                      <span className="text-[10px] text-[#EA580C] font-mono font-bold">{spec.key}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E6E4DF] text-xs text-[#0F1E36]/80 leading-relaxed">
              <strong className="text-[#0F1E36] font-bold">Process Quality Advisory: </strong>
              {chemicalSpec.sampleNotes}
            </div>
          </div>

          {formError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="font-bold">{formError}</span>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-[#E6E4DF] bg-white text-xs font-bold text-[#0F1E36] hover:bg-[#FAF8F5] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-4 h-4 text-[#1B365D]" />
              <span>Back to Batch Setup</span>
            </button>

            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#1B365D] text-white text-sm font-bold hover:bg-[#132743] focus:ring-4 focus:ring-[#1B365D]/20 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-[#FB923C]" />
              <span>Predict Quality</span>
              <ArrowRight className="w-4 h-4 text-[#FB923C]" />
            </button>
          </div>
        </form>
      </div>

      {/* Voice Input Modal */}
      <VoiceInputModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        chemicalSpec={chemicalSpec}
        currentBatchId={batchId}
        onApplyMeasurements={handleApplyVoiceMeasurements}
      />

      {/* Footer */}
      <div className="max-w-5xl mx-auto w-full pt-4 text-center">
        <p className="text-[11px] text-[#0F1E36]/50 font-mono">
          Page 2: Process Telemetry & Threshold Analysis · Chemical Batch Quality Predictor
        </p>
      </div>
    </div>
  );
};
