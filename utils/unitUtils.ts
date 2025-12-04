export type DepthUnit = 'm' | 'ft';

export const METERS_TO_FEET = 3.28084;

/**
 * Converts a depth value from meters to the target unit.
 * Note: The base unit in the app is always meters.
 * @param valueInMeters The value in meters
 * @param targetUnit The unit to convert to ('m' or 'ft')
 * @returns The converted value
 */
export const convertDepth = (valueInMeters: number, targetUnit: DepthUnit): number => {
  if (targetUnit === 'm') return valueInMeters;
  return valueInMeters * METERS_TO_FEET;
};

/**
 * Converts a depth value from the source unit to meters.
 * @param value The value in the source unit
 * @param sourceUnit The unit the value is currently in ('m' or 'ft')
 * @returns The value in meters
 */
export const convertDepthToMeters = (value: number, sourceUnit: DepthUnit): number => {
  if (sourceUnit === 'm') return value;
  return value / METERS_TO_FEET;
};

/**
 * Returns the label for the given unit (e.g., "m" or "ft")
 */
export const getUnitLabel = (unit: DepthUnit): string => {
  return unit;
};

/**
 * Returns the speed label for the given unit (e.g., "m/h" or "ft/h")
 */
export const getSpeedLabel = (unit: DepthUnit): string => {
  return `${unit}/h`;
};
