import React, { useEffect, useState } from 'react';

// Helper to generate random color
function getColor(idx) {
  const palette = [
    '#4648d4', '#06b6d4', '#22c55e', '#f59e42', '#e11d48', '#a21caf', '#facc15', '#0ea5e9', '#14b8a6', '#f43f5e'
  ];
  return palette[idx % palette.length];
}

const weeks = [1, 2, 3, 4, 5, 6, 7, 8];
const svgW = 400, svgH = 150, chartPad = 30, chartH = svgH - 2 * chartPad, chartW = svgW - 2 * chartPad;

export default function SectionOverallScoreChart() {
  const [sections, setSections] = useState([]);
  const [sectionData, setSectionData] = useState([]); // [[scores...], ...]

  useEffect(() => {
    const fetchSections = async () => {
      try {
        const res = await fetch('/api/sections', {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          credentials: 'include',
        });
        const data = await res.json();
        const sectionList = (data.data || []).map(s => s.section_name);
        setSections(sectionList);
        // Generate random demo data for each section (8 weeks)
        setSectionData(sectionList.map(() => weeks.map(() => Math.floor(Math.random() * 41) + 60)));
      } catch (e) {
        // fallback demo
        setSections(['A', 'B', 'C']);
        setSectionData([
          [70, 75, 80, 85, 90, 92, 95, 93],
          [60, 65, 70, 75, 80, 85, 90, 88],
          [80, 82, 85, 87, 89, 91, 92, 91],
        ]);
      }
    };
    fetchSections();
  }, []);

  // Find min/max for scaling
  const allVals = sectionData.flat();
  const minY = Math.min(...allVals, 50);
  const maxY = Math.max(...allVals, 100);

  // X scale
  const x = (i) => chartPad + (i * (chartW / (weeks.length - 1)));
  // Y scale (invert)
  const y = (val) => chartPad + chartH - ((val - minY) / (maxY - minY)) * chartH;

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6">
      <div className="mb-6">
        <h3 className="font-headline text-lg font-bold text-gray-900">Section Overall Score</h3>
        <p className="text-xs text-gray-600">Comparative Batch Data</p>
      </div>
      <div className="relative h-48 w-full">
        <svg className="h-full w-full" viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="xMidYMid meet">
          {sectionData.map((scores, sIdx) => {
            // Build line path
            let d = '';
            scores.forEach((val, i) => {
              const cx = x(i), cy = y(val);
              d += i === 0 ? `M${cx},${cy}` : ` L${cx},${cy}`;
            });
            return (
              <g key={sIdx}>
                <path
                  d={d}
                  fill="none"
                  stroke={getColor(sIdx)}
                  strokeWidth={3}
                  strokeLinecap="round"
                  opacity={0.9}
                />
                {scores.map((val, i) => (
                  <circle key={i} cx={x(i)} cy={y(val)} r={3.5} fill={getColor(sIdx)} />
                ))}
              </g>
            );
          })}
        </svg>
        {/* Legend */}
        <div className="absolute right-2 top-2 flex flex-col gap-1 bg-white/80 rounded p-2 border border-gray-100 shadow-sm">
          {sections.map((name, idx) => (
            <span key={name} className="flex items-center gap-2 text-xs font-bold" style={{color: getColor(idx)}}>
              <span style={{background: getColor(idx), width: 12, height: 4, borderRadius: 2, display: 'inline-block'}}></span>
              Section {name}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-4 flex justify-between text-xs font-bold uppercase tracking-widest text-gray-500">
        <span>Week 1</span>
        <span>Week 4</span>
        <span>Week 8</span>
      </div>
    </div>
  );
}