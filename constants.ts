import { Bit, GlobalParams, ScenarioConfig } from './types';

export const DEFAULT_GLOBAL_PARAMS: GlobalParams = {
  operationCostPerDay: 100000,
  tripSpeed: 12,
  standLength: 28, // Standard range 2 stand approx 27-29m. Assuming 28m for calc.
  depthIn: 2000,
  intervalToDrill: 1200,
  circulatingHours: 2,
};

export const DEFAULT_BITS: Bit[] = [
  {
    id: 'type-a',
    name: 'Type A',
    cost: 15000,
    rop: 5,
    maxDistance: 150,
    color: '#3b82f6', // blue-500
  },
  {
    id: 'type-b',
    name: 'Type B',
    cost: 25000,
    rop: 5,
    maxDistance: 450,
    color: '#10b981', // emerald-500
  },
];

export const DEFAULT_SCENARIOS: ScenarioConfig[] = [
  {
    id: 'scenario-1',
    name: 'Scenario 1: Type B then A',
    // 3 Type B (450*3 > 1200) covers it
    bitSequence: ['type-b', 'type-b', 'type-a'], 
  },
  {
    id: 'scenario-2',
    name: 'Scenario 2: All Type A',
    // Start with a few, but leave it incomplete to demonstrate feature
    bitSequence: ['type-a', 'type-a', 'type-a'],
  },
];

// Initial state uses sample data so users can see how the app works
export const INITIAL_GLOBAL_PARAMS: GlobalParams = {
  operationCostPerDay: 10000,
  tripSpeed: 12,
  standLength: 28,
  depthIn: 2000,
  intervalToDrill: 1200,
  circulatingHours: 2,
};

export const INITIAL_BITS: Bit[] = [
  {
    id: 'type-a',
    name: 'Type A',
    cost: 15000,
    rop: 5,
    maxDistance: 150,
    color: '#3b82f6',
  },
  {
    id: 'type-b',
    name: 'Type B',
    cost: 25000,
    rop: 5,
    maxDistance: 450,
    color: '#10b981',
  },
];

export const INITIAL_SCENARIOS: ScenarioConfig[] = [
  {
    id: 'scenario-1',
    name: 'Scenario 1: Type B then A',
    bitSequence: ['type-b', 'type-b', 'type-a'],
  },
  {
    id: 'scenario-2',
    name: 'Scenario 2: All Type A',
    bitSequence: ['type-a', 'type-a', 'type-a'],
  },
  {
    id: 'scen-1764763934621',
    name: 'Scenario 3',
    bitSequence: ['type-a', 'type-b', 'type-a', 'type-b'],
  },
];