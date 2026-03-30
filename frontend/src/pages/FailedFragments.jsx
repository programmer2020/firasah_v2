import React, { useEffect, useState } from 'react';
import ProtectedLayout from '../components/ProtectedLayout';
import api from '../services/api';
import useAutoHideMessage from '../hooks/useAutoHideMessage';

const FailedFragments = () => {
  const [fragments, setFragments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

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

  useEffect(() => {
    fetchFailedFragments();
  }, []);

  const handleManualRetry = async (fragmentId) => {
    setRetryingId(fragmentId);
    setError('');
    setSuccess('');

    try {
      await api.post(`/sound-files/fragments/${fragmentId}/retry-manual`);
      setSuccess('Manual retry completed successfully and the related lecture transcript was updated.');
      await fetchFailedFragments();
    } catch (err) {
      setError(err.response?.data?.message || 'Manual retry failed.');
    } finally {
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
          ) : fragments.length === 0 ? (
            <div className="py-10 text-center text-gray-600 dark:text-gray-400">
              There are no failed fragments right now.
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
                  {fragments.map((fragment) => (
                    <tr key={fragment.id} className="border-b border-gray-100 dark:border-gray-700">
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
                          onClick={() => handleManualRetry(fragment.id)}
                          disabled={retryingId === fragment.id}
                          className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {retryingId === fragment.id ? 'Retrying...' : 'Retry Manual'}
                        </button>
                      </td>
                    </tr>
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
