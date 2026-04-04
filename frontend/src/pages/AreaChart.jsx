import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const AreaChart = () => {
  const svgRef = useRef();
  const [sections, setSections] = useState([]);
  const [sectionData, setSectionData] = useState([]);

  const weeks = [1, 2, 3, 4, 5, 6, 7, 8];
  const svgW = 500;
  const svgH = 220;
  const chartPad = 40;

  // Color palette
  const colorPalette = [
    '#4648d4', '#06b6d4', '#22c55e', '#f59e42', '#e11d48', '#a21caf', '#facc15', '#0ea5e9', '#14b8a6', '#f43f5e'
  ];

  const getColor = (idx) => colorPalette[idx % colorPalette.length];

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
        setSectionData(sectionList.map(() => weeks.map(() => Math.floor(Math.random() * 41) + 60)));
      } catch (e) {
        // Fallback demo data
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

  useEffect(() => {
    if (!svgRef.current || sectionData.length === 0) return;

    const chartW = svgW - 2 * chartPad;
    const chartH = svgH - 2 * chartPad;

    // Get min/max values for scaling
    const allVals = sectionData.flat();
    const minY = Math.min(...allVals, 50);
    const maxY = Math.max(...allVals, 100);

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr('width', svgW)
      .attr('height', svgH)
      .attr('viewBox', `0 0 ${svgW} ${svgH}`);

    // Add defs for filters
    const defs = svg.append('defs');
    const filter = defs.append('filter')
      .attr('id', 'area-shadow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    
    filter.append('feDropShadow')
      .attr('dx', '0')
      .attr('dy', '2')
      .attr('stdDeviation', '2')
      .attr('flood-opacity', '0.08');

    // Create group for chart
    const g = svg.append('g');

    // X scale
    const xScale = d3.scaleLinear()
      .domain([0, weeks.length - 1])
      .range([chartPad, chartPad + chartW]);

    // Y scale
    const yScale = d3.scaleLinear()
      .domain([minY, maxY])
      .range([chartPad + chartH, chartPad]);

    // Area generator
    const areaGenerator = d3.area()
      .x((d, i) => xScale(i))
      .y0(chartPad + chartH)
      .y1(d => yScale(d));

    // Line generator
    const lineGenerator = d3.line()
      .x((d, i) => xScale(i))
      .y(d => yScale(d));

    // Draw grid lines
    const gridGroup = g.append('g');
    [0.25, 0.5, 0.75].forEach(ratio => {
      gridGroup.append('line')
        .attr('x1', chartPad)
        .attr('y1', chartPad + chartH * (1 - ratio))
        .attr('x2', chartPad + chartW)
        .attr('y2', chartPad + chartH * (1 - ratio))
        .attr('stroke', '#f0f0f0')
        .attr('stroke-width', 1);
    });

    // Draw each section's area and line
    sectionData.forEach((scores, sIdx) => {
      const group = g.append('g')
        .attr('filter', 'url(#area-shadow)');

      // Filled area
      group.append('path')
        .attr('d', areaGenerator(scores))
        .attr('fill', getColor(sIdx))
        .attr('opacity', 0.25);

      // Line on top
      group.append('path')
        .attr('d', lineGenerator(scores))
        .attr('fill', 'none')
        .attr('stroke', getColor(sIdx))
        .attr('stroke-width', 3.5)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .attr('opacity', 0.95);

      // Data points
      group.selectAll('circle')
        .data(scores)
        .join('circle')
        .attr('cx', (d, i) => xScale(i))
        .attr('cy', d => yScale(d))
        .attr('r', 4)
        .attr('fill', getColor(sIdx))
        .attr('stroke', 'white')
        .attr('stroke-width', 1.5);
    });

  }, [sectionData]);

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-8">
        <h3 className="font-headline text-xl font-bold text-gray-900">Section Overall Score</h3>
        <p className="text-sm text-gray-500 mt-1">Area Chart - Comparative Batch Data</p>
      </div>
      <div className="relative h-56 w-full flex items-center justify-center">
        <svg ref={svgRef} className="w-full h-full"></svg>
        
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
};

export default AreaChart;
