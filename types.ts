export interface Bit {
  id: string;
  name: string;
  cost: number; // USD
  rop: number; // m/hr
  maxDistance: number; // m
  color: string;
  isActive: boolean;
  order: number;
}

export interface GlobalParams {
  operationCostPerDay: number; // USD/day
  tripSpeed: number; // stands/hr
  standLength: number; // m (implicit param to convert stands to meters)
  depthIn: number; // m
  intervalToDrill: number; // m
  circulatingHours: number; // hrs (changing bit and BHA)
}

export interface SimulationStep {
  depth: number; // Current depth (m)
  time: number; // Cumulative time (hrs)
  cost: number; // Cumulative cost (USD)
  activity: 'drilling' | 'tripping' | 'circulating' | 'start';
  bitName?: string;
}

export interface ScenarioResult {
  id: string;
  name: string;
  steps: SimulationStep[];
  totalTime: number; // hrs
  totalCost: number; // USD
  costPerMeter: number; // USD/m
  bitsUsed: { name: string; count: number }[];
  status: 'complete' | 'incomplete';
}

export interface ScenarioConfig {
  id: string;
  name: string;
  // A sequence of bits to use. If the sequence runs out, the last bit is repeated.
  bitSequence: string[]; // array of Bit IDs
}