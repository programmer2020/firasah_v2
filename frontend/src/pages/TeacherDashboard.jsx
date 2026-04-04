import React, { useState, useEffect } from 'react';
import * as d3 from 'd3';
import AreaChart from './AreaChart';
import MixedChart from './MixedChart';
import ProtectedLayout from '../components/ProtectedLayout';
import { useAuth } from '../context/AuthContext';
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
    subject: 'Math',
    week: 'Week 8',
    grade: 'Grade 10',
    kpi: 'Active KPI',
  });

  const [tempFilters, setTempFilters] = useState(filters);

  // Fetch lecture statistics for current and previous month
  useEffect(() => {
    const fetchLectureStats = async () => {
      try {
        setLoading(true);
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Get current month dates (first day of current month to first day of next month)
        const currentMonthStart = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
        const currentMonthEnd = new Date(currentYear, currentMonth + 1, 1, 0, 0, 0, 0);

        // Get previous month dates
        const previousMonthStart = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0);
        const previousMonthEnd = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);

        console.log('📊 Fetching lecture statistics...');
        console.log('Current month:', currentMonthStart.toISOString(), 'to', currentMonthEnd.toISOString());
        console.log('Previous month:', previousMonthStart.toISOString(), 'to', previousMonthEnd.toISOString());

        // Fetch lectures for current month
        const currentUrl = `/api/lectures?startDate=${currentMonthStart.toISOString()}&endDate=${currentMonthEnd.toISOString()}`;
        console.log('📡 Fetching current month from:', currentUrl);
        
        const currentResponse = await fetch(currentUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        console.log('Response status:', currentResponse.status, currentResponse.statusText);
        
        if (!currentResponse.ok) {
          const errorText = await currentResponse.text();
          throw new Error(`Current month fetch failed: ${currentResponse.status} ${errorText}`);
        }
        
        const currentData = await currentResponse.json();
        console.log('✅ Current month data:', currentData);
        const currentCount = currentData.count || currentData.data?.length || 0;
        console.log('Current count:', currentCount);

        // Fetch lectures for previous month
        const previousUrl = `/api/lectures?startDate=${previousMonthStart.toISOString()}&endDate=${previousMonthEnd.toISOString()}`;
        console.log('📡 Fetching previous month from:', previousUrl);
        
        const previousResponse = await fetch(previousUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        console.log('Previous response status:', previousResponse.status, previousResponse.statusText);
        
        if (!previousResponse.ok) {
          const errorText = await previousResponse.text();
          throw new Error(`Previous month fetch failed: ${previousResponse.status} ${errorText}`);
        }
        
        const previousData = await previousResponse.json();
        console.log('✅ Previous month data:', previousData);
        const previousCount = previousData.count || previousData.data?.length || 0;
        console.log('Previous count:', previousCount);

        // Calculate percentage change
        let percentageChange = 0;
        if (previousCount > 0) {
          percentageChange = ((currentCount - previousCount) / previousCount) * 100;
        }

        const isPositive = percentageChange >= 0;
        const trendText = isPositive ? '+' : '';
        const roundedPercent = Math.round(percentageChange);

        console.log('📈 Stats calculated:', { currentCount, previousCount, percentageChange: `${trendText}${roundedPercent}%` });

        setLectureStats({
          currentMonth: currentCount,
          previousMonth: previousCount,
          trend: `${trendText}${roundedPercent}%`,
          trendUp: isPositive,
        });
        
        console.log('✅ State updated successfully');
      } catch (error) {
        console.error('❌ Failed to fetch lecture statistics:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.log('Using fallback dummy data');
        // Fallback to dummy data if API fails
        const errorMsg = error.message ? error.message.substring(0, 50) : 'UNKNOWN ERROR';
        setLectureStats({
          currentMonth: 9999,
          previousMonth: 9999,
          trend: errorMsg,
          trendUp: false,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLectureStats();
  }, []);

  // Fetch teacher login statistics for current and previous month
  useEffect(() => {
    const fetchTeacherStats = async () => {
      try {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Get current month dates
        const currentMonthStart = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
        const currentMonthEnd = new Date(currentYear, currentMonth + 1, 1, 0, 0, 0, 0);

        // Get previous month dates
        const previousMonthStart = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0);
        const previousMonthEnd = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);

        console.log('👨‍🏫 Fetching teacher login statistics...');

        // Fetch teachers for current month
        const currentUrl = `/api/teachers/logins/stats?startDate=${currentMonthStart.toISOString()}&endDate=${currentMonthEnd.toISOString()}`;
        console.log('📡 Fetching current month teachers from:', currentUrl);
        
        const currentResponse = await fetch(currentUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        console.log('Teacher current response status:', currentResponse.status);
        
        if (!currentResponse.ok) {
          const errorText = await currentResponse.text();
          throw new Error(`Current month teacher fetch failed: ${currentResponse.status} ${errorText}`);
        }
        
        const currentData = await currentResponse.json();
        console.log('✅ Current month teachers:', currentData);
        const currentCount = currentData.count || currentData.data?.length || 0;

        // Fetch teachers for previous month
        const previousUrl = `/api/teachers/logins/stats?startDate=${previousMonthStart.toISOString()}&endDate=${previousMonthEnd.toISOString()}`;
        console.log('📡 Fetching previous month teachers from:', previousUrl);
        
        const previousResponse = await fetch(previousUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        console.log('Teacher previous response status:', previousResponse.status);
        
        if (!previousResponse.ok) {
          const errorText = await previousResponse.text();
          throw new Error(`Previous month teacher fetch failed: ${previousResponse.status} ${errorText}`);
        }
        
        const previousData = await previousResponse.json();
        console.log('✅ Previous month teachers:', previousData);
        const previousCount = previousData.count || previousData.data?.length || 0;

        // Calculate percentage change
        let percentageChange = 0;
        if (previousCount > 0) {
          percentageChange = ((currentCount - previousCount) / previousCount) * 100;
        }

        const isPositive = percentageChange >= 0;
        const trendText = isPositive ? '+' : '';
        const roundedPercent = Math.round(percentageChange);

        console.log('📈 Teacher stats calculated:', { currentCount, previousCount, percentageChange: `${trendText}${roundedPercent}%` });

        setTeacherStats({
          currentMonth: currentCount,
          previousMonth: previousCount,
          trend: `${trendText}${roundedPercent}%`,
          trendUp: isPositive,
        });
        
        console.log('✅ Teacher stats updated successfully');
      } catch (error) {
        console.error('❌ Failed to fetch teacher statistics:', error);
        // Fallback to dummy data if API fails
        const errorMsg = error.message ? error.message.substring(0, 50) : 'UNKNOWN ERROR';
        setTeacherStats({
          currentMonth: 452,
          previousMonth: 452,
          trend: errorMsg,
          trendUp: false,
        });
      }
    };

    fetchTeacherStats();
  }, []);

  // Fetch upload hours statistics for current and previous month
  useEffect(() => {
    const fetchUploadStats = async () => {
      try {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Get current month dates
        const currentMonthStart = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
        const currentMonthEnd = new Date(currentYear, currentMonth + 1, 1, 0, 0, 0, 0);

        // Get previous month dates
        const previousMonthStart = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0);
        const previousMonthEnd = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);

        console.log('📁 Fetching upload hours statistics...');

        // Fetch upload hours for current month
        const currentUrl = `/api/sound-files/upload-hours/stats?startDate=${currentMonthStart.toISOString()}&endDate=${currentMonthEnd.toISOString()}`;
        console.log('📡 Fetching current month upload hours from:', currentUrl);
        
        const currentResponse = await fetch(currentUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        console.log('Upload current response status:', currentResponse.status);
        
        if (!currentResponse.ok) {
          const errorText = await currentResponse.text();
          throw new Error(`Current month upload fetch failed: ${currentResponse.status} ${errorText}`);
        }
        
        const currentData = await currentResponse.json();
        console.log('✅ Current month upload:', currentData);
        const currentCount = currentData.count || 0;

        // Fetch upload hours for previous month
        const previousUrl = `/api/sound-files/upload-hours/stats?startDate=${previousMonthStart.toISOString()}&endDate=${previousMonthEnd.toISOString()}`;
        console.log('📡 Fetching previous month upload hours from:', previousUrl);
        
        const previousResponse = await fetch(previousUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        console.log('Upload previous response status:', previousResponse.status);
        
        if (!previousResponse.ok) {
          const errorText = await previousResponse.text();
          throw new Error(`Previous month upload fetch failed: ${previousResponse.status} ${errorText}`);
        }
        
        const previousData = await previousResponse.json();
        console.log('✅ Previous month upload:', previousData);
        const previousCount = previousData.count || 0;

        // Calculate percentage change
        let percentageChange = 0;
        if (previousCount > 0) {
          percentageChange = ((currentCount - previousCount) / previousCount) * 100;
        }

        const isPositive = percentageChange >= 0;
        const trendText = isPositive ? '+' : '';
        const roundedPercent = Math.round(percentageChange);

        console.log('📈 Upload stats calculated:', { currentCount, previousCount, percentageChange: `${trendText}${roundedPercent}%` });

        setUploadStats({
          currentMonth: currentCount,
          previousMonth: previousCount,
          trend: `${trendText}${roundedPercent}%`,
          trendUp: isPositive,
        });
        
        console.log('✅ Upload stats updated successfully');
      } catch (error) {
        console.error('❌ Failed to fetch upload statistics:', error);
        // Fallback to dummy data if API fails
        const errorMsg = error.message ? error.message.substring(0, 50) : 'UNKNOWN ERROR';
        setUploadStats({
          currentMonth: 8920,
          previousMonth: 8920,
          trend: errorMsg,
          trendUp: false,
        });
      }
    };

    fetchUploadStats();
  }, []);

  // Fetch user login statistics for current and previous month
  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Get current month dates
        const currentMonthStart = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
        const currentMonthEnd = new Date(currentYear, currentMonth + 1, 1, 0, 0, 0, 0);

        // Get previous month dates
        const previousMonthStart = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0);
        const previousMonthEnd = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);

        console.log('👤 Fetching user login statistics...');

        // Fetch users for current month
        const currentUrl = `/api/auth/logins/stats?startDate=${currentMonthStart.toISOString()}&endDate=${currentMonthEnd.toISOString()}`;
        console.log('📡 Fetching current month users from:', currentUrl);
        
        const currentResponse = await fetch(currentUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        console.log('User current response status:', currentResponse.status);
        
        if (!currentResponse.ok) {
          const errorText = await currentResponse.text();
          throw new Error(`Current month user fetch failed: ${currentResponse.status} ${errorText}`);
        }
        
        const currentData = await currentResponse.json();
        console.log('✅ Current month users:', currentData);
        const currentCount = currentData.count || 0;

        // Fetch users for previous month
        const previousUrl = `/api/auth/logins/stats?startDate=${previousMonthStart.toISOString()}&endDate=${previousMonthEnd.toISOString()}`;
        console.log('📡 Fetching previous month users from:', previousUrl);
        
        const previousResponse = await fetch(previousUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        console.log('User previous response status:', previousResponse.status);
        
        if (!previousResponse.ok) {
          const errorText = await previousResponse.text();
          throw new Error(`Previous month user fetch failed: ${previousResponse.status} ${errorText}`);
        }
        
        const previousData = await previousResponse.json();
        console.log('✅ Previous month users:', previousData);
        const previousCount = previousData.count || 0;

        // Calculate percentage change
        let percentageChange = 0;
        if (previousCount > 0) {
          percentageChange = ((currentCount - previousCount) / previousCount) * 100;
        }

        const isPositive = percentageChange >= 0;
        const trendText = isPositive ? '+' : '';
        const roundedPercent = Math.round(percentageChange);

        console.log('📈 User stats calculated:', { currentCount, previousCount, percentageChange: `${trendText}${roundedPercent}%` });

        setUserStats({
          currentMonth: currentCount,
          previousMonth: previousCount,
          trend: `${trendText}${roundedPercent}%`,
          trendUp: isPositive,
        });
        
        console.log('✅ User stats updated successfully');
      } catch (error) {
        console.error('❌ Failed to fetch user statistics:', error);
        // Fallback to dummy data if API fails
        const errorMsg = error.message ? error.message.substring(0, 50) : 'UNKNOWN ERROR';
        setUserStats({
          currentMonth: 12500,
          previousMonth: 12500,
          trend: errorMsg,
          trendUp: false,
        });
      }
    };

    fetchUserStats();
  }, []);

  // Fetch 8 domains from database
  useEffect(() => {
    const fetchDomains = async () => {
      try {
        console.log('📚 Fetching domains from database...');
        const response = await fetch('/api/kpis/domains/all', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        console.log('Domains response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch domains: ${response.status} ${errorText}`);
        }
        
        const data = await response.json();
        console.log('✅ Domains data:', data);
        
        // Transform domains data to include week scores
        const domainsWithWeeks = (data.data || []).map((domain) => ({
          name: domain.domain_name,
          domainCode: domain.domain_code,
          description: domain.domain_description,
          // Generate random week scores between 30 and 100
          weeks: Array.from({ length: 8 }, () => Math.floor(Math.random() * 71) + 30),
        }));
        
        console.log('📊 Transformed domains with weeks:', domainsWithWeeks);
        setDomains(domainsWithWeeks);
      } catch (error) {
        console.error('❌ Failed to fetch domains:', error);
        // Fallback with 8 sample domains
        const fallbackDomains = [
          {
            name: 'إعداد وتنفيذ خطة التعلم داخل الحصة',
            domainCode: 'D1',
            weeks: [90, 70, 80, 40, 100, 60, 90, 95],
          },
          {
            name: 'تنوع استراتيجيات التدريس',
            domainCode: 'D2',
            weeks: [40, 50, 80, 60, 70, 80, 90, 100],
          },
          {
            name: 'تهيئة البيئة التعليمية',
            domainCode: 'D3',
            weeks: [80, 90, 100, 90, 80, 30, 70, 80],
          },
          {
            name: 'الإدارة الصفية',
            domainCode: 'D4',
            weeks: [85, 75, 85, 95, 80, 75, 90, 85],
          },
          {
            name: 'تنوع أساليب التقويم داخل الحصة',
            domainCode: 'D5',
            weeks: [70, 80, 75, 85, 90, 80, 75, 70],
          },
          {
            name: 'تحليل مشاركات الطلاب وتشخيص مستوياتهم',
            domainCode: 'D6',
            weeks: [65, 70, 75, 80, 85, 90, 75, 80],
          },
          {
            name: 'توظيف تقنيات ووسائل التعلم المناسبة',
            domainCode: 'D7',
            weeks: [60, 65, 70, 75, 80, 85, 90, 80],
          },
          {
            name: 'تحسين نتائج المتعلمين',
            domainCode: 'D8',
            weeks: [75, 80, 85, 90, 80, 75, 70, 85],
          },
        ];
        setDomains(fallbackDomains);
      }
    };

    fetchDomains();
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

  const stats = [
    {
      label: 'Lectures',
      value: loading ? '-' : lectureStats.currentMonth.toLocaleString(),
      icon: '📚',
      trend: loading ? '-' : lectureStats.trend,
      trendUp: lectureStats.trendUp,
    },
    {
      label: 'Teachers',
      value: loading ? '-' : teacherStats.currentMonth.toLocaleString(),
      icon: '👥',
      trend: loading ? '-' : teacherStats.trend,
      trendUp: teacherStats.trendUp,
    },
    {
      label: 'Upload Hours',
      value: loading ? '-' : uploadStats.currentMonth.toLocaleString(),
      icon: '☁️',
      trend: loading ? '-' : uploadStats.trend,
      trendUp: uploadStats.trendUp,
    },
    {
      label: 'User Sessions',
      value: loading ? '-' : userStats.currentMonth.toLocaleString(),
      icon: '👤',
      trend: loading ? '-' : userStats.trend,
      trendUp: userStats.trendUp,
    },
  ];

  // KPIs and Subjects for dynamic table
  const [kpis, setKpis] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [kpiSubjectMatrix, setKpiSubjectMatrix] = useState([]);

  // Fetch KPIs and Subjects from backend
  useEffect(() => {
    const fetchKpisAndSubjects = async () => {
      try {
        // Fetch KPIs
        const kpiRes = await fetch('/api/kpis', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        const kpiData = await kpiRes.json();
        const kpiList = (kpiData.data || []).map(kpi => ({
          id: kpi.kpi_id,
          name: kpi.kpi_name,
        }));
        setKpis(kpiList);

        // Fetch Subjects
        const subRes = await fetch('/api/subjects', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        const subData = await subRes.json();
        const subList = (subData.data || []).map(sub => ({
          id: sub.subject_id,
          name: sub.subject_name,
        }));
        setSubjects(subList);

        // Generate random matrix for demo
        const matrix = kpiList.map(() => subList.map(() => Math.floor(Math.random() * 71) + 30));
        setKpiSubjectMatrix(matrix);
      } catch (error) {
        // fallback demo data
        setKpis([
          { name: 'Clarity' },
          { name: 'Engagement' },
          { name: 'Pacing' },
          { name: 'Assessment' },
        ]);
        setSubjects([
          { name: 'Math' },
          { name: 'Science' },
          { name: 'English' },
          { name: 'History' },
        ]);
        setKpiSubjectMatrix([
          [90, 60, 40, 80],
          [100, 70, 95, 30],
          [80, 75, 85, 100],
          [85, 95, 70, 60],
        ]);
      }
    };
    fetchKpisAndSubjects();
  }, []);

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
      <div className="mx-auto max-w-[1500px]">
        {/* Welcome Section */}
        <section className="mb-0 pt-2 -mt-4">
          <h2 className="font-headline mb-0 text-5xl font-bold tracking-[-0.08em] text-[var(--dashboard-primary)]">
            Welcome back, {user?.name || 'User'}
          </h2>
          <p className="max-w-2xl text-[#62746d] text-sm -mb-2">
            Your dashboard is ready with the latest insights from your lessons this week.
          </p>
        </section>

        {/* Stats Section */}
        <section className="mb-1 -mt-2 grid grid-cols-1 gap-0 md:grid-cols-4">
          {/* Lectures Analyzed */}
          <div className="dashboard-panel dashboard-ghost-top px-8 py-8">
            <p className="font-dashboard-mono mb-4 text-[10px] uppercase tracking-[0.28em] text-[#7e8f89]">Lectures Analyzed</p>
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-[3.5rem] font-bold leading-none tracking-[-0.05em] text-[var(--dashboard-primary)]">
                {loading ? '-' : lectureStats.currentMonth}
              </span>
              <span className="text-sm text-[#51555c]">{loading ? '-' : lectureStats.trend}</span>
            </div>
          </div>

          {/* Average KPI Score */}
          <div className="dashboard-panel-soft dashboard-ghost-top px-8 py-8">
            <p className="font-dashboard-mono mb-4 text-[10px] uppercase tracking-[0.28em] text-[#7e8f89]">This academic term</p>
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-[3.5rem] font-bold leading-none tracking-[-0.05em] text-[var(--dashboard-primary)]">
                82
              </span>
              <span className="font-headline text-2xl text-[rgba(0,96,73,0.6)]">%</span>
            </div>
          </div>

          {/* Top Strength */}
          <div className="dashboard-panel dashboard-ghost-top px-8 py-8">
            <p className="font-dashboard-mono mb-4 text-[10px] uppercase tracking-[0.28em] text-[#7e8f89]">Top Strength</p>
            <div className="flex flex-col">
              <span className="font-headline mb-2 text-xl font-bold text-[#172b26]">Questioning</span>
              <div className="flex items-baseline gap-1">
                <span className="font-headline text-3xl font-bold leading-none tracking-[-0.05em] text-[var(--dashboard-primary)]">
                  94
                </span>
                <span className="font-dashboard-mono text-xs text-[#7f938a]">/100</span>
              </div>
            </div>
          </div>

          {/* Area to Improve */}
          <div className="dashboard-panel-soft dashboard-ghost-top px-8 py-8">
            <p className="font-dashboard-mono mb-4 text-[10px] uppercase tracking-[0.28em] text-[#7e8f89]">Area to Improve</p>
            <div className="flex flex-col">
              <span className="font-headline mb-2 text-xl font-bold text-[#172b26]">Wait Time</span>
              <div className="flex items-baseline gap-1">
                <span className="font-headline text-3xl font-bold leading-none tracking-[-0.05em] text-[var(--dashboard-primary)]">
                  8
                </span>
                <span className="font-dashboard-mono text-xs text-[#7f938a]">s avg</span>
              </div>
            </div>
          </div>
        </section>

        {/* Header with Filters */}
        <div className="space-y-0 mb-2">
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
      </div>

      {/* KPI Overview Cards */}
      <section className="mb-0 -mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-transform hover:shadow-md"
          >
            <div className="mb-2 flex items-start justify-between">
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
            <p className="mt-1 text-3xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </section>

      {/* Heatmaps */}
      <section className="mb-0 -mt-1 space-y-2">
        {/* Domains Score vs Weeks */}
        <div className="rounded-3xl border border-gray-200 bg-white p-8">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-headline text-xl font-bold text-gray-900">Domains Score vs Weeks</h2>
              <p className="mt-2 text-sm text-gray-600">8-week performance progression across all domains</p>
            </div>
            <span className="text-2xl">📊</span>
          </div>
          <div className="space-y-2 overflow-x-auto pb-1">
            {/* Week Labels Header */}
            <div className="flex items-stretch">
              <div className="w-40 flex-shrink-0 pr-3"></div>
              <div className="flex flex-1 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((week) => (
                  <div key={`week-${week}`} className="flex-1 flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-700 bg-gray-100 w-full py-2 flex items-center justify-center rounded-lg">W{week}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Divider */}
            <div className="border-b border-gray-200"></div>
            {domains.map((domain, idx) => (
              <div key={idx} className="flex items-stretch hover:bg-gray-50 rounded-lg transition-colors px-2 py-0.5 gap-1.5">
                <div className="w-40 flex-shrink-0 pr-1 flex items-center">
                  <p className="text-sm font-semibold text-gray-900 line-clamp-2">{domain.name}</p>
                </div>
                <div className="flex flex-1 gap-1.5">
                  {domain.weeks.map((value, weekIdx) => (
                    <div
                      key={weekIdx}
                      className={`flex-1 rounded-xl transition-all hover:scale-105 cursor-pointer flex items-center justify-center text-sm font-bold py-3 ${getHeatmapColor(
                        value,
                        value < 50,
                      )} ${getOpacityClass(value)}`}
                      title={`Week ${weekIdx + 1}: ${value}%`}
                    >
                      <span className="text-gray-800">{value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Domains vs Subject */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-headline text-lg font-bold text-gray-900">Domains vs Subject</h2>
            <span className="text-gray-400">📊</span>
          </div>
          <div className="space-y-2 overflow-x-auto">
            <div className="flex items-center text-xs font-bold uppercase tracking-widest text-gray-500">
              <div className="w-32">KPI Name</div>
              <div className="flex flex-1 justify-between px-2">
                {subjects.map((sub, idx) => (
                  <span key={idx} className="w-20 text-center">{sub.name}</span>
                ))}
              </div>
            </div>
            {domains.map((domain, idx) => (
              <div key={idx} className="flex items-center">
                <div className="w-32 text-xs font-semibold text-gray-900">{domain.name}</div>
                <div className="flex flex-1 justify-between px-1 gap-2">
                  {subjects.map((sub, subIdx) => {
                    const value = domain.weeks?.[subIdx] ?? Math.floor(Math.random() * 71) + 30;
                    return (
                      <div
                        key={subIdx}
                        className={`h-10 w-20 rounded-xl transition-all hover:scale-105 cursor-pointer ${getHeatmapColor(
                          value,
                          value < 50,
                        )} ${getOpacityClass(value)}`}
                        title={`${value}%`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Charts Section */}
      <section className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Teacher Performance Metrics - ECharts Mixed Bar & Line Chart */}
        <MixedChart />

        {/* Section Overall Score - D3 Area Chart */}
        <AreaChart />
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
