import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

const WatermarkChart = () => {
  const chartRef = useRef(null);
  let chartInstance = null;

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize ECharts instance
    if (!chartInstance) {
      chartInstance = echarts.init(chartRef.current);
    }

    const option = {
      backgroundColor: '#fff',
      title: [
        {
          text: '',
          left: -100,
          top: -300
        }
      ],
      graphic: {
        elements: []
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        }
      },
      legend: {
        top: 20,
        right: 20,
        data: ['Weeks Progress', 'Target'],
        textStyle: {
          color: '#666',
          fontSize: 12
        }
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'],
        axisLine: {
          lineStyle: {
            color: '#d0d0d0'
          }
        },
        axisLabel: {
          color: '#666',
          fontSize: 11
        }
      },
      yAxis: {
        type: 'value',
        name: 'Performance Score',
        nameTextStyle: {
          color: '#666',
          fontSize: 12
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
        },
        axisLabel: {
          color: '#666',
          fontSize: 11
        }
      },
      series: [
        {
          name: 'Weeks Progress',
          type: 'line',
          smooth: true,
          data: [70, 75, 82, 88, 92, 96, 98, 100],
          lineStyle: {
            color: '#06b6d4',
            width: 3
          },
          itemStyle: {
            color: '#06b6d4'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(6, 182, 212, 0.4)' },
                { offset: 1, color: 'rgba(6, 182, 212, 0.05)' }
              ]
            }
          },
          symbol: 'circle',
          symbolSize: 6,
          emphasis: {
            focus: 'series'
          }
        },
        {
          name: 'Target',
          type: 'line',
          smooth: true,
          data: [60, 65, 70, 75, 80, 85, 90, 95],
          lineStyle: {
            color: '#22c55e',
            width: 2,
            type: 'dashed'
          },
          itemStyle: {
            color: '#22c55e'
          },
          symbol: 'square',
          symbolSize: 5,
          emphasis: {
            focus: 'series'
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
        <h3 className="font-headline text-xl font-bold text-gray-900">Progress Tracking</h3>
        <p className="text-sm text-gray-500 mt-1">Weekly Performance vs Target</p>
      </div>
      <div ref={chartRef} style={{ width: '100%', height: '320px' }} />
    </div>
  );
};

export default WatermarkChart;
