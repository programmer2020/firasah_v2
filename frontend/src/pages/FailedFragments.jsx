import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ProtectedLayout from '../components/ProtectedLayout';
import api from '../services/api';
import useAutoHideMessage from '../hooks/useAutoHideMessage';

const FailedFragments = () => {
  const [searchParams] = useSearchParams();
  const [fragments, setFragments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);
  const [retryProgress, setRetryProgress] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const retryPollRef = useRef(null);
  const fileIdFilter = searchParams.get('fileId');
  const filteredFragments = fileIdFilter
    ? fragments.filter((fragment) => String(fragment.file_id) === String(fileIdFilter))
    : fragments;

  useAutoHideMessage(success, setSuccess);
  useAutoHideMessage(error, setError);

  const fetchFailedFragments = async () => {
    setLoading(true);
    try {
      const response = await api.get('/sound-files/fragments/failed');
      setFragments(response.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'فشل تحميل المقاطع الفاشلة');
    } finally {
      setLoading(false);
    }
  };

  const clearRetryPolling = () => {
    if (retryPollRef.current) {
      clearInterval(retryPollRef.current);
      retryPollRef.current = null;
    }
  };

  const startRetryProgressPolling = (fragment) => {
    clearRetryPolling();

    setRetryProgress({
      fragmentId: fragment.fragment_id,
      fileId: fragment.file_id,
      status: 'transcribing',
      message: `Starting manual retry for fragment #${fragment.fragment_order}...`,
      percent: 5,
    });

    retryPollRef.current = setInterval(async () => {
      try {
        const response = await api.get(`/sound-files/${fragment.file_id}/progress`);
        const data = response.data?.data;

        if (!data) {
          return;
        }

        setRetryProgress({
          fragmentId: fragment.fragment_id,
          fileId: fragment.file_id,
          status: data.status,
          message: data.error ? `${data.message} ${data.error}`.trim() : data.message,
          percent: Number(data.percent || 0),
        });

        if (['completed', 'partial', 'failed'].includes(data.status)) {
          clearRetryPolling();
        }
      } catch {
        // Ignore polling errors during retry
      }
    }, 700);
  };

  useEffect(() => {
    fetchFailedFragments();
    return () => clearRetryPolling();
  }, []);

  const getRetryProgressStyles = (status) => {
    if (status === 'failed') {
      return 'bg-error-500';
    }

    if (status === 'completed') {
      return 'bg-success-500';
    }

    return 'bg-brand-600';
  };

  const handleManualRetry = async (fragment) => {
    if (retryingId) {
      return;
    }

    setRetryingId(fragment.fragment_id);
    setError('');
    setSuccess('');
    startRetryProgressPolling(fragment);

    try {
      await api.post(`/sound-files/fragments/${fragment.fragment_id}/retry-manual`);
      setRetryProgress((current) => (
        current?.fragmentId === fragment.fragment_id
          ? {
              ...current,
              status: 'completed',
              message: `Manual retry completed successfully for fragment #${fragment.fragment_order}.`,
              percent: 100,
            }
          : current
      ));
      setSuccess('Manual retry completed successfully and the related lecture transcript was updated.');
      await fetchFailedFragments();
    } catch (err) {
      const failureMessage = err.response?.data?.message || 'Manual retry failed.';
      setRetryProgress((current) => (
        current?.fragmentId === fragment.fragment_id
          ? {
              ...current,
              status: 'failed',
              message: failureMessage,
              percent: Math.max(Number(current.percent || 0), 100),
            }
          : current
      ));
      setError(failureMessage);
    } finally {
      clearRetryPolling();
      setRetryingId(null);
    }
  };

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-outfit font-bold text-gray-900 dark:text-white">
              Failed Fragments
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              This page lists every fragment that failed after the initial attempt plus two automatic retries. You can retry any fragment manually.
            </p>
            {fileIdFilter && (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 font-semibold text-orange-700 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                  Filtered by File ID: {fileIdFilter}
                </span>
                <Link
                  to="/failed-fragments"
                  className="font-semibold text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                >
                  Clear filter
                </Link>
              </div>
            )}
          </div>
          <button
            onClick={fetchFailedFragments}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Refresh List
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-error-200 bg-error-50 p-4 text-error-700 dark:border-error-700 dark:bg-error-900 dark:text-error-300">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-success-200 bg-success-50 p-4 text-success-700 dark:border-success-700 dark:bg-success-900 dark:text-success-300">
            {success}
          </div>
        )}

        <div className="rounded-2xl bg-white p-6 shadow-md dark:bg-gray-800">
          {loading ? (
            <div className="py-10 text-center text-gray-600 dark:text-gray-400">Loading failed fragments...</div>
          ) : filteredFragments.length === 0 ? (
            <div className="py-10 text-center text-gray-600 dark:text-gray-400">
              {fileIdFilter
                ? `There are no failed fragments for file ${fileIdFilter}.`
                : 'There are no failed fragments right now.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700/50">
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">File ID</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Filename</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Fragment</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Duration</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Failure Reason</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFragments.map((fragment) => (
                    <React.Fragment key={fragment.fragment_id}>
                      <tr className="border-b border-gray-100 dark:border-gray-700">
                        <td className="px-4 py-4 text-sm font-semibold text-gray-900 dark:text-white">{fragment.file_id}</td>
                        <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{fragment.filename}</td>
                        <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                          #{fragment.fragment_order}
                          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {Number(fragment.start_seconds || 0).toFixed(0)}s - {Number(fragment.end_seconds || 0).toFixed(0)}s
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                          {fragment.duration ? `${Number(fragment.duration).toFixed(0)} sec` : '-'}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                          <div className="max-w-xs whitespace-pre-wrap break-words">
                            {fragment.last_error || 'No failure reason was recorded.'}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <button
                            onClick={() => handleManualRetry(fragment)}
                            disabled={Boolean(retryingId)}
                            className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {retryingId === fragment.fragment_id
                              ? `Retrying... ${Math.round(Number(retryProgress?.percent || 0))}%`
                              : 'Retry Manual'}
                          </button>
                        </td>
                      </tr>

                      {retryProgress?.fragmentId === fragment.fragment_id && (
                        <tr className="border-b border-gray-100 bg-gray-50/70 dark:border-gray-700 dark:bg-gray-900/30">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                              <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {retryProgress.message || 'Retry is in progress...'}
                                </p>
                                <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
                                  {Math.round(Number(retryProgress.percent || 0))}%
                                </span>
                              </div>
                              <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                                <div
                                  className={`h-2.5 rounded-full transition-all duration-300 ${getRetryProgressStyles(retryProgress.status)}`}
                                  style={{ width: `${Math.max(0, Math.min(100, Number(retryProgress.percent || 0)))}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ProtectedLayout>
  );
};

export default FailedFragments;
