import React, { useState, useEffect } from 'react';
import * as d3 from 'd3';
import WatermarkChart from './WatermarkChart';
import MixedChart from './MixedChart';
import ProtectedLayout from '../components/ProtectedLayout';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../config/apiConfig';
import './TeacherDashboard.css';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [lectureStats, setLectureStats] = useState({
    currentMonth: 0,
    previousMonth: 0,
    trend: '+0%',
    trendUp: true,
  });
  const [teacherStats, setTeacherStats] = useState({
    currentMonth: 0,
    previousMonth: 0,
    trend: '+0%',
    trendUp: true,
  });
  const [uploadStats, setUploadStats] = useState({
    currentMonth: 0,
    previousMonth: 0,
    trend: '+0%',
    trendUp: true,
  });
  const [userStats, setUserStats] = useState({
    currentMonth: 0,
    previousMonth: 0,
    trend: '+0%',
    trendUp: true,
  });
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    subject: 'All',
    week: 'All',
    grade: 'All',
    kpi: 'All',
  });

  const [tempFilters, setTempFilters] = useState(filters);

  // Fetch all 4 KPI card metrics in a single API call
  useEffect(() => {
    const fetchKpiCards = async () => {
      try {
        setLoading(true);
        console.log('📊 Fetching all KPI card stats from single endpoint...');

        const url = getApiUrl('/api/dashboard/kpi-cards');
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`KPI cards fetch failed: ${response.status} ${errorText}`);
        }

        const json = await response.json();
        console.log('✅ KPI cards data:', json);
        const cards = json.data || {};

        // Helper: build stat object from a card entry
        const toStat = (entry) => {
          if (!entry) return { currentMonth: 0, previousMonth: 0, trend: '+0%', trendUp: true };
          const pct = entry.mom_percent_change || 0;
          const isPositive = pct >= 0;
          return {
            currentMonth: entry.current_value,
            previousMonth: entry.previous_value,
            trend: `${isPositive ? '+' : ''}${Math.round(pct)}%`,
            trendUp: isPositive,
          };
        };

        setLectureStats(toStat(cards['Lectures']));
        setTeacherStats(toStat(cards['Teachers']));
        setUploadStats(toStat(cards['Upload Hours']));
        setUserStats(toStat(cards['User Sessions']));

        console.log('✅ All KPI card stats updated');
      } catch (error) {
        console.error('❌ Failed to fetch KPI cards:', error);
        // On error, leave current state as-is (zeros)
      } finally {
        setLoading(false);
      }
    };

    fetchKpiCards();
  }, []);

  // Fetch domains with real week scores from dashboard materialized view
  useEffect(() => {
    const fetchDomainsWeeks = async () => {
      try {
        console.log('📚 Fetching domains-weeks heatmap data...');
        const response = await fetch(getApiUrl('/api/dashboard/domains-weeks'), {
          method: 'GET',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Domains-weeks fetch failed: ${response.status} ${errorText}`);
        }

        const json = await response.json();
        console.log('✅ Domains-weeks data:', json);

        const domainsWithWeeks = (json.data || []).map((d) => ({
          name: d.domain_name,
          domainCode: `D${d.domain_id}`,
          weeks: (d.weeks || []).map((v) => (v !== null ? v : 0)),
        }));

        console.log('📊 Domains heatmap ready:', domainsWithWeeks);
        setDomains(domainsWithWeeks);
      } catch (error) {
        console.error('❌ Failed to fetch domains-weeks:', error);
        // Fallback with sample data
        const fallbackDomains = [
          { name: '1: In-Class Lesson Planning & Execution', domainCode: 'D1', weeks: [0, 0, 0, 0, 0, 0, 0, 0] },
          { name: '2: Diversity of Teaching Strategies', domainCode: 'D2', weeks: [0, 0, 0, 0, 0, 0, 0, 0] },
          { name: '3: Learning Environment', domainCode: 'D3', weeks: [0, 0, 0, 0, 0, 0, 0, 0] },
          { name: '4: Classroom Management', domainCode: 'D4', weeks: [0, 0, 0, 0, 0, 0, 0, 0] },
          { name: '5: Diversity of In-Class Assessment', domainCode: 'D5', weeks: [0, 0, 0, 0, 0, 0, 0, 0] },
          { name: '6: Analysing Student Responses & Diagnosing Learning Levels', domainCode: 'D6', weeks: [0, 0, 0, 0, 0, 0, 0, 0] },
          { name: '7: Use of Technology & Learning Resources', domainCode: 'D7', weeks: [0, 0, 0, 0, 0, 0, 0, 0] },
          { name: '8: Improving Learner Outcomes', domainCode: 'D8', weeks: [0, 0, 0, 0, 0, 0, 0, 0] },
        ];
        setDomains(fallbackDomains);
      }
    };

    fetchDomainsWeeks();
  }, []);

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

  console.log('🔄 TeacherDashboard rendering with lectureStats:', lectureStats);

  const LecturesIcon = () => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lectures-grad" x1="0" y1="0" x2="26" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34d399"/>
          <stop offset="100%" stopColor="#059669"/>
        </linearGradient>
      </defs>
      {/* Open book */}
      <path d="M13 5.5C10.5 3.8 7 3.5 4 4.5V20c3-.8 6.5-.5 9 1.2V5.5z" fill="url(#lectures-grad)" opacity="0.9"/>
      <path d="M13 5.5C15.5 3.8 19 3.5 22 4.5V20c-3-.8-6.5-.5-9 1.2V5.5z" fill="url(#lectures-grad)" opacity="0.6"/>
      <line x1="13" y1="5.5" x2="13" y2="21.2" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Lines on left page */}
      <line x1="6.5" y1="9" x2="11" y2="8.2" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.7"/>
      <line x1="6.5" y1="12" x2="11" y2="11.2" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.7"/>
      <line x1="6.5" y1="15" x2="11" y2="14.2" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.7"/>
      {/* Lines on right page */}
      <line x1="15" y1="8.2" x2="19.5" y2="9" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
      <line x1="15" y1="11.2" x2="19.5" y2="12" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
      <line x1="15" y1="14.2" x2="19.5" y2="15" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
    </svg>
  );

  const TeachersIcon = () => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="teachers-grad" x1="0" y1="0" x2="26" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818cf8"/>
          <stop offset="100%" stopColor="#6366f1"/>
        </linearGradient>
      </defs>
      {/* Back person (left) */}
      <circle cx="9" cy="9.5" r="3" fill="url(#teachers-grad)" opacity="0.55"/>
      <path d="M3 22c0-4 2.7-6 6-6s6 2 6 6" stroke="url(#teachers-grad)" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.45"/>
      {/* Front person (right) */}
      <circle cx="17" cy="9.5" r="3.3" fill="url(#teachers-grad)" opacity="0.9"/>
      <path d="M10.5 22c0-4 3-6.5 6.5-6.5s6.5 2.5 6.5 6.5" stroke="url(#teachers-grad)" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.85"/>
    </svg>
  );

  const UploadHoursIcon = () => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="upload-grad" x1="0" y1="0" x2="26" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8"/>
          <stop offset="100%" stopColor="#0ea5e9"/>
        </linearGradient>
      </defs>
      {/* Cloud shape */}
      <path d="M19.5 14.5a4 4 0 00-3.2-6.5 5.5 5.5 0 00-10.8 1.5A3.5 3.5 0 006 17h13.5z" fill="url(#upload-grad)" opacity="0.85"/>
      {/* Upload arrow */}
      <line x1="13" y1="21" x2="13" y2="13" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
      <polyline points="10,15.5 13,12.5 16,15.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* Clock ring hint */}
      <circle cx="20" cy="20" r="4.5" fill="#0ea5e9" opacity="0.9"/>
      <line x1="20" y1="17.5" x2="20" y2="20" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="20" y1="20" x2="22" y2="20" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );

  const UserSessionsIcon = () => (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sessions-grad" x1="0" y1="0" x2="26" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fb923c"/>
          <stop offset="100%" stopColor="#ea580c"/>
        </linearGradient>
      </defs>
      {/* User head */}
      <circle cx="13" cy="9" r="4" fill="url(#sessions-grad)" opacity="0.9"/>
      {/* User body */}
      <path d="M5 23c0-5 3.6-8 8-8s8 3 8 8" fill="url(#sessions-grad)" opacity="0.7"/>
      {/* Activity pulse line */}
      <polyline points="3,19 6.5,19 8,16.5 10,21.5 11.5,17 13,19 15,19" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9"/>
    </svg>
  );

  const stats = [
    {
      label: 'Lectures',
      value: loading ? '-' : lectureStats.currentMonth.toLocaleString(),
      icon: <LecturesIcon />,
      iconBg: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
      trend: loading ? '-' : lectureStats.trend,
      trendUp: lectureStats.trendUp,
    },
    {
      label: 'Teachers',
      value: loading ? '-' : teacherStats.currentMonth.toLocaleString(),
      icon: <TeachersIcon />,
      iconBg: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
      trend: loading ? '-' : teacherStats.trend,
      trendUp: teacherStats.trendUp,
    },
    {
      label: 'Upload Hours',
      value: loading ? '-' : uploadStats.currentMonth.toLocaleString(),
      icon: <UploadHoursIcon />,
      iconBg: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
      trend: loading ? '-' : uploadStats.trend,
      trendUp: uploadStats.trendUp,
    },
    {
      label: 'User Sessions',
      value: loading ? '-' : userStats.currentMonth.toLocaleString(),
      icon: <UserSessionsIcon />,
      iconBg: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)',
      trend: loading ? '-' : userStats.trend,
      trendUp: userStats.trendUp,
    },
  ];

  // Subjects and domain×subject matrix for the "Domains vs Subject" heatmap
  const [subjects, setSubjects] = useState([]);
  const [domainSubjectMatrix, setDomainSubjectMatrix] = useState([]);

  // Fetch real domains×subjects scores from the dashboard endpoint
  useEffect(() => {
    const fetchDomainsSubjects = async () => {
      try {
        console.log('📖 Fetching domains-subjects heatmap data...');
        const response = await fetch(getApiUrl('/api/dashboard/domains-subjects'), {
          method: 'GET',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Domains-subjects fetch failed: ${response.status} ${errorText}`);
        }

        const json = await response.json();
        console.log('✅ Domains-subjects data:', json);

        const { subjects: subList, domains: domList } = json.data || {};

        setSubjects((subList || []).map((s) => ({ id: s.id, name: s.name })));

        // Build matrix: rows = domains (same order as heatmapDomains), cols = subjects
        const subjectIds = (subList || []).map((s) => s.id);
        const matrix = (domList || []).map((d) =>
          subjectIds.map((sid) => (d.scores[sid] !== null && d.scores[sid] !== undefined ? d.scores[sid] : 0))
        );
        setDomainSubjectMatrix(matrix);
        console.log('✅ Domain-subject matrix ready:', matrix.length, 'x', (matrix[0] || []).length);
      } catch (error) {
        console.error('❌ Failed to fetch domains-subjects:', error);
        setSubjects([]);
        setDomainSubjectMatrix([]);
      }
    };

    fetchDomainsSubjects();
  }, []);

  // Top 10 high-confidence evidence samples from real data
  const [topEvidences, setTopEvidences] = useState([]);

  useEffect(() => {
    const fetchTopEvidences = async () => {
      try {
        console.log('🏆 Fetching top evidences...');
        const response = await fetch(getApiUrl('/api/dashboard/top-evidences'), {
          method: 'GET',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

        const json = await response.json();
        console.log('✅ Top evidences:', json);
        setTopEvidences(json.data || []);
      } catch (error) {
        console.error('❌ Failed to fetch top evidences:', error);
        setTopEvidences([]);
      }
    };

    fetchTopEvidences();
  }, []);

  const heatmapDomains = domains;
  const heatmapWeekLabels = (heatmapDomains[0]?.weeks || Array.from({ length: 8 }, () => 0)).map((_, index) => `W${index + 1}`);
  const heatmapSubjects = subjects;
  const subjectHeatmapMatrix = domainSubjectMatrix;
  const heatmapCellSize = 120;
  const heatmapLabelColumnWidth = 360;

  const getHeatmapTone = (value) => {
    if (value >= 90) {
      return {
        bg: '#006c4a',
        border: '#005137',
        text: '#ffffff',
        label: 'High',
      };
    }
    if (value >= 75) {
      return {
        bg: '#3fb687',
        border: '#2a9a6f',
        text: '#ffffff',
        label: 'Strong',
      };
    }
    if (value >= 60) {
      return {
        bg: '#85f8c4',
        border: '#68dba9',
        text: '#00422c',
        label: 'Good',
      };
    }
    if (value >= 45) {
      return {
        bg: '#e0e3e5',
        border: '#bbcabf',
        text: '#3c4a42',
        label: 'Moderate',
      };
    }
    return {
      bg: '#ffdadb',
      border: '#ffb2b7',
      text: '#92002a',
      label: 'Low',
    };
  };

  const heatmapLegend = [
    { label: 'Low', range: '0-44', bg: '#ffdadb', border: '#ffb2b7' },
    { label: 'Moderate', range: '45-59', bg: '#e0e3e5', border: '#bbcabf' },
    { label: 'Good', range: '60-74', bg: '#85f8c4', border: '#68dba9' },
    { label: 'Strong', range: '75-89', bg: '#3fb687', border: '#2a9a6f' },
    { label: 'High', range: '90-100', bg: '#006c4a', border: '#005137' },
  ];

  return (
    <ProtectedLayout>
      <div className="mx-auto flex max-w-[1500px] flex-col gap-2">
        {/* Welcome Section */}
        <section className="welcome-section border border-[rgba(0,76,58,0.08)] rounded-2xl bg-white px-6 py-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <h2 className="font-headline mb-0 text-5xl font-bold text-[var(--dashboard-primary)]">
            Welcome back, {user?.name || 'User'}
          </h2>
        </section>

        {/* Filters Section */}
        <section className="shrink-0 border border-[rgba(0,76,58,0.08)] rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="dashboard-panel dashboard-ghost-top h-auto px-8 py-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="font-dashboard-mono text-[10px] uppercase tracking-[0.28em] text-[#7e8f89]">
                  Dashboard Filters
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleResetFilters}
                  className="rounded-xl border border-[rgba(0,76,58,0.16)] px-4 py-2 text-sm font-semibold text-[#24433b] transition hover:bg-[rgba(238,243,239,0.88)]"
                >
                  Reset
                </button>
                <button
                  onClick={handleApplyFilters}
                  className="rounded-xl bg-[var(--dashboard-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  Apply
                </button>
                <button
                  onClick={() => setShowFilterPanel(!showFilterPanel)}
                  className="inline-flex items-center gap-2 self-start rounded-full bg-[var(--dashboard-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  <span>🔍</span>
                  <span>{showFilterPanel ? 'Hide Filters' : 'Filters'}</span>
                </button>
              </div>
            </div>

            {!showFilterPanel && (
              <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[rgba(0,76,58,0.08)] pt-5">
                <span className="rounded-full bg-[rgba(238,243,239,0.88)] px-3 py-1.5 text-xs font-medium text-[#24433b]">
                  Subject: {filters.subject}
                </span>
                <span className="rounded-full bg-[rgba(238,243,239,0.88)] px-3 py-1.5 text-xs font-medium text-[#24433b]">
                  {filters.week}
                </span>
                <span className="rounded-full bg-[rgba(238,243,239,0.88)] px-3 py-1.5 text-xs font-medium text-[#24433b]">
                  {filters.grade}
                </span>
                <span className="rounded-full bg-[rgba(238,243,239,0.88)] px-3 py-1.5 text-xs font-medium text-[#24433b]">
                  {filters.kpi}
                </span>
              </div>
            )}

            {showFilterPanel && (
              <div className="filter-panel mt-6 space-y-5 border-t border-[rgba(0,76,58,0.08)] pt-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="dashboard-panel-soft rounded-2xl p-4">
                    <label className="mb-2 block text-sm font-semibold text-[#172b26]">
                      Subject
                    </label>
                    <select
                      value={tempFilters.subject}
                      onChange={(e) => handleFilterChange('subject', e.target.value)}
                      className="w-full rounded-xl border border-[rgba(0,76,58,0.12)] bg-white px-3 py-2 text-sm text-[#172b26] outline-none transition focus:border-[var(--dashboard-primary)] focus:ring-2 focus:ring-[rgba(0,96,73,0.12)]"
                    >
                      <option>All</option>
                      <option>Math</option>
                      <option>Science</option>
                      <option>English</option>
                      <option>History</option>
                    </select>
                  </div>

                  <div className="dashboard-panel-soft rounded-2xl p-4">
                    <label className="mb-2 block text-sm font-semibold text-[#172b26]">
                      Week
                    </label>
                    <select
                      value={tempFilters.week}
                      onChange={(e) => handleFilterChange('week', e.target.value)}
                      className="w-full rounded-xl border border-[rgba(0,76,58,0.12)] bg-white px-3 py-2 text-sm text-[#172b26] outline-none transition focus:border-[var(--dashboard-primary)] focus:ring-2 focus:ring-[rgba(0,96,73,0.12)]"
                    >
                      <option>All</option>
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

                  <div className="dashboard-panel-soft rounded-2xl p-4">
                    <label className="mb-2 block text-sm font-semibold text-[#172b26]">
                      Grade
                    </label>
                    <select
                      value={tempFilters.grade}
                      onChange={(e) => handleFilterChange('grade', e.target.value)}
                      className="w-full rounded-xl border border-[rgba(0,76,58,0.12)] bg-white px-3 py-2 text-sm text-[#172b26] outline-none transition focus:border-[var(--dashboard-primary)] focus:ring-2 focus:ring-[rgba(0,96,73,0.12)]"
                    >
                      <option>All</option>
                      <option>Grade 8</option>
                      <option>Grade 9</option>
                      <option>Grade 10</option>
                      <option>Grade 11</option>
                      <option>Grade 12</option>
                    </select>
                  </div>

                  <div className="dashboard-panel-soft rounded-2xl p-4">
                    <label className="mb-2 block text-sm font-semibold text-[#172b26]">
                      KPI Status
                    </label>
                    <select
                      value={tempFilters.kpi}
                      onChange={(e) => handleFilterChange('kpi', e.target.value)}
                      className="w-full rounded-xl border border-[rgba(0,76,58,0.12)] bg-white px-3 py-2 text-sm text-[#172b26] outline-none transition focus:border-[var(--dashboard-primary)] focus:ring-2 focus:ring-[rgba(0,96,73,0.12)]"
                    >
                      <option>All</option>
                      <option>Active KPI</option>
                      <option>All KPIs</option>
                      <option>High Performers</option>
                      <option>Needs Improvement</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Stats Section */}
        <section className="relative z-10 grid grid-cols-1 gap-0 md:grid-cols-4 border border-[rgba(0,76,58,0.08)] rounded-2xl bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05)]" dir="ltr"
        >
          {stats.map((stat, idx) => (
            <div
              key={stat.label}
              className={`${idx % 2 === 0 ? 'dashboard-panel' : 'dashboard-panel-soft'} dashboard-ghost-top px-8 py-8`}
            >
              <p className="font-dashboard-mono mb-4 text-[10px] uppercase tracking-[0.28em] text-[#7e8f89]">
                {stat.label}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="font-headline text-[3.5rem] font-bold leading-none tracking-[-0.05em] text-[var(--dashboard-primary)]">
                  {stat.value}
                </span>
                <span className={`text-sm ${stat.trendUp ? 'text-[#006d4a]' : 'text-[#9b4d4d]'}`}>
                  {stat.trend}
                </span>
              </div>
            </div>
          ))}
        </section>

      {/* Heatmaps */}
      <section className="space-y-4 border border-[rgba(0,76,58,0.08)] rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="overflow-hidden rounded-[24px] border border-[rgba(187,202,191,0.4)] bg-white px-8 py-7 shadow-[0_-4px_24px_rgba(25,28,30,0.04)]">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-headline text-xl font-bold text-[#191c1e]">Domains Score vs Weeks</h2>
              <p className="mt-1 text-sm text-[#6c7a71]">Distribution of domain performance across the latest eight weeks</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(63,182,135,0.12)]">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 14.5 7 10.5l3 2.5 5-6" stroke="#006c4a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13.5 7h3.5v3.5" stroke="#006c4a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          <div className="overflow-x-auto pb-4">
            <div className="w-max min-w-full">
              <div
                className="grid items-center gap-3"
                style={{ gridTemplateColumns: `${heatmapLabelColumnWidth}px repeat(${heatmapWeekLabels.length}, ${heatmapCellSize}px)` }}
              >
                <div />
                {heatmapWeekLabels.map((label) => (
                  <span
                    key={label}
                    className="text-center font-dashboard-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#6c7a71]"
                  >
                    {label}
                  </span>
                ))}

                {heatmapDomains.map((domain) => (
                  <React.Fragment key={domain.domainCode || domain.name}>
                    <div className="pr-4">
                      <p
                        className="whitespace-nowrap text-sm font-semibold leading-5 text-[#191c1e]"
                        title={domain.name}
                      >
                        {domain.name}
                      </p>
                    </div>

                    {domain.weeks.map((value, weekIdx) => {
                      const tone = getHeatmapTone(value);

                      return (
                        <div
                          key={`${domain.domainCode || domain.name}-week-${weekIdx}`}
                          className="aspect-square rounded-xl border transition-transform duration-200 hover:scale-[1.03]"
                          style={{
                            backgroundColor: tone.bg,
                            borderColor: tone.border,
                            color: tone.text,
                          }}
                          title={`${domain.name} - Week ${weekIdx + 1}: ${value}%`}
                        >
                          <div className="flex h-full items-center justify-center">
                            <span className="font-headline text-base font-bold">{value}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[rgba(187,202,191,0.3)] pt-6">
            <span className="font-dashboard-mono text-[10px] uppercase tracking-[0.28em] text-[#6c7a71]">
              Intensity Scale
            </span>
            <div className="flex flex-wrap items-center gap-3">
              {heatmapLegend.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div
                    className="h-3.5 w-3.5 rounded-[4px] border"
                    style={{ backgroundColor: item.bg, borderColor: item.border }}
                  />
                  <span className="text-[11px] font-medium text-[#6c7a71]">
                    {item.label} ({item.range})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-[rgba(187,202,191,0.4)] bg-white px-8 py-7 shadow-[0_-4px_24px_rgba(25,28,30,0.04)]">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-headline text-xl font-bold text-[#191c1e]">Domains vs Subject</h2>
              <p className="mt-1 text-sm text-[#6c7a71]">Cross-view of domain performance across your available subjects</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(0,108,74,0.08)]">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="4" height="4" rx="1" fill="#85f8c4" />
                <rect x="8" y="3" width="4" height="4" rx="1" fill="#3fb687" />
                <rect x="13" y="3" width="4" height="4" rx="1" fill="#006c4a" />
                <rect x="3" y="8" width="4" height="4" rx="1" fill="#e0e3e5" />
                <rect x="8" y="8" width="4" height="4" rx="1" fill="#85f8c4" />
                <rect x="13" y="8" width="4" height="4" rx="1" fill="#ffdadb" />
                <rect x="3" y="13" width="4" height="4" rx="1" fill="#3fb687" />
                <rect x="8" y="13" width="4" height="4" rx="1" fill="#006c4a" />
                <rect x="13" y="13" width="4" height="4" rx="1" fill="#85f8c4" />
              </svg>
            </div>
          </div>

          <div className="overflow-x-auto pb-4">
            <div className="w-max min-w-full">
              <div
                className="grid items-center gap-3"
                style={{ gridTemplateColumns: `${heatmapLabelColumnWidth}px repeat(${heatmapSubjects.length}, ${heatmapCellSize}px)` }}
              >
                <div />
                {heatmapSubjects.map((subject) => (
                  <span
                    key={subject.id || subject.name}
                    className="whitespace-nowrap px-1 text-center font-dashboard-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#6c7a71]"
                  >
                    {subject.name}
                  </span>
                ))}

                {heatmapDomains.map((domain, domainIdx) => (
                  <React.Fragment key={`${domain.domainCode || domain.name}-subject-row`}>
                    <div className="pr-4">
                      <p
                        className="whitespace-nowrap text-sm font-semibold leading-5 text-[#191c1e]"
                        title={domain.name}
                      >
                        {domain.name}
                      </p>
                    </div>

                    {(subjectHeatmapMatrix[domainIdx] || []).map((value, subjectIdx) => {
                      const tone = getHeatmapTone(value);

                      return (
                        <div
                          key={`${domain.domainCode || domain.name}-subject-${subjectIdx}`}
                          className="aspect-square rounded-xl border transition-transform duration-200 hover:scale-[1.03]"
                          style={{
                            backgroundColor: tone.bg,
                            borderColor: tone.border,
                            color: tone.text,
                          }}
                          title={`${domain.name} - ${heatmapSubjects[subjectIdx]?.name}: ${value}%`}
                        >
                          <div className="flex h-full flex-col items-center justify-center text-center">
                            <span className="font-headline text-sm font-bold leading-none">{value}%</span>
                            <span className="mt-0.5 text-[8px] font-semibold uppercase leading-none tracking-[0.08em] opacity-80">
                              {tone.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[rgba(187,202,191,0.3)] pt-6">
            <span className="font-dashboard-mono text-[10px] uppercase tracking-[0.28em] text-[#6c7a71]">
              Performance Scale
            </span>
            <div className="flex flex-wrap items-center gap-3">
              {heatmapLegend.map((item) => (
                <div key={`subject-${item.label}`} className="flex items-center gap-2">
                  <div
                    className="h-3.5 w-3.5 rounded-[4px] border"
                    style={{ backgroundColor: item.bg, borderColor: item.border }}
                  />
                  <span className="text-[11px] font-medium text-[#6c7a71]">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Charts Section — side by side */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Teacher Performance Metrics */}
        <MixedChart />
        {/* Class Performance */}
        <WatermarkChart />
      </section>

      {/* Evidence Samples Table */}
      <section className="border border-[rgba(0,76,58,0.08)] rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="mb-3">
          <h2 className="font-headline text-xl font-bold" style={{color: '#005239'}}>High-Confidence KPI Samples</h2>
          <p className="text-sm" style={{color: '#006d4a'}}>Top 10 AI-verified performance highlights</p>
        </div>
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead style={{ background: 'linear-gradient(135deg, #006d4a 0%, #005239 100%)' }}>
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-emerald-100">
                    Rank
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-emerald-100">
                    KPI Name
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-emerald-100">
                    Teacher
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-emerald-100">
                    Confidence
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-emerald-100">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {topEvidences.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">No evidence data available yet</td>
                  </tr>
                )}
                {topEvidences.map((evidence, idx) => (
                  <tr
                    key={evidence.evidence_id || idx}
                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[#f3f5f4]'} transition-colors hover:bg-gray-50`}
                  >
                    <td className="px-6 py-5 font-headline font-bold text-gray-900">#{String(evidence.rank).padStart(2, '0')}</td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{evidence.kpi_name}</span>
                        <span className="text-xs text-gray-600">Section {evidence.section_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 font-medium text-gray-700">{evidence.teacher_name}</td>
                    <td className="px-6 py-5">
                      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                        {evidence.confidence}%
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center gap-1 rounded-xl bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700">
                        {evidence.start_time} - {evidence.end_time}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      </div>
    </ProtectedLayout>
  );
};

export default TeacherDashboard;
