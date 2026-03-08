import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import '../pages/AudioUpload.css';

export const AudioUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);

  const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB in bytes
  const ALLOWED_AUDIO_TYPES = [
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/mp4',
    'audio/webm',
  ];

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    setError('');
    setSuccess('');

    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Validate file type
    if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
      setError(`نوع الملف غير مدعوم. الأنواع المدعومة: MP3, WAV, OGG, MP4, WebM`);
      setSelectedFile(null);
      return;
    }

    // Validate file size (200 MB max)
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
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('يرجى اختيار ملف صوتي أولاً');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('file', selectedFile);

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
      setSelectedFile(null);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar />

      {/* Header */}
      <header className="fixed top-0 right-0 left-0 bg-brand-600 text-white shadow-lg z-30">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            <Link
              to="/dashboard"
              className="text-2xl font-outfit font-bold hover:opacity-90"
            >
              Firasah AI
            </Link>
            <span className="text-brand-100">تحميل الملفات الصوتية</span>
          </div>
        </div>
      </header>

      <main className="pt-24 pl-64 transition-all duration-300">
        <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-outfit font-bold text-gray-900 dark:text-white mb-2">
            تحميل الملفات الصوتية
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            قم بتحميل الملفات الصوتية بصيغ مختلفة (MP3, WAV, OGG, MP4, WebM)
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
                accept="audio/*"
                onChange={handleFileSelect}
                disabled={uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                style={{ display: selectedFile ? 'none' : 'block' }}
              />
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  selectedFile
                    ? 'border-brand-200 bg-brand-50 dark:border-brand-700 dark:bg-brand-900'
                    : 'border-gray-300 dark:border-gray-600 hover:border-brand-400'
                }`}
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
                  الحد الأقصى لحجم الملف: 200 MB
                </p>
              </div>
            </div>

            {/* Selected File Display */}
            {selectedFile && (
              <div className="mb-6">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <svg
                        className="h-6 w-6 text-brand-600 dark:text-brand-400 mr-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8 16.5a.5.5 0 01-.5-.5v-5.793l-2.146 2.147a.5.5 0 01-.708-.708l3.5-3.5a.5.5 0 01.708 0l3.5 3.5a.5.5 0 01-.708.708L8.707 10.207V16a.5.5 0 01-.5.5z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <div>
                        <p className="text-gray-900 dark:text-white font-semibold">
                          {selectedFile.name}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        const fileInput = document.getElementById('audioInput');
                        if (fileInput) fileInput.value = '';
                      }}
                      disabled={uploading}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <svg
                        className="h-6 w-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Progress Bar */}
                  {uploading && (
                    <div className="mb-4">
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
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
                  !selectedFile || uploading
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-brand-600 text-white hover:bg-brand-700 dark:hover:bg-brand-500'
                }`}
              >
                {uploading ? 'جاري التحميل...' : 'تحميل الملف'}
              </button>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  const fileInput = document.getElementById('audioInput');
                  if (fileInput) fileInput.value = '';
                  setError('');
                  setSuccess('');
                }}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>

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
      </main>
    </div>
  );
};

export default AudioUpload;
