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
        const currentUrl = getApiUrl(`/api/lectures?startDate=${currentMonthStart.toISOString()}&endDate=${currentMonthEnd.toISOString()}`);
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
        const previousUrl = getApiUrl(`/api/lectures?startDate=${previousMonthStart.toISOString()}&endDate=${previousMonthEnd.toISOString()}`);
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
        const currentUrl = getApiUrl(`/api/teachers/logins/stats?startDate=${currentMonthStart.toISOString()}&endDate=${currentMonthEnd.toISOString()}`);
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
        const previousUrl = getApiUrl(`/api/teachers/logins/stats?startDate=${previousMonthStart.toISOString()}&endDate=${previousMonthEnd.toISOString()}`);
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
        const currentUrl = getApiUrl(`/api/sound-files/upload-hours/stats?startDate=${currentMonthStart.toISOString()}&endDate=${currentMonthEnd.toISOString()}`);
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
        const previousUrl = getApiUrl(`/api/sound-files/upload-hours/stats?startDate=${previousMonthStart.toISOString()}&endDate=${previousMonthEnd.toISOString()}`);
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
        const currentUrl = getApiUrl(`/api/auth/logins/stats?startDate=${currentMonthStart.toISOString()}&endDate=${currentMonthEnd.toISOString()}`);
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
        const previousUrl = getApiUrl(`/api/auth/logins/stats?startDate=${previousMonthStart.toISOString()}&endDate=${previousMonthEnd.toISOString()}`);
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
        const response = await fetch(getApiUrl('/api/kpis/domains/all'), {
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
          name: domain.domain_name_en || domain.domain_name || domain.name,
          domainCode: domain.domain_code,
          description: domain.domain_description,
          // Generate random week scores between 30 and 100
          weeks: Array.from({ length: 8 }, () => Math.floor(Math.random() * 71) + 30),
        }));
        
        console.log('📊 Transformed domains with weeks:', domainsWithWeeks);
        setDomains(domainsWithWeeks);
      } catch (error) {
        console.error('❌ Failed to fetch domains:', error);
        // Fallback with 8 sample domains - Arabic names from database
        const fallbackDomains = [
          { name: 'Domain 1: In-Class Lesson Planning & Execution', domainCode: 'D1', weeks: [90, 70, 80, 40, 100, 60, 90, 95] },
          { name: 'Domain 2: Diversity of Teaching Strategies', domainCode: 'D2', weeks: [40, 50, 80, 60, 70, 80, 90, 100] },
          { name: 'Domain 3: Learning Environment', domainCode: 'D3', weeks: [80, 90, 100, 90, 80, 30, 70, 80] },
          { name: 'Domain 4: Classroom Management', domainCode: 'D4', weeks: [85, 75, 85, 95, 80, 75, 90, 85] },
          { name: 'Domain 5: Diversity of In-Class Assessment', domainCode: 'D5', weeks: [70, 80, 75, 85, 90, 80, 75, 70] },
          { name: 'Domain 6: Analysing Student Responses & Diagnosing Learning Levels', domainCode: 'D6', weeks: [65, 70, 75, 80, 85, 90, 75, 80] },
          { name: 'Domain 7: Use of Technology & Learning Resources', domainCode: 'D7', weeks: [60, 65, 70, 75, 80, 85, 90, 80] },
          { name: 'Domain 8: Improving Learner Outcomes', domainCode: 'D8', weeks: [75, 80, 85, 90, 80, 75, 70, 85] },
        ];
        setDomains(fallbackDomains);
        
        // Also set fallback subjects
        const fallbackSubjects = [
          { id: 1, name: 'Math' },
          { id: 2, name: 'Science' },
          { id: 3, name: 'English' },
          { id: 4, name: 'History' },
          { id: 5, name: 'Arabic' },
          { id: 6, name: 'Geography' },
          { id: 7, name: 'Social Studies' },
          { id: 8, name: 'Physical Education' },
        ];
        setSubjects(fallbackSubjects);
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

  // KPIs and Subjects for dynamic table
  const [kpis, setKpis] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [kpiSubjectMatrix, setKpiSubjectMatrix] = useState([]);

  // Fetch KPIs and Subjects from backend
  useEffect(() => {
    const fetchKpisAndSubjects = async () => {
      try {
        console.log('📖 Fetching KPIs and Subjects...');
        
        // Fetch KPIs
        console.log('🔍 Calling /api/kpis endpoint...');
        const kpiRes = await fetch(getApiUrl('/api/kpis'), {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        console.log('KPIs response status:', kpiRes.status);
        const kpiData = await kpiRes.json();
        console.log('✅ KPI data received:', kpiData);
        
        const kpiList = (kpiData.data || []).map(kpi => ({
          id: kpi.kpi_id,
          name: kpi.kpi_name,
        }));
        console.log('📋 Transformed KPI list:', kpiList);
        setKpis(kpiList);

        // Fetch Subjects
        console.log('🔍 Calling /api/subjects endpoint...');
        const subRes = await fetch(getApiUrl('/api/subjects'), {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        console.log('Subjects response status:', subRes.status);
        const subData = await subRes.json();
        console.log('✅ Subject data received:', subData);
        
        const subList = (subData.data || []).map(sub => ({
          id: sub.subject_id,
          name: sub.subject_name,
        }));
        console.log('📋 Transformed subject list (LENGTH=' + subList.length + '):', subList);
        setSubjects(subList);
        console.log('✅ setSubjects called with:', subList);

        // Generate random matrix for demo
        const matrix = kpiList.map(() => subList.map(() => Math.floor(Math.random() * 71) + 30));
        setKpiSubjectMatrix(matrix);
        console.log('✅ KPI/Subject matrix generated:', matrix.length, 'x', matrix[0]?.length);
      } catch (error) {
        console.error('❌ Error fetching KPIs/Subjects:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // fallback demo data
        console.log('📦 Using fallback demo data for KPIs and Subjects');
        const fallbackKpis = [
          { id: 1, name: 'Clarity' },
          { id: 2, name: 'Engagement' },
          { id: 3, name: 'Pacing' },
          { id: 4, name: 'Assessment' },
          { id: 5, name: 'Organization' },
          { id: 6, name: 'Communication' },
          { id: 7, name: 'Feedback' },
          { id: 8, name: 'Participation' },
        ];
        const fallbackSubjects = [
          { id: 1, name: 'Math' },
          { id: 2, name: 'Science' },
          { id: 3, name: 'English' },
          { id: 4, name: 'History' },
          { id: 5, name: 'Arabic' },
          { id: 6, name: 'Geography' },
          { id: 7, name: 'Social Studies' },
          { id: 8, name: 'Physical Education' },
        ];
        setKpis(fallbackKpis);
        setSubjects(fallbackSubjects);
        const fallbackMatrix = fallbackKpis.map(() => fallbackSubjects.map(() => Math.floor(Math.random() * 71) + 30));
        setKpiSubjectMatrix(fallbackMatrix);
        
        console.log('📦 Fallback KPIs set:', fallbackKpis);
        console.log('📦 Fallback Subjects set:', fallbackSubjects);
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
          <h2 className="font-headline mb-0 text-5xl font-bold text-[var(--dashboard-primary)]">
            Welcome back, {user?.name || 'User'}
          </h2>
          <p className="max-w-2xl text-sm -mb-2" style={{color: '#006d4a'}}>
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
            <h1 className="font-headline text-3xl font-bold tracking-tight" style={{color: '#005239'}}>
              Teacher Performance Dashboard
            </h1>
            <p className="mt-2 text-sm" style={{color: '#006d4a'}}>Real-time analytics and evidence-based insights</p>
          </div>
        </div>

      {/* Filter Bar */}
        <div className="rounded-2xl p-4 shadow-sm" style={{ background: 'linear-gradient(180deg, #006d4a 0%, #005239 100%)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {/* Filter Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors"
            >
              <span>🔍</span> Filters
            </button>
            {!showFilterPanel && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white">
                  Subject: {filters.subject}
                </span>
                <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white">
                  {filters.week}
                </span>
                <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white">
                  {filters.grade}
                </span>
                <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white">
                  {filters.kpi}
                </span>
              </div>
            )}
          </div>

          {/* Expandable Filter Panel */}
          {showFilterPanel && (
            <div className="filter-panel space-y-4 mb-4 pt-4 border-t border-white/20">
              {/* Subject Filter */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
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
                  <label className="block text-sm font-semibold text-white mb-2">
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
                  <label className="block text-sm font-semibold text-white mb-2">
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
                  <label className="block text-sm font-semibold text-white mb-2">
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
              <div className="flex justify-end gap-3 pt-4 border-t border-white/20">
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 text-sm font-semibold text-white border border-white/40 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={handleApplyFilters}
                  className="px-4 py-2 text-sm font-semibold text-white bg-emerald-500 rounded-lg hover:bg-emerald-400 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          )}

          {/* Fixed Performance Overview Text */}
          {!showFilterPanel && (
            <div className="flex justify-between items-center pt-2 border-t border-white/10">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-200">
                Performance Overview
              </span>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* KPI Overview Cards */}
      <section className="mb-0 -mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4" style={{marginBottom: '-8px'}}>
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="rounded-2xl p-4 shadow-sm transition-transform hover:shadow-md"
            style={{ background: 'linear-gradient(180deg, #006d4a 0%, #005239 100%)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="mb-2 flex items-start justify-between">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm"
                style={{ background: stat.iconBg }}
              >
                {stat.icon}
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  stat.trendUp
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  {stat.trendUp
                    ? <polyline points="1,8 5,2 9,8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    : <polyline points="1,2 5,8 9,2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  }
                </svg>
                {stat.trend}
              </span>
            </div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-emerald-200">
              {stat.label}
            </h3>
            <p className="mt-1 text-3xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </section>

      {/* Heatmaps */}
      <section className="mb-0 mt-2 space-y-2">
        {/* Domains Score vs Weeks */}
        <div className="rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 p-8 shadow-2xl border border-emerald-700">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-headline text-2xl font-black text-white">Domains Score vs Weeks</h2>
              <p className="mt-2 text-sm text-emerald-200">8-week performance progression across all domains</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg" style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)', border: '1px solid rgba(255,255,255,0.15)'}}>
              <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="dsw-bar1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399"/>
                    <stop offset="100%" stopColor="#059669"/>
                  </linearGradient>
                  <linearGradient id="dsw-bar2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24"/>
                    <stop offset="100%" stopColor="#d97706"/>
                  </linearGradient>
                  <linearGradient id="dsw-bar3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8"/>
                    <stop offset="100%" stopColor="#6366f1"/>
                  </linearGradient>
                  <linearGradient id="dsw-bar4" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb923c"/>
                    <stop offset="100%" stopColor="#ea580c"/>
                  </linearGradient>
                </defs>
                {/* Bar chart */}
                <rect x="2" y="16" width="5" height="11" rx="1.5" fill="url(#dsw-bar1)"/>
                <rect x="9" y="10" width="5" height="17" rx="1.5" fill="url(#dsw-bar2)"/>
                <rect x="16" y="13" width="5" height="14" rx="1.5" fill="url(#dsw-bar3)"/>
                <rect x="23" y="6" width="5" height="21" rx="1.5" fill="url(#dsw-bar4)"/>
                {/* Trend line */}
                <polyline points="4.5,15 11.5,9 18.5,11 25.5,5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7"/>
                <circle cx="4.5" cy="15" r="1.5" fill="white" opacity="0.9"/>
                <circle cx="11.5" cy="9" r="1.5" fill="white" opacity="0.9"/>
                <circle cx="18.5" cy="11" r="1.5" fill="white" opacity="0.9"/>
                <circle cx="25.5" cy="5" r="1.5" fill="white" opacity="0.9"/>
              </svg>
            </div>
          </div>
          <div className="space-y-3 overflow-x-auto pb-1">
            {/* Week Labels Header */}
            <div className="flex items-stretch gap-3">
              <div className="w-40 flex-shrink-0 pr-3 flex items-center">
                <div className="text-xs font-black uppercase tracking-widest text-emerald-300">Domain</div>
              </div>
              <div className="flex flex-1 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((week) => (
                  <div key={`week-${week}`} className="flex-1 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-black text-emerald-200 bg-emerald-700 bg-opacity-50 w-full py-2 flex items-center justify-center rounded-lg border border-emerald-600">W{week}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Divider */}
            <div className="border-b border-emerald-700"></div>
            {domains.map((domain, idx) => (
              <div key={idx} className="flex items-stretch hover:bg-emerald-700 hover:bg-opacity-20 rounded-lg transition-all px-3 py-2 gap-3 group">
                <div className="w-40 flex-shrink-0 pr-2 flex items-center">
                  <p className="text-sm font-black text-white line-clamp-2 group-hover:text-emerald-300 transition-colors">{domain.name}</p>
                </div>
                <div className="flex flex-1 gap-3">
                  {domain.weeks.map((value, weekIdx) => {
                    let gradient, glowColor, textColor = '#fff';
                    if (value >= 90) {
                      gradient = 'linear-gradient(135deg, #059669 0%, #10b981 100%)';
                      glowColor = '#059669';
                    } else if (value >= 75) {
                      gradient = 'linear-gradient(135deg, #10b981 0%, #34d399 100%)';
                      glowColor = '#10b981';
                    } else if (value >= 60) {
                      gradient = 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)';
                      glowColor = '#d97706';
                    } else if (value >= 40) {
                      gradient = 'linear-gradient(135deg, #dc2626 0%, #f87171 100%)';
                      glowColor = '#dc2626';
                    } else {
                      gradient = 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)';
                      glowColor = '#7f1d1d';
                    }
                    return (
                      <div
                        key={weekIdx}
                        className="flex-1 rounded-2xl transition-all hover:scale-110 cursor-pointer flex items-center justify-center text-sm font-black py-3 flex-shrink-0"
                        style={{
                          background: gradient,
                          opacity: value / 100,
                          boxShadow: `0 4px 14px ${glowColor}60, inset 0 1px 0 rgba(255,255,255,0.25)`,
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: textColor,
                        }}
                        title={`Week ${weekIdx + 1}: ${value}%`}
                      >
                        <span className="drop-shadow font-black">{value}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Domains vs Subject - Professional Performance Matrix */}
        <div className="rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-900 p-8 shadow-2xl border border-emerald-700">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="font-headline text-3xl font-black text-white">Domain vs Subject</h2>
                <p className="text-emerald-200 mt-2">Real-time domain performance across all subjects - Track progress instantly</p>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg" style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)', border: '1px solid rgba(255,255,255,0.15)'}}>
                <svg width="34" height="34" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="pm-grad1" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#34d399"/>
                      <stop offset="100%" stopColor="#059669"/>
                    </linearGradient>
                    <linearGradient id="pm-grad2" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#fbbf24"/>
                      <stop offset="100%" stopColor="#f59e0b"/>
                    </linearGradient>
                    <linearGradient id="pm-grad3" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#f87171"/>
                      <stop offset="100%" stopColor="#ef4444"/>
                    </linearGradient>
                    <linearGradient id="pm-grad4" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#818cf8"/>
                      <stop offset="100%" stopColor="#6366f1"/>
                    </linearGradient>
                  </defs>
                  {/* Grid matrix dots */}
                  <rect x="3" y="3" width="8" height="8" rx="2" fill="url(#pm-grad1)" opacity="0.95"/>
                  <rect x="13" y="3" width="8" height="8" rx="2" fill="url(#pm-grad1)" opacity="0.6"/>
                  <rect x="23" y="3" width="8" height="8" rx="2" fill="url(#pm-grad2)" opacity="0.8"/>
                  <rect x="3" y="13" width="8" height="8" rx="2" fill="url(#pm-grad2)" opacity="0.7"/>
                  <rect x="13" y="13" width="8" height="8" rx="2" fill="url(#pm-grad1)" opacity="0.95"/>
                  <rect x="23" y="13" width="8" height="8" rx="2" fill="url(#pm-grad3)" opacity="0.85"/>
                  <rect x="3" y="23" width="8" height="8" rx="2" fill="url(#pm-grad3)" opacity="0.6"/>
                  <rect x="13" y="23" width="8" height="8" rx="2" fill="url(#pm-grad4)" opacity="0.8"/>
                  <rect x="23" y="23" width="8" height="8" rx="2" fill="url(#pm-grad1)" opacity="0.9"/>
                </svg>
              </div>
            </div>
            <div className="h-1 w-16 bg-gradient-to-r from-amber-300 via-emerald-300 to-rose-300 rounded-full"></div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-400 rounded-2xl p-4 border border-emerald-300 shadow-lg shadow-emerald-400/50">
              <div className="text-sm font-semibold text-white uppercase tracking-wider font-black">Excellent</div>
              <div className="text-3xl font-black text-white mt-1 drop-shadow-lg">
                {Math.floor(Math.random() * 30) + 50}%
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-amber-400 rounded-2xl p-4 border border-amber-300 shadow-lg shadow-amber-400/50">
              <div className="text-sm font-semibold text-white uppercase tracking-wider font-black">Good</div>
              <div className="text-3xl font-black text-white mt-1 drop-shadow-lg">
                {Math.floor(Math.random() * 30) + 20}%
              </div>
            </div>
            <div className="bg-gradient-to-br from-rose-500 to-rose-400 rounded-2xl p-4 border border-rose-300 shadow-lg shadow-rose-400/50">
              <div className="text-sm font-semibold text-white uppercase tracking-wider font-black">Needs Work</div>
              <div className="text-3xl font-black text-white mt-1 drop-shadow-lg">
                {Math.floor(Math.random() * 30) + 10}%
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="space-y-4 min-w-max">
              {/* Header Row */}
              <div className="flex items-center gap-3 pb-4 border-b border-emerald-700">
                <div className="w-40 pr-4 flex-shrink-0">
                  <div className="text-xs font-black uppercase tracking-widest text-emerald-300">📌 Domain</div>
                </div>
                <div className="flex gap-3">
                  {subjects.map((sub, idx) => (
                    <div key={idx} className="w-24 text-center flex-shrink-0">
                      <div className="text-xs font-black uppercase tracking-wider text-emerald-200 whitespace-nowrap">
                        {sub.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Rows */}
              {domains.map((domain, idx) => (
                <div key={idx} className="flex items-start gap-3 pb-4 group hover:bg-emerald-700 hover:bg-opacity-30 px-4 py-3 rounded-2xl transition-all duration-300">
                  <div className="w-40 pr-4 flex-shrink-0 pt-2">
                    <div className="text-sm font-black text-white leading-snug group-hover:text-emerald-300 transition-colors">
                      {domain.name}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {subjects.map((sub, subIdx) => {
                      const value = domain.weeks?.[subIdx] ?? Math.floor(Math.random() * 71) + 30;
                      const isExcellent = value >= 85;
                      const isGood = value >= 70;
                      const opacity = value / 100;
                      
                      // Vibrant, bright color scheme with maximum shine
                      let bgColor = '#ff6b9d'; // rose vibrant (needs improvement)
                      let bgColorLight = '#ff85b3'; // rose light
                      if (isGood && !isExcellent) {
                        bgColor = '#ffc107'; // amber vibrant (good)
                        bgColorLight = '#ffd54f'; // amber light
                      }
                      if (isExcellent) {
                        bgColor = '#00e5a0'; // emerald vibrant (excellent)
                        bgColorLight = '#26f0ce'; // emerald light
                      }
                      
                      return (
                        <div
                          key={subIdx}
                          className={`
                            w-24 h-24 rounded-2xl flex flex-col items-center justify-center
                            transition-all duration-300 cursor-pointer flex-shrink-0
                            border-2 border-white border-opacity-40
                            shadow-lg hover:shadow-2xl hover:scale-110
                            group/card relative
                            backdrop-blur-sm
                          `}
                          style={{ 
                            backgroundColor: bgColor,
                            opacity: opacity,
                            boxShadow: `0 0 15px ${bgColor}60, inset 0 1px 0 rgba(255,255,255,0.3)`
                          }}
                          title={`${domain.name} - ${sub.name}: ${value}%`}
                        >
                          {/* Score Text */}
                          <div className="text-2xl font-black text-white drop-shadow-lg">
                            {value}%
                          </div>
                          
                          {/* Grade Badge */}
                          <div className="text-xs font-black text-white opacity-90 drop-shadow-md mt-0.5">
                            {isExcellent ? '⭐ Excellent' : isGood ? '✓ Good' : '⚠ Improve'}
                          </div>

                          {/* Hover Info */}
                          <div className="
                            absolute -top-14 left-1/2 transform -translate-x-1/2
                            bg-emerald-950 text-white px-4 py-2 rounded-xl
                            text-xs font-bold whitespace-nowrap
                            opacity-0 group-hover/card:opacity-100
                            transition-opacity duration-200
                            pointer-events-none border border-emerald-700
                            shadow-xl
                          ">
                            {domain.name} → {sub.name}
                          </div>

                          {/* Corner indicator */}
                          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-white opacity-40"></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enhanced Legend */}
          <div className="mt-8 pt-6 border-t border-emerald-700 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3 group">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg group-hover:scale-110 transition-transform"></div>
              <div>
                <div className="text-xs font-bold uppercase text-emerald-300">Excellent</div>
                <div className="text-sm font-semibold text-emerald-200">85-100%</div>
              </div>
            </div>
            <div className="flex items-center gap-3 group">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-300 to-amber-500 shadow-lg group-hover:scale-110 transition-transform"></div>
              <div>
                <div className="text-xs font-bold uppercase text-emerald-300">Good</div>
                <div className="text-sm font-semibold text-emerald-200">70-84%</div>
              </div>
            </div>
            <div className="flex items-center gap-3 group">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-rose-300 to-rose-500 shadow-lg group-hover:scale-110 transition-transform"></div>
              <div>
                <div className="text-xs font-bold uppercase text-emerald-300">Needs Improvement</div>
                <div className="text-sm font-semibold text-emerald-200">0-69%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Charts Section */}
      <section className="mb-2 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Teacher Performance Metrics - ECharts Mixed Bar & Line Chart */}
        <MixedChart />

        {/* Progress Tracking - ECharts Watermark Chart */}
        <WatermarkChart />
      </section>

      {/* Evidence Samples Table */}
      <section>
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
                    Score
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-emerald-100">
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
