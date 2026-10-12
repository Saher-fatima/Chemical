import { ChemicalSpec } from '../types';

/**
 * Words-to-digits dictionary for natural spoken speech numbers.
 */
const WORD_NUMBERS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
};

/**
 * Converts phrases like "eighty five", "four point five", "seventy two" into numeric values.
 */
export function wordsToNumber(text: string): number | null {
  const cleaned = text
    .toLowerCase()
    .trim()
    .replace(/-/g, ' ')
    .replace(/\band\b/g, ' ')
    .replace(/\s+/g, ' ');

  // Direct numeric match
  if (!isNaN(Number(cleaned)) && cleaned !== '') {
    return Number(cleaned);
  }

  // Handle "X point Y" (e.g., "four point five", "seven point two", "eighty five point five")
  if (cleaned.includes('point')) {
    const parts = cleaned.split('point');
    if (parts.length === 2) {
      const whole = wordsToNumber(parts[0].trim());
      const decimalStr = parts[1].trim();

      // Check decimal parts
      let decimalVal: number | null = null;
      if (!isNaN(Number(decimalStr)) && decimalStr !== '') {
        decimalVal = Number(decimalStr);
      } else if (WORD_NUMBERS[decimalStr] !== undefined) {
        decimalVal = WORD_NUMBERS[decimalStr];
      } else {
        decimalVal = wordsToNumber(decimalStr);
      }

      if (whole !== null && decimalVal !== null) {
        return Number(`${whole}.${decimalVal}`);
      }
    }
  }

  // Handle composite words like "eighty five", "three hundred"
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  let total = 0;
  let current = 0;
  let foundAny = false;

  for (const token of tokens) {
    if (!isNaN(Number(token))) {
      current += Number(token);
      foundAny = true;
    } else if (WORD_NUMBERS[token] !== undefined) {
      const val = WORD_NUMBERS[token];
      if (val === 100) {
        current = (current === 0 ? 1 : current) * 100;
      } else {
        current += val;
      }
      foundAny = true;
    }
  }

  total += current;
  return foundAny ? total : null;
}

export interface ExtractedMeasurementsResult {
  rawTranscript: string;
  batchId?: string;
  temperature: number | null;
  pressure: number | null;
  ph: number | null;
  mixingTime: number | null;
  mixingSpeed?: number | null;
  secondary: Record<string, number | null>;
  detectedFields: {
    name: string;
    key: string;
    value: number | string;
    unit: string;
    snippet: string;
  }[];
  missingCoreFields: string[];
  confidence: number;
}

/**
 * Intelligently analyzes spoken speech transcript and extracts process measurements.
 * Supports:
 * - "Batch B102, temperature 85 degrees Celsius, pressure 4.5 bar, pH 7.2, mixing speed 300 RPM, reaction time 45 minutes."
 * - "temperature is eighty-five degrees, pressure four point five bar, pH is seven point two, mixing time thirty minutes"
 */
export function extractMeasurementsFromSpeech(
  transcript: string,
  chemicalSpec: ChemicalSpec
): ExtractedMeasurementsResult {
  const normalized = transcript
    .replace(/[,\.;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let extractedBatchId: string | undefined = undefined;
  let temperature: number | null = null;
  let pressure: number | null = null;
  let ph: number | null = null;
  let mixingTime: number | null = null;
  let mixingSpeed: number | null = null;
  const secondary: Record<string, number | null> = {};

  const detectedFields: ExtractedMeasurementsResult['detectedFields'] = [];

  // 1. Batch ID extraction
  // e.g. "batch B102", "batch is B-102", "batch B 102", "batch number DET-2026-904"
  const batchRegex = /\bbatch\s*(?:id|number|is)?\s*([a-zA-Z]{1,4}\s*[-_]?\s*[0-9]{2,6}|[a-zA-Z0-9\-_]+)/i;
  const batchMatch = normalized.match(batchRegex);
  if (batchMatch && batchMatch[1]) {
    // Avoid capturing words like "temperature" if someone says "batch temperature"
    const candidate = batchMatch[1].replace(/\s+/g, '').trim();
    if (!['temperature', 'pressure', 'ph', 'mixing', 'speed', 'time'].includes(candidate.toLowerCase())) {
      extractedBatchId = candidate.toUpperCase();
      detectedFields.push({
        name: 'Batch ID',
        key: 'batchId',
        value: extractedBatchId,
        unit: 'ID',
        snippet: batchMatch[0],
      });
    }
  }

  // 2. Temperature extraction
  // Matches "temperature 85 degrees", "temp is eighty-five point five degrees celsius", "temperature 85.5 C"
  const tempRegex = /\b(?:temperature|temp)\s*(?:is)?\s*([0-9\.]+|[a-zA-Z\s\-]+?)\s*(?:degrees?|degree|deg|°c|°|celsius|c\b)/i;
  const tempMatch = normalized.match(tempRegex);
  if (tempMatch && tempMatch[1]) {
    const val = wordsToNumber(tempMatch[1].trim());
    if (val !== null) {
      temperature = Number(val.toFixed(2));
      detectedFields.push({
        name: 'Temperature',
        key: 'temperature',
        value: temperature,
        unit: '°C',
        snippet: tempMatch[0],
      });
    }
  } else {
    // Fallback: "temperature 85" (without degrees unit)
    const simpleTempRegex = /\b(?:temperature|temp)\s*(?:is)?\s*([0-9]+(?:\.[0-9]+)?)/i;
    const simpleMatch = normalized.match(simpleTempRegex);
    if (simpleMatch && simpleMatch[1]) {
      temperature = Number(parseFloat(simpleMatch[1]).toFixed(2));
      detectedFields.push({
        name: 'Temperature',
        key: 'temperature',
        value: temperature,
        unit: '°C',
        snippet: simpleMatch[0],
      });
    }
  }

  // 3. Pressure extraction
  // Matches "pressure 4.5 bar", "pressure four point five bar", "pressure is 5 bar"
  const pressureRegex = /\bpressure\s*(?:is)?\s*([0-9\.]+|[a-zA-Z\s\-]+?)\s*(?:bar|bars|psi|kpa)?(?:\s|$|,)/i;
  const pressMatch = normalized.match(pressureRegex);
  if (pressMatch && pressMatch[1]) {
    const val = wordsToNumber(pressMatch[1].trim());
    if (val !== null) {
      pressure = Number(val.toFixed(2));
      detectedFields.push({
        name: 'Pressure',
        key: 'pressure',
        value: pressure,
        unit: 'bar',
        snippet: pressMatch[0].trim(),
      });
    }
  }

  // 4. pH extraction
  // Matches "pH 7.2", "pH is seven point two", "ph value 6.8"
  const phRegex = /\b(?:ph|p\.h\.)\s*(?:value|is)?\s*([0-9\.]+|[a-zA-Z\s\-]+?)(?:\s|$|,)/i;
  const phMatch = normalized.match(phRegex);
  if (phMatch && phMatch[1]) {
    const val = wordsToNumber(phMatch[1].trim());
    if (val !== null && val >= 0 && val <= 14) {
      ph = Number(val.toFixed(2));
      detectedFields.push({
        name: 'pH Value',
        key: 'ph',
        value: ph,
        unit: 'pH',
        snippet: phMatch[0].trim(),
      });
    }
  }

  // 5. Mixing Time / Reaction Time extraction
  // Matches "mixing time 45 minutes", "reaction time 30 minutes", "time 45 minutes"
  const timeRegex = /\b(?:mixing\s*time|reaction\s*time|cycle\s*time|time)\s*(?:is)?\s*([0-9\.]+|[a-zA-Z\s\-]+?)\s*(?:minutes?|mins?|min\b)/i;
  const timeMatch = normalized.match(timeRegex);
  if (timeMatch && timeMatch[1]) {
    const val = wordsToNumber(timeMatch[1].trim());
    if (val !== null) {
      mixingTime = Number(val.toFixed(1));
      detectedFields.push({
        name: 'Mixing Time',
        key: 'mixingTime',
        value: mixingTime,
        unit: 'min',
        snippet: timeMatch[0].trim(),
      });
    }
  } else {
    // Secondary fallback for mixing time
    const simpleTime = /\bmixing\s*(?:time)?\s*(?:is)?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:minutes?|mins?|min\b)?/i;
    const sMatch = normalized.match(simpleTime);
    if (sMatch && sMatch[1]) {
      mixingTime = Number(parseFloat(sMatch[1]).toFixed(1));
      detectedFields.push({
        name: 'Mixing Time',
        key: 'mixingTime',
        value: mixingTime,
        unit: 'min',
        snippet: sMatch[0].trim(),
      });
    }
  }

  // 6. Mixing Speed (e.g., "mixing speed 300 RPM", "mixing speed three hundred rpm", "speed 300 rpm", "300 RPM")
  const speedRegex = /\b(?:mixing\s*speed|agitation\s*speed|stirring\s*speed|speed)\s*(?:is)?\s*([0-9\.]+|[a-zA-Z\s\-]+?)\s*(?:rpm|revolutions\s*per\s*minute)?(?:\s|$|,)/i;
  const speedMatch = normalized.match(speedRegex);
  if (speedMatch && speedMatch[1]) {
    const val = wordsToNumber(speedMatch[1].trim());
    if (val !== null && val > 0) {
      mixingSpeed = Math.round(val);
      detectedFields.push({
        name: 'Mixing Speed',
        key: 'mixingSpeed',
        value: mixingSpeed,
        unit: 'RPM',
        snippet: speedMatch[0].trim(),
      });
    }
  } else {
    // Fallback: "[number] RPM"
    const rpmRegex = /\b([0-9\.]+|[a-zA-Z\s\-]+?)\s*rpm\b/i;
    const rpmMatch = normalized.match(rpmRegex);
    if (rpmMatch && rpmMatch[1]) {
      const val = wordsToNumber(rpmMatch[1].trim());
      if (val !== null && val > 0) {
        mixingSpeed = Math.round(val);
        detectedFields.push({
          name: 'Mixing Speed',
          key: 'mixingSpeed',
          value: mixingSpeed,
          unit: 'RPM',
          snippet: rpmMatch[0].trim(),
        });
      }
    }
  }

  // 7. Chemical-Specific Suggested Measurements
  chemicalSpec.suggestedThresholds.forEach((spec) => {
    // Build regex based on key and name
    let specRegex: RegExp | null = null;

    if (spec.key === 'activeSurfactant') {
      specRegex = /\b(?:active\s*)?surfactant\s*(?:content|is)?\s*([0-9\.]+|[a-zA-Z\s\-]+?)\s*(?:%|percent)?(?:\s|$)/i;
    } else if (spec.key === 'viscosity' || spec.key === 'krebsViscosity') {
      specRegex = /\b(?:dynamic\s*|krebs\s*)?viscosity\s*(?:is)?\s*([0-9\.]+|[a-zA-Z\s\-]+?)\s*(?:cp|ku)?(?:\s|$)/i;
    } else if (spec.key === 'activeBiocide') {
      specRegex = /\b(?:active\s*)?(?:biocide|chlorine)\s*(?:is)?\s*([0-9\.]+|[a-zA-Z\s\-]+?)\s*(?:ppm)?(?:\s|$)/i;
    } else if (spec.key === 'dissolvedSolids') {
      specRegex = /\b(?:total\s*dissolved\s*solids|tds|dissolved\s*solids)\s*(?:is)?\s*([0-9\.]+|[a-zA-Z\s\-]+?)\s*(?:ppm)?(?:\s|$)/i;
    } else if (spec.key === 'solidsContent') {
      specRegex = /\b(?:solids\s*content|solids)\s*(?:is)?\s*([0-9\.]+|[a-zA-Z\s\-]+?)\s*(?:%|percent)?(?:\s|$)/i;
    } else if (spec.key === 'moistureContent' || spec.key === 'granuleMoisture') {
      specRegex = /\bmoisture\s*(?:content|ratio|is)?\s*([0-9\.]+|[a-zA-Z\s\-]+?)\s*(?:%|percent)?(?:\s|$)/i;
    } else if (spec.key === 'gelTime') {
      specRegex = /\bgel\s*time\s*(?:is)?\s*([0-9\.]+|[a-zA-Z\s\-]+?)\s*(?:minutes?|min)?(?:\s|$)/i;
    } else if (spec.key === 'crushingHardness') {
      specRegex = /\b(?:crush\s*strength|hardness)\s*(?:is)?\s*([0-9\.]+|[a-zA-Z\s\-]+?)\s*(?:n|newtons)?(?:\s|$)/i;
    }

    if (specRegex) {
      const match = normalized.match(specRegex);
      if (match && match[1]) {
        const val = wordsToNumber(match[1].trim());
        if (val !== null) {
          secondary[spec.key] = Number(val.toFixed(2));
          detectedFields.push({
            name: spec.name,
            key: spec.key,
            value: secondary[spec.key]!,
            unit: spec.unit,
            snippet: match[0].trim(),
          });
        }
      }
    }
  });

  // Calculate missing core fields
  const missingCoreFields: string[] = [];
  if (temperature === null) missingCoreFields.push('Temperature (°C)');
  if (pressure === null) missingCoreFields.push('Pressure (bar)');
  if (ph === null) missingCoreFields.push('pH value');
  if (mixingTime === null) missingCoreFields.push('Mixing time (min)');

  // Confidence estimation
  const coreDetectedCount = 4 - missingCoreFields.length;
  const confidence = Math.round((coreDetectedCount / 4) * 85 + (detectedFields.length > 4 ? 15 : 0));

  return {
    rawTranscript: transcript,
    batchId: extractedBatchId,
    temperature,
    pressure,
    ph,
    mixingTime,
    mixingSpeed,
    secondary,
    detectedFields,
    missingCoreFields,
    confidence,
  };
}
