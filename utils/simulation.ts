import { Bit, GlobalParams, ScenarioResult, ScenarioConfig, SimulationStep } from '../types';

export const runSimulation = (
  params: GlobalParams,
  bits: Bit[],
  scenario: ScenarioConfig
): ScenarioResult => {
  const steps: SimulationStep[] = [];
  const bitMap = new Map(bits.map((b) => [b.id, b]));
  
  // Initial State
  let currentDepth = params.depthIn;
  const targetDepth = params.depthIn + params.intervalToDrill;
  let currentTime = 0; // hours
  let currentCost = 0; // USD
  const hourlyRigCost = params.operationCostPerDay / 24;

  // Track bits used
  const bitsUsedCounter: Record<string, number> = {};
  
  // Add start point
  steps.push({
    depth: currentDepth,
    time: currentTime,
    cost: currentCost,
    activity: 'start',
  });

  let sequenceIndex = 0;

  // Use epsilon for float comparison
  const EPSILON = 1e-4;

  while (currentDepth < targetDepth - EPSILON) {
    // 1. Determine which bit to use
    // Stop if we have exhausted the defined sequence (no auto-repeat)
    if (sequenceIndex >= scenario.bitSequence.length) {
      break;
    }

    const entry = scenario.bitSequence[sequenceIndex];
    const bitId = entry.bitId;
    const bit = bitMap.get(bitId);

    if (!bit) {
      console.warn(`Bit ID ${bitId} not found in configuration, skipping.`);
      sequenceIndex++;
      continue; 
    }

    // Increment usage counter
    bitsUsedCounter[bit.name] = (bitsUsedCounter[bit.name] || 0) + 1;

    // 2. Add Bit Cost (One-time purchase per run)
    // Only add cost if it's NOT a rerun
    if (!entry.isRerun) {
      currentCost += bit.cost;
    }
    
    // 3. Calculate drilling duration for this run (use actualDistance from entry)
    const remainingDistance = targetDepth - currentDepth;
    const actualBitDistance = entry.actualDistance ?? bit.maxDistance;
    const distanceToDrill = Math.min(actualBitDistance, remainingDistance);
    
    const actualROP = entry.actualROP ?? bit.rop;
    const drillTime = distanceToDrill / actualROP;
    const drillCost = drillTime * hourlyRigCost;

    // Advance Drilling
    currentTime += drillTime;
    currentCost += drillCost;
    currentDepth += distanceToDrill;

    steps.push({
      depth: currentDepth,
      time: currentTime,
      cost: currentCost,
      activity: 'drilling',
      bitName: bit.name,
    });

    // 4. If we haven't reached TD, we must Trip and Change Bit
    // Only trip if we are not at TD and we have more bits to run (or if we just finished this bit's run)
    // Actually, if we finished the bit's max distance but not TD, we trip.
    // If we finished TD, we stop.
    if (currentDepth < targetDepth - EPSILON) {
      // Trip Out (POOH) from current depth
      // Trip In (RIH) to current depth
      const speedMph = params.tripSpeed * params.standLength;
      
      const tripOutTime = currentDepth / speedMph;
      const tripInTime = currentDepth / speedMph;
      const totalTripTime = tripOutTime + tripInTime;
      
      const circulationTime = params.circulatingHours; 

      const tripEventTime = totalTripTime + circulationTime;
      const tripEventCost = tripEventTime * hourlyRigCost;

      currentTime += tripEventTime;
      currentCost += tripEventCost;

      steps.push({
        depth: currentDepth,
        time: currentTime,
        cost: currentCost,
        activity: 'tripping',
      });
      
      // Move to next bit in sequence
      sequenceIndex++;
    }
  }

  const bitsUsedSummary = Object.entries(bitsUsedCounter).map(([name, count]) => ({ name, count }));
  const status = currentDepth >= targetDepth - EPSILON ? 'complete' : 'incomplete';

  return {
    id: scenario.id,
    name: scenario.name,
    steps,
    totalTime: currentTime,
    totalCost: currentCost,
    costPerMeter: currentCost / (currentDepth - params.depthIn || 1), // normalized to actual drilled depth
    bitsUsed: bitsUsedSummary,
    status,
  };
};