import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;
let modelLoadingPromise: Promise<boolean> | null = null;

/**
 * Loads the face detection, landmark, and recognition neural network models.
 */
export async function loadFaceModels(): Promise<boolean> {
  if (modelsLoaded) return true;
  if (modelLoadingPromise) return modelLoadingPromise;

  modelLoadingPromise = (async () => {
    try {
      // Use local models hosted in /models (copied from face-api package)
      const MODEL_URL = '/models';

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);

      modelsLoaded = true;
      console.log('Face-api neural network models loaded successfully.');
      return true;
    } catch (err) {
      console.warn('Failed loading local models, attempting fallback model URL...', err);
      try {
        // Fallback to jsdelivr CDN if local models fail
        const CDN_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(CDN_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(CDN_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(CDN_URL),
        ]);
        modelsLoaded = true;
        return true;
      } catch (cdnErr) {
        console.error('All model loading attempts failed:', cdnErr);
        return false;
      }
    }
  })();

  return modelLoadingPromise;
}

export interface DetectedFaceResult {
  detected: boolean;
  score: number;
  box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  descriptor?: number[]; // 128-dimensional facial embedding vector
  landmarks?: { x: number; y: number }[];
  message?: string;
}

/**
 * Detects face from an HTMLVideoElement, HTMLCanvasElement, or HTMLImageElement
 * and extracts the 128-dimensional biometric descriptor.
 */
export async function detectFaceAndExtractDescriptor(
  input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement
): Promise<DetectedFaceResult> {
  try {
    const isLoaded = await loadFaceModels();
    if (!isLoaded) {
      return {
        detected: false,
        score: 0,
        message: 'Neural network models not ready yet. Please retry in a moment.',
      };
    }

    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 320,
      scoreThreshold: 0.4,
    });

    const detection = await faceapi
      .detectSingleFace(input, options)
      .withFaceLandmarks(true)
      .withFaceDescriptor();

    if (!detection) {
      return {
        detected: false,
        score: 0,
        message: 'No face detected in video frame. Please center your face in the reticle with adequate lighting.',
      };
    }

    const box = {
      x: Math.round(detection.detection.box.x),
      y: Math.round(detection.detection.box.y),
      width: Math.round(detection.detection.box.width),
      height: Math.round(detection.detection.box.height),
    };

    // Extract 128D vector
    const descriptorArray = Array.from(detection.descriptor);

    const landmarks = detection.landmarks.positions.map((p) => ({
      x: Math.round(p.x),
      y: Math.round(p.y),
    }));

    return {
      detected: true,
      score: Number(detection.detection.score.toFixed(3)),
      box,
      descriptor: descriptorArray,
      landmarks,
      message: 'Face detected and 128D biometric template extracted.',
    };
  } catch (err) {
    console.error('Error during face detection:', err);
    return {
      detected: false,
      score: 0,
      message: 'Computer vision processing encountered an unexpected error: ' + (err as Error).message,
    };
  }
}

/**
 * Computes Euclidean Distance (L2 norm) between two 128D face descriptors.
 * In face recognition, standard threshold is ~0.50 - 0.55.
 * Distance <= 0.50 signifies a match; > 0.50 signifies a different face.
 */
export function computeEuclideanDistance(desc1: number[], desc2: number[]): number {
  if (desc1.length !== desc2.length || desc1.length === 0) {
    return 1.0;
  }
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    const diff = desc1[i] - desc2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Converts Euclidean Distance into a human-readable similarity percentage.
 * At distance 0.0 -> 100% match.
 * At distance 0.50 -> ~75% match (threshold cutoff).
 * At distance >= 1.0 -> 0% match.
 */
export function distanceToConfidencePercentage(distance: number): number {
  const confidence = Math.max(0, Math.min(100, (1 - distance / 0.8) * 100));
  return Number(confidence.toFixed(1));
}
