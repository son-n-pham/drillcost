import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { ScenarioResult } from '../types';

interface SimulationChartsProps {
  results: ScenarioResult[];
  targetDepth: number;
  isDark?: boolean;
}

const CustomTooltip = ({ active, payload, label, xLabel, isDark }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className={`p-3 border shadow-lg rounded-lg text-xs ${isDark ? 'bg-[var(--bh-surface-0)] border-[var(--bh-border)] text-[var(--bh-text)]' : 'bg-white border-slate-200 text-slate-700'}`}>
        <p className={`font-bold mb-2 ${isDark ? 'text-[var(--bh-text)]' : 'text-slate-700'}`}>
           {xLabel || 'Value'}: {typeof label === 'number' ? label.toLocaleString(undefined, { maximumFractionDigits: 0 }) : label}
        </p>
        {payload.map((p: any) => (
          <div key={p.name} style={{ color: p.color }} className="flex items-center gap-2 mb-1">
             <span className="font-medium">{p.name}:</span>
             <span>{Number(p.value).toLocaleString()} {p.unit}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const SimulationCharts: React.FC<SimulationChartsProps> = ({ results, targetDepth, isDark = false }) => {
  
  // Calculate active scenarios for dynamic margin calculation
  const activeScenarios = results.filter(r => r.steps.length > 1);
  const scenarioCount = activeScenarios.length;
  
  // Optimized bottom margin for X-axis label only
  const bottomMargin = 40;
  
  // Dynamic Y-axis width calculation based on max depth
  const maxDepth = Math.max(...results.flatMap(r => r.steps.map(s => s.depth)), targetDepth);
  
  // Estimate width: ~8px per digit + ~15px for " m" + ~15px padding for label
  const depthDigits = Math.floor(maxDepth).toString().length;
  // e.g. "3000 m" -> 70px
  const yAxisWidth = (depthDigits * 8) + 35;
  
  // Transform data for charts
  // Expanded chart palette for dark theme - 12 distinct colors optimized for dark green background
  const colors = [
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
  ];
  const gridColor = isDark ? '#2A2B31' : '#f1f5f9';
  const axisColor = isDark ? '#8B8E97' : '#64748b';

  // Custom Legend Component
  const CustomLegend = () => (
    <div className="flex flex-wrap justify-center gap-4 mt-4 px-2">
      {results.map((res, index) => {
        if (res.steps.length <= 1) return null;
        return (
          <div key={res.id} className="flex items-center gap-2 text-xs">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className={`font-medium ${isDark ? 'text-[var(--bh-text-weak)]' : 'text-slate-600'}`}>
              {res.name}{res.status === 'incomplete' ? ' (Incomplete)' : ''}
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Time vs Depth Chart */}
      <div className="bg-white dark:bg-[var(--bh-surface-0)] p-3 rounded-xl shadow-sm border border-slate-200 dark:border-[var(--bh-border)] transition-colors duration-300">
        <h3 className="text-lg font-bold text-slate-800 dark:text-[var(--bh-text)] mb-4">Depth vs. Time</h3>
        <div className="h-[400px] w-full flex flex-col">
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart margin={{ top: 5, right: 20, left: 0, bottom: bottomMargin }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis 
                  type="number" 
                  dataKey="time" 
                  name="Time" 
                  label={{ value: 'Time (hours)', position: 'insideBottom', offset: -10, style: { fill: axisColor, fontSize: 12, fontWeight: 500 } }}
                  tick={{ fill: axisColor, fontSize: 11 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="depth" 
                  name="Depth" 
                  unit="m" 
                  reversed={true}
                  width={yAxisWidth}
                  domain={['dataMin', 'auto']}
                  label={{ value: 'Depth (m)', angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle', fill: axisColor, fontSize: 12, fontWeight: 500 } }}
                  tick={{ fill: axisColor, fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip xLabel="Time (hrs)" isDark={isDark} />} />
                {results.map((res, index) => {
                  if (res.steps.length <= 1) return null;
                  return (
                    <Line
                      key={res.id}
                      data={res.steps}
                      type="linear" 
                      dataKey="depth"
                      name={`${res.name}${res.status === 'incomplete' ? ' (Incomplete)' : ''}`}
                      stroke={colors[index % colors.length]}
                      strokeWidth={2}
                      dot={false}
                      unit="m"
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <CustomLegend />
        </div>
      </div>

      {/* Depth vs Cost Chart */}
      <div className="bg-white dark:bg-[var(--bh-surface-0)] p-3 rounded-xl shadow-sm border border-slate-200 dark:border-[var(--bh-border)] transition-colors duration-300">
        <h3 className="text-lg font-bold text-slate-800 dark:text-[var(--bh-text)] mb-4">Depth vs. Cost</h3>
        <div className="h-[400px] w-full flex flex-col">
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart margin={{ top: 5, right: 20, left: 0, bottom: bottomMargin }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis 
                  type="number" 
                  dataKey="cost" 
                  name="Cost" 
                  domain={['dataMin', 'auto']}
                  tickFormatter={(value) => (value / 1000).toLocaleString()}
                  label={{ value: 'Cumulative Cost (k$)', position: 'insideBottom', offset: -10, style: { fill: axisColor, fontSize: 12, fontWeight: 500 } }}
                  tick={{ fill: axisColor, fontSize: 11 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="depth" 
                  name="Depth" 
                  unit="m" 
                  reversed={true}
                  width={yAxisWidth}
                  domain={['dataMin', 'auto']}
                  label={{ value: 'Depth (m)', angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle', fill: axisColor, fontSize: 12, fontWeight: 500 } }}
                  tick={{ fill: axisColor, fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip xLabel="Cost ($)" isDark={isDark} />} />
                {results.map((res, index) => {
                  if (res.steps.length <= 1) return null;
                  return (
                    <Line
                      key={res.id}
                      data={res.steps}
                      type="linear"
                      dataKey="depth"
                      name={`${res.name}${res.status === 'incomplete' ? ' (Incomplete)' : ''}`}
                      stroke={colors[index % colors.length]}
                      strokeWidth={2}
                      dot={false}
                      unit="m"
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <CustomLegend />
        </div>
      </div>

    </div>
  );
};

export default SimulationCharts;