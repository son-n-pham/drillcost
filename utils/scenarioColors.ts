/**
 * Unified scenario color palette
 * Used across scenario cards, comparison table, and charts for consistency
 */

// 12 distinct colors optimized for dark green background
export const SCENARIO_COLORS = [
  '#02BC94', // 1. Light Green (Brand Primary)
  '#FFB547', // 2. Warm Amber
  '#A78BFA', // 3. Soft Purple
  '#67E8F9', // 4. Cyan
  '#FB7185', // 5. Coral Pink
  '#FBBF24', // 6. Golden Yellow
  '#34D399', // 7. Emerald
  '#F472B6', // 8. Pink
  '#60A5FA', // 9. Sky Blue
  '#C084FC', // 10. Violet
  '#FCD34D', // 11. Sunflower
  '#2DD4BF', // 12. Teal
] as const;

/**
 * Get the color for a scenario based on its index
 * @param index - The index of the scenario in the results/scenarios array
 * @returns The hex color string
 */
export function getScenarioColor(index: number): string {
  return SCENARIO_COLORS[index % SCENARIO_COLORS.length];
}

/**
 * Stacked bar chart colors (for breakdown charts)
 */
export const BAR_CHART_COLORS = {
  drillingTime: '#02BC94',  // Green - drilling
  flatTime: '#FFB547',      // Amber - flat time
  bitCost: '#A78BFA',       // Purple - bit costs
  drillingCost: '#02BC94',  // Green - drilling cost
  flatTimeCost: '#FFB547',  // Amber - flat time cost
} as const;
