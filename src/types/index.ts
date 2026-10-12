export type ChemicalType =
  | 'Liquid Detergent'
  | 'Water-Treatment Formulation'
  | 'Paint or Coating Formulation'
  | 'Polymer Resin'
  | 'Fertilizer Formulation';

export interface ThresholdRange {
  key: string;
  name: string;
  min: number;
  max: number;
  unit: string;
  description: string;
  isCore?: boolean;
}

export interface ChemicalSpec {
  name: ChemicalType;
  code: string;
  category: string;
  description: string;
  processOverview: string;
  coreThresholds: {
    temperature: ThresholdRange;
    pressure: ThresholdRange;
    ph: ThresholdRange;
    mixingTime: ThresholdRange;
  };
  suggestedThresholds: ThresholdRange[];
  sampleNotes: string;
}

export interface EngineerProfile {
  id: string;
  name: string;
  role: string;
  department: string;
  passcode?: string;
  registeredDate?: string;
  faceEmbeddingVector?: number[]; // 128-dimensional biometric descriptor
  biometricConfidenceThreshold?: number;
  sessionToken?: string;
}

export interface BatchMeasurements {
  temperature: number | '';
  pressure: number | '';
  ph: number | '';
  mixingTime: number | '';
  mixingSpeed?: number | '';
  secondary: Record<string, number | ''>;
}

export type RiskLevel = 'Low' | 'Medium' | 'High';

export interface ParameterDeviation {
  key: string;
  name: string;
  enteredValue: number;
  min: number;
  max: number;
  unit: string;
  deviation: number;
  percentageOffset: number;
  direction: 'high' | 'low';
  isSevere: boolean;
}

export interface ParameterInRange {
  key: string;
  name: string;
  enteredValue: number;
  min: number;
  max: number;
  unit: string;
}

export interface AssessmentResult {
  riskLevel: RiskLevel;
  outOfRangeItems: ParameterDeviation[];
  inRangeItems: ParameterInRange[];
  explanation: string;
  suggestedNextSteps: string[];
  mlInsights: {
    simulatedPassProbability: number;
    highestRiskContributor: string;
    anomalyScore: number;
    confidenceTier: string;
  };
  timestamp: string;
  batchId: string;
  chemicalName: ChemicalType;
  engineerId: string;
  engineerName: string;
}
