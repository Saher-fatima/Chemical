import {
  AssessmentResult,
  BatchMeasurements,
  ChemicalSpec,
  ParameterDeviation,
  ParameterInRange,
  RiskLevel,
} from '../types';

export function evaluateBatchQuality(
  chemical: ChemicalSpec,
  measurements: BatchMeasurements,
  batchId: string,
  engineerId: string,
  engineerName: string
): AssessmentResult {
  const outOfRangeItems: ParameterDeviation[] = [];
  const inRangeItems: ParameterInRange[] = [];

  // Check Core Parameters
  const coreParams = [
    {
      key: 'temperature',
      value: measurements.temperature,
      spec: chemical.coreThresholds.temperature,
    },
    {
      key: 'pressure',
      value: measurements.pressure,
      spec: chemical.coreThresholds.pressure,
    },
    {
      key: 'ph',
      value: measurements.ph,
      spec: chemical.coreThresholds.ph,
    },
    {
      key: 'mixingTime',
      value: measurements.mixingTime,
      spec: chemical.coreThresholds.mixingTime,
    },
  ];

  for (const item of coreParams) {
    if (typeof item.value !== 'number') continue;
    const val = item.value;
    const { min, max, unit, name, key } = item.spec;

    if (val < min) {
      const deviation = Math.abs(val - min);
      const span = max - min;
      const percentageOffset = (deviation / span) * 100;
      const isSevere = percentageOffset > 25;

      outOfRangeItems.push({
        key,
        name,
        enteredValue: val,
        min,
        max,
        unit,
        deviation: Number(deviation.toFixed(2)),
        percentageOffset: Number(percentageOffset.toFixed(1)),
        direction: 'low',
        isSevere,
      });
    } else if (val > max) {
      const deviation = Math.abs(val - max);
      const span = max - min;
      const percentageOffset = (deviation / span) * 100;
      const isSevere = percentageOffset > 25;

      outOfRangeItems.push({
        key,
        name,
        enteredValue: val,
        min,
        max,
        unit,
        deviation: Number(deviation.toFixed(2)),
        percentageOffset: Number(percentageOffset.toFixed(1)),
        direction: 'high',
        isSevere,
      });
    } else {
      inRangeItems.push({
        key,
        name,
        enteredValue: val,
        min,
        max,
        unit,
      });
    }
  }

  // Check Suggested Parameters
  for (const spec of chemical.suggestedThresholds) {
    const val = measurements.secondary[spec.key];
    if (typeof val !== 'number') continue;
    const { min, max, unit, name, key } = spec;

    if (val < min) {
      const deviation = Math.abs(val - min);
      const span = max - min;
      const percentageOffset = (deviation / span) * 100;
      const isSevere = percentageOffset > 25;

      outOfRangeItems.push({
        key,
        name,
        enteredValue: val,
        min,
        max,
        unit,
        deviation: Number(deviation.toFixed(2)),
        percentageOffset: Number(percentageOffset.toFixed(1)),
        direction: 'low',
        isSevere,
      });
    } else if (val > max) {
      const deviation = Math.abs(val - max);
      const span = max - min;
      const percentageOffset = (deviation / span) * 100;
      const isSevere = percentageOffset > 25;

      outOfRangeItems.push({
        key,
        name,
        enteredValue: val,
        min,
        max,
        unit,
        deviation: Number(deviation.toFixed(2)),
        percentageOffset: Number(percentageOffset.toFixed(1)),
        direction: 'high',
        isSevere,
      });
    } else {
      inRangeItems.push({
        key,
        name,
        enteredValue: val,
        min,
        max,
        unit,
      });
    }
  }

  // Check Mixing Speed (if provided)
  if (typeof measurements.mixingSpeed === 'number' && measurements.mixingSpeed > 0) {
    const val = measurements.mixingSpeed;
    const min = 250;
    const max = 400;
    const unit = 'RPM';
    const name = 'Mixing Speed';
    const key = 'mixingSpeed';

    if (val < min) {
      const deviation = Math.abs(val - min);
      const span = max - min;
      const percentageOffset = (deviation / span) * 100;
      const isSevere = percentageOffset > 25;

      outOfRangeItems.push({
        key,
        name,
        enteredValue: val,
        min,
        max,
        unit,
        deviation: Number(deviation.toFixed(2)),
        percentageOffset: Number(percentageOffset.toFixed(1)),
        direction: 'low',
        isSevere,
      });
    } else if (val > max) {
      const deviation = Math.abs(val - max);
      const span = max - min;
      const percentageOffset = (deviation / span) * 100;
      const isSevere = percentageOffset > 25;

      outOfRangeItems.push({
        key,
        name,
        enteredValue: val,
        min,
        max,
        unit,
        deviation: Number(deviation.toFixed(2)),
        percentageOffset: Number(percentageOffset.toFixed(1)),
        direction: 'high',
        isSevere,
      });
    } else {
      inRangeItems.push({
        key,
        name,
        enteredValue: val,
        min,
        max,
        unit,
      });
    }
  }

  // Determine Overall Risk Level
  let riskLevel: RiskLevel = 'Low';
  const outCount = outOfRangeItems.length;
  const severeCount = outOfRangeItems.filter((i) => i.isSevere).length;

  if (outCount === 0) {
    riskLevel = 'Low';
  } else if (severeCount >= 1 || outCount >= 2) {
    riskLevel = 'High';
  } else {
    // 1 mild out-of-range
    riskLevel = 'Medium';
  }

  // Generate Technical Explanation
  let explanation = '';
  if (riskLevel === 'Low') {
    explanation = `All recorded process measurements (${inRangeItems.length} parameters evaluated) are within configured baseline operating limits. Thermal equilibrium, pressure containment, and reaction residence times satisfy quality criteria for ${chemical.name}. The batch shows nominal homogeneity and low risk of downstream non-conformance.`;
  } else if (riskLevel === 'Medium') {
    const dev = outOfRangeItems[0];
    explanation = `A single operational deviation was detected in ${dev.name} (${dev.enteredValue} ${dev.unit}, target: ${dev.min}–${dev.max} ${dev.unit}, deviation: ${dev.direction === 'high' ? '+' : '-'}${dev.deviation} ${dev.unit}). While other monitored variables remained compliant, this singular drift may indicate minor kinetic variation or sensor drift requiring verification before release.`;
  } else {
    const devNames = outOfRangeItems.map((d) => d.name).join(', ');
    explanation = `Multiple or severe process excursions detected across ${devNames}. Deviations exceed acceptable tolerances for ${chemical.name}, representing a significant risk of product degradation, incomplete reaction synthesis, or off-spec physical properties. Immediate quality containment is recommended.`;
  }

  // Actionable SOP Next Steps
  const suggestedNextSteps: string[] = [];
  if (riskLevel === 'Low') {
    suggestedNextSteps.push('Clear batch for standard composite lab sampling and routine release packaging.');
    suggestedNextSteps.push('Archive in-process SCADA historian logs under batch record ' + batchId + '.');
    suggestedNextSteps.push('Proceed with scheduled vessel wash cycle before initiating subsequent run.');
  } else if (riskLevel === 'Medium') {
    const firstDev = outOfRangeItems[0];
    suggestedNextSteps.push(`Perform immediate secondary sampling from top and bottom sampling ports to confirm ${firstDev.name}.`);
    suggestedNextSteps.push(`Inspect sensor probe calibration on line transducer for ${firstDev.name} to rule out instrumentation drift.`);
    suggestedNextSteps.push(`Place batch in "Pending Quality Review" hold status prior to any transfer into bulk storage tanks.`);
    suggestedNextSteps.push(`Consult Formulation Standard Operating Procedure (SOP-${chemical.code}-REV4) for corrective buffering or adjustment guidelines.`);
  } else {
    suggestedNextSteps.push(`IMMEDIATE ACTION: Apply physical and digital QA Quarantine Hold (Status: QA-RED) on Batch ${batchId}.`);
    suggestedNextSteps.push('Do NOT pump or transfer contents into downstream holding silos or packaging lines.');
    suggestedNextSteps.push('Notify Shift Production Superintendent and Lead Formulation Chemist immediately.');
    suggestedNextSteps.push('Initiate Non-Conformance Report (NCR) and extract continuous high-frequency DCS/SCADA trend data for thermal/pressure curves.');
    suggestedNextSteps.push('Prepare representative retain sample for analytical lab gas chromatography / spectroscopy verification.');
  }

  // Simulated ML model perspective (comparing rule-based vs trained ML classifier)
  const simulatedPassProbability =
    riskLevel === 'Low'
      ? Math.round(94 + Math.random() * 4)
      : riskLevel === 'Medium'
      ? Math.round(62 + Math.random() * 12)
      : Math.round(14 + Math.random() * 15);

  const highestRiskContributor =
    outOfRangeItems.length > 0
      ? outOfRangeItems.sort((a, b) => b.percentageOffset - a.percentageOffset)[0].name
      : 'None (All variables nominal)';

  return {
    riskLevel,
    outOfRangeItems,
    inRangeItems,
    explanation,
    suggestedNextSteps,
    mlInsights: {
      simulatedPassProbability,
      highestRiskContributor,
      anomalyScore: Number(((outCount * 2.5 + severeCount * 4.0) / 10).toFixed(2)),
      confidenceTier: riskLevel === 'Low' ? 'High Confidence (98.2%)' : 'Moderate Confidence (89.5%)',
    },
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    batchId,
    chemicalName: chemical.name,
    engineerId,
    engineerName,
  };
}
