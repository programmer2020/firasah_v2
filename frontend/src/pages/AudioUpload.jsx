import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import ProtectedLayout from '../components/ProtectedLayout';
import useAutoHideMessage from '../hooks/useAutoHideMessage';
import usePagination from '../hooks/usePagination';
import PaginationControls from '../components/PaginationControls';
import '../pages/AudioUpload.css';

export const AudioUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);

  // Pipeline progress state
  const [pipelineProgress, setPipelineProgress] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [showDenoiseModal, setShowDenoiseModal] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [shouldDenoise, setShouldDenoise] = useState(null);
  const [modalError, setModalError] = useState('');

  // Uploaded files list
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Pagination
  const pagination = usePagination(uploadedFiles, 10);

  const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB in bytes
  const ALLOWED_AUDIO_TYPES = [
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/mp4',
    'audio/webm',
  ];
  const ALLOWED_VIDEO_TYPES = [
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
  ];
  const ALLOWED_TEXT_TYPES = [
    'text/plain',
  ];
  const ALLOWED_TYPES = [...ALLOWED_AUDIO_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_TEXT_TYPES];

  // Auto-hide success and error messages after 5 seconds
  useAutoHideMessage(success, setSuccess);
  useAutoHideMessage(error, setError);

  // Fetch classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await api.get('/api/schedule/classes');
        setClasses(Array.isArray(response.data) ? response.data : response.data.data || []);
      } catch (err) {
        console.error('Failed to fetch classes:', err);
      }
    };
    fetchClasses();

    // Fetch uploaded files
    fetchUploadedFiles();
  }, []);

  const fetchUploadedFiles = async () => {
    setLoadingFiles(true);
    try {
      const response = await api.get('/api/sound-files');
      const files = Array.isArray(response.data) ? response.data : response.data.data || [];
      setUploadedFiles(files);
    } catch (err) {
      console.error('Failed to fetch uploaded files:', err);
    } finally {
      setLoadingFiles(false);
    }
  };

  // Start polling for pipeline progress
  const startPipelineProgress = (fileId) => {
    setProcessing(true);
    setPipelineProgress({ status: 'uploading', message: 'File uploaded. Starting processing pipeline...', percent: 5 });

    const pollInterval = setInterval(async () => {
      try {
        const res = await api.get(`/api/sound-files/${fileId}/progress`);
        const data = res.data?.data;
        if (data) {
          setPipelineProgress(data);

          if (data.status === 'completed' || data.status === 'failed' || data.status === 'partial') {
            clearInterval(pollInterval);
            if (data.status === 'completed') {
              setSuccess(data.message || 'Processing completed successfully!');
            } else if (data.status === 'partial') {
              setError(data.message || 'Some fragments could not be transcribed. You can retry them manually from the Failed Fragments page.');
            }
            setTimeout(() => {
              setProcessing(false);
              setPipelineProgress(null);
            }, 4000);
          }
        }
      } catch {
        // Ignore poll errors, will retry next interval
      }
    }, 1000);

    // Safety: stop polling after 30 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      setProcessing(false);
      setPipelineProgress(null);
    }, 30 * 60 * 1000);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    setError('');
    setSuccess('');

    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Validate file type (check MIME type or file extension as fallback)
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isAllowedType = ALLOWED_TYPES.includes(file.type) || ext === 'txt';
    if (!isAllowedType) {
      setError(`Unsupported file type. Supported formats: MP3, WAV, OGG, MP4, WebM, MOV, AVI, MKV, TXT`);
      setSelectedFile(null);
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const maxMB = MAX_FILE_SIZE / (1024 * 1024);
      setError(
        `File size (${sizeMB} MB) exceeds the maximum allowed size (${maxMB} MB)`
      );
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setSelectedClassId('');
    setSelectedDate('');
    setModalError('');
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedFile(null);
    setSelectedClassId('');
    setSelectedDate('');
    const fileInput = document.getElementById('audioInput');
    if (fileInput) fileInput.value = '';
  };

  const handleModalUpload = async () => {
    if (!selectedFile) return;
    setModalError('');
    if (!selectedClassId) {
      setModalError('يرجى اختيار الفصل');
      return;
    }
    if (!selectedDate) {
      setModalError('يرجى اختيار التاريخ');
      return;
    }

    // Validate: check if the selected day exists in section_time_slots for this class
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const selectedDay = dayNames[new Date(selectedDate).getDay()];
    try {
      const res = await api.get(`/api/schedule/time-slots/${selectedClassId}`);
      const allSlots = res.data?.data || res.data || [];
      const daySlots = allSlots.filter(s => s.day_of_week === selectedDay);
      if (!daySlots.length) {
        const availableDays = [...new Set(allSlots.map(s => s.day_of_week))].join(', ');
        setModalError(`لا يوجد جدول حصص ليوم ${selectedDay} للفصل المختار. الأيام المتاحة: ${availableDays}`);
        return;
      }
    } catch {
      // If API fails, skip validation and proceed
    }

    setShowModal(false);
    setModalError('');
    // Show denoise modal before proceeding with upload
    setShowDenoiseModal(true);
  };

  const handleDenoiseChoice = async (denoise) => {
    setShouldDenoise(denoise);
    setShowDenoiseModal(false);
    await performUpload(denoise);
  };

  const performUpload = async (denoise) => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadProgress(0);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('class_id', selectedClassId);
    formData.append('should_denoise', denoise ? 'true' : 'false');

    // Derive day_of_week from the selected date
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = dayNames[new Date(selectedDate).getDay()];
    formData.append('day_of_week', dayOfWeek);

    try {
      // Instance default is application/json; that makes axios stringify FormData → server gets no file.
      // Content-Type: false removes the default so the browser sets multipart/form-data with boundary.
      const token = localStorage.getItem('authToken');
      const response = await api.post('/api/sound-files/upload', formData, {
        headers: {
          'Content-Type': false,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
      });

      setSuccess(`File uploaded successfully: ${selectedFile.name}`);
      setUploadedFile(response.data.data);

      // Refresh the uploaded files list
      fetchUploadedFiles();

      // Start listening for pipeline progress (audio files)
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      const isText = selectedFile.type === 'text/plain' || ext === 'txt';
      if (!isText && response.data.data?.file_id) {
        startPipelineProgress(response.data.data.file_id);
      }

      setSelectedFile(null);
      setSelectedClassId('');
      setSelectedDate('');
      setUploadProgress(0);

      // Reset file input
      const fileInput = document.getElementById('audioInput');
      if (fileInput) fileInput.value = '';
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'File upload failed. Please try again.'
      );
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'completed': { bg: 'bg-success-100 dark:bg-success-900/30', border: 'border-success-200 dark:border-success-700', text: 'text-success-700 dark:text-success-300', label: 'Completed', icon: '✓' },
      'processing': { bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-700', text: 'text-blue-700 dark:text-blue-300', label: 'Processing', icon: '⟳' },
      'partial': { bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-200 dark:border-orange-700', text: 'text-orange-700 dark:text-orange-300', label: 'Partial', icon: '!' },
      'pending': { bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-200 dark:border-yellow-700', text: 'text-yellow-700 dark:text-yellow-300', label: 'Pending', icon: '⏳' },
      'failed': { bg: 'bg-error-100 dark:bg-error-900/30', border: 'border-error-200 dark:border-error-700', text: 'text-error-700 dark:text-error-300', label: 'Failed', icon: '✗' },
      'uploaded': { bg: 'bg-gray-100 dark:bg-gray-900/30', border: 'border-gray-200 dark:border-gray-700', text: 'text-gray-700 dark:text-gray-300', label: 'Uploaded', icon: '📁' },
    };
    return statusMap[status] || statusMap['pending'];
  };

  return (
    <ProtectedLayout>
      <div>
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-outfit font-bold mb-2" style={{color: '#005239'}}>
            Upload Audio &amp; Video Files
          </h1>
          <p style={{color: '#006d4a'}}>
            Upload audio, video, or text files in various formats (MP3, WAV, OGG, MP4, WebM, MOV, AVI, MKV, TXT)
          </p>
        </div>

        {/* Upload Container */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 mb-6" style={{border: '1px solid #d1fae5'}}>
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-error-50 dark:bg-error-900 border border-error-200 dark:border-error-700 rounded-xl text-error-700 dark:text-error-300">
              <span className="font-semibold">Error:</span> {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 rounded-xl text-white font-semibold" style={{background: 'linear-gradient(135deg, #006d4a 0%, #005239 100%)'}}>
              ✓ {success}
            </div>
          )}

          {/* File Input Area */}
          <div className="audio-upload-area">
            <div className="relative mb-6">
              <input
                id="audioInput"
                type="file"
                accept="audio/*,video/*,.txt,text/plain"
                onChange={handleFileSelect}
                disabled={uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div
                className="border-2 border-dashed rounded-2xl p-12 text-center transition-all"
                style={{borderColor: '#a7f3d0', background: '#f0fdf4'}}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#006d4a'; e.currentTarget.style.background = '#ecfdf5'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#a7f3d0'; e.currentTarget.style.background = '#f0fdf4'; }}
              >
                <div className="mb-5 flex justify-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl shadow-md" style={{background: 'linear-gradient(135deg, #006d4a 0%, #005239 100%)'}}>
                    <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
                      <path d="M19 8v16M12 15l7-7 7 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M6 28h26" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.6"/>
                      <path d="M10 33h18" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
                    </svg>
                  </div>
                </div>
                <p className="font-bold text-lg mb-1" style={{color: '#005239'}}>
                  Click to upload or drag &amp; drop
                </p>
                <p className="text-sm" style={{color: '#006d4a'}}>
                  MP3, WAV, OGG, MP4, WebM, MOV, AVI, MKV, TXT &nbsp;·&nbsp; Max 2 GB
                </p>
              </div>
            </div>

            {/* Progress Bar (shown during upload) */}
            {uploading && (
              <div className="mb-6">
                <div className="rounded-xl p-4 border" style={{background: '#f0fdf4', borderColor: '#a7f3d0'}}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium" style={{color: '#005239'}}>
                      Uploading file...
                    </span>
                    <span className="text-sm font-bold" style={{color: '#006d4a'}}>
                      {uploadProgress}%
                    </span>
                  </div>
                  <div className="w-full rounded-full h-2.5" style={{background: '#d1fae5'}}>
                    <div
                      className="h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%`, background: 'linear-gradient(90deg, #006d4a, #34d399)' }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* Pipeline Progress (shown during processing) */}
            {processing && pipelineProgress && (
              <div className="mb-6">
                  <div className={`rounded-lg p-5 border ${
                  pipelineProgress.status === 'completed'
                    ? 'bg-success-50 dark:bg-success-900/30 border-success-200 dark:border-success-700'
                    : pipelineProgress.status === 'partial'
                    ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700'
                    : pipelineProgress.status === 'failed'
                    ? 'bg-error-50 dark:bg-error-900/30 border-error-200 dark:border-error-700'
                    : 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700'
                }`}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3" dir="rtl">
                    <div className="flex items-center gap-2">
                      {pipelineProgress.status === 'completed' ? (
                        <svg className="h-5 w-5 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : pipelineProgress.status === 'partial' ? (
                        <svg className="h-5 w-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : pipelineProgress.status === 'failed' ? (
                        <svg className="h-5 w-5 text-error-600 dark:text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                      )}
                      <span className={`text-sm font-semibold ${
                        pipelineProgress.status === 'completed' ? 'text-success-700 dark:text-success-300'
                          : pipelineProgress.status === 'partial' ? 'text-orange-700 dark:text-orange-300'
                          : pipelineProgress.status === 'failed' ? 'text-error-700 dark:text-error-300'
                          : 'text-blue-700 dark:text-blue-300'
                      }`}>
                        Processing File
                      </span>
                    </div>
                    <span className={`text-sm font-bold ${
                      pipelineProgress.status === 'completed' ? 'text-success-600 dark:text-success-400'
                        : pipelineProgress.status === 'partial' ? 'text-orange-600 dark:text-orange-400'
                        : pipelineProgress.status === 'failed' ? 'text-error-600 dark:text-error-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}>
                      {pipelineProgress.percent}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5 mb-3">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        pipelineProgress.status === 'completed' ? 'bg-success-500'
                          : pipelineProgress.status === 'partial' ? 'bg-orange-500'
                          : pipelineProgress.status === 'failed' ? 'bg-error-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${pipelineProgress.percent}%` }}
                    ></div>
                  </div>

                  {/* Status Message */}
                  <p className="text-sm text-gray-700 dark:text-gray-300 text-right" dir="rtl">
                    {pipelineProgress.message}
                  </p>

                  {pipelineProgress.status === 'partial' && uploadedFile?.file_id && (
                    <div className="mt-3">
                      <Link
                        to={`/failed-fragments?fileId=${uploadedFile.file_id}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
                      >
                        Open Failed Fragments Page
                      </Link>
                    </div>
                  )}

                  {/* Slot info */}
                  {pipelineProgress.currentSlot && pipelineProgress.totalSlots && pipelineProgress.status !== 'completed' && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Slot {pipelineProgress.currentSlot} of {pipelineProgress.totalSlots}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Denoise Modal */}
        {showDenoiseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-outfit font-bold mb-4" style={{color: '#005239'}}>
                Audio Enhancement
              </h2>

              <p className="text-gray-700 dark:text-gray-300 mb-6">
                Would you like to apply noise reduction before transcription?
                <br />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  (Enabling this improves transcription quality but may take longer)
                </span>
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => handleDenoiseChoice(true)}
                  className="flex-1 px-6 py-3 rounded-xl font-semibold text-white transition-colors"
                  style={{background: 'linear-gradient(135deg, #006d4a 0%, #005239 100%)'}}
                >
                  Yes, Enhance Audio
                </button>
                <button
                  onClick={() => handleDenoiseChoice(false)}
                  className="flex-1 px-6 py-3 rounded-xl font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  No, Continue Directly
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleModalClose}>
            <div
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={handleModalClose}
                className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <h2 className="text-xl font-outfit font-bold mb-6" style={{color: '#005239'}}>
                Upload Details
              </h2>

              {/* Selected File Info */}
              {selectedFile && (
                <div className="mb-5 rounded-xl p-4 flex items-center gap-3" style={{background: '#f0fdf4', border: '1px solid #a7f3d0'}}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0" style={{background: 'linear-gradient(135deg, #006d4a 0%, #005239 100%)'}}>
                    <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate" style={{color: '#005239'}}>{selectedFile.name}</p>
                    <p className="text-gray-500 text-sm">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
              )}

              {/* Class Selection */}
              <div className="mb-5">
                <label className="block text-sm font-semibold mb-2" style={{color: '#005239'}}>
                  Class
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => { setSelectedClassId(e.target.value); setModalError(''); }}
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none transition-colors"
                  style={{border: '1.5px solid #a7f3d0'}}
                  onFocus={e => e.target.style.borderColor = '#006d4a'}
                  onBlur={e => e.target.style.borderColor = '#a7f3d0'}
                >
                  <option value="">-- Select a class --</option>
                  {classes.map((cls) => (
                    <option key={cls.class_id} value={cls.class_id}>
                      {cls.class_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Selection */}
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2" style={{color: '#005239'}}>
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => { setSelectedDate(e.target.value); setModalError(''); }}
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none transition-colors"
                  style={{border: '1.5px solid #a7f3d0'}}
                  onFocus={e => e.target.style.borderColor = '#006d4a'}
                  onBlur={e => e.target.style.borderColor = '#a7f3d0'}
                />
              </div>

              {/* Modal Error Message */}
              {modalError && (
                <div className="mb-4 p-3 rounded-xl text-sm font-semibold text-red-700 bg-red-50 border border-red-200">
                  {modalError}
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleModalUpload}
                  disabled={!selectedClassId || !selectedDate}
                  className="flex-1 px-6 py-3 rounded-xl font-semibold transition-all text-white"
                  style={{
                    background: (!selectedClassId || !selectedDate)
                      ? '#d1d5db'
                      : 'linear-gradient(135deg, #006d4a 0%, #005239 100%)',
                    cursor: (!selectedClassId || !selectedDate) ? 'not-allowed' : 'pointer',
                  }}
                >
                  Upload File
                </button>
                <button
                  onClick={handleModalClose}
                  className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Uploaded File Info */}
        {uploadedFile && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mb-6" style={{border: '1px solid #d1fae5'}}>
            <h2 className="text-xl font-outfit font-bold mb-4" style={{color: '#005239'}}>
              Uploaded File Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm mb-1" style={{color: '#006d4a'}}>File ID</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {uploadedFile.file_id || uploadedFile.id || '-'}
                </p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{color: '#006d4a'}}>File Name</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {uploadedFile.filename || uploadedFile.fileName || '-'}
                </p>
              </div>
              {uploadedFile.duration && (
                <div>
                  <p className="text-sm mb-1" style={{color: '#006d4a'}}>Duration</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {uploadedFile.duration} seconds
                  </p>
                </div>
              )}
              {uploadedFile.fileSize && (
                <div>
                  <p className="text-sm mb-1" style={{color: '#006d4a'}}>File Size</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatFileSize(uploadedFile.fileSize)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Uploaded Files Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden" style={{border: '1px solid #d1fae5'}}>
          <div className="px-6 py-5" style={{background: 'linear-gradient(135deg, #006d4a 0%, #005239 100%)', borderBottom: '1px solid #005239'}}>
            <h2 className="text-xl font-outfit font-bold text-white">
              Uploaded Files
            </h2>
          </div>

          {loadingFiles ? (
            <div className="flex justify-center items-center py-12 gap-3">
              <svg className="h-7 w-7 animate-spin" style={{color: '#006d4a'}} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <span style={{color: '#006d4a'}} className="font-medium">Loading files...</span>
            </div>
          ) : uploadedFiles.length === 0 ? (
            <div className="text-center py-16">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl" style={{background: '#f0fdf4'}}>
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <path d="M10 26V8l16-4v18M10 26c0 1.657-1.79 3-4 3s-4-1.343-4-3 1.79-3 4-3 4 1.343 4 3zm16-4c0 1.657-1.79 3-4 3s-4-1.343-4-3 1.79-3 4-3 4 1.343 4 3z" stroke="#006d4a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                </div>
              </div>
              <p className="font-medium" style={{color: '#006d4a'}}>No files uploaded yet</p>
              <p className="text-sm text-gray-400 mt-1">Upload a file above to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{background: 'linear-gradient(135deg, #006d4a 0%, #005239 100%)'}}>
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-emerald-100">File Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-emerald-100">Uploaded By</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-emerald-100">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-widest text-emerald-100">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagination.paginatedItems.map((file, index) => {
                    const status = file.status || 'uploaded';
                    const statusBadge = getStatusBadge(status);
                    return (
                      <tr key={index} className="border-b border-gray-100 dark:border-gray-700 hover:bg-emerald-50/40 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <svg className="h-4 w-4 shrink-0" style={{color: '#006d4a'}} fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                            </svg>
                            <span className="truncate font-medium" title={file.filename}>{file.filename || 'Unnamed file'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {file.createdBy || file.createdby || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {(file.createdAt || file.created_at)
                            ? new Date(file.createdAt || file.created_at).toLocaleDateString('en-US')
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {status === 'partial' && file.file_id ? (
                            <Link
                              to={`/failed-fragments?fileId=${file.file_id}`}
                              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-colors hover:brightness-95 ${statusBadge.bg} ${statusBadge.border} ${statusBadge.text}`}
                              title="View incomplete fragments and retry"
                            >
                              <span>{statusBadge.icon}</span>
                              <span>{statusBadge.label}</span>
                            </Link>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-semibold ${statusBadge.bg} ${statusBadge.border} ${statusBadge.text}`}>
                              <span>{statusBadge.icon}</span>
                              <span>{statusBadge.label}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {/* Pagination */}
              <PaginationControls
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalItems={pagination.totalItems}
                itemsPerPage={pagination.itemsPerPage}
                onPrevPage={pagination.prevPage}
                onNextPage={pagination.nextPage}
                onGoToPage={pagination.goToPage}
              />
            </div>
          )}
        </div>
      </div>
    </ProtectedLayout>
  );
};

export default AudioUpload;
