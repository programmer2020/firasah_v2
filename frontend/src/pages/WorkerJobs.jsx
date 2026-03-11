import React, { useEffect, useState } from 'react';
import ProtectedLayout from '../components/ProtectedLayout';
import api from '../services/api';

const FALLBACK_SCHEDULE = '0 */12 * * *';

const WorkerJobs = () => {
  const [statusPayload, setStatusPayload] = useState(null);
  const [schedule, setSchedule] = useState(FALLBACK_SCHEDULE);
  const [statusLoading, setStatusLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastRunResult, setLastRunResult] = useState(null);

  const loadStatus = async () => {
    setError('');
    setStatusLoading(true);
    try {
      const response = await api.get('/config/worker/status');
      const payload = response.data;
      setStatusPayload(payload);

      const defaultSchedule = payload?.defaults?.schedule || FALLBACK_SCHEDULE;
      const currentSchedule = payload?.worker?.pgCron?.schedule || defaultSchedule;
      setSchedule(currentSchedule);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'فشل تحميل حالة الـ Worker');
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const withAction = async (action) => {
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      await action();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'حدث خطأ غير متوقع');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunNow = async () => {
    await withAction(async () => {
      const response = await api.post('/config/worker/run');
      const result = response.data?.data || null;
      setLastRunResult(result);
      setSuccess('تم تشغيل الـ Worker بنجاح.');
      await loadStatus();
    });
  };

  const handleEnableSchedule = async () => {
    await withAction(async () => {
      const normalized = (schedule || '').trim() || FALLBACK_SCHEDULE;
      await api.post('/config/worker/schedule/enable', {
        schedule: normalized,
      });
      setSuccess('تم تفعيل الجدولة بنجاح (pg_cron أو fallback in-app).');
      await loadStatus();
    });
  };

  const handleDisableSchedule = async () => {
    await withAction(async () => {
      await api.post('/config/worker/schedule/disable');
      setSuccess('تم إيقاف جميع جدولات الـ Worker.');
      await loadStatus();
    });
  };

  const database = statusPayload?.database;
  const worker = statusPayload?.worker;
  const pgCron = worker?.pgCron;
  const inApp = worker?.inApp;
  const activeMode = worker?.activeMode || 'none';
  const usingInAppFallback = activeMode === 'in_app' && Boolean(worker?.enabled);
  const schedulerHealthy = Boolean(worker?.enabled) && (activeMode === 'pg_cron' || activeMode === 'in_app') && !inApp?.lastError;
  const pgCronStatusText = pgCron?.pgCronAvailable
    ? 'متاح'
    : usingInAppFallback
      ? 'غير مستخدم (fallback يعمل)'
      : 'غير متاح';
  const pgCronStatusClass = pgCron?.pgCronAvailable
    ? 'text-green-700'
    : usingInAppFallback
      ? 'text-sky-700'
      : 'text-red-700';
  const manualRunStatusText = lastRunResult
    ? (lastRunResult.skipped ? 'تم التخطي (تشغيل متزامن)' : 'تم التنفيذ بنجاح')
    : '-';
  const manualRunStatusClass = lastRunResult?.skipped ? 'text-amber-700' : 'text-green-700';

  return (
    <ProtectedLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-brand-600">إدارة Worker التقييم</h1>
            <p className="text-gray-600 mt-1">
              شغّل الـ Worker يدويًا في أي وقت أو فعّل الجدولة كل 12 ساعة (pg_cron مع fallback تلقائي).
            </p>
          </div>
          <button
            onClick={loadStatus}
            disabled={statusLoading || actionLoading}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            تحديث الحالة
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 text-green-700 px-4 py-3">
            {success}
          </div>
        )}

        {usingInAppFallback && schedulerHealthy && (
          <div className="rounded-lg border border-green-200 bg-green-50 text-green-800 px-4 py-3">
            الجدولة تعمل بشكل طبيعي عبر in-app fallback، ولا يوجد أي خطأ حالي.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow p-4 border">
            <p className="text-sm text-gray-500">قاعدة البيانات الحالية</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{database?.type || '...'}</p>
            <p className="text-sm text-gray-500 mt-1">{database?.host || '-'}</p>
          </div>

          <div className="bg-white rounded-xl shadow p-4 border">
            <p className="text-sm text-gray-500">حالة pg_cron</p>
            <p className={`text-lg font-semibold mt-1 ${pgCronStatusClass}`}>
              {pgCronStatusText}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {usingInAppFallback ? 'غير مطلوب حاليًا لأن fallback نشط.' : (pgCron?.info || '-')}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-4 border">
            <p className="text-sm text-gray-500">وضع الجدولة الفعّال</p>
            <p className={`text-lg font-semibold mt-1 ${worker?.enabled ? 'text-green-700' : 'text-gray-700'}`}>
              {activeMode === 'pg_cron' && 'pg_cron'}
              {activeMode === 'in_app' && 'in-app'}
              {activeMode === 'none' && 'غير مفعّل'}
            </p>
            <p className="text-sm text-gray-500 mt-1">{worker?.schedule || 'لا توجد جدولة'}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5 border space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">أوامر التحكم</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleRunNow}
              disabled={actionLoading || statusLoading}
              className="px-4 py-3 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              تشغيل الـ Worker الآن
            </button>

            <button
              onClick={handleDisableSchedule}
              disabled={actionLoading || statusLoading || !worker?.enabled}
              className="px-4 py-3 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
            >
              إيقاف كل الجدولات
            </button>
          </div>

          <div className="pt-2 border-t">
            <label className="block text-sm text-gray-600 mb-2">Cron Expression (كل 12 ساعة افتراضيًا)</label>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                disabled={actionLoading || statusLoading}
                dir="ltr"
                className="flex-1 min-w-[260px] px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm text-left"
                placeholder={FALLBACK_SCHEDULE}
              />
              <button
                onClick={handleEnableSchedule}
                disabled={actionLoading || statusLoading}
                className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
              >
                تفعيل الجدولة (pg_cron / fallback)
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              في حالة عدم توفر pg_cron سيتم التبديل تلقائيًا إلى in-app scheduler بنفس التكرار قدر الإمكان.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5 border">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">حالة in-app Scheduler</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
            <div className="p-3 rounded-lg bg-gray-50 border">
              <p className="text-gray-500">Enabled</p>
              <p className="font-semibold">{String(Boolean(inApp?.enabled))}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 border">
              <p className="text-gray-500">Interval</p>
              <p className="font-semibold">{inApp?.intervalMs || 0} ms</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 border">
              <p className="text-gray-500">Next Run</p>
              <p className="font-semibold">{inApp?.nextRunAt || '-'}</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 border">
              <p className="text-gray-500">Last Error</p>
              <p className="font-semibold">{inApp?.lastError || '-'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5 border">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">آخر تشغيل يدوي</h2>
          {lastRunResult ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-gray-50 border">
                  <p className="text-gray-500">حالة التشغيل</p>
                  <p className={`font-semibold ${manualRunStatusClass}`}>{manualRunStatusText}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 border">
                  <p className="text-gray-500">Groups</p>
                  <p className="font-semibold">{lastRunResult.groupsProcessed}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 border">
                  <p className="text-gray-500">Evidences</p>
                  <p className="font-semibold">{lastRunResult.evidencesProcessed}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 border">
                  <p className="text-gray-500">Marked</p>
                  <p className="font-semibold">{lastRunResult.evidencesMarked}</p>
                </div>
              </div>

              {!lastRunResult.skipped && lastRunResult.evidencesProcessed === 0 && (
                <p className="text-sm text-gray-500">
                  التشغيل تم بنجاح، لكن لا توجد evidences جديدة غير محسوبة حاليًا.
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500">لم يتم تشغيل يدوي حتى الآن.</p>
          )}
        </div>
      </div>
    </ProtectedLayout>
  );
};

export default WorkerJobs;
