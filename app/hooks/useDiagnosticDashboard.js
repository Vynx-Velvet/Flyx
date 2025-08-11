/**
 * Hook for managing diagnostic dashboard state
 * Provides easy access to diagnostic functionality in components
 */

import { useState, useEffect } from 'react';
import { loggerManager } from '../utils/logging/index.js';

export function useDiagnosticDashboard() {
  const [isOpen, setIsOpen] = useState(false);
  const [logCount, setLogCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  // Update log counts periodically
  useEffect(() => {
    const updateCounts = () => {
      const allLogs = loggerManager.getAllLogs();
      setLogCount(allLogs.length);
      setErrorCount(allLogs.filter(log => log.level === 'error').length);
    };

    updateCounts();
    const interval = setInterval(updateCounts, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut to open dashboard (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openDashboard = () => setIsOpen(true);
  const closeDashboard = () => setIsOpen(false);
  const toggleDashboard = () => setIsOpen(prev => !prev);

  return {
    isOpen,
    logCount,
    errorCount,
    openDashboard,
    closeDashboard,
    toggleDashboard
  };
}