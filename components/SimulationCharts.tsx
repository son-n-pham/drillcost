import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { ScenarioResult, Bit, GlobalParams } from '../types';
import { DepthUnit, convertDepth, getUnitLabel } from '../utils/unitUtils';
import { SCENARIO_COLORS, BAR_CHART_COLORS, getScenarioColor } from '../utils/scenarioColors';

// Chart types for zoom modal
type ChartType = 'depthVsTime' | 'depthVsCost' | 'timeBreakdown' | 'costBreakdown' | null;

interface SimulationChartsProps {
  results: ScenarioResult[];
  targetDepth: number;
  isDark?: boolean;
  bits?: Bit[];
  params?: GlobalParams;
  depthUnit: DepthUnit;
  selectedForComparison?: string[];
  isCompareMode?: boolean;
}

const CustomTooltip = ({ active, payload, label, xLabel, isDark, depthUnit }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className={`p-3 border shadow-lg rounded-lg text-xs ${isDark ? 'bg-[var(--bh-surface-0)] border-[var(--bh-border)] text-[var(--bh-text)]' : 'bg-white border-slate-200 text-slate-700'}`}>
        <p className={`font-bold mb-2 ${isDark ? 'text-[var(--bh-text)]' : 'text-slate-700'}`}>
          {xLabel || 'Value'}: {typeof label === 'number' ? label.toLocaleString(undefined, { maximumFractionDigits: 0 }) : label}
        </p>
        {payload.map((p: any, index: number) => (
          <div key={`${p.name}-${index}`} style={{ color: p.color }} className="flex items-center gap-2 mb-1">
            <span className="font-medium">{p.name}:</span>
            <span>{Number(p.value).toLocaleString()} {p.unit || getUnitLabel(depthUnit)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const SimulationCharts: React.FC<SimulationChartsProps> = ({ results, targetDepth, isDark = false, bits = [], params, depthUnit, selectedForComparison = [], isCompareMode = false }) => {
  // Track if component is mounted to prevent Recharts rendering before container dimensions are calculated
  const [isMounted, setIsMounted] = useState(false);
  // Track which chart is currently zoomed
  const [zoomedChart, setZoomedChart] = useState<ChartType>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Delay chart rendering to ensure containers have valid dimensions
    const timer = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Handle closing the zoom modal
  const closeZoomModal = useCallback(() => {
    setZoomedChart(null);
  }, []);

  // Handle click outside to close modal
  const handleModalBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeZoomModal();
    }
  }, [closeZoomModal]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && zoomedChart) {
        closeZoomModal();
      }
    };
    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [zoomedChart, closeZoomModal]);

  // Get chart title based on type
  const getChartTitle = (type: ChartType): string => {
    switch (type) {
      case 'depthVsTime': return 'Depth vs. Time';
      case 'depthVsCost': return 'Depth vs. Cost';
      case 'timeBreakdown': return 'Time Breakdown by Scenario';
      case 'costBreakdown': return 'Cost Breakdown by Scenario';
      default: return '';
    }
  };

  // Calculate active scenarios for dynamic margin calculation
  const activeScenarios = results.filter(r => r.steps.length > 1);
  const scenarioCount = activeScenarios.length;

  // Optimized bottom margin for X-axis label only
  const bottomMargin = 25;

  // Transform results for charts (convert depth)
  const chartResults = useMemo(() => {
    return results.map(res => ({
      ...res,
      steps: res.steps.map(step => ({
        ...step,
        depth: convertDepth(step.depth, depthUnit)
      }))
    }));
  }, [results, depthUnit]);

  // Dynamic Y-axis width calculation based on max depth
  const maxDepth = Math.max(...chartResults.flatMap(r => r.steps.map(s => s.depth)), convertDepth(targetDepth, depthUnit));

  // Estimate width: ~8px per digit + ~15px for " m" + ~15px padding for label
  const depthDigits = Math.floor(maxDepth).toString().length;
  // e.g. "3000 m" -> 70px
  const yAxisWidth = (depthDigits * 8) + 35;

  // Compute time and cost breakdown data for stacked bar charts
  const breakdownData = useMemo(() => {
    if (!params) return [];

    const hourlyRigCost = params.operationCostPerDay / 24;
    const bitMap = new Map(bits.map(b => [b.name, b]));

    return activeScenarios.map((scenario) => {
      let drillingTime = 0;
      let flatTime = 0; // tripping + circulating
      let bitCost = 0;
      let drillingCost = 0;
      let flatTimeCost = 0;

      let prevTime = 0;
      let prevCost = 0;

      scenario.steps.forEach((step, index) => {
        if (index === 0) {
          prevTime = step.time;
          prevCost = step.cost;
          return;
        }

        const timeDelta = step.time - prevTime;
        const costDelta = step.cost - prevCost;

        if (step.activity === 'drilling') {
          // For drilling step, we need to separate bit cost from drilling cost
          // Bit cost is added at the start of each run
          const bit = step.bitName ? bitMap.get(step.bitName) : null;
          if (bit) {
            bitCost += bit.cost;
            drillingCost += costDelta - bit.cost;
          } else {
            drillingCost += costDelta;
          }
          drillingTime += timeDelta;
        } else if (step.activity === 'tripping') {
          flatTime += timeDelta;
          flatTimeCost += costDelta;
        }

        prevTime = step.time;
        prevCost = step.cost;
      });

      return {
        id: scenario.id,
        name: scenario.status === 'incomplete' ? `${scenario.name} (Incomplete)` : scenario.name,
        drillingTime,
        flatTime,
        bitCost,
        drillingCost,
        flatTimeCost,
        totalTime: scenario.totalTime,
        totalCost: scenario.totalCost,
        status: scenario.status,
      };
    });
  }, [activeScenarios, bits, params]);

  // Use shared color utilities
  const colors = SCENARIO_COLORS;
  const barColors = BAR_CHART_COLORS;


  const gridColor = isDark ? '#2a2a2a' : '#f1f5f9';
  const axisColor = isDark ? '#a0a0a0' : '#64748b';

  // Check if we should highlight (compare mode is on AND 2 scenarios are selected)
  const shouldHighlight = isCompareMode && selectedForComparison.length === 2;

  // Helper to determine if a scenario is highlighted
  const isHighlighted = (scenarioId: string) =>
    !shouldHighlight || selectedForComparison.includes(scenarioId);

  // Custom Legend Component with compare mode highlighting
  const CustomLegend = () => (
    <div className="flex flex-wrap justify-center gap-4 mt-2 px-2">
      {results.map((res, index) => {
        if (res.steps.length <= 1) return null;
        const highlighted = isHighlighted(res.id);
        return (
          <div
            key={res.id}
            className={`flex items-center gap-2 text-xs transition-opacity duration-300 ${!highlighted ? 'opacity-40' : ''}`}
          >
            <div
              className={`rounded-full transition-all duration-300 ${highlighted && shouldHighlight ? 'w-4 h-4 ring-2 ring-offset-1' : 'w-3 h-3'}`}
              style={{
                backgroundColor: colors[index % colors.length],
                ringColor: colors[index % colors.length]
              }}
            />
            <span className={`font-medium ${isDark ? 'text-[var(--bh-text-weak)]' : 'text-slate-600'} ${highlighted && shouldHighlight ? 'font-bold' : ''}`}>
              {res.name}
              {res.status === 'incomplete' && (
                <span className="text-red-500 ml-1">(Incomplete)</span>
              )}
              {highlighted && shouldHighlight && (
                <span className="ml-1 text-[var(--bh-primary)] dark:text-[var(--bh-primary)]">★</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );

  // Custom X-Axis Tick for bar charts with red incomplete marker
  const CustomBarXAxisTick = ({ x, y, payload }: any) => {
    const name = payload.value as string;
    const isIncomplete = name.includes('(Incomplete)');
    const displayName = isIncomplete ? name.replace(' (Incomplete)', '') : name;

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={10}
          textAnchor="end"
          fill={axisColor}
          fontSize={10}
          transform="rotate(-45)"
        >
          {displayName}
          {isIncomplete && (
            <tspan fill="#ef4444" fontWeight="500"> (Inc.)</tspan>
          )}
        </text>
      </g>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* Time vs Depth Chart */}
      <div
        className="bg-white dark:bg-[var(--bh-surface-0)] p-3 rounded-xl shadow-sm border border-slate-200 dark:border-[var(--bh-border)] transition-all duration-300 cursor-pointer hover:shadow-lg hover:scale-[1.01] group relative"
        onClick={() => setZoomedChart('depthVsTime')}
      >
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-[var(--bh-surface-2)] text-slate-600 dark:text-[var(--bh-text-weak)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          </div>
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-[var(--bh-text)] mb-4">Depth vs. Time</h3>
        <div className="h-[400px] w-full flex flex-col" style={{ minHeight: '400px' }}>
          <div className="flex-1 min-h-0">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart margin={{ top: 5, right: 20, left: 0, bottom: bottomMargin }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    type="number"
                    dataKey="time"
                    name="Time"
                    label={{ value: 'Time (hours)', position: 'insideBottom', offset: -5, style: { fill: axisColor, fontSize: 12, fontWeight: 500 } }}
                    tick={{ fill: axisColor, fontSize: 11 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="depth"
                    name="Depth"
                    reversed={true}
                    width={yAxisWidth}
                    domain={['dataMin', 'auto']}
                    label={{ value: `Depth (${getUnitLabel(depthUnit)})`, angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle', fill: axisColor, fontSize: 12, fontWeight: 500 } }}
                    tick={{ fill: axisColor, fontSize: 11 }}
                    tickFormatter={(value) => value.toLocaleString()}
                  />
                  <Tooltip content={<CustomTooltip xLabel="Time (hrs)" isDark={isDark} depthUnit={depthUnit} />} />
                  {chartResults.map((res, index) => {
                    if (res.steps.length <= 1) return null;
                    const highlighted = isHighlighted(res.id);
                    return (
                      <Line
                        key={res.id}
                        data={res.steps}
                        type="linear"
                        dataKey="depth"
                        name={`${res.name}${res.status === 'incomplete' ? ' (Incomplete)' : ''}`}
                        stroke={colors[index % colors.length]}
                        strokeWidth={highlighted ? (shouldHighlight ? 4 : 2) : 1}
                        strokeOpacity={highlighted ? 1 : 0.25}
                        dot={false}
                        unit={getUnitLabel(depthUnit)}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className={`text-sm ${isDark ? 'text-[var(--bh-text-weak)]' : 'text-slate-500'}`}>Loading chart...</div>
              </div>
            )}
          </div>
          <CustomLegend />
        </div>
      </div>

      {/* Depth vs Cost Chart */}
      <div
        className="bg-white dark:bg-[var(--bh-surface-0)] p-3 rounded-xl shadow-sm border border-slate-200 dark:border-[var(--bh-border)] transition-all duration-300 cursor-pointer hover:shadow-lg hover:scale-[1.01] group relative"
        onClick={() => setZoomedChart('depthVsCost')}
      >
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-[var(--bh-surface-2)] text-slate-600 dark:text-[var(--bh-text-weak)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9"></polyline>
              <polyline points="9 21 3 21 3 15"></polyline>
              <line x1="21" y1="3" x2="14" y2="10"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          </div>
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-[var(--bh-text)] mb-4">Depth vs. Cost</h3>
        <div className="h-[400px] w-full flex flex-col" style={{ minHeight: '400px' }}>
          <div className="flex-1 min-h-0">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart margin={{ top: 5, right: 20, left: 0, bottom: bottomMargin }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    type="number"
                    dataKey="cost"
                    name="Cost"
                    domain={['dataMin', 'auto']}
                    tickFormatter={(value) => (value / 1000).toLocaleString()}
                    label={{ value: 'Cumulative Cost (k$)', position: 'insideBottom', offset: -5, style: { fill: axisColor, fontSize: 12, fontWeight: 500 } }}
                    tick={{ fill: axisColor, fontSize: 11 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="depth"
                    name="Depth"
                    reversed={true}
                    width={yAxisWidth}
                    domain={['dataMin', 'auto']}
                    label={{ value: `Depth (${getUnitLabel(depthUnit)})`, angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle', fill: axisColor, fontSize: 12, fontWeight: 500 } }}
                    tick={{ fill: axisColor, fontSize: 11 }}
                    tickFormatter={(value) => value.toLocaleString()}
                  />
                  <Tooltip content={<CustomTooltip xLabel="Cost ($)" isDark={isDark} depthUnit={depthUnit} />} />
                  {chartResults.map((res, index) => {
                    if (res.steps.length <= 1) return null;
                    const highlighted = isHighlighted(res.id);
                    return (
                      <Line
                        key={res.id}
                        data={res.steps}
                        type="linear"
                        dataKey="depth"
                        name={`${res.name}${res.status === 'incomplete' ? ' (Incomplete)' : ''}`}
                        stroke={colors[index % colors.length]}
                        strokeWidth={highlighted ? (shouldHighlight ? 4 : 2) : 1}
                        strokeOpacity={highlighted ? 1 : 0.25}
                        dot={false}
                        unit={getUnitLabel(depthUnit)}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className={`text-sm ${isDark ? 'text-[var(--bh-text-weak)]' : 'text-slate-500'}`}>Loading chart...</div>
              </div>
            )}
          </div>
          <CustomLegend />
        </div>
      </div>

      {/* Time Breakdown Chart - Stacked Bar */}
      {breakdownData.length > 0 && (
        <div
          className="bg-white dark:bg-[var(--bh-surface-0)] p-3 rounded-xl shadow-sm border border-slate-200 dark:border-[var(--bh-border)] transition-all duration-300 cursor-pointer hover:shadow-lg hover:scale-[1.01] group relative"
          onClick={() => setZoomedChart('timeBreakdown')}
        >
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-[var(--bh-surface-2)] text-slate-600 dark:text-[var(--bh-text-weak)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-[var(--bh-text)] mb-4">Time Breakdown by Scenario</h3>
          <div className="h-[320px] w-full" style={{ minHeight: '320px' }}>
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={breakdownData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  layout="horizontal"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="name"
                    tick={<CustomBarXAxisTick />}
                    height={90}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fill: axisColor, fontSize: 11 }}
                    tickFormatter={(value) => value.toLocaleString()}
                    label={{ value: 'Time (hours)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: axisColor, fontSize: 12, fontWeight: 500 } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? 'var(--bh-surface-0)' : '#ffffff',
                      border: `1px solid ${isDark ? 'var(--bh-border)' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    labelStyle={{ color: isDark ? 'var(--bh-text)' : '#1e293b', fontWeight: 'bold' }}
                    formatter={(value: number, name: string) => [
                      `${value.toFixed(1)} hrs`,
                      name === 'drillingTime' ? 'Drilling Time' : 'Flat Time (Trip + Circ.)'
                    ]}
                  />
                  <Bar
                    dataKey="drillingTime"
                    stackId="time"
                    fill={barColors.drillingTime}
                    name="drillingTime"
                    radius={[0, 0, 0, 0]}
                  >
                    {breakdownData.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-drilling-${index}`}
                        fillOpacity={isHighlighted(entry.id) ? 1 : 0.25}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="flatTime"
                    stackId="time"
                    fill={barColors.flatTime}
                    name="flatTime"
                    radius={[4, 4, 0, 0]}
                  >
                    {breakdownData.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-flat-${index}`}
                        fillOpacity={isHighlighted(entry.id) ? 1 : 0.25}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className={`text-sm ${isDark ? 'text-[var(--bh-text-weak)]' : 'text-slate-500'}`}>Loading chart...</div>
              </div>
            )}
          </div>
          {/* Custom Legend - outside chart to prevent overlap */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-3 px-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: barColors.drillingTime }} />
              <span className={`text-xs font-medium ${isDark ? 'text-[var(--bh-text-weak)]' : 'text-slate-600'}`}>
                Drilling Time
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: barColors.flatTime }} />
              <span className={`text-xs font-medium ${isDark ? 'text-[var(--bh-text-weak)]' : 'text-slate-600'}`}>
                Flat Time (Trip + Circ.)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Cost Breakdown Chart - Stacked Bar */}
      {breakdownData.length > 0 && (
        <div
          className="bg-white dark:bg-[var(--bh-surface-0)] p-3 rounded-xl shadow-sm border border-slate-200 dark:border-[var(--bh-border)] transition-all duration-300 cursor-pointer hover:shadow-lg hover:scale-[1.01] group relative"
          onClick={() => setZoomedChart('costBreakdown')}
        >
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-[var(--bh-surface-2)] text-slate-600 dark:text-[var(--bh-text-weak)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-[var(--bh-text)] mb-4">Cost Breakdown by Scenario</h3>
          <div className="h-[320px] w-full" style={{ minHeight: '320px' }}>
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={breakdownData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  layout="horizontal"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="name"
                    tick={<CustomBarXAxisTick />}
                    height={90}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fill: axisColor, fontSize: 11 }}
                    tickFormatter={(value) => `${(value / 1000).toLocaleString()}k`}
                    label={{ value: 'Cost ($)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: axisColor, fontSize: 12, fontWeight: 500 } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? 'var(--bh-surface-0)' : '#ffffff',
                      border: `1px solid ${isDark ? 'var(--bh-border)' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    labelStyle={{ color: isDark ? 'var(--bh-text)' : '#1e293b', fontWeight: 'bold' }}
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = {
                        'bitCost': 'Bit Cost',
                        'drillingCost': 'Drilling Cost',
                        'flatTimeCost': 'Flat Time Cost'
                      };
                      return [`$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, labels[name] || name];
                    }}
                  />
                  <Bar
                    dataKey="bitCost"
                    stackId="cost"
                    fill={barColors.bitCost}
                    name="bitCost"
                    radius={[0, 0, 0, 0]}
                  >
                    {breakdownData.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-bit-${index}`}
                        fillOpacity={isHighlighted(entry.id) ? 1 : 0.25}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="drillingCost"
                    stackId="cost"
                    fill={barColors.drillingCost}
                    name="drillingCost"
                    radius={[0, 0, 0, 0]}
                  >
                    {breakdownData.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-drillcost-${index}`}
                        fillOpacity={isHighlighted(entry.id) ? 1 : 0.25}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="flatTimeCost"
                    stackId="cost"
                    fill={barColors.flatTimeCost}
                    name="flatTimeCost"
                    radius={[4, 4, 0, 0]}
                  >
                    {breakdownData.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-flatcost-${index}`}
                        fillOpacity={isHighlighted(entry.id) ? 1 : 0.25}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className={`text-sm ${isDark ? 'text-[var(--bh-text-weak)]' : 'text-slate-500'}`}>Loading chart...</div>
              </div>
            )}
          </div>
          {/* Custom Legend - outside chart to prevent overlap */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-3 px-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: barColors.bitCost }} />
              <span className={`text-xs font-medium ${isDark ? 'text-[var(--bh-text-weak)]' : 'text-slate-600'}`}>
                Bit Cost
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: barColors.drillingCost }} />
              <span className={`text-xs font-medium ${isDark ? 'text-[var(--bh-text-weak)]' : 'text-slate-600'}`}>
                Drilling Cost
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: barColors.flatTimeCost }} />
              <span className={`text-xs font-medium ${isDark ? 'text-[var(--bh-text-weak)]' : 'text-slate-600'}`}>
                Flat Time Cost
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Zoom Modal - using Portal to render above all other elements */}
      {zoomedChart && ReactDOM.createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={handleModalBackdropClick}
        >
          <div
            ref={modalRef}
            className="bg-white dark:bg-[var(--bh-surface-0)] rounded-2xl shadow-2xl border border-slate-200 dark:border-[var(--bh-border)] w-full max-w-5xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-[var(--bh-border)]">
              <h2 className="text-xl font-bold text-slate-800 dark:text-[var(--bh-text)]">
                {getChartTitle(zoomedChart)}
              </h2>
              <button
                onClick={closeZoomModal}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[var(--bh-surface-2)] transition-colors text-slate-500 dark:text-[var(--bh-text-weak)] hover:text-slate-700 dark:hover:text-[var(--bh-text)]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Modal Content - Larger Chart */}
            <div className="p-6">
              <div className="h-[70vh] w-full">
                {isMounted && zoomedChart === 'depthVsTime' && (
                  <>
                    <ResponsiveContainer width="100%" height="90%">
                      <LineChart margin={{ top: 20, right: 30, left: 20, bottom: bottomMargin }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis
                          type="number"
                          dataKey="time"
                          name="Time"
                          label={{ value: 'Time (hours)', position: 'insideBottom', offset: -5, style: { fill: axisColor, fontSize: 14, fontWeight: 500 } }}
                          tick={{ fill: axisColor, fontSize: 12 }}
                        />
                        <YAxis
                          type="number"
                          dataKey="depth"
                          name="Depth"
                          reversed={true}
                          width={yAxisWidth + 10}
                          domain={['dataMin', 'auto']}
                          label={{ value: `Depth (${getUnitLabel(depthUnit)})`, angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle', fill: axisColor, fontSize: 14, fontWeight: 500 } }}
                          tick={{ fill: axisColor, fontSize: 12 }}
                          tickFormatter={(value) => value.toLocaleString()}
                        />
                        <Tooltip content={<CustomTooltip xLabel="Time (hrs)" isDark={isDark} depthUnit={depthUnit} />} />
                        {chartResults.map((res, index) => {
                          if (res.steps.length <= 1) return null;
                          const highlighted = isHighlighted(res.id);
                          return (
                            <Line
                              key={res.id}
                              data={res.steps}
                              type="linear"
                              dataKey="depth"
                              name={`${res.name}${res.status === 'incomplete' ? ' (Incomplete)' : ''}`}
                              stroke={colors[index % colors.length]}
                              strokeWidth={highlighted ? (shouldHighlight ? 4 : 3) : 1.5}
                              strokeOpacity={highlighted ? 1 : 0.25}
                              dot={false}
                              unit={getUnitLabel(depthUnit)}
                            />
                          );
                        })}
                      </LineChart>
                    </ResponsiveContainer>
                    <CustomLegend />
                  </>
                )}

                {isMounted && zoomedChart === 'depthVsCost' && (
                  <>
                    <ResponsiveContainer width="100%" height="90%">
                      <LineChart margin={{ top: 20, right: 30, left: 20, bottom: bottomMargin }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis
                          type="number"
                          dataKey="cost"
                          name="Cost"
                          domain={['dataMin', 'auto']}
                          tickFormatter={(value) => (value / 1000).toLocaleString()}
                          label={{ value: 'Cumulative Cost (k$)', position: 'insideBottom', offset: -5, style: { fill: axisColor, fontSize: 14, fontWeight: 500 } }}
                          tick={{ fill: axisColor, fontSize: 12 }}
                        />
                        <YAxis
                          type="number"
                          dataKey="depth"
                          name="Depth"
                          reversed={true}
                          width={yAxisWidth + 10}
                          domain={['dataMin', 'auto']}
                          label={{ value: `Depth (${getUnitLabel(depthUnit)})`, angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle', fill: axisColor, fontSize: 14, fontWeight: 500 } }}
                          tick={{ fill: axisColor, fontSize: 12 }}
                          tickFormatter={(value) => value.toLocaleString()}
                        />
                        <Tooltip content={<CustomTooltip xLabel="Cost ($)" isDark={isDark} depthUnit={depthUnit} />} />
                        {chartResults.map((res, index) => {
                          if (res.steps.length <= 1) return null;
                          const highlighted = isHighlighted(res.id);
                          return (
                            <Line
                              key={res.id}
                              data={res.steps}
                              type="linear"
                              dataKey="depth"
                              name={`${res.name}${res.status === 'incomplete' ? ' (Incomplete)' : ''}`}
                              stroke={colors[index % colors.length]}
                              strokeWidth={highlighted ? (shouldHighlight ? 4 : 3) : 1.5}
                              strokeOpacity={highlighted ? 1 : 0.25}
                              dot={false}
                              unit={getUnitLabel(depthUnit)}
                            />
                          );
                        })}
                      </LineChart>
                    </ResponsiveContainer>
                    <CustomLegend />
                  </>
                )}

                {isMounted && zoomedChart === 'timeBreakdown' && breakdownData.length > 0 && (
                  <>
                    <ResponsiveContainer width="100%" height="85%">
                      <BarChart
                        data={breakdownData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                        layout="horizontal"
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis
                          dataKey="name"
                          tick={<CustomBarXAxisTick />}
                          height={100}
                          interval={0}
                        />
                        <YAxis
                          tick={{ fill: axisColor, fontSize: 12 }}
                          tickFormatter={(value) => value.toLocaleString()}
                          label={{ value: 'Time (hours)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: axisColor, fontSize: 14, fontWeight: 500 } }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isDark ? 'var(--bh-surface-0)' : '#ffffff',
                            border: `1px solid ${isDark ? 'var(--bh-border)' : '#e2e8f0'}`,
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}
                          labelStyle={{ color: isDark ? 'var(--bh-text)' : '#1e293b', fontWeight: 'bold' }}
                          formatter={(value: number, name: string) => [
                            `${value.toFixed(1)} hrs`,
                            name === 'drillingTime' ? 'Drilling Time' : 'Flat Time (Trip + Circ.)'
                          ]}
                        />
                        <Bar dataKey="drillingTime" stackId="time" fill={barColors.drillingTime} name="drillingTime" radius={[0, 0, 0, 0]}>
                          {breakdownData.map((entry: any, index: number) => (
                            <Cell key={`cell-drilling-${index}`} fillOpacity={isHighlighted(entry.id) ? 1 : 0.25} />
                          ))}
                        </Bar>
                        <Bar dataKey="flatTime" stackId="time" fill={barColors.flatTime} name="flatTime" radius={[4, 4, 0, 0]}>
                          {breakdownData.map((entry: any, index: number) => (
                            <Cell key={`cell-flat-${index}`} fillOpacity={isHighlighted(entry.id) ? 1 : 0.25} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-3 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: barColors.drillingTime }} />
                        <span className={`text-sm font-medium ${isDark ? 'text-[var(--bh-text-weak)]' : 'text-slate-600'}`}>Drilling Time</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: barColors.flatTime }} />
                        <span className={`text-sm font-medium ${isDark ? 'text-[var(--bh-text-weak)]' : 'text-slate-600'}`}>Flat Time (Trip + Circ.)</span>
                      </div>
                    </div>
                  </>
                )}

                {isMounted && zoomedChart === 'costBreakdown' && breakdownData.length > 0 && (
                  <>
                    <ResponsiveContainer width="100%" height="85%">
                      <BarChart
                        data={breakdownData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                        layout="horizontal"
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                        <XAxis
                          dataKey="name"
                          tick={<CustomBarXAxisTick />}
                          height={100}
                          interval={0}
                        />
                        <YAxis
                          tick={{ fill: axisColor, fontSize: 12 }}
                          tickFormatter={(value) => `${(value / 1000).toLocaleString()}k`}
                          label={{ value: 'Cost ($)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: axisColor, fontSize: 14, fontWeight: 500 } }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: isDark ? 'var(--bh-surface-0)' : '#ffffff',
                            border: `1px solid ${isDark ? 'var(--bh-border)' : '#e2e8f0'}`,
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                          }}
                          labelStyle={{ color: isDark ? 'var(--bh-text)' : '#1e293b', fontWeight: 'bold' }}
                          formatter={(value: number, name: string) => {
                            const labels: Record<string, string> = {
                              'bitCost': 'Bit Cost',
                              'drillingCost': 'Drilling Cost',
                              'flatTimeCost': 'Flat Time Cost'
                            };
                            return [`$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, labels[name] || name];
                          }}
                        />
                        <Bar dataKey="bitCost" stackId="cost" fill={barColors.bitCost} name="bitCost" radius={[0, 0, 0, 0]}>
                          {breakdownData.map((entry: any, index: number) => (
                            <Cell key={`cell-bit-${index}`} fillOpacity={isHighlighted(entry.id) ? 1 : 0.25} />
                          ))}
                        </Bar>
                        <Bar dataKey="drillingCost" stackId="cost" fill={barColors.drillingCost} name="drillingCost" radius={[0, 0, 0, 0]}>
                          {breakdownData.map((entry: any, index: number) => (
                            <Cell key={`cell-drillcost-${index}`} fillOpacity={isHighlighted(entry.id) ? 1 : 0.25} />
                          ))}
                        </Bar>
                        <Bar dataKey="flatTimeCost" stackId="cost" fill={barColors.flatTimeCost} name="flatTimeCost" radius={[4, 4, 0, 0]}>
                          {breakdownData.map((entry: any, index: number) => (
                            <Cell key={`cell-flatcost-${index}`} fillOpacity={isHighlighted(entry.id) ? 1 : 0.25} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-3 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: barColors.bitCost }} />
                        <span className={`text-sm font-medium ${isDark ? 'text-[var(--bh-text-weak)]' : 'text-slate-600'}`}>Bit Cost</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: barColors.drillingCost }} />
                        <span className={`text-sm font-medium ${isDark ? 'text-[var(--bh-text-weak)]' : 'text-slate-600'}`}>Drilling Cost</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: barColors.flatTimeCost }} />
                        <span className={`text-sm font-medium ${isDark ? 'text-[var(--bh-text-weak)]' : 'text-slate-600'}`}>Flat Time Cost</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        , document.body)}
    </div>
  );
};

export default SimulationCharts;