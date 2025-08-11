/**
 * Error toast component for displaying brief error notifications
 * Shows temporary messages for less critical errors and recovery status
 */

import React, { useEffect, useState } from 'react';

export function ErrorToast({ 
  message, 
  type = 'error', 
  duration = 5000, 
  onDismiss,
  position = 'top-right'
}) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 300);
  };

  if (!isVisible || !message) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'error':
      default:
        return '❌';
    }
  };

  const getTypeClass = () => {
    switch (type) {
      case 'success':
        return 'toast-success';
      case 'warning':
        return 'toast-warning';
      case 'info':
        return 'toast-info';
      case 'error':
      default:
        return 'toast-error';
    }
  };

  return (
    <div className={`error-toast ${getTypeClass()} ${position} ${isExiting ? 'exiting' : ''}`}>
      <div className="toast-content">
        <div className="toast-icon">{getIcon()}</div>
        <div className="toast-message">
          {typeof message === 'string' ? (
            <p>{message}</p>
          ) : (
            <>
              {message.title && <h4>{message.title}</h4>}
              <p>{message.message}</p>
            </>
          )}
        </div>
        <button 
          className="toast-close" 
          onClick={handleDismiss}
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      </div>

      <style jsx>{`
        .error-toast {
          position: fixed;
          z-index: 9999;
          max-width: 400px;
          min-width: 300px;
          background: #1a1a1a;
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          border: 1px solid #333;
          animation: slideIn 0.3s ease-out;
          transition: all 0.3s ease;
        }

        .error-toast.exiting {
          animation: slideOut 0.3s ease-in;
        }

        .error-toast.top-right {
          top: 20px;
          right: 20px;
        }

        .error-toast.top-left {
          top: 20px;
          left: 20px;
        }

        .error-toast.bottom-right {
          bottom: 20px;
          right: 20px;
        }

        .error-toast.bottom-left {
          bottom: 20px;
          left: 20px;
        }

        .error-toast.top-center {
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
        }

        .error-toast.bottom-center {
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
        }

        .toast-content {
          display: flex;
          align-items: flex-start;
          padding: 16px;
          gap: 12px;
        }

        .toast-icon {
          font-size: 18px;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .toast-message {
          flex: 1;
          color: #fff;
        }

        .toast-message h4 {
          margin: 0 0 4px 0;
          font-size: 14px;
          font-weight: 600;
          color: #fff;
        }

        .toast-message p {
          margin: 0;
          font-size: 13px;
          line-height: 1.4;
          color: #ccc;
        }

        .toast-close {
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          font-size: 16px;
          padding: 2px;
          border-radius: 2px;
          flex-shrink: 0;
          transition: color 0.2s;
        }

        .toast-close:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.1);
        }

        /* Type-specific styles */
        .toast-error {
          border-left: 4px solid #f44336;
        }

        .toast-success {
          border-left: 4px solid #4caf50;
        }

        .toast-warning {
          border-left: 4px solid #ff9800;
        }

        .toast-info {
          border-left: 4px solid #2196f3;
        }

        /* Animations */
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        /* Responsive adjustments */
        @media (max-width: 480px) {
          .error-toast {
            left: 10px !important;
            right: 10px !important;
            max-width: none;
            min-width: auto;
            transform: none !important;
          }

          .error-toast.top-center,
          .error-toast.bottom-center {
            left: 10px;
            transform: none;
          }

          @keyframes slideIn {
            from {
              transform: translateY(-100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }

          @keyframes slideOut {
            from {
              transform: translateY(0);
              opacity: 1;
            }
            to {
              transform: translateY(-100%);
              opacity: 0;
            }
          }
        }
      `}</style>
    </div>
  );
}

// Toast container component for managing multiple toasts
export function ErrorToastContainer({ toasts = [], onDismiss }) {
  return (
    <div className="toast-container">
      {toasts.map((toast, index) => (
        <ErrorToast
          key={toast.id || index}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          position={toast.position}
          onDismiss={() => onDismiss(toast.id || index)}
        />
      ))}
      
      <style jsx>{`
        .toast-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 9999;
        }
        
        .toast-container > :global(.error-toast) {
          pointer-events: auto;
        }
      `}</style>
    </div>
  );
}