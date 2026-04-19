import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import api from '../services/api';

const MixedChart = ({ filters = {} }) => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [chartData, setChartData] = useState({ labels: [], scores: [], lectureCounts: [] });

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

  // Fetch real data from dashboard endpoint
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('📊 Fetching teacher performance data...');
        const qs = buildFilterParams();
        const response = await api.get(`/api/dashboard/teacher-performance${qs ? `?${qs}` : ''}`);
        console.log('✅ Teacher performance data:', response.data);

        const weeks = response.data.data?.weeks || [];
        setChartData({
          labels: weeks.map((w) => w.week_label),
          scores: weeks.map((w) => w.avg_score),
          lectureCounts: weeks.map((w) => w.lecture_count),
        });
      } catch (error) {
        console.error('❌ Failed to fetch teacher performance:', error);
        // No fallback — chart will show empty
        setChartData({ labels: [], scores: [], lectureCounts: [] });
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

    const { labels, scores, lectureCounts } = chartData;

    const option = {
      color: ['#006c4a', '#3fb687'],
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross', label: { backgroundColor: '#6a7985' } },
        formatter: (params) => {
          let tip = `<b>${params[0]?.axisValue}</b><br/>`;
          for (const p of params) {
            tip += `${p.marker} ${p.seriesName}: <b>${p.value}</b><br/>`;
          }
          return tip;
        },
      },
      legend: {
        top: 10,
        right: 20,
        data: ['Avg Score', 'Lectures'],
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true,
      },
      xAxis: [
        {
          type: 'category',
          data: labels.length ? labels : ['No data'],
          axisPointer: { type: 'shadow' },
          axisLine: { lineStyle: { color: '#d0d0d0' } },
        },
      ],
      yAxis: [
        {
          type: 'value',
          name: 'Score',
          position: 'left',
          min: 0,
          max: 100,
          axisLabel: { formatter: '{value}', color: '#666' },
          axisLine: { lineStyle: { color: '#d0d0d0' } },
          splitLine: { lineStyle: { color: '#f0f0f0' } },
        },
        {
          type: 'value',
          name: 'Lectures',
          position: 'right',
          min: 0,
          axisLabel: { formatter: '{value}', color: '#666' },
          axisLine: { lineStyle: { color: '#d0d0d0' } },
        },
      ],
      series: [
        {
          name: 'Avg Score',
          type: 'bar',
          yAxisIndex: 0,
          data: scores,
          barWidth: '50%',
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#006c4a' },
              { offset: 1, color: '#3fb687' },
            ]),
            borderRadius: [6, 6, 0, 0],
          },
        },
        {
          name: 'Lectures',
          type: 'line',
          yAxisIndex: 1,
          data: lectureCounts,
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { width: 2.5, color: '#f97316' },
          itemStyle: { color: '#f97316', borderWidth: 2, borderColor: '#fff' },
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
        <h3 className="font-headline text-xl font-bold text-gray-900">Teacher Performance</h3>
        <p className="text-sm text-gray-500 mt-1">Average Score & Lecture Count Over Last 8 Weeks</p>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '320px' }} />
    </div>
  );
};

export default MixedChart;
