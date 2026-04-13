import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import api from '../services/api';

// Color palette for multiple class lines
const CLASS_COLORS = [
  '#06b6d4', // cyan
  '#22c55e', // green
  '#8b5cf6', // violet
  '#f97316', // orange
  '#ec4899', // pink
  '#eab308', // yellow
  '#14b8a6', // teal
  '#6366f1', // indigo
];

const WatermarkChart = ({ filters = {} }) => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [chartData, setChartData] = useState({ week_labels: [], classes: [] });

  // Build query string from filters
  const buildFilterParams = () => {
    const params = new URLSearchParams();
    if (filters.subject) params.append('subject_id', filters.subject);
    if (filters.grade) params.append('grade_id', filters.grade);
    if (filters.week) {
      const weekNum = parseInt(filters.week.replace('Week ', ''), 10);
      if (!isNaN(weekNum)) params.append('week_num', weekNum);
    }
    if (filters.kpiStatus === 'high') {
      params.append('min_score', '75');
    } else if (filters.kpiStatus === 'needs_improvement') {
      params.append('max_score', '50');
    }
    return params.toString();
  };

  // Fetch real data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const qs = buildFilterParams();
        const response = await api.get(`/api/dashboard/section-progress${qs ? `?${qs}` : ''}`);
        setChartData(response.data.data || { week_labels: [], classes: [] });
      } catch (error) {
        console.error('Failed to fetch class progress:', error);
        setChartData({ week_labels: [], classes: [] });
      }
    };

    fetchData();
  }, [filters]);

  // Render chart when data changes
  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current);
    }

    const { week_labels, classes } = chartData;

    const series = classes.map((cls, idx) => ({
      name: cls.class_name,
      type: 'line',
      smooth: true,
      data: cls.scores.map((s) => (s !== null ? s : 0)),
      lineStyle: {
        color: CLASS_COLORS[idx % CLASS_COLORS.length],
        width: 3,
      },
      itemStyle: {
        color: CLASS_COLORS[idx % CLASS_COLORS.length],
      },
      areaStyle:
        idx === 0
          ? {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: `${CLASS_COLORS[0]}66` },
                  { offset: 1, color: `${CLASS_COLORS[0]}0D` },
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
        data: classes.map((cls) => cls.class_name),
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
        <p className="text-sm text-gray-500 mt-1">Weekly Class Performance Over Last 8 Weeks</p>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '320px' }} />
    </div>
  );
};

export default WatermarkChart;
