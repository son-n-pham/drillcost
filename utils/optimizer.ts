import { Bit, GlobalParams, ScenarioConfig, ScenarioResult, BitSequenceEntry } from '../types';
import { runSimulation } from './simulation';

export interface OptimizationResult {
  bitSequence: BitSequenceEntry[];
  estimatedCost: number;
  estimatedTime: number;
  costPerMeter: number;
}

/**
 * Finds the optimal bit strategy to minimize total drilling cost.
 * Uses a greedy approach with cost-effectiveness scoring.
 * 
 * @param params - Global drilling parameters
 * @param bits - Available bit options
 * @param maxSequenceLength - Maximum bits to consider (default: 20)
 * @returns The optimal bit sequence and estimated metrics
 */
export function findOptimalBitStrategy(
  params: GlobalParams,
  bits: Bit[],
  maxSequenceLength: number = 20
): OptimizationResult | null {
  if (bits.length === 0 || params.intervalToDrill <= 0) {
    return null;
  }

  const hourlyRigCost = params.operationCostPerDay / 24;
  const speedMph = params.tripSpeed * params.standLength;

  /**
   * Calculate the effective cost-per-meter for a bit at a given depth.
   * This considers: bit cost, drilling time, and tripping time.
   */
  const calculateEffectiveCostPerMeter = (bit: Bit, currentDepth: number, remainingDistance: number): number => {
    const distanceToDrill = Math.min(bit.maxDistance, remainingDistance);
    if (distanceToDrill <= 0) return Infinity;

    // Bit purchase cost
    const bitCost = bit.cost;
    
    // Drilling time cost
    const drillTime = distanceToDrill / bit.rop;
    const drillCost = drillTime * hourlyRigCost;
    
    // Tripping cost (only if we need to trip after this bit)
    let tripCost = 0;
    const depthAfterDrilling = currentDepth + distanceToDrill;
    const isLastRun = remainingDistance <= bit.maxDistance;
    
    if (!isLastRun) {
      const tripOutTime = depthAfterDrilling / speedMph;
      const tripInTime = depthAfterDrilling / speedMph;
      const totalTripTime = tripOutTime + tripInTime + params.circulatingHours;
      tripCost = totalTripTime * hourlyRigCost;
    }
    
    const totalCost = bitCost + drillCost + tripCost;
    return totalCost / distanceToDrill;
  };

  // Build the optimal sequence greedily
  const optimalSequence: BitSequenceEntry[] = [];
  let currentDepth = params.depthIn;
  const targetDepth = params.depthIn + params.intervalToDrill;

  while (currentDepth < targetDepth && optimalSequence.length < maxSequenceLength) {
    const remainingDistance = targetDepth - currentDepth;
    
    // Find the bit with the best cost-per-meter for the current position
    let bestBit: Bit | null = null;
    let bestCostPerMeter = Infinity;

    for (const bit of bits) {
      const effectiveCpm = calculateEffectiveCostPerMeter(bit, currentDepth, remainingDistance);
      if (effectiveCpm < bestCostPerMeter) {
        bestCostPerMeter = effectiveCpm;
        bestBit = bit;
      }
    }

    if (!bestBit) break;

    const actualDist = Math.min(bestBit.maxDistance, remainingDistance);
    optimalSequence.push({ bitId: bestBit.id, actualDistance: actualDist });
    currentDepth += actualDist;
  }

  if (optimalSequence.length === 0) {
    return null;
  }

  // Run the actual simulation to get accurate metrics
  const tempScenario: ScenarioConfig = {
    id: 'temp-optimal',
    name: 'Optimized',
    bitSequence: optimalSequence,
  };

  const result = runSimulation(params, bits, tempScenario);

  return {
    bitSequence: optimalSequence,
    estimatedCost: result.totalCost,
    estimatedTime: result.totalTime,
    costPerMeter: result.costPerMeter,
  };
}

/**
 * Alternative exhaustive search for smaller bit sets.
 * Tries more combinations to find the true optimal solution.
 * Use this when the number of bits is small (< 5).
 */
export function findOptimalBitStrategyExhaustive(
  params: GlobalParams,
  bits: Bit[],
  maxSequenceLength: number = 15
): OptimizationResult | null {
  if (bits.length === 0 || params.intervalToDrill <= 0) {
    return null;
  }

  let bestResult: OptimizationResult | null = null;
  let bestCost = Infinity;

  // Generate candidate sequences using DFS with pruning
  const generateSequences = (
    currentSequence: BitSequenceEntry[],
    currentCapacity: number
  ) => {
    // If we've covered the interval, evaluate this sequence
    if (currentCapacity >= params.intervalToDrill) {
      const tempScenario: ScenarioConfig = {
        id: 'temp-search',
        name: 'Search',
        bitSequence: currentSequence,
      };
      const result = runSimulation(params, bits, tempScenario);
      
      if (result.totalCost < bestCost) {
        bestCost = result.totalCost;
        bestResult = {
          bitSequence: [...currentSequence],
          estimatedCost: result.totalCost,
          estimatedTime: result.totalTime,
          costPerMeter: result.costPerMeter,
        };
      }
      return;
    }

    // Pruning: if sequence is too long, stop
    if (currentSequence.length >= maxSequenceLength) {
      return;
    }

    // Try adding each bit
    for (const bit of bits) {
      currentSequence.push({ bitId: bit.id, actualDistance: bit.maxDistance });
      generateSequences(currentSequence, currentCapacity + bit.maxDistance);
      currentSequence.pop();
    }
  };

  generateSequences([], 0);

  return bestResult;
}

/**
 * Smart optimizer that chooses the best algorithm based on the problem size.
 */
export function optimizeBitStrategy(
  params: GlobalParams,
  bits: Bit[]
): OptimizationResult | null {
  // For small bit sets, use exhaustive search for true optimal
  // For larger sets, use greedy approach for performance
  if (bits.length <= 3) {
    return findOptimalBitStrategyExhaustive(params, bits, 12);
  } else {
    return findOptimalBitStrategy(params, bits, 20);
  }
}
