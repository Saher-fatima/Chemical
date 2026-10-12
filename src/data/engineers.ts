import { EngineerProfile } from '../types';

export const INITIAL_REGISTERED_ENGINEERS: EngineerProfile[] = [
  {
    id: 'QE-4091',
    name: 'Dr. Elena Vance',
    role: 'Lead Quality Assurance Engineer',
    department: 'Advanced Formulation & Reaction QA',
    passcode: '739204',
    registeredDate: '2025-11-14',
    faceEmbeddingVector: [
      0.14, -0.22, 0.58, -0.09, 0.33, 0.12, -0.41, 0.77, 
      0.05, -0.31, 0.19, -0.62, 0.44, 0.28, -0.15, 0.81,
      0.23, -0.05, 0.39, 0.18, -0.29, 0.47, 0.11, -0.36
    ],
    biometricConfidenceThreshold: 0.85,
  },
  {
    id: 'QE-8120',
    name: 'Marcus Chen',
    role: 'Senior Process Chemist',
    department: 'Continuous Flow & Polymerization Unit',
    passcode: '518492',
    registeredDate: '2026-01-20',
    faceEmbeddingVector: [
      -0.21, 0.44, -0.12, 0.65, -0.33, 0.08, 0.52, -0.19,
      0.38, 0.11, -0.49, 0.27, -0.18, 0.63, 0.04, -0.42,
      -0.09, 0.32, 0.25, -0.51, 0.14, 0.38, -0.27, 0.16
    ],
    biometricConfidenceThreshold: 0.82,
  },
  {
    id: 'QE-2933',
    name: 'Sarah Jenkins',
    role: 'Batch Inspection Specialist',
    department: 'Industrial Chemical Synthesis',
    passcode: '840165',
    registeredDate: '2026-02-08',
    faceEmbeddingVector: [
      0.35, 0.18, -0.42, 0.11, 0.59, -0.24, 0.06, 0.39,
      -0.15, 0.62, 0.28, -0.33, 0.41, -0.08, 0.53, 0.22,
      0.17, -0.44, 0.09, 0.31, -0.18, 0.52, 0.40, -0.11
    ],
    biometricConfidenceThreshold: 0.84,
  },
];
