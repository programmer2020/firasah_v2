import React, { useEffect, useState } from 'react';
import api from '../services/api';

// Helper to generate random color
function getColor(idx) {
  const palette = [
    '#4648d4', '#06b6d4', '#22c55e', '#f59e42', '#e11d48', '#a21caf', '#facc15', '#0ea5e9', '#14b8a6', '#f43f5e'
  ];
  return palette[idx % palette.length];
}

const weeks = [1, 2, 3, 4, 5, 6, 7, 8];
const svgW = 400, svgH = 180, chartPad = 40, chartH = svgH - 2 * chartPad, chartW = svgW - 2 * chartPad;

export default function SectionOverallScoreChart() {
  const [sections, setSections] = useState([]);
  const [sectionData, setSectionData] = useState([]); // [[scores...], ...]

  useEffect(() => {
    const fetchSections = async () => {
      try {
        const res = await api.get('/api/sections');
        const sectionList = (res.data.data || []).map(s => s.section_name);
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
    <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-8">
        <h3 className="font-headline text-xl font-bold text-gray-900">Section Overall Score</h3>
        <p className="text-sm text-gray-500 mt-1">Area Chart - Comparative Batch Data</p>
      </div>
      <div className="relative h-56 w-full">
        <svg className="h-full w-full" viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            <filter id="area-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.08"/>
            </filter>
          </defs>
          
          {/* Grid lines */}
          <line x1={chartPad} y1={chartPad + chartH * 0.75} x2={svgW - chartPad} y2={chartPad + chartH * 0.75} stroke="#f0f0f0" strokeWidth="1" />
          <line x1={chartPad} y1={chartPad + chartH * 0.5} x2={svgW - chartPad} y2={chartPad + chartH * 0.5} stroke="#f0f0f0" strokeWidth="1" />
          <line x1={chartPad} y1={chartPad + chartH * 0.25} x2={svgW - chartPad} y2={chartPad + chartH * 0.25} stroke="#f0f0f0" strokeWidth="1" />
          
          {/* Area charts */}
          {sectionData.map((scores, sIdx) => {
            // Build area path
            let linePath = '';
            scores.forEach((val, i) => {
              const cx = x(i), cy = y(val);
              linePath += i === 0 ? `M${cx},${cy}` : ` L${cx},${cy}`;
            });
            
            // Create area path (close the bottom)
            const areaPath = linePath + ` L${x(weeks.length - 1)},${chartPad + chartH} L${chartPad},${chartPad + chartH} Z`;
            
            return (
              <g key={sIdx} filter="url(#area-shadow)">
                {/* Filled area */}
                <path
                  d={areaPath}
                  fill={getColor(sIdx)}
                  opacity="0.25"
                />
                {/* Line on top */}
                <path
                  d={linePath}
                  fill="none"
                  stroke={getColor(sIdx)}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.95"
                />
                {/* Data points */}
                {scores.map((val, i) => (
                  <circle key={i} cx={x(i)} cy={y(val)} r="4" fill={getColor(sIdx)} stroke="white" strokeWidth="1.5" />
                ))}
              </g>
            );
          })}
        </svg>
        
        {/* Legend */}
        <div className="absolute right-4 top-4 flex flex-col gap-2 bg-white rounded-xl p-3 border border-gray-100 shadow-lg">
          {sections.map((name, idx) => (
            <span key={name} className="flex items-center gap-2 text-xs font-semibold" style={{color: getColor(idx)}}>
              <span style={{background: getColor(idx), width: 10, height: 3, borderRadius: 1.5, display: 'inline-block'}}></span>
              Section {name}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-6 flex justify-between text-xs font-bold uppercase tracking-wider text-gray-600 px-1">
        <span>Week 1</span>
        <span>Week 4</span>
        <span>Week 8</span>
      </div>
    </div>
  );
}