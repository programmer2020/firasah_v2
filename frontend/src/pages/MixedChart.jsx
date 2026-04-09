import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const MixedChart = () => {
  const chartRef = useRef(null);
  let chartInstance = null;

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize ECharts instance
    if (!chartInstance) {
      chartInstance = echarts.init(chartRef.current);
    }

    const option = {
      color: ['#22c55e', '#4648d4', '#06b6d4'],
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985'
          }
        }
      },
      legend: {
        top: 10,
        right: 20,
        data: ['Engagement']
      },
      toolbox: {
        feature: {
          saveAsImage: { show: false }
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true
      },
      xAxis: [
        {
          type: 'category',
          data: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'],
          axisPointer: {
            type: 'shadow'
          },
          axisLine: {
            lineStyle: {
              color: '#d0d0d0'
            }
          }
        }
      ],
      yAxis: [
        {
          type: 'value',
          name: 'Score',
          position: 'left',
          axisLabel: {
            formatter: '{value}',
            color: '#666'
          },
          axisLine: {
            lineStyle: {
              color: '#d0d0d0'
            }
          },
          splitLine: {
            lineStyle: {
              color: '#f0f0f0'
            }
          }
        },
        {
          type: 'value',
          name: 'Growth %',
          position: 'right',
          axisLabel: {
            formatter: '{value}%',
            color: '#666'
          },
          axisLine: {
            lineStyle: {
              color: '#d0d0d0'
            }
          }
        }
      ],
      series: [
        {
          name: 'Engagement',
          type: 'bar',
          data: [70, 75, 80, 85, 90, 92, 95, 93],
          barWidth: '60%',
          itemStyle: {
            color: '#22c55e',
            opacity: 0.8
          }
        }
      ]
    };

    chartInstance.setOption(option);

    // Handle window resize
    const handleResize = () => {
      chartInstance?.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartInstance) {
        chartInstance.dispose();
        chartInstance = null;
      }
    };
  }, []);

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-6">
        <h3 className="font-headline text-xl font-bold text-gray-900">Teacher Performance Metrics</h3>
        <p className="text-sm text-gray-500 mt-1">Mixed Bar & Line Chart Analysis</p>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '320px' }} />
    </div>
  );
};

export default MixedChart;
