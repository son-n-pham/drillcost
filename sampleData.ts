import { Bit, GlobalParams, ScenarioConfig } from './types';

export const SAMPLE_PARAMS: GlobalParams = {
  operationCostPerDay: 100000,
  tripSpeed: 12,
  standLength: 28,
  depthIn: 2000,
  intervalToDrill: 1200,
  circulatingHours: 2,
};

export const SAMPLE_BITS: Bit[] = [
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

export const SAMPLE_SCENARIOS: ScenarioConfig[] = [
  {
    id: 'scenario-1',
    name: 'Scenario 1: Type B then A',
    bitSequence: ['type-b', 'type-b', 'type-b'],
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
