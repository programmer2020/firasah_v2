import React, { useState } from 'react';
import ProtectedLayout from '../components/ProtectedLayout';
import './TeacherDashboard.css';

const TeacherDashboard = () => {
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState({
    subject: 'Math',
    week: 'Week 8',
    grade: 'Grade 10',
    kpi: 'Active KPI',
  });

  const [tempFilters, setTempFilters] = useState(filters);

  const handleFilterChange = (key, value) => {
    setTempFilters({ ...tempFilters, [key]: value });
  };

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setShowFilterPanel(false);
  };

  const handleResetFilters = () => {
    const defaultFilters = {
      subject: 'Math',
      week: 'Week 8',
      grade: 'Grade 10',
      kpi: 'Active KPI',
    };
    setTempFilters(defaultFilters);
    setFilters(defaultFilters);
    setShowFilterPanel(false);
  };

  const stats = [
    {
      label: 'Lectures',
      value: '1,284',
      icon: '📚',
      trend: '+12%',
      trendUp: true,
    },
    {
      label: 'Teachers',
      value: '452',
      icon: '👥',
      trend: '-5%',
      trendUp: false,
    },
    {
      label: 'Upload Hours',
      value: '8,920',
      icon: '☁️',
      trend: '+8%',
      trendUp: true,
    },
    {
      label: 'User Sessions',
      value: '12.5k',
      icon: '👤',
      trend: '+24%',
      trendUp: true,
    },
  ];

  const domains = [
    {
      name: 'Engagement',
      weeks: [90, 70, 80, 40, 100, 60, 90, 95],
    },
    {
      name: 'Content Mastery',
      weeks: [40, 50, 80, 60, 70, 80, 90, 100],
    },
    {
      name: 'Pedagogy',
      weeks: [80, 90, 100, 90, 80, 30, 70, 80],
    },
  ];

  const kpiSubjects = [
    {
      name: 'Clarity',
      subjects: [90, 60, 40, 80],
    },
    {
      name: 'Engagement',
      subjects: [100, 70, 95, 30],
    },
    {
      name: 'Pacing',
      subjects: [80, 75, 85, 100],
    },
    {
      name: 'Assessment',
      subjects: [85, 95, 70, 60],
    },
  ];

  const sampleEvidences = [
    {
      rank: '#01',
      kpiName: 'Questioning Technique',
      category: 'Interaction Quality',
      teacher: 'Dr. Sarah Jenkins',
      score: '98%',
    },
    {
      rank: '#02',
      kpiName: 'Scaffolding Complex Concepts',
      category: 'Instructional Support',
      teacher: 'Mr. Robert Chen',
      score: '94%',
    },
    {
      rank: '#03',
      kpiName: 'Formative Feedback Loop',
      category: 'Assessment Literacy',
      teacher: 'Ms. Elena Rodriguez',
      score: '92%',
    },
  ];

  const getOpacityClass = (value) => {
    if (value >= 90) return 'opacity-100';
    if (value >= 80) return 'opacity-90';
    if (value >= 70) return 'opacity-80';
    if (value >= 60) return 'opacity-70';
    if (value >= 50) return 'opacity-60';
    if (value >= 40) return 'opacity-50';
    return 'opacity-40';
  };

  const getHeatmapColor = (value, isError = false) => {
    if (isError) {
      return value >= 50 ? 'bg-red-500' : 'bg-red-400';
    }
    return 'bg-emerald-500';
  };

  return (
    <ProtectedLayout>
      {/* Header with Filters */}
      <div className="mb-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline text-3xl font-bold tracking-tight text-gray-900">
              Teacher Performance Dashboard
            </h1>
            <p className="mt-2 text-sm text-gray-600">Real-time analytics and evidence-based insights</p>
          </div>
        </div>

      {/* Filter Bar */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          {/* Filter Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className="inline-flex items-center gap-2 rounded-full bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 transition-colors"
            >
              <span>🔍</span> Filters
            </button>
            {!showFilterPanel && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
                  Subject: {filters.subject}
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
                  {filters.week}
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
                  {filters.grade}
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
                  {filters.kpi}
                </span>
              </div>
            )}
          </div>

          {/* Expandable Filter Panel */}
          {showFilterPanel && (
            <div className="filter-panel space-y-4 mb-4 pt-4 border-t border-gray-200">
              {/* Subject Filter */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Subject
                  </label>
                  <select
                    value={tempFilters.subject}
                    onChange={(e) => handleFilterChange('subject', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option>Math</option>
                    <option>Science</option>
                    <option>English</option>
                    <option>History</option>
                  </select>
                </div>

                {/* Week Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Week
                  </label>
                  <select
                    value={tempFilters.week}
                    onChange={(e) => handleFilterChange('week', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option>Week 1</option>
                    <option>Week 2</option>
                    <option>Week 3</option>
                    <option>Week 4</option>
                    <option>Week 5</option>
                    <option>Week 6</option>
                    <option>Week 7</option>
                    <option>Week 8</option>
                  </select>
                </div>

                {/* Grade Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Grade
                  </label>
                  <select
                    value={tempFilters.grade}
                    onChange={(e) => handleFilterChange('grade', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option>Grade 8</option>
                    <option>Grade 9</option>
                    <option>Grade 10</option>
                    <option>Grade 11</option>
                    <option>Grade 12</option>
                  </select>
                </div>

                {/* KPI Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    KPI Status
                  </label>
                  <select
                    value={tempFilters.kpi}
                    onChange={(e) => handleFilterChange('kpi', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option>Active KPI</option>
                    <option>All KPIs</option>
                    <option>High Performers</option>
                    <option>Needs Improvement</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={handleApplyFilters}
                  className="px-4 py-2 text-sm font-semibold text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          )}

          {/* Fixed Performance Overview Text */}
          {!showFilterPanel && (
            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                Performance Overview
              </span>
            </div>
          )}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-transform hover:shadow-md"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-xl">
                {stat.icon}
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                  stat.trendUp
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                <span className="mr-1">{stat.trendUp ? '📈' : '📉'}</span>
                {stat.trend}
              </span>
            </div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              {stat.label}
            </h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </section>

      {/* Heatmaps */}
      <section className="mb-8 space-y-6">
        {/* Domains Score vs Weeks */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-headline text-lg font-bold text-gray-900">Domains Score vs Weeks</h2>
            <span className="text-gray-400">ℹ️</span>
          </div>
          <div className="space-y-3 overflow-x-auto">
            {domains.map((domain, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="w-32 text-xs font-semibold text-gray-900">{domain.name}</div>
                <div className="flex flex-1 gap-1">
                  {domain.weeks.map((value, weekIdx) => (
                    <div
                      key={weekIdx}
                      className={`h-10 w-10 rounded-xl transition-all hover:scale-110 cursor-pointer ${getHeatmapColor(
                        value,
                        value < 50,
                      )} ${getOpacityClass(value)}`}
                      title={`Week ${weekIdx + 1}: ${value}%`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between px-4 text-xs font-bold uppercase tracking-widest text-gray-500">
            <span>W1</span>
            <span>W4</span>
            <span>W8</span>
          </div>
        </div>

        {/* KPIs vs Subject */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-headline text-lg font-bold text-gray-900">KPIs vs Subject</h2>
            <span className="text-gray-400">📊</span>
          </div>
          <div className="space-y-3 overflow-x-auto">
            <div className="flex items-center text-xs font-bold uppercase tracking-widest text-gray-500">
              <div className="w-32">KPI Name</div>
              <div className="flex flex-1 justify-between px-2">
                <span className="w-20 text-center">Math</span>
                <span className="w-20 text-center">Science</span>
                <span className="w-20 text-center">English</span>
                <span className="w-20 text-center">History</span>
              </div>
            </div>
            {kpiSubjects.map((kpi, idx) => (
              <div key={idx} className="flex items-center">
                <div className="w-32 text-xs font-semibold text-gray-900">{kpi.name}</div>
                <div className="flex flex-1 justify-between px-1 gap-2">
                  {kpi.subjects.map((value, subIdx) => (
                    <div
                      key={subIdx}
                      className={`h-10 w-20 rounded-xl transition-all hover:scale-105 cursor-pointer ${getHeatmapColor(
                        value,
                        value < 50,
                      )} ${getOpacityClass(value)}`}
                      title={`${value}%`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Charts Section */}
      <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Teacher Overall Score */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6">
          <div className="mb-6">
            <h3 className="font-headline text-lg font-bold text-gray-900">Teacher Overall Score</h3>
            <p className="text-xs text-gray-600">8-Week Progress Trend</p>
          </div>
          <div className="relative h-48 w-full">
            <svg className="h-full w-full" viewBox="0 0 400 150" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="grad1" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,120 Q50,80 100,90 T200,40 T300,60 T400,20"
                fill="none"
                stroke="#00687a"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M0,120 Q50,80 100,90 T200,40 T300,60 T400,20 L400,150 L0,150 Z"
                fill="url(#grad1)"
              />
              <circle cx="100" cy="90" r="4" fill="#00687a" />
              <circle cx="200" cy="40" r="4" fill="#00687a" />
              <circle cx="300" cy="60" r="4" fill="#00687a" />
              <circle cx="400" cy="20" r="4" fill="#00687a" />
            </svg>
          </div>
          <div className="mt-4 flex justify-between text-xs font-bold uppercase tracking-widest text-gray-500">
            <span>Week 1</span>
            <span>Week 4</span>
            <span>Week 8</span>
          </div>
        </div>

        {/* Section Overall Score */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6">
          <div className="mb-6">
            <h3 className="font-headline text-lg font-bold text-gray-900">Section Overall Score</h3>
            <p className="text-xs text-gray-600">Comparative Batch Data</p>
          </div>
          <div className="relative h-48 w-full">
            <svg className="h-full w-full" viewBox="0 0 400 150" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="grad2" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#4648d4" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#4648d4" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,130 Q50,110 100,100 T200,70 T300,40 T400,50"
                fill="none"
                stroke="#4648d4"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M0,130 Q50,110 100,100 T200,70 T300,40 T400,50 L400,150 L0,150 Z"
                fill="url(#grad2)"
              />
              <circle cx="100" cy="100" r="4" fill="#4648d4" />
              <circle cx="200" cy="70" r="4" fill="#4648d4" />
              <circle cx="300" cy="40" r="4" fill="#4648d4" />
              <circle cx="400" cy="50" r="4" fill="#4648d4" />
            </svg>
          </div>
          <div className="mt-4 flex justify-between text-xs font-bold uppercase tracking-widest text-gray-500">
            <span>Week 1</span>
            <span>Week 4</span>
            <span>Week 8</span>
          </div>
        </div>
      </section>

      {/* Evidence Samples Table */}
      <section>
        <div className="mb-6">
          <h2 className="font-headline text-xl font-bold text-gray-900">High-Confidence KPI Samples</h2>
          <p className="text-sm text-gray-600">Top 10 AI-verified performance highlights</p>
        </div>
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-600">
                    Rank
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-600">
                    KPI Name
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-600">
                    Teacher
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-600">
                    Score
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-gray-600">
                    Evidence
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sampleEvidences.map((evidence, idx) => (
                  <tr key={idx} className="transition-colors hover:bg-gray-50">
                    <td className="px-6 py-5 font-headline font-bold text-gray-900">{evidence.rank}</td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{evidence.kpiName}</span>
                        <span className="text-xs text-gray-600">{evidence.category}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 font-medium text-gray-700">{evidence.teacher}</td>
                    <td className="px-6 py-5">
                      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                        {evidence.score}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <button className="inline-flex items-center gap-2 rounded-xl bg-cyan-100 px-4 py-2 text-xs font-bold text-cyan-600 transition-colors hover:bg-cyan-600 hover:text-white">
                        <span>▶</span> Play Clip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </ProtectedLayout>
  );
};

export default TeacherDashboard;
