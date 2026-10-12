import React, { useState } from 'react';
import { Header } from './components/Header';
import { FaceVerificationPage } from './components/FaceVerificationPage';
import { BatchInfoPage } from './components/BatchInfoPage';
import { ProcessMeasurementsPage } from './components/ProcessMeasurementsPage';
import { BatchRiskAssessmentPage } from './components/BatchRiskAssessmentPage';
import {
  AssessmentResult,
  BatchMeasurements,
  ChemicalType,
  EngineerProfile,
} from './types';
import { CHEMICAL_DATABASE } from './data/chemicals';
import { evaluateBatchQuality } from './utils/riskEngine';

export default function App() {
  // Biometric Authentication & User State
  const [authenticatedEngineer, setAuthenticatedEngineer] = useState<EngineerProfile | null>(null);

  // Active step in the workflow
  const [currentStep, setCurrentStep] = useState<
    'auth' | 'batch-info' | 'measurements' | 'results'
  >('auth');

  // Batch Configuration State
  const [batchId, setBatchId] = useState<string>('DET-2026-8401');
  const [chemicalName, setChemicalName] = useState<ChemicalType>('Liquid Detergent');

  // Process Measurements State
  const [measurements, setMeasurements] = useState<BatchMeasurements>({
    temperature: 85.5,
    pressure: 4.8,
    ph: 7.1,
    mixingTime: 30,
    secondary: {
      activeSurfactant: 16.2,
      viscosity: 440,
    },
  });

  // Assessment Results State
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);

  // Auth success handler
  const handleAuthSuccess = (engineer: EngineerProfile) => {
    setAuthenticatedEngineer(engineer);
    setCurrentStep('batch-info');
  };

  // Sign out / lock session
  const handleLogout = async () => {
    if (authenticatedEngineer?.sessionToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: authenticatedEngineer.sessionToken }),
        });
      } catch {
        // Ignore logout network error
      }
    }
    setAuthenticatedEngineer(null);
    setAssessmentResult(null);
    setCurrentStep('auth');
  };

  // Step 1: Batch Details Continue
  const handleBatchInfoContinue = (newBatchId: string, newChemical: ChemicalType) => {
    setBatchId(newBatchId);
    setChemicalName(newChemical);

    // Reset default secondary measurements for newly selected chemical if changed
    const spec = CHEMICAL_DATABASE[newChemical];
    const newSecondary: Record<string, number | ''> = {};
    spec.suggestedThresholds.forEach((th) => {
      newSecondary[th.key] = Number(((th.min + th.max) / 2).toFixed(1));
    });

    setMeasurements((prev) => ({
      ...prev,
      secondary: newSecondary,
    }));

    setCurrentStep('measurements');
  };

  // Step 2: Run Quality Prediction
  const handlePredictQuality = (newMeasurements: BatchMeasurements) => {
    setMeasurements(newMeasurements);
    const spec = CHEMICAL_DATABASE[chemicalName];
    const result = evaluateBatchQuality(
      spec,
      newMeasurements,
      batchId,
      authenticatedEngineer?.id || 'QE-UNVERIFIED',
      authenticatedEngineer?.name || 'Authorized Engineer'
    );
    setAssessmentResult(result);
    setCurrentStep('results');
  };

  // Step navigation (strict gatekeeping: cannot leave 'auth' if not authenticated)
  const handleNavigateStep = (step: 'batch-info' | 'measurements' | 'results') => {
    if (!authenticatedEngineer) {
      setCurrentStep('auth');
      return;
    }
    setCurrentStep(step);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#0F1E36] flex flex-col font-sans selection:bg-[#FFF2E8] selection:text-[#EA580C]">
      {/* Top Bar Navigation */}
      <Header
        currentStep={currentStep}
        authenticatedEngineer={authenticatedEngineer}
        onLogout={handleLogout}
        onNavigateStep={handleNavigateStep}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Strict Gatekeeper: if not authenticated, always render FaceVerificationPage */}
        {(!authenticatedEngineer || currentStep === 'auth') && (
          <FaceVerificationPage
            onVerificationSuccess={handleAuthSuccess}
          />
        )}

        {authenticatedEngineer && currentStep === 'batch-info' && (
          <BatchInfoPage
            authenticatedEngineer={authenticatedEngineer}
            initialBatchId={batchId}
            initialChemical={chemicalName}
            onContinue={handleBatchInfoContinue}
          />
        )}

        {authenticatedEngineer && currentStep === 'measurements' && (
          <ProcessMeasurementsPage
            authenticatedEngineer={authenticatedEngineer}
            batchId={batchId}
            chemicalName={chemicalName}
            initialMeasurements={measurements}
            onBack={() => setCurrentStep('batch-info')}
            onPredict={handlePredictQuality}
            onUpdateBatchId={(newId) => setBatchId(newId)}
          />
        )}

        {authenticatedEngineer && currentStep === 'results' && assessmentResult && (
          <BatchRiskAssessmentPage
            assessment={assessmentResult}
            onAdjustParameters={() => setCurrentStep('measurements')}
            onNewBatch={() => setCurrentStep('batch-info')}
          />
        )}
      </main>
    </div>
  );
}
