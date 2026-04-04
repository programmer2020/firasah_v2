import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const DonutChart = () => {
  const svgRef = useRef();

  const data = [
    { label: 'Engagement', value: 25 },
    { label: 'Content', value: 18 },
    { label: 'Clarity', value: 15 },
    { label: 'Interaction', value: 25 },
    { label: 'Assessment', value: 17 },
  ];

  const colors = ['#006d4a', '#22c55e', '#84cc16', '#fbbf24', '#f97316'];

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const width = 280;
    const height = 280;
    const radius = Math.min(width, height) / 2 - 10;

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    // Create group for donut chart
    const g = svg.append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Create pie layout
    const pie = d3.pie()
      .value(d => d.value);

    // Create arc generator
    const arc = d3.arc()
      .innerRadius(radius - 50)
      .outerRadius(radius);

    // Add gradient filter
    const defs = svg.append('defs');
    const filter = defs.append('filter')
      .attr('id', 'donut-shadow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    
    filter.append('feDropShadow')
      .attr('dx', '0')
      .attr('dy', '2')
      .attr('stdDeviation', '3')
      .attr('flood-opacity', '0.1');

    // Create slices
    g.selectAll('.arc')
      .data(pie(data))
      .join('path')
      .attr('class', 'arc')
      .attr('d', arc)
      .attr('fill', (d, i) => colors[i])
      .attr('opacity', '0.9')
      .attr('filter', 'url(#donut-shadow)')
      .style('transition', 'opacity 0.3s')
      .on('mouseover', function() { d3.select(this).attr('opacity', 1); })
      .on('mouseout', function(d, i) { d3.select(this).attr('opacity', 0.9); });

    // Add center text
    g.append('text')
      .attr('x', 0)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '28px')
      .attr('font-weight', 'bold')
      .attr('fill', '#006d4a')
      .text('92');

    g.append('text')
      .attr('x', 0)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#7e8f89')
      .attr('font-weight', '600')
      .text('%');

  }, [data]);

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-8">
        <h3 className="font-headline text-xl font-bold text-gray-900">Teacher Overall Score</h3>
        <p className="text-sm text-gray-500 mt-1">Performance Distribution</p>
      </div>
      <div className="flex items-center justify-center">
        <div className="relative w-80 h-80 flex items-center justify-center">
          <svg ref={svgRef}></svg>
          {/* Center circle (white) */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white rounded-full w-32 h-32 flex flex-col items-center justify-center shadow-sm">
              <div className="text-3xl font-bold text-[#006d4a]">92</div>
              <div className="text-xs text-gray-500 font-semibold">Overall</div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-8 grid grid-cols-5 gap-2 text-center">
        {data.map((item, idx) => (
          <div key={idx} className="px-2">
            <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ backgroundColor: colors[idx] }}></div>
            <div className="text-xs font-semibold text-gray-700">{item.value}%</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonutChart;
