import React, { useState } from 'react';
import {
  FlaskConical,
  Sparkles,
  ArrowRight,
  CheckCircle,
  FileSpreadsheet,
  Droplets,
  Waves,
  Paintbrush,
  Boxes,
  Sprout,
  ShieldCheck,
} from 'lucide-react';
import { ChemicalType, EngineerProfile } from '../types';
import { CHEMICAL_DATABASE, CHEMICAL_OPTIONS } from '../data/chemicals';

interface BatchInfoPageProps {
  authenticatedEngineer: EngineerProfile;
  initialBatchId: string;
  initialChemical: ChemicalType;
  onContinue: (batchId: string, chemical: ChemicalType) => void;
}

export const BatchInfoPage: React.FC<BatchInfoPageProps> = ({
  authenticatedEngineer,
  initialBatchId,
  initialChemical,
  onContinue,
}) => {
  const [batchId, setBatchId] = useState<string>(initialBatchId || 'BAT-2026-904');
  const [selectedChemical, setSelectedChemical] = useState<ChemicalType>(initialChemical);
  const [batchIdError, setBatchIdError] = useState<string>('');

  const chemicalSpec = CHEMICAL_DATABASE[selectedChemical];

  const handleGenerateFreshId = () => {
    const prefix = chemicalSpec.code.split('-')[1] || 'BAT';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setBatchId(`${prefix}-2026-${randomNum}`);
    setBatchIdError('');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchId.trim()) {
      setBatchIdError('Please enter a valid Batch ID or generate one.');
      return;
    }
    onContinue(batchId.trim(), selectedChemical);
  };

  const getChemicalIcon = (name: ChemicalType) => {
    switch (name) {
      case 'Liquid Detergent':
        return <Droplets className="w-5 h-5" />;
      case 'Water-Treatment Formulation':
        return <Waves className="w-5 h-5" />;
      case 'Paint or Coating Formulation':
        return <Paintbrush className="w-5 h-5" />;
      case 'Polymer Resin':
        return <Boxes className="w-5 h-5" />;
      case 'Fertilizer Formulation':
        return <Sprout className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Navigation context banner */}
        <div className="flex items-center justify-between text-xs text-[#0F1E36]/70 pb-2 border-b border-[#E6E4DF]">
          <span className="font-bold tracking-wide uppercase text-[11px] text-[#EA580C]">
            Step 1 of 3: Production Batch Setup
          </span>
          <span className="text-[#0F1E36] font-mono font-bold flex items-center gap-1.5 bg-[#FFF2E8] text-[#EA580C] px-3 py-1 rounded-lg border border-[#FCD5B5]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#EA580C]" />
            Verified: {authenticatedEngineer.id} ({authenticatedEngineer.name})
          </span>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl border border-[#E6E4DF] card-elevation p-6 sm:p-8 space-y-7">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F1E36] tracking-tight">
              Production Batch Profile
            </h1>
            <p className="text-xs sm:text-sm text-[#0F1E36]/70 mt-1 leading-relaxed">
              Define the manufacturing lot identifier and choose the chemical formulation to configure calibrated tolerance matrices.
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Quality Engineer ID (Locked to verified session) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#0F1E36] uppercase tracking-wider">
                  Quality Engineer ID
                </label>
                <div className="flex items-center gap-3 bg-[#FAF8F5] border border-[#E6E4DF] rounded-2xl px-4 py-3 shadow-inner">
                  <div className="w-9 h-9 rounded-xl bg-[#FFF2E8] flex items-center justify-center text-[#EA580C] font-bold text-xs border border-[#FCD5B5] shadow-xs">
                    QE
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-mono font-bold text-[#0F1E36]">
                      {authenticatedEngineer.id}
                    </div>
                    <div className="text-[11px] text-[#0F1E36]/70 font-medium">
                      {authenticatedEngineer.name} · {authenticatedEngineer.role}
                    </div>
                  </div>
                  <div className="text-[11px] bg-[#FFF2E8] text-[#EA580C] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 border border-[#FCD5B5]">
                    <CheckCircle className="w-3.5 h-3.5 text-[#EA580C]" />
                    <span>Verified</span>
                  </div>
                </div>
                <p className="text-[11px] text-[#0F1E36]/50">
                  Cryptographically bonded to active biometric session.
                </p>
              </div>

              {/* Batch ID Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#0F1E36] uppercase tracking-wider">
                    Batch Identifier
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateFreshId}
                    className="text-[11px] text-[#EA580C] hover:text-[#C2410C] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate New ID</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={batchId}
                    onChange={(e) => {
                      setBatchId(e.target.value);
                      setBatchIdError('');
                    }}
                    placeholder="e.g. DET-2026-904"
                    className="w-full bg-white border border-[#E6E4DF] rounded-2xl px-4 py-3 text-sm font-mono font-bold text-[#0F1E36] input-focus-ring shadow-xs"
                    required
                  />
                </div>

                {batchIdError ? (
                  <p className="text-xs text-rose-600 font-bold">{batchIdError}</p>
                ) : (
                  <p className="text-[11px] text-[#0F1E36]/50 font-mono">
                    Lot format: [PRODUCT-CODE]-[YEAR]-[LOT#]
                  </p>
                )}
              </div>
            </div>

            {/* Chemical Formulation Selection */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-[#0F1E36] uppercase tracking-wider">
                Select Chemical Formulation
              </label>

              {/* Interactive Visual Formulation Selector Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {CHEMICAL_OPTIONS.map((chem) => {
                  const isSelected = selectedChemical === chem;
                  return (
                    <button
                      key={chem}
                      type="button"
                      onClick={() => setSelectedChemical(chem)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                        isSelected
                          ? 'bg-[#FFF2E8] border-[#EA580C] shadow-sm text-[#0F1E36]'
                          : 'bg-[#FAF8F5] border-[#E6E4DF] hover:bg-white text-[#0F1E36]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-white text-[#EA580C] shadow-xs border border-[#FCD5B5]'
                              : 'bg-white text-[#1B365D] border border-[#E6E4DF]'
                          }`}
                        >
                          {getChemicalIcon(chem)}
                        </div>
                        {isSelected && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#EA580C]" />
                        )}
                      </div>
                      <div>
                        <span className="font-display font-bold text-xs block leading-snug">
                          {chem}
                        </span>
                        <span className="text-[10px] text-[#0F1E36]/60 font-mono block mt-0.5 font-semibold">
                          {CHEMICAL_DATABASE[chem].code}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Chemical Specification Overview Panel */}
              <div className="mt-4 bg-[#FAF8F5] border border-[#E6E4DF] rounded-2xl p-5 space-y-3.5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FFF2E8] flex items-center justify-center text-[#EA580C] border border-[#FCD5B5] shadow-xs">
                      {getChemicalIcon(chemicalSpec.name)}
                    </div>
                    <div>
                      <h4 className="font-display text-base font-bold text-[#0F1E36]">
                        {chemicalSpec.name}
                      </h4>
                      <p className="text-[11px] font-mono text-[#EA580C] font-bold">
                        Specification: {chemicalSpec.code} · {chemicalSpec.category}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] bg-[#FFF2E8] text-[#EA580C] px-3 py-1 rounded-lg font-bold border border-[#FCD5B5]">
                    Threshold Matrix Active
                  </span>
                </div>

                <p className="text-xs text-[#0F1E36]/80 leading-relaxed font-medium">
                  {chemicalSpec.description}
                </p>

                <div className="pt-3 border-t border-[#E6E4DF] flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#0F1E36]/70 gap-2">
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-[#1B365D]" />
                    <span className="font-semibold">Reactor Dynamics: {chemicalSpec.processOverview}</span>
                  </span>
                  <span className="text-[#1B365D] font-mono font-bold">
                    4 Core Tolerances + 2 Suggested Metrics
                  </span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-[#E6E4DF]">
              <button
                type="submit"
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#1B365D] text-white text-sm font-bold hover:bg-[#132743] focus:ring-4 focus:ring-[#1B365D]/20 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Continue to Process Measurements</span>
                <ArrowRight className="w-4 h-4 text-[#FB923C]" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto w-full pt-4 text-center">
        <p className="text-[11px] text-[#0F1E36]/50 font-mono">
          Page 1: Batch Setup & Formulation Configuration · Chemical Batch Quality Predictor
        </p>
      </div>
    </div>
  );
};
