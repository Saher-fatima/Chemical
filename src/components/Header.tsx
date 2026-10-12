import React from 'react';
import { FlaskConical, ShieldCheck, LogOut, Lock, Atom } from 'lucide-react';
import { EngineerProfile } from '../types';

interface HeaderProps {
  currentStep: 'auth' | 'batch-info' | 'measurements' | 'results';
  authenticatedEngineer: EngineerProfile | null;
  onLogout: () => void;
  onNavigateStep?: (step: 'batch-info' | 'measurements' | 'results') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentStep,
  authenticatedEngineer,
  onLogout,
  onNavigateStep,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#E6E4DF] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-[#FFF2E8] flex items-center justify-center text-[#EA580C] border border-[#FCD5B5] shadow-xs">
            <Atom className="w-5 h-5 text-[#EA580C]" />
          </div>
          <div>
            <span className="font-display text-base font-bold text-[#0F1E36] tracking-tight whitespace-nowrap block">
              Chemical Batch Quality Predictor
            </span>
            <span className="text-[11px] text-[#EA580C] font-semibold tracking-wide block -mt-0.5">
              Industrial QA Intelligence System
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Steps */}
        <nav className="hidden md:flex items-center gap-2 text-xs font-medium text-[#0F1E36]/70">
          <div
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
              currentStep === 'auth'
                ? 'bg-[#FFF2E8] text-[#EA580C] font-bold border border-[#FCD5B5] shadow-xs'
                : 'text-[#0F1E36]/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#EA580C]" />
            <span>1. Face Verification</span>
          </div>

          <span className="text-[#E6E4DF] select-none">›</span>

          <button
            type="button"
            disabled={!authenticatedEngineer}
            onClick={() => onNavigateStep && onNavigateStep('batch-info')}
            className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              currentStep === 'batch-info'
                ? 'bg-[#FFF2E8] text-[#EA580C] font-bold border border-[#FCD5B5] shadow-xs'
                : authenticatedEngineer
                ? 'hover:text-[#0F1E36] text-[#0F1E36]/80 hover:bg-[#FFF2E8]/50 cursor-pointer'
                : 'text-[#0F1E36]/30 cursor-not-allowed'
            }`}
          >
            <span>2. Batch Setup</span>
          </button>

          <span className="text-[#E6E4DF] select-none">›</span>

          <button
            type="button"
            disabled={!authenticatedEngineer}
            onClick={() => onNavigateStep && onNavigateStep('measurements')}
            className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              currentStep === 'measurements'
                ? 'bg-[#FFF2E8] text-[#EA580C] font-bold border border-[#FCD5B5] shadow-xs'
                : authenticatedEngineer
                ? 'hover:text-[#0F1E36] text-[#0F1E36]/80 hover:bg-[#FFF2E8]/50 cursor-pointer'
                : 'text-[#0F1E36]/30 cursor-not-allowed'
            }`}
          >
            <span>3. Process Telemetry</span>
          </button>

          <span className="text-[#E6E4DF] select-none">›</span>

          <button
            type="button"
            disabled={!authenticatedEngineer || currentStep !== 'results'}
            onClick={() => onNavigateStep && onNavigateStep('results')}
            className={`px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
              currentStep === 'results'
                ? 'bg-[#FFF2E8] text-[#EA580C] font-bold border border-[#FCD5B5] shadow-xs'
                : authenticatedEngineer
                ? 'text-[#0F1E36]/80'
                : 'text-[#0F1E36]/30 cursor-not-allowed'
            }`}
          >
            <span>4. Risk Assessment</span>
          </button>
        </nav>

        {/* Zone 3: Engineer Status / Action */}
        <div className="flex items-center gap-3 shrink-0">
          {authenticatedEngineer ? (
            <div className="flex items-center gap-2.5 bg-white border border-[#E6E4DF] rounded-xl px-2.5 py-1.5 shadow-xs">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-[#0F1E36] leading-none">
                  {authenticatedEngineer.name}
                </span>
                <span className="text-[10px] text-[#EA580C] font-mono font-semibold leading-tight mt-0.5">
                  ID: {authenticatedEngineer.id}
                </span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-[#FFF2E8] text-[#EA580C] font-bold text-xs flex items-center justify-center border border-[#FCD5B5]">
                {authenticatedEngineer.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
              <button
                type="button"
                onClick={onLogout}
                title="Lock session & logout"
                className="p-1 rounded-lg text-[#0F1E36]/60 hover:text-[#B91C1C] hover:bg-[#FEE2E2] transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-[#0F1E36]/80 bg-white px-3 py-1.5 rounded-xl border border-[#E6E4DF] shadow-xs">
              <Lock className="w-3.5 h-3.5 text-[#1B365D]" />
              <span className="font-bold text-[11px] tracking-wide uppercase text-[#1B365D]">
                Navy Guard Secured
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
