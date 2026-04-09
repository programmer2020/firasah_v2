import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { getApiUrl } from '../config/apiConfig';

// Color palette for multiple section lines
const SECTION_COLORS = [
  '#06b6d4', // cyan
  '#22c55e', // green
  '#8b5cf6', // violet
  '#f97316', // orange
  '#ec4899', // pink
  '#eab308', // yellow
  '#14b8a6', // teal
  '#6366f1', // indigo
];

const WatermarkChart = () => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [chartData, setChartData] = useState({ week_labels: [], sections: [] });

  // Fetch real data
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('📈 Fetching section progress data...');
        const response = await fetch(getApiUrl('/api/dashboard/section-progress'), {
          method: 'GET',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

        const json = await response.json();
        console.log('✅ Section progress data:', json);
        setChartData(json.data || { week_labels: [], sections: [] });
      } catch (error) {
        console.error('❌ Failed to fetch section progress:', error);
        setChartData({ week_labels: [], sections: [] });
      }
    };

    fetchData();
  }, []);

  // Render chart when data changes
  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current);
    }

    const { week_labels, sections } = chartData;

    const series = sections.map((sec, idx) => ({
      name: `Section ${sec.section_name}`,
      type: 'line',
      smooth: true,
      data: sec.scores.map((s) => (s !== null ? s : 0)),
      lineStyle: {
        color: SECTION_COLORS[idx % SECTION_COLORS.length],
        width: 3,
      },
      itemStyle: {
        color: SECTION_COLORS[idx % SECTION_COLORS.length],
      },
      areaStyle:
        idx === 0
          ? {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: `${SECTION_COLORS[0]}66` },
                  { offset: 1, color: `${SECTION_COLORS[0]}0D` },
                ],
              },
            }
          : undefined,
      symbol: 'circle',
      symbolSize: 6,
      emphasis: { focus: 'series' },
    }));

    const option = {
      backgroundColor: '#fff',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      legend: {
        top: 20,
        right: 20,
        data: sections.map((sec) => `Section ${sec.section_name}`),
        textStyle: { color: '#666', fontSize: 12 },
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: week_labels.length ? week_labels : ['No data'],
        axisLine: { lineStyle: { color: '#d0d0d0' } },
        axisLabel: { color: '#666', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        name: 'Performance Score',
        min: 0,
        max: 100,
        nameTextStyle: { color: '#666', fontSize: 12 },
        axisLine: { lineStyle: { color: '#d0d0d0' } },
        splitLine: { lineStyle: { color: '#f0f0f0' } },
        axisLabel: { color: '#666', fontSize: 11 },
      },
      series: series.length
        ? series
        : [
            {
              name: 'No Data',
              type: 'line',
              data: [],
            },
          ],
    };

    chartInstanceRef.current.setOption(option, true);

    const handleResize = () => chartInstanceRef.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [chartData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="rounded-2xl border border-[rgba(0,76,58,0.08)] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <div className="mb-6">
        <h3 className="font-headline text-xl font-bold text-gray-900">Class Performance</h3>
        <p className="text-sm text-gray-500 mt-1">Weekly Section Performance Over Last 8 Weeks</p>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '320px' }} />
    </div>
  );
};

export default WatermarkChart;
