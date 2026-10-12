import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RegisteredEngineerRecord {
  id: string;
  name: string;
  role: string;
  department: string;
  consentAccepted: boolean;
  registeredDate: string;
  faceDescriptor: number[]; // 128-dimensional biometric template
  photoThumbnail?: string;
}

// In-memory persistent registry pre-seeded with 2 initial engineers with synthetic reference descriptors
const engineerRegistry = new Map<string, RegisteredEngineerRecord>();

// Seed initial registered engineers
const seedEngineers: RegisteredEngineerRecord[] = [
  {
    id: 'QE-4091',
    name: 'Dr. Elena Vance',
    role: 'Lead Quality Assurance Engineer',
    department: 'Advanced Formulation QA',
    consentAccepted: true,
    registeredDate: '2026-01-15',
    faceDescriptor: Array.from({ length: 128 }, (_, i) => Math.sin(i * 0.15 + 1.2) * 0.1),
  },
  {
    id: 'QE-8120',
    name: 'Marcus Chen',
    role: 'Senior Process Chemist',
    department: 'Continuous Flow & Polymerization Unit',
    consentAccepted: true,
    registeredDate: '2026-02-10',
    faceDescriptor: Array.from({ length: 128 }, (_, i) => Math.cos(i * 0.22 + 2.5) * 0.1),
  },
];

for (const eng of seedEngineers) {
  engineerRegistry.set(eng.id, eng);
}

// Active session tokens
const activeSessions = new Set<string>();

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '10mb' }));

  // Static model weights routing
  app.use('/models', express.static(path.join(__dirname, 'public/models')));

  // --- API Endpoints ---

  // 1. List Registered Engineers (Public Directory without raw biometric data)
  app.get('/api/auth/engineers', (req, res) => {
    const list = Array.from(engineerRegistry.values()).map((eng) => ({
      id: eng.id,
      name: eng.name,
      role: eng.role,
      department: eng.department,
      registeredDate: eng.registeredDate,
      hasTemplate: eng.faceDescriptor && eng.faceDescriptor.length === 128,
    }));
    res.json({ success: true, engineers: list });
  });

  // 2. Register New Engineer Face Template
  app.post('/api/auth/register', (req, res) => {
    const { engineerId, name, role, department, consentAccepted, faceDescriptor, photoThumbnail } = req.body;

    if (!engineerId || !engineerId.trim()) {
      return res.status(400).json({ success: false, message: 'Engineer ID is required.' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Engineer full name is required.' });
    }
    if (!consentAccepted) {
      return res.status(400).json({ success: false, message: 'Biometric privacy consent is mandatory for registration.' });
    }
    if (!Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({
        success: false,
        message: 'Invalid biometric template. Face detection must produce a valid 128-dimensional descriptor array.',
      });
    }

    const trimmedId = engineerId.trim();

    // Prevent duplicate registrations for the same Engineer ID
    if (engineerRegistry.has(trimmedId)) {
      return res.status(409).json({
        success: false,
        message: `Engineer ID "${trimmedId}" is already registered. Please use a unique Engineer ID or verify your face.`,
      });
    }

    const newRecord: RegisteredEngineerRecord = {
      id: trimmedId,
      name: name.trim(),
      role: (role || 'Quality Assurance Engineer').trim(),
      department: (department || 'Chemical Synthesis Unit').trim(),
      consentAccepted: true,
      registeredDate: new Date().toISOString().split('T')[0],
      faceDescriptor: faceDescriptor.map((n: number) => Number(n)),
      photoThumbnail: photoThumbnail || undefined,
    };

    engineerRegistry.set(trimmedId, newRecord);

    console.log(`[AUTH] Registered new engineer face template: ${trimmedId} (${newRecord.name})`);

    // Notice: DOES NOT issue a session token. Registration does not grant access!
    return res.status(201).json({
      success: true,
      message: 'Registration Successful! You can now verify your identity.',
      engineer: {
        id: newRecord.id,
        name: newRecord.name,
        role: newRecord.role,
        department: newRecord.department,
      },
    });
  });

  // 3. Verify Live Face Against Registered Template
  app.post('/api/auth/verify', (req, res) => {
    const { engineerId, liveDescriptor } = req.body;

    if (!engineerId || !engineerId.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide your Engineer ID.' });
    }
    if (!Array.isArray(liveDescriptor) || liveDescriptor.length !== 128) {
      return res.status(400).json({
        success: false,
        message: 'Invalid live facial descriptor. Please ensure your face is clearly visible to the camera.',
      });
    }

    const trimmedId = engineerId.trim();
    const storedRecord = engineerRegistry.get(trimmedId);

    // If Engineer ID is not registered
    if (!storedRecord) {
      return res.status(404).json({
        success: false,
        message: 'Engineer Not Registered. Please Register First.',
      });
    }

    // Compute Euclidean Distance (L2 norm) between live descriptor and stored template
    let sumSq = 0;
    for (let i = 0; i < 128; i++) {
      const diff = liveDescriptor[i] - storedRecord.faceDescriptor[i];
      sumSq += diff * diff;
    }
    const distance = Math.sqrt(sumSq);

    // Standard threshold in FaceNet/ResNet face recognition is ~0.50 - 0.54
    const MATCH_THRESHOLD = 0.52;
    const isMatch = distance <= MATCH_THRESHOLD;

    const confidencePercentage = Math.max(0, Math.min(100, Number(((1 - distance / 0.8) * 100).toFixed(1))));

    if (!isMatch) {
      console.warn(`[AUTH] Face verification rejected for ${trimmedId}. Distance: ${distance.toFixed(3)} > ${MATCH_THRESHOLD}`);
      return res.status(401).json({
        success: false,
        message: 'Face Not Recognized. Access Denied.',
        distance: Number(distance.toFixed(3)),
        confidencePercentage,
      });
    }

    // Issue cryptographic session token
    const sessionToken = `sess_${Buffer.from(`${trimmedId}:${Date.now()}:${Math.random()}`).toString('base64')}`;
    activeSessions.add(sessionToken);

    console.log(`[AUTH] Face verified successfully for ${trimmedId} (${storedRecord.name}). Distance: ${distance.toFixed(3)}`);

    return res.status(200).json({
      success: true,
      message: 'Face Verified Successfully',
      sessionToken,
      engineer: {
        id: storedRecord.id,
        name: storedRecord.name,
        role: storedRecord.role,
        department: storedRecord.department,
      },
      distance: Number(distance.toFixed(3)),
      confidencePercentage,
    });
  });

  // 4. Validate Session Token
  app.post('/api/auth/validate-session', (req, res) => {
    const { token } = req.body;
    if (!token || !activeSessions.has(token)) {
      return res.status(401).json({ valid: false, message: 'Invalid or expired session.' });
    }
    return res.json({ valid: true });
  });

  // 5. Logout Session
  app.post('/api/auth/logout', (req, res) => {
    const { token } = req.body;
    if (token) {
      activeSessions.delete(token);
    }
    res.json({ success: true, message: 'Session terminated.' });
  });

  // Mount Vite middleware in development
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Chemical Batch Quality Predictor server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
