import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export type ThemeMode = 'light' | 'dark';

export const shellClass = {
  light: {
    page: 'bg-slate-100 text-slate-900',
    card: 'bg-white border border-slate-200 shadow-sm',
    subtle: 'text-slate-500',
    panel: 'bg-white border-r border-slate-200',
    input: 'bg-white border border-slate-300 text-slate-900',
    active: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    muted: 'hover:bg-slate-100',
  },
  dark: {
    page: 'bg-slate-950 text-slate-100',
    card: 'bg-slate-900 border border-slate-800 shadow-sm',
    subtle: 'text-slate-400',
    panel: 'bg-slate-950 border-r border-slate-800',
    input: 'bg-slate-900 border border-slate-700 text-slate-100',
    active: 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40',
    muted: 'hover:bg-slate-900',
  },
};

export const useAdminTheme = (): ThemeMode => ((localStorage.getItem('admin-theme') as ThemeMode) || 'light');

export const StatCard: React.FC<{ title: string; value: string; subtitle?: string; theme: ThemeMode }> = ({ title, value, subtitle, theme }) => (
  <div className={`${shellClass[theme].card} rounded-2xl p-5`}>
    <p className={`text-sm ${shellClass[theme].subtle}`}>{title}</p>
    <p className="mt-2 text-3xl font-bold">{value}</p>
    {subtitle ? <p className={`mt-1 text-xs ${shellClass[theme].subtle}`}>{subtitle}</p> : null}
  </div>
);

export const PageScaffold: React.FC<{ title: string; description: string; theme: ThemeMode; children: React.ReactNode }> = ({
  title,
  description,
  theme,
  children,
}) => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className={`text-sm ${shellClass[theme].subtle}`}>{description}</p>
    </div>
    {children}
  </div>
);

export const Table: React.FC<{ headers: string[]; rows: React.ReactNode[][]; theme: ThemeMode }> = ({ headers, rows, theme }) => (
  <div className={`${shellClass[theme].card} overflow-hidden rounded-2xl`}>
    <table className="w-full text-left text-sm">
      <thead>
        <tr className={theme === 'light' ? 'bg-slate-50' : 'bg-slate-800'}>
          {headers.map((header) => (
            <th key={header} className="px-4 py-3 font-semibold">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index} className="border-t border-slate-200/20">
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="px-4 py-3">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const Toggle: React.FC<{ checked: boolean; onChange: (value: boolean) => void }> = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative h-6 w-12 rounded-full transition ${checked ? 'bg-emerald-500' : 'bg-slate-400'}`}
  >
    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${checked ? 'left-6' : 'left-1'}`} />
  </button>
);

export const LineChart: React.FC<{ points: number[]; height?: number }> = ({ points, height = 140 }) => {
  const max = Math.max(...points, 1);
  const width = 500;
  const step = width / Math.max(points.length - 1, 1);
  const path = points
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * (height - 12) - 6;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="3" className="text-indigo-500" />
    </svg>
  );
};

export const PieChart: React.FC<{ slices: { label: string; value: number; color: string }[] }> = ({ slices }) => {
  const total = slices.reduce((acc, cur) => acc + cur.value, 0);
  let start = 0;

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 40 40" className="h-32 w-32 -rotate-90">
        {slices.map((slice) => {
          const percent = total ? (slice.value / total) * 100 : 0;
          const dash = `${percent} ${100 - percent}`;
          const circle = (
            <circle
              key={slice.label}
              cx="20"
              cy="20"
              r="15.915"
              fill="transparent"
              stroke={slice.color}
              strokeWidth="8"
              strokeDasharray={dash}
              strokeDashoffset={-start}
            />
          );
          start += percent;
          return circle;
        })}
      </svg>
      <div className="space-y-1 text-sm">
        {slices.map((slice) => (
          <div key={slice.label} className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: slice.color }} />
            <span>{slice.label}</span>
            <span className="font-semibold">{slice.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const Toast: React.FC<{ message: string; theme: ThemeMode }> = ({ message, theme }) => (
  <div className={`fixed bottom-6 right-6 ${shellClass[theme].card} rounded-xl px-4 py-3 text-sm shadow-xl`}>
    <div className="flex items-center gap-2">
      <CheckCircle2 size={16} className="text-emerald-500" />
      <span>{message}</span>
    </div>
  </div>
);
