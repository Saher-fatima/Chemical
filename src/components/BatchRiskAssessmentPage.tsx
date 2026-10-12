import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  ArrowLeft,
  RotateCcw,
  Printer,
  Brain,
  CheckCircle2,
  XCircle,
  FileText,
  TrendingUp,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';
import { AssessmentResult } from '../types';

interface BatchRiskAssessmentPageProps {
  assessment: AssessmentResult;
  onAdjustParameters: () => void;
  onNewBatch: () => void;
}

export const BatchRiskAssessmentPage: React.FC<BatchRiskAssessmentPageProps> = ({
  assessment,
  onAdjustParameters,
  onNewBatch,
}) => {
  const [activeTab, setActiveTab] = useState<'assessment' | 'ml-architecture'>('assessment');
  const [printSuccessNotice, setPrintSuccessNotice] = useState<boolean>(false);

  const handlePrint = () => {
    window.print();
    setPrintSuccessNotice(true);
    setTimeout(() => setPrintSuccessNotice(false), 3000);
  };

  const getRiskConfig = () => {
    switch (assessment.riskLevel) {
      case 'Low':
        return {
          title: 'Low Risk — Release Cleared',
          badgeBg: 'bg-[#DCFCE7]',
          badgeText: 'text-[#15803D]',
          borderColor: 'border-[#86EFAC]',
          icon: ShieldCheck,
          summary: 'Process measurements align within baseline tolerance bounds. Proceed with standard release protocols.',
        };
      case 'Medium':
        return {
          title: 'Medium Risk — QA Investigation Mandated',
          badgeBg: 'bg-[#FFF2E8]',
          badgeText: 'text-[#EA580C]',
          borderColor: 'border-[#FCD5B5]',
          icon: AlertTriangle,
          summary: 'Isolated operational drift observed. Secondary verification sampling and probe diagnostic required prior to lot transfer.',
        };
      case 'High':
        return {
          title: 'High Risk — Quarantine Hold Mandated',
          badgeBg: 'bg-[#FEE2E2]',
          badgeText: 'text-[#B91C1C]',
          borderColor: 'border-[#FCA5A5]',
          icon: AlertOctagon,
          summary: 'Critical multi-variable or severe kinetic excursion detected. Do NOT discharge vessel. Trigger root-cause audit under factory QA protocols.',
        };
    }
  };

  const riskConfig = getRiskConfig();
  const RiskIcon = riskConfig.icon;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        {/* Navigation context kicker */}
        <div className="flex items-center justify-between text-xs text-[#0F1E36]/70 pb-2 border-b border-[#E6E4DF]">
          <span className="font-bold tracking-wide uppercase text-[11px] text-[#EA580C]">
            Step 3 of 3: Quality Risk Assessment & Recommendations
          </span>
          <span className="text-[#0F1E36] font-mono font-bold flex items-center gap-1.5 bg-[#FFF2E8] text-[#EA580C] px-3 py-1 rounded-lg border border-[#FCD5B5]">
            Audit Time: {assessment.timestamp} · Evaluator: {assessment.engineerId}
          </span>
        </div>

        {/* Tab switch between Assessment and Machine Learning Architecture */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1.5 bg-[#FAF8F5] border border-[#E6E4DF] rounded-2xl shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab('assessment')}
              className={`px-5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'assessment'
                  ? 'bg-[#1B365D] text-white shadow-xs'
                  : 'text-[#0F1E36]/70 hover:text-[#0F1E36]'
              }`}
            >
              QA Risk Assessment
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ml-architecture')}
              className={`px-5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'ml-architecture'
                  ? 'bg-[#1B365D] text-white shadow-xs'
                  : 'text-[#0F1E36]/70 hover:text-[#0F1E36]'
              }`}
            >
              <Brain className="w-3.5 h-3.5 text-[#FB923C]" />
              <span>Future ML Classifier Architecture</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl border border-[#E6E4DF] bg-white text-xs font-bold text-[#0F1E36] hover:bg-[#FAF8F5] transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4 text-[#1B365D]" />
              <span>Print / Export Audit</span>
            </button>
          </div>
        </div>

        {printSuccessNotice && (
          <div className="p-3 rounded-2xl bg-[#FFF2E8] text-[#EA580C] text-xs font-bold flex items-center gap-2 border border-[#FCD5B5]">
            <CheckCircle2 className="w-4 h-4" />
            <span>Document dispatched to print/PDF spooler.</span>
          </div>
        )}

        {activeTab === 'assessment' ? (
          <div className="space-y-6">
            {/* Batch Risk Level Primary Banner */}
            <div
              className={`rounded-3xl border-2 ${riskConfig.borderColor} ${riskConfig.badgeBg} p-6 sm:p-8 card-elevation space-y-5`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl bg-white shadow-sm ${riskConfig.badgeText} border border-current/15`}>
                    <RiskIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] uppercase tracking-wider font-bold opacity-80 font-mono">
                        Classification Outcome
                      </span>
                      <span className="text-xs font-mono font-bold opacity-70">· Batch {assessment.batchId}</span>
                    </div>
                    <h2 className={`font-display text-2xl sm:text-3xl font-bold tracking-tight ${riskConfig.badgeText}`}>
                      {riskConfig.title}
                    </h2>
                  </div>
                </div>

                <div className="text-right sm:border-l sm:border-black/10 sm:pl-7">
                  <span className="text-[11px] block font-mono uppercase tracking-wider opacity-70 font-semibold">
                    Simulated Pass Likelihood
                  </span>
                  <span className={`font-display text-3xl sm:text-4xl font-bold font-mono ${riskConfig.badgeText}`}>
                    {assessment.mlInsights.simulatedPassProbability}%
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-[#0F1E36] leading-relaxed pt-3 border-t border-black/10 font-medium">
                {assessment.explanation}
              </p>
            </div>

            {/* Batch Metadata Header Strip */}
            <div className="bg-white rounded-3xl border border-[#E6E4DF] p-6 card-elevation grid grid-cols-2 sm:grid-cols-4 gap-5 text-xs">
              <div>
                <span className="text-[#0F1E36]/60 block text-[11px] font-bold uppercase tracking-wider">
                  Chemical Product
                </span>
                <span className="font-display font-bold text-sm text-[#0F1E36] mt-0.5 block">
                  {assessment.chemicalName}
                </span>
              </div>
              <div>
                <span className="text-[#0F1E36]/60 block text-[11px] font-bold uppercase tracking-wider">
                  Batch Identifier
                </span>
                <span className="font-mono font-bold text-sm text-[#1B365D] mt-0.5 block">
                  {assessment.batchId}
                </span>
              </div>
              <div>
                <span className="text-[#0F1E36]/60 block text-[11px] font-bold uppercase tracking-wider">
                  Quality Engineer
                </span>
                <span className="font-semibold text-sm text-[#0F1E36] mt-0.5 block">
                  {assessment.engineerName} ({assessment.engineerId})
                </span>
              </div>
              <div>
                <span className="text-[#0F1E36]/60 block text-[11px] font-bold uppercase tracking-wider">
                  Monitored Inputs
                </span>
                <span className="font-mono text-sm font-bold text-[#EA580C] mt-0.5 block">
                  {assessment.inRangeItems.length + assessment.outOfRangeItems.length} Telemetry Nodes
                </span>
              </div>
            </div>

            {/* Parameter Comparison & Deviation Table */}
            <div className="bg-white rounded-3xl border border-[#E6E4DF] card-elevation p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between pb-3.5 border-b border-[#E6E4DF]">
                <div>
                  <h3 className="font-display text-lg font-bold text-[#0F1E36]">
                    Process Measurements & Tolerance Comparison
                  </h3>
                  <p className="text-xs text-[#0F1E36]/70 mt-0.5">
                    Recorded sensor parameters evaluated against illustrative chemical thresholds.
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono font-bold">
                  <span className="flex items-center gap-1.5 text-[#15803D] bg-[#DCFCE7] px-2.5 py-1 rounded-lg border border-[#86EFAC]/40">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{assessment.inRangeItems.length} In-Range</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-[#B91C1C] bg-[#FEE2E2] px-2.5 py-1 rounded-lg border border-[#FCA5A5]/40">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{assessment.outOfRangeItems.length} Out-of-Range</span>
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-[#E6E4DF] text-[#0F1E36]/60 uppercase text-[10px] tracking-wider font-mono">
                      <th className="py-3 px-3 font-bold">Parameter</th>
                      <th className="py-3 px-3 font-bold">Configured Target</th>
                      <th className="py-3 px-3 font-bold">Recorded Value</th>
                      <th className="py-3 px-3 font-bold">Status</th>
                      <th className="py-3 px-3 font-bold text-right">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E4DF]">
                    {assessment.outOfRangeItems.map((item) => (
                      <tr key={item.key} className="bg-[#FEE2E2]/35 hover:bg-[#FEE2E2]/60 transition-colors">
                        <td className="py-3.5 px-3 font-bold text-[#0F1E36]">
                          {item.name}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[#0F1E36]/80">
                          {item.min} – {item.max} {item.unit}
                        </td>
                        <td className="py-3.5 px-3 font-mono font-bold text-[#B91C1C] text-sm">
                          {item.enteredValue} {item.unit}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#FEE2E2] text-[#B91C1C] border border-[#FCA5A5]">
                            <XCircle className="w-3 h-3" />
                            <span>{item.direction === 'high' ? 'High Excursion' : 'Low Excursion'}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-[#B91C1C]">
                          {item.direction === 'high' ? '+' : '-'}{item.deviation} {item.unit} ({item.percentageOffset}%)
                        </td>
                      </tr>
                    ))}

                    {assessment.inRangeItems.map((item) => (
                      <tr key={item.key} className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-3.5 px-3 font-semibold text-[#0F1E36]">
                          {item.name}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[#0F1E36]/70">
                          {item.min} – {item.max} {item.unit}
                        </td>
                        <td className="py-3.5 px-3 font-mono font-bold text-[#15803D] text-sm">
                          {item.enteredValue} {item.unit}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]/40">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Within Bounds</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-[#0F1E36]/50">
                          Nominal (0.0)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Suggested Investigation Next Steps (SOP Checklist) */}
            <div className="bg-white rounded-3xl border border-[#E6E4DF] card-elevation p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-[#E6E4DF]">
                <FileText className="w-5 h-5 text-[#1B365D]" />
                <h3 className="font-display text-lg font-bold text-[#0F1E36]">
                  Suggested Next Steps for Quality Engineer
                </h3>
              </div>

              <div className="space-y-3">
                {assessment.suggestedNextSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E6E4DF] text-xs text-[#0F1E36] transition-all"
                  >
                    <span className="w-6 h-6 rounded-xl bg-[#FFF2E8] text-[#EA580C] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-[#FCD5B5] shadow-2xs">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed font-semibold">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Tab 2: Educational ML Classifier Architecture Section */
          <div className="bg-white rounded-3xl border border-[#E6E4DF] card-elevation p-6 sm:p-9 space-y-7">
            <div>
              <div className="flex items-center gap-2 text-[#EA580C] font-bold text-xs uppercase tracking-wider font-mono">
                <Brain className="w-4 h-4 text-[#EA580C]" />
                <span>AI Engineering Architecture</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-[#0F1E36] mt-1.5">
                From Rule-Based Heuristics to Machine Learning Classification
              </h2>
              <p className="text-xs sm:text-sm text-[#0F1E36]/70 mt-1 leading-relaxed font-medium">
                In this prototype, we evaluated parameters using deterministic threshold rules. In industrial production, real failure modes arise from complex multi-variable interactions rather than simple isolated out-of-range counts.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E6E4DF] space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF2E8] flex items-center justify-center text-[#EA580C] border border-[#FCD5B5] shadow-xs">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h4 className="font-display text-sm font-bold text-[#0F1E36]">1. Historical Data Training</h4>
                <p className="text-xs text-[#0F1E36]/80 leading-relaxed font-medium">
                  Supervised models (XGBoost, Gradient Boosted Trees, Random Forest) are trained on 10,000+ historical batch runs correlated with actual QC lab assay certificates (viscosity, yield, impurity).
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E6E4DF] space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF2E8] flex items-center justify-center text-[#EA580C] border border-[#FCD5B5] shadow-xs">
                  <Layers className="w-5 h-5" />
                </div>
                <h4 className="font-display text-sm font-bold text-[#0F1E36]">2. Multivariate Interactions</h4>
                <p className="text-xs text-[#0F1E36]/80 leading-relaxed font-medium">
                  A batch might pass individual temperature and pressure thresholds, yet fail because slight negative pressure combined with a low mixing time creates an off-spec reaction kinetics anomaly that rules alone miss.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#E6E4DF] space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF2E8] flex items-center justify-center text-[#EA580C] border border-[#FCD5B5] shadow-xs">
                  <Cpu className="w-5 h-5" />
                </div>
                <h4 className="font-display text-sm font-bold text-[#0F1E36]">3. SHAP Explainability</h4>
                <p className="text-xs text-[#0F1E36]/80 leading-relaxed font-medium">
                  SHAP (Shapley Additive exPlanations) computes exact feature importance values, highlighting precisely which sensor or ingredient interaction drove the failure probability score.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#FFF2E8] border border-[#FCD5B5] text-xs text-[#0F1E36] space-y-1.5">
              <p className="font-display font-bold text-sm text-[#EA580C]">
                Engineering Transparency Notice
              </p>
              <p className="leading-relaxed text-[#0F1E36]/80 font-medium">
                Counting out-of-range measurements is an effective screening tool, but is never claimed as a trained AI model. This architecture roadmap provides the exact enterprise path for integrating Scikit-learn/TensorFlow model artifacts when factory dataset pipelines are established.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={onAdjustParameters}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-[#E6E4DF] bg-white text-xs font-bold text-[#0F1E36] hover:bg-[#FAF8F5] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-[#1B365D]" />
            <span>Adjust Process Measurements</span>
          </button>

          <button
            type="button"
            onClick={onNewBatch}
            className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-[#1B365D] text-white text-xs font-bold hover:bg-[#132743] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-4 h-4 text-[#FB923C]" />
            <span>Evaluate Another Batch</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-5xl mx-auto w-full pt-4 text-center">
        <p className="text-[11px] text-[#0F1E36]/50 font-mono">
          Page 3: Batch Quality Risk Assessment · Chemical Batch Quality Predictor
        </p>
      </div>
    </div>
  );
};
