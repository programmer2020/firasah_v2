import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import ProtectedLayout from '../components/ProtectedLayout';
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

  // Fetch classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await api.get('/schedule/classes');
        setClasses(Array.isArray(response.data) ? response.data : response.data.data || []);
      } catch (err) {
        console.error('Failed to fetch classes:', err);
      }
    };
    fetchClasses();
  }, []);

  // Start polling for pipeline progress
  const startPipelineProgress = (fileId) => {
    setProcessing(true);
    setPipelineProgress({ status: 'uploading', message: 'تم التحميل. جاري بدء المعالجة...', percent: 5 });

    const pollInterval = setInterval(async () => {
      try {
        const res = await api.get(`/sound-files/${fileId}/progress`);
        const data = res.data?.data;
        if (data) {
          setPipelineProgress(data);

          if (data.status === 'completed' || data.status === 'failed') {
            clearInterval(pollInterval);
            if (data.status === 'completed') {
              setSuccess(data.message || 'تم الانتهاء بنجاح!');
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
      setError(`نوع الملف غير مدعوم. الأنواع المدعومة: MP3, WAV, OGG, MP4, WebM, MOV, AVI, MKV, TXT`);
      setSelectedFile(null);
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const maxMB = MAX_FILE_SIZE / (1024 * 1024);
      setError(
        `حجم الملف (${sizeMB} MB) يتجاوز الحد الأقصى المسموح به (${maxMB} MB)`
      );
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setSelectedClassId('');
    setSelectedDate('');
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
    if (!selectedClassId) {
      setError('يرجى اختيار الفصل');
      return;
    }
    if (!selectedDate) {
      setError('يرجى اختيار التاريخ');
      return;
    }

    setShowModal(false);
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
    formData.append('slot_date', selectedDate);
    formData.append('should_denoise', denoise ? 'true' : 'false');

    // Derive day_of_week from the selected date
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = dayNames[new Date(selectedDate).getDay()];
    formData.append('day_of_week', dayOfWeek);

    try {
      const response = await api.post('/sound-files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
      });

      setSuccess(`تم تحميل الملف بنجاح: ${selectedFile.name}`);
      setUploadedFile(response.data.data);

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
          'فشل تحميل الملف. يرجى المحاولة مرة أخرى'
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

  return (
    <ProtectedLayout>
      <div>
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-outfit font-bold text-gray-900 dark:text-white mb-2">
            تحميل الملفات الصوتية والمرئية
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            قم بتحميل الملفات الصوتية أو المرئية أو النصية بصيغ مختلفة (MP3, WAV, OGG, MP4, WebM, MOV, AVI, MKV, TXT)
          </p>
        </div>

        {/* Upload Container */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-6">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-error-50 dark:bg-error-900 border border-error-200 dark:border-error-700 rounded-lg text-error-700 dark:text-error-300">
              <span className="font-semibold">خطأ:</span> {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-success-50 dark:bg-success-900 border border-success-200 dark:border-success-700 rounded-lg text-success-700 dark:text-success-300">
              <span className="font-semibold">نجح:</span> {success}
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
                className="border-2 border-dashed rounded-lg p-8 text-center transition-colors border-gray-300 dark:border-gray-600 hover:border-brand-400"
              >
                <div className="mb-4">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"
                    />
                  </svg>
                </div>
                <p className="text-gray-900 dark:text-white font-semibold mb-1">
                  اضغط هنا أو اسحب الملف
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  الحد الأقصى لحجم الملف: 2 GB
                </p>
              </div>
            </div>

            {/* Progress Bar (shown during upload) */}
            {uploading && (
              <div className="mb-6">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      جاري التحميل...
                    </span>
                    <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                      {uploadProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div
                      className="bg-brand-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
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
                          : pipelineProgress.status === 'failed' ? 'text-error-700 dark:text-error-300'
                          : 'text-blue-700 dark:text-blue-300'
                      }`}>
                        معالجة الملف
                      </span>
                    </div>
                    <span className={`text-sm font-bold ${
                      pipelineProgress.status === 'completed' ? 'text-success-600 dark:text-success-400'
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

                  {/* Slot info */}
                  {pipelineProgress.currentSlot && pipelineProgress.totalSlots && pipelineProgress.status !== 'completed' && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right" dir="rtl">
                      الحصة {pipelineProgress.currentSlot} من {pipelineProgress.totalSlots}
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
              <h2 className="text-xl font-outfit font-bold text-gray-900 dark:text-white mb-4 text-right">
                تحسين جودة الصوت
              </h2>

              <p className="text-gray-700 dark:text-gray-300 mb-6 text-right" dir="rtl">
                هل تريد تحسين جودة الصوت من الضوضاء قبل التحويل إلى نص؟
                <br />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  (التفعيل يحسّن جودة النتائج لكن قد يستغرق وقتاً أطول)
                </span>
              </p>

              <div className="flex gap-3" dir="rtl">
                <button
                  onClick={() => handleDenoiseChoice(true)}
                  className="flex-1 px-6 py-3 rounded-lg font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors"
                >
                  نعم، حسّن الصوت
                </button>
                <button
                  onClick={() => handleDenoiseChoice(false)}
                  className="flex-1 px-6 py-3 rounded-lg font-semibold bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  لا، كمل مباشرة
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

              <h2 className="text-xl font-outfit font-bold text-gray-900 dark:text-white mb-6 text-right">
                تفاصيل التحميل
              </h2>

              {/* Selected File Info */}
              {selectedFile && (
                <div className="mb-5 bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-700 rounded-lg p-4 flex items-center gap-3" dir="rtl">
                  <svg className="h-8 w-8 text-brand-600 dark:text-brand-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-gray-900 dark:text-white font-semibold truncate">{selectedFile.name}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
              )}

              {/* Class Selection */}
              <div className="mb-5" dir="rtl">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  الفصل الدراسي
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors"
                >
                  <option value="">-- اختر الفصل --</option>
                  {classes.map((cls) => (
                    <option key={cls.class_id} value={cls.class_id}>
                      {cls.class_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Selection */}
              <div className="mb-6" dir="rtl">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  التاريخ
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3" dir="rtl">
                <button
                  onClick={handleModalUpload}
                  disabled={!selectedClassId || !selectedDate}
                  className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
                    !selectedClassId || !selectedDate
                      ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-brand-600 text-white hover:bg-brand-700'
                  }`}
                >
                  تحميل الملف
                </button>
                <button
                  onClick={handleModalClose}
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Uploaded File Info */}
        {uploadedFile && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-outfit font-bold text-gray-900 dark:text-white mb-4">
              تفاصيل الملف المحمل
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">معرّف الملف</p>
                <p className="text-gray-900 dark:text-white font-semibold">
                  {uploadedFile.id}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">اسم الملف</p>
                <p className="text-gray-900 dark:text-white font-semibold">
                  {uploadedFile.fileName}
                </p>
              </div>
              {uploadedFile.duration && (
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">المدة الزمنية</p>
                  <p className="text-gray-900 dark:text-white font-semibold">
                    {uploadedFile.duration} ثانية
                  </p>
                </div>
              )}
              {uploadedFile.fileSize && (
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">حجم الملف</p>
                  <p className="text-gray-900 dark:text-white font-semibold">
                    {formatFileSize(uploadedFile.fileSize)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
};

export default AudioUpload;
