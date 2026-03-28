import React from 'react';

export const ConfirmModal = ({ 
  isOpen, 
  title = 'Confirm', 
  message, 
  onConfirm, 
  onCancel,
  confirmText = 'OK',
  cancelText = 'Cancel',
  isDangerous = false 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full mx-4 p-6">
        {/* Title */}
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          {title}
        </h2>
        
        {/* Message */}
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {message}
        </p>

        {/* Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-6 py-2 rounded-full bg-blue-400 hover:bg-blue-500 text-white font-medium transition-colors duration-200"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-6 py-2 rounded-full font-medium transition-colors duration-200 text-white ${
              isDangerous
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-blue-400 hover:bg-blue-500'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
