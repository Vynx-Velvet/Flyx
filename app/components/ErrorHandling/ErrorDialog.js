/**
 * Error dialog component for displaying user-friendly error messages
 * Provides actionable recovery options and error reporting functionality
 */

import React, { useState } from 'react';
import { UserFriendlyMessages } from '../../utils/errorHandling/UserFriendlyMessages.js';

export function ErrorDialog({ 
  error, 
  userMessage, 
  isRecovering, 
  recoveryProgress, 
  onAction, 
  onDismiss, 
  onReport 
}) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportFormData, setReportFormData] = useState({});

  if (!error || !userMessage) return null;

  const handleActionClick = async (action) => {
    if (action === 'report') {
      setShowReportForm(true);
      return;
    }
    
    await onAction(action);
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    await onReport(reportFormData);
    setShowReportForm(false);
    setReportFormData({});
  };

  const handleReportFormChange = (field, value) => {
    setReportFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="error-dialog-overlay">
      <div className="error-dialog">
        {/* Header */}
        <div className="error-dialog-header">
          <div className="error-icon">
            {error.severity === 'critical' ? '🚨' : 
             error.severity === 'high' ? '⚠️' : 
             error.severity === 'medium' ? '⚡' : 'ℹ️'}
          </div>
          <h2 className="error-title">{userMessage.title}</h2>
          <button 
            className="error-dialog-close" 
            onClick={onDismiss}
            aria-label="Close error dialog"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="error-dialog-content">
          <p className="error-message">{userMessage.message}</p>

          {/* Recovery Progress */}
          {isRecovering && (
            <div className="recovery-progress">
              <div className="progress-label">
                {UserFriendlyMessages.getProgressMessage('recovery', recoveryProgress)}
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${recoveryProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!isRecovering && userMessage.actions && (
            <div className="error-actions">
              {userMessage.actions.map((action, index) => (
                <button
                  key={index}
                  className={`error-action-btn ${action.primary ? 'primary' : 'secondary'}`}
                  onClick={() => handleActionClick(action.action)}
                  title={UserFriendlyMessages.getActionInstructions(action.action)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          {/* Technical Details Toggle */}
          <div className="technical-details-section">
            <button
              className="technical-details-toggle"
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            >
              {showTechnicalDetails ? '▼' : '▶'} Technical Details
            </button>
            
            {showTechnicalDetails && (
              <div className="technical-details">
                <div className="detail-item">
                  <strong>Error Type:</strong> {error.type}
                </div>
                <div className="detail-item">
                  <strong>Severity:</strong> {error.severity}
                </div>
                <div className="detail-item">
                  <strong>Time:</strong> {new Date(error.timestamp).toLocaleString()}
                </div>
                {userMessage.technicalDetails?.errorMessage && (
                  <div className="detail-item">
                    <strong>Message:</strong> {userMessage.technicalDetails.errorMessage}
                  </div>
                )}
                {userMessage.technicalDetails?.metadata?.hlsDetails && (
                  <div className="detail-item">
                    <strong>HLS Details:</strong>
                    <pre>{JSON.stringify(userMessage.technicalDetails.metadata.hlsDetails, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Report Form Modal */}
        {showReportForm && (
          <div className="report-form-overlay">
            <div className="report-form">
              <h3>Report Error</h3>
              <form onSubmit={handleReportSubmit}>
                <div className="form-group">
                  <label htmlFor="description">What happened?</label>
                  <textarea
                    id="description"
                    value={reportFormData.description || ''}
                    onChange={(e) => handleReportFormChange('description', e.target.value)}
                    placeholder="Please describe what you were trying to do when this error occurred..."
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="reproductionSteps">How can we reproduce this?</label>
                  <textarea
                    id="reproductionSteps"
                    value={reportFormData.reproductionSteps || ''}
                    onChange={(e) => handleReportFormChange('reproductionSteps', e.target.value)}
                    placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="contactEmail">Email (optional)</label>
                  <input
                    type="email"
                    id="contactEmail"
                    value={reportFormData.contactEmail || ''}
                    onChange={(e) => handleReportFormChange('contactEmail', e.target.value)}
                    placeholder="your.email@example.com"
                  />
                </div>
                
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={reportFormData.allowFollowUp || false}
                      onChange={(e) => handleReportFormChange('allowFollowUp', e.target.checked)}
                    />
                    Allow follow-up contact
                  </label>
                </div>
                
                <div className="form-actions">
                  <button type="submit" className="btn-primary">Send Report</button>
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => setShowReportForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .error-dialog-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
        }

        .error-dialog {
          background: #1a1a1a;
          border-radius: 12px;
          max-width: 600px;
          width: 100%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
          border: 1px solid #333;
        }

        .error-dialog-header {
          display: flex;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #333;
          gap: 12px;
        }

        .error-icon {
          font-size: 24px;
        }

        .error-title {
          flex: 1;
          margin: 0;
          color: #fff;
          font-size: 18px;
          font-weight: 600;
        }

        .error-dialog-close {
          background: none;
          border: none;
          color: #999;
          font-size: 20px;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: color 0.2s;
        }

        .error-dialog-close:hover {
          color: #fff;
          background: #333;
        }

        .error-dialog-content {
          padding: 20px;
        }

        .error-message {
          color: #ccc;
          line-height: 1.5;
          margin: 0 0 20px 0;
        }

        .recovery-progress {
          margin: 20px 0;
        }

        .progress-label {
          color: #fff;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .progress-bar {
          background: #333;
          border-radius: 4px;
          height: 8px;
          overflow: hidden;
        }

        .progress-fill {
          background: linear-gradient(90deg, #4CAF50, #8BC34A);
          height: 100%;
          transition: width 0.3s ease;
        }

        .error-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin: 20px 0;
        }

        .error-action-btn {
          padding: 10px 20px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
          min-width: 120px;
        }

        .error-action-btn.primary {
          background: #2196F3;
          color: white;
        }

        .error-action-btn.primary:hover {
          background: #1976D2;
        }

        .error-action-btn.secondary {
          background: #333;
          color: #ccc;
          border: 1px solid #555;
        }

        .error-action-btn.secondary:hover {
          background: #444;
          color: #fff;
        }

        .technical-details-section {
          margin-top: 20px;
          border-top: 1px solid #333;
          padding-top: 20px;
        }

        .technical-details-toggle {
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .technical-details-toggle:hover {
          color: #fff;
        }

        .technical-details {
          margin-top: 12px;
          padding: 12px;
          background: #222;
          border-radius: 6px;
          font-size: 13px;
        }

        .detail-item {
          margin-bottom: 8px;
          color: #ccc;
        }

        .detail-item strong {
          color: #fff;
        }

        .detail-item pre {
          background: #111;
          padding: 8px;
          border-radius: 4px;
          overflow-x: auto;
          margin-top: 4px;
          font-size: 11px;
        }

        .report-form-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .report-form {
          background: #1a1a1a;
          border-radius: 8px;
          padding: 24px;
          max-width: 500px;
          width: 100%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .report-form h3 {
          color: #fff;
          margin: 0 0 20px 0;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          color: #ccc;
          margin-bottom: 6px;
          font-size: 14px;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 10px;
          background: #333;
          border: 1px solid #555;
          border-radius: 4px;
          color: #fff;
          font-size: 14px;
        }

        .form-group textarea {
          min-height: 80px;
          resize: vertical;
        }

        .checkbox-group label {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .checkbox-group input[type="checkbox"] {
          width: auto;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 24px;
        }

        .btn-primary {
          background: #2196F3;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        }

        .btn-primary:hover {
          background: #1976D2;
        }

        .btn-secondary {
          background: #333;
          color: #ccc;
          border: 1px solid #555;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
        }

        .btn-secondary:hover {
          background: #444;
          color: #fff;
        }
      `}</style>
    </div>
  );
}