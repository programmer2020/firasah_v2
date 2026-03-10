/**
 * Evaluation Dashboard Component
 * Displays KPI evaluations with filters, search, and statistics
 */

import React, { useState, useEffect } from 'react';
import '../styles/EvaluationDashboard.css';

const EvaluationDashboard = () => {
  const [fileId, setFileId] = useState('45'); // Default test file ID
  const [evaluations, setEvaluations] = useState([]);
  const [report, setReport] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Fetch comprehensive report
  const fetchReport = async (id) => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`http://localhost:5000/api/sound-files/${id}/evaluation/report/comprehensive`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to fetch report');

      const data = await response.json();
      setReport(data.data.domainReport);
      setStatistics(data.data.statistics);
      setEvaluations(data.data.detailedEvaluations);
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle file ID change
  const handleLoadReport = () => {
    if (fileId) {
      fetchReport(fileId);
    }
  };

  // Export to JSON
  const handleExportJSON = async () => {
    if (!fileId) return;

    try {
      const response = await fetch(`http://localhost:5000/api/sound-files/${fileId}/evaluation/export`, {
        method: 'GET',
      });

      if (!response.ok) throw new Error('Failed to export');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `evaluation_${fileId}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('خطأ في التصدير: ' + err.message);
    }
  };

  // Filtered evaluations
  const filteredEvaluations = evaluations.filter((ev) => {
    const matchesSearch = searchText === '' || 
      ev.kpi_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      ev.evidence_txt?.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesStatus = filterStatus === '' || ev.evidence_txt?.includes(`[${filterStatus}]`);
    
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const pageCount = Math.ceil(filteredEvaluations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEvaluations = filteredEvaluations.slice(startIndex, startIndex + itemsPerPage);

  // Get status color and icon
  const getStatusStyle = (evidenceText) => {
    if (evidenceText?.includes('[Strong]')) {
      return { color: '#10b981', label: 'قوي', bgColor: '#d1fae5' };
    } else if (evidenceText?.includes('[Emerging]')) {
      return { color: '#f59e0b', label: 'ناشئ', bgColor: '#fef3c7' };
    } else if (evidenceText?.includes('[Limited]')) {
      return { color: '#ef4444', label: 'محدود', bgColor: '#fee2e2' };
    } else if (evidenceText?.includes('[Insufficient]')) {
      return { color: '#9ca3af', label: 'غير كافي', bgColor: '#f3f4f6' };
    }
    return { color: '#6b7280', label: 'غير معروف', bgColor: '#f9fafb' };
  };

  return (
    <div className="evaluation-dashboard" dir="rtl">
      {/* Input Section */}
      <div className="input-section">
        <div className="file-input">
          <label>معرّف الملف الصوتي:</label>
          <input
            type="number"
            value={fileId}
            onChange={(e) => setFileId(e.target.value)}
            placeholder="أدخل معرف الملف"
          />
          <button onClick={handleLoadReport} className="btn-primary">
            تحميل التقرير
          </button>
        </div>

        {fileId && (
          <div className="action-buttons">
            <button onClick={handleExportJSON} className="btn-secondary">
              📥 تصدير JSON
            </button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          ❌ خطأ: {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="loading">
          جاري التحميل...
        </div>
      )}

      {/* Statistics Section */}
      {statistics && !loading && (
        <div className="statistics-section">
          <div className="stat-card strong">
            <div className="stat-number">{statistics.strong.count}</div>
            <div className="stat-label">قوي</div>
            <div className="stat-percent">{statistics.strong.percentage}%</div>
          </div>
          <div className="stat-card emerging">
            <div className="stat-number">{statistics.emerging.count}</div>
            <div className="stat-label">ناشئ</div>
            <div className="stat-percent">{statistics.emerging.percentage}%</div>
          </div>
          <div className="stat-card limited">
            <div className="stat-number">{statistics.limited.count}</div>
            <div className="stat-label">محدود</div>
            <div className="stat-percent">{statistics.limited.percentage}%</div>
          </div>
          <div className="stat-card insufficient">
            <div className="stat-number">{statistics.insufficient.count}</div>
            <div className="stat-label">غير كافي</div>
            <div className="stat-percent">{statistics.insufficient.percentage}%</div>
          </div>
        </div>
      )}

      {/* Report Section */}
      {report && !loading && (
        <div className="report-section">
          <h2>📋 التقرير حسب المجالات</h2>
          <div className="domains-grid">
            {Object.entries(report).map(([code, domain]) => (
              <div key={code} className="domain-card">
                <div className="domain-header">
                  <h3>{domain.domain_name}</h3>
                  <span className="domain-code">{code}</span>
                </div>
                <div className="domain-stats">
                  <span className="count">📊 {domain.evidence_count} شاهد</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evaluations Section */}
      {evaluations.length > 0 && !loading && (
        <div className="evaluations-section">
          <div className="section-header">
            <h2>🔍 تفاصيل التقييمات</h2>
            <div className="filters">
              <input
                type="text"
                placeholder="ابحث عن معيار أو شاهد..."
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setCurrentPage(1);
                }}
                className="search-input"
              />
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="filter-select"
              >
                <option value="">جميع الحالات</option>
                <option value="Strong">قوي</option>
                <option value="Emerging">ناشئ</option>
                <option value="Limited">محدود</option>
                <option value="Insufficient">غير كافي</option>
              </select>
            </div>
          </div>

          {/* Evaluations Table */}
          <div className="evaluations-table">
            {paginatedEvaluations.length > 0 ? (
              paginatedEvaluations.map((ev, index) => {
                const statusStyle = getStatusStyle(ev.evidence_txt);
                return (
                  <div key={ev.evidence_id} className="evaluation-item">
                    <div className="eval-index">{startIndex + index + 1}</div>
                    <div className="eval-content">
                      <div className="eval-header">
                        <span className="kpi-code">{ev.kpi_code}</span>
                        <h4>{ev.kpi_name}</h4>
                        <span
                          className="status-badge"
                          style={{
                            backgroundColor: statusStyle.bgColor,
                            color: statusStyle.color,
                          }}
                        >
                          {statusStyle.label}
                        </span>
                      </div>
                      <div className="eval-text">{ev.evidence_txt}</div>
                      <div className="eval-meta">
                        <span className="domain">{ev.domain_name}</span>
                        <span className="date">
                          {new Date(ev.created_at).toLocaleDateString('ar-SA')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="no-results">
                لا توجد نتائج تطابق البحث
              </div>
            )}
          </div>

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="pagination">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                أول
              </button>
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                السابق
              </button>
              <span className="page-info">
                صفحة {currentPage} من {pageCount}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(pageCount, currentPage + 1))}
                disabled={currentPage === pageCount}
                className="pagination-btn"
              >
                التالي
              </button>
              <button
                onClick={() => setCurrentPage(pageCount)}
                disabled={currentPage === pageCount}
                className="pagination-btn"
              >
                أخر
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && evaluations.length === 0 && fileId && (
        <div className="empty-state">
          <p>لم يتم العثور على تقييمات لهذا الملف</p>
          <p className="hint">تأكد من رقم الملف وحاول مرة أخرى</p>
        </div>
      )}
    </div>
  );
};

export default EvaluationDashboard;
