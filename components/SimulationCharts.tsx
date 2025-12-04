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
      <div className={`p-3 border shadow-lg rounded-lg text-xs ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}>
        <p className={`font-bold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>
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
  
  // Transform data for charts
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
  const gridColor = isDark ? '#334155' : '#f1f5f9';
  const axisColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Time vs Depth Chart */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors duration-300">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Depth vs. Time</h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart margin={{ top: 20, right: 30, left: 70, bottom: 65 }}>
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
                domain={['dataMin', 'auto']}
                label={{ value: 'Depth (m)', angle: -90, position: 'insideLeft', offset: -15, style: { textAnchor: 'middle', fill: axisColor, fontSize: 12, fontWeight: 500 } }}
                tick={{ fill: axisColor, fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip xLabel="Time (hrs)" isDark={isDark} />} />
              <Legend 
                verticalAlign="bottom" 
                align="center"
                iconType="circle"
                wrapperStyle={{ paddingTop: '20px', paddingBottom: '10px' }}
              />
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
      </div>

      {/* Depth vs Cost Chart */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors duration-300">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Depth vs. Cost</h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart margin={{ top: 20, right: 30, left: 80, bottom: 65 }}>
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
                domain={['dataMin', 'auto']}
                label={{ value: 'Depth (m)', angle: -90, position: 'insideLeft', offset: -20, style: { textAnchor: 'middle', fill: axisColor, fontSize: 12, fontWeight: 500 } }}
                tick={{ fill: axisColor, fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip xLabel="Cost ($)" isDark={isDark} />} />
              <Legend 
                verticalAlign="bottom" 
                align="center"
                iconType="circle"
                wrapperStyle={{ paddingTop: '20px', paddingBottom: '10px' }}
              />
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
      </div>

    </div>
  );
};

export default SimulationCharts;