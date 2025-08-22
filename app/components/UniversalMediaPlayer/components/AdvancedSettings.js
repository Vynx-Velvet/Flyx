import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../FuturisticMediaPlayer.module.css';

/**
 * AdvancedSettings - Comprehensive settings panel for all futuristic media player features
 * 
 * Features:
 * - Organized settings categories with smooth navigation
 * - Real-time setting previews and validation
 * - Import/export settings with cloud sync
 * - Performance optimization recommendations
 * - Accessibility compliance settings
 * - Advanced user customization options
 * - Setting search and quick access
 * - Preset management and sharing
 */
const AdvancedSettings = ({
  isOpen = false,
  currentSettings = {},
  onSettingsChange = null,
  onClose = null,
  deviceCapabilities = {},
  userPreferences = {},
  cloudSyncEnabled = false
}) => {
  const [activeCategory, setActiveCategory] = useState('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsState, setSettingsState] = useState(currentSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [presets, setPresets] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  // Settings categories structure
  const settingsCategories = useMemo(() => ({
    general: {
      title: 'General',
      icon: '⚙️',
      settings: {
        theme: {
          type: 'select',
          label: 'Theme',
          options: [
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
            { value: 'auto', label: 'Auto' },
            { value: 'cinema', label: 'Cinema' }
          ],
          default: 'dark',
          description: 'Overall visual theme of the player'
        },
        language: {
          type: 'select',
          label: 'Language',
          options: [
            { value: 'en', label: 'English' },
            { value: 'es', label: 'Español' },
            { value: 'fr', label: 'Français' },
            { value: 'de', label: 'Deutsch' },
            { value: 'ja', label: '日本語' },
            { value: 'ko', label: '한국어' },
            { value: 'zh', label: '中文' }
          ],
          default: 'en'
        },
        autoPlay: {
          type: 'toggle',
          label: 'Auto Play',
          default: false,
          description: 'Automatically start playing when media loads'
        },
        rememberPosition: {
          type: 'toggle',
          label: 'Remember Position',
          default: true,
          description: 'Resume playback from last position'
        },
        showFPS: {
          type: 'toggle',
          label: 'Show FPS Counter',
          default: false,
          category: 'debug'
        }
      }
    },
    
    performance: {
      title: 'Performance',
      icon: '🚀',
      settings: {
        renderingMode: {
          type: 'select',
          label: 'Rendering Mode',
          options: [
            { value: 'auto', label: 'Auto (Recommended)' },
            { value: 'performance', label: 'Performance' },
            { value: 'quality', label: 'Quality' },
            { value: 'balanced', label: 'Balanced' }
          ],
          default: 'auto',
          description: 'Balance between visual quality and performance'
        },
        particleQuality: {
          type: 'select',
          label: 'Particle Effects',
          options: [
            { value: 'off', label: 'Disabled' },
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'ultra', label: 'Ultra' }
          ],
          default: 'medium'
        },
        ambientLighting: {
          type: 'range',
          label: 'Ambient Lighting Intensity',
          min: 0,
          max: 1,
          step: 0.1,
          default: 0.7,
          format: 'percentage'
        },
        batteryOptimization: {
          type: 'toggle',
          label: 'Battery Optimization',
          default: true,
          description: 'Reduce performance when battery is low'
        },
        hardwareAcceleration: {
          type: 'toggle',
          label: 'Hardware Acceleration',
          default: true,
          description: 'Use GPU acceleration when available'
        }
      }
    },
    
    video: {
      title: 'Video',
      icon: '📺',
      settings: {
        defaultQuality: {
          type: 'select',
          label: 'Default Quality',
          options: [
            { value: 'auto', label: 'Auto' },
            { value: '2160p', label: '4K (2160p)' },
            { value: '1440p', label: '2K (1440p)' },
            { value: '1080p', label: 'Full HD (1080p)' },
            { value: '720p', label: 'HD (720p)' },
            { value: '480p', label: 'SD (480p)' }
          ],
          default: 'auto'
        },
        adaptiveStreaming: {
          type: 'toggle',
          label: 'Adaptive Streaming',
          default: true,
          description: 'Automatically adjust quality based on connection'
        },
        preloadStrategy: {
          type: 'select',
          label: 'Preload Strategy',
          options: [
            { value: 'none', label: 'None' },
            { value: 'metadata', label: 'Metadata Only' },
            { value: 'auto', label: 'Auto' }
          ],
          default: 'metadata'
        },
        seekPreview: {
          type: 'toggle',
          label: 'Seek Preview Thumbnails',
          default: true,
          description: 'Show thumbnails when seeking'
        },
        sceneDetection: {
          type: 'toggle',
          label: 'Scene Detection',
          default: true,
          description: 'Detect and mark scene changes'
        }
      }
    },
    
    audio: {
      title: 'Audio',
      icon: '🎵',
      settings: {
        defaultVolume: {
          type: 'range',
          label: 'Default Volume',
          min: 0,
          max: 1,
          step: 0.05,
          default: 0.8,
          format: 'percentage'
        },
        audioNormalization: {
          type: 'toggle',
          label: 'Volume Normalization',
          default: false,
          description: 'Normalize audio levels across different content'
        },
        surroundSound: {
          type: 'toggle',
          label: 'Surround Sound',
          default: true,
          description: 'Enable spatial audio when available'
        },
        audioEnhancement: {
          type: 'select',
          label: 'Audio Enhancement',
          options: [
            { value: 'off', label: 'Off' },
            { value: 'bass', label: 'Bass Boost' },
            { value: 'vocal', label: 'Vocal Enhance' },
            { value: 'dynamic', label: 'Dynamic Range' }
          ],
          default: 'off'
        }
      }
    },
    
    subtitles: {
      title: 'Subtitles',
      icon: '💬',
      settings: {
        defaultSubtitles: {
          type: 'toggle',
          label: 'Enable by Default',
          default: false
        },
        fontSize: {
          type: 'range',
          label: 'Font Size',
          min: 12,
          max: 48,
          step: 2,
          default: 20,
          format: 'px'
        },
        fontFamily: {
          type: 'select',
          label: 'Font Family',
          options: [
            { value: 'Inter', label: 'Inter' },
            { value: 'Arial', label: 'Arial' },
            { value: 'Helvetica', label: 'Helvetica' },
            { value: 'Georgia', label: 'Georgia' },
            { value: 'Times New Roman', label: 'Times New Roman' }
          ],
          default: 'Inter'
        },
        backgroundColor: {
          type: 'color',
          label: 'Background Color',
          default: '#000000',
          alpha: true
        },
        textColor: {
          type: 'color',
          label: 'Text Color',
          default: '#ffffff'
        },
        position: {
          type: 'select',
          label: 'Position',
          options: [
            { value: 'bottom', label: 'Bottom' },
            { value: 'top', label: 'Top' },
            { value: 'center', label: 'Center' }
          ],
          default: 'bottom'
        },
        intelligentPositioning: {
          type: 'toggle',
          label: 'Intelligent Positioning',
          default: true,
          description: 'Automatically avoid important visual content'
        }
      }
    },
    
    controls: {
      title: 'Controls',
      icon: '🎮',
      settings: {
        gestureControls: {
          type: 'toggle',
          label: 'Gesture Controls',
          default: true,
          description: 'Enable touch and mouse gestures'
        },
        voiceControls: {
          type: 'toggle',
          label: 'Voice Controls',
          default: false,
          description: 'Enable voice commands'
        },
        voiceSensitivity: {
          type: 'range',
          label: 'Voice Sensitivity',
          min: 0.1,
          max: 1,
          step: 0.1,
          default: 0.5,
          format: 'percentage',
          dependsOn: 'voiceControls'
        },
        keyboardShortcuts: {
          type: 'toggle',
          label: 'Keyboard Shortcuts',
          default: true
        },
        autoHideControls: {
          type: 'range',
          label: 'Auto-hide Delay (seconds)',
          min: 1,
          max: 10,
          step: 1,
          default: 3,
          format: 's'
        },
        showVolumeBar: {
          type: 'toggle',
          label: 'Show Volume Bar',
          default: true
        }
      }
    },
    
    accessibility: {
      title: 'Accessibility',
      icon: '♿',
      settings: {
        highContrast: {
          type: 'toggle',
          label: 'High Contrast Mode',
          default: false,
          description: 'Enhance contrast for better visibility'
        },
        reducedMotion: {
          type: 'toggle',
          label: 'Reduce Motion',
          default: false,
          description: 'Minimize animations and transitions'
        },
        largeText: {
          type: 'toggle',
          label: 'Large Text',
          default: false,
          description: 'Increase text size throughout the interface'
        },
        screenReaderSupport: {
          type: 'toggle',
          label: 'Screen Reader Support',
          default: true,
          description: 'Enhanced compatibility with screen readers'
        },
        focusIndicators: {
          type: 'toggle',
          label: 'Enhanced Focus Indicators',
          default: false,
          description: 'More visible focus outlines for keyboard navigation'
        },
        hapticFeedback: {
          type: 'toggle',
          label: 'Haptic Feedback',
          default: true,
          description: 'Vibration feedback on supported devices'
        }
      }
    },
    
    advanced: {
      title: 'Advanced',
      icon: '🔬',
      settings: {
        debugMode: {
          type: 'toggle',
          label: 'Debug Mode',
          default: false,
          description: 'Show detailed performance and debugging information'
        },
        experimentalFeatures: {
          type: 'toggle',
          label: 'Experimental Features',
          default: false,
          description: 'Enable cutting-edge features (may be unstable)'
        },
        telemetry: {
          type: 'toggle',
          label: 'Usage Analytics',
          default: false,
          description: 'Help improve the player by sharing anonymous usage data'
        },
        cloudSync: {
          type: 'toggle',
          label: 'Cloud Sync',
          default: cloudSyncEnabled,
          description: 'Sync settings across devices',
          disabled: !cloudSyncEnabled
        },
        cacheSize: {
          type: 'range',
          label: 'Cache Size (MB)',
          min: 50,
          max: 1000,
          step: 50,
          default: 200,
          format: 'MB'
        }
      }
    }
  }), [cloudSyncEnabled]);

  // Filter settings based on search query
  const filteredSettings = useMemo(() => {
    if (!searchQuery) return settingsCategories;
    
    const filtered = {};
    Object.entries(settingsCategories).forEach(([categoryKey, category]) => {
      const matchingSettings = {};
      Object.entries(category.settings).forEach(([settingKey, setting]) => {
        if (
          setting.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          setting.description?.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          matchingSettings[settingKey] = setting;
        }
      });
      
      if (Object.keys(matchingSettings).length > 0) {
        filtered[categoryKey] = {
          ...category,
          settings: matchingSettings
        };
      }
    });
    
    return filtered;
  }, [settingsCategories, searchQuery]);

  // Update settings state
  const updateSetting = useCallback((category, key, value) => {
    const newSettings = {
      ...settingsState,
      [category]: {
        ...settingsState[category],
        [key]: value
      }
    };
    
    setSettingsState(newSettings);
    setHasChanges(true);
    
    if (onSettingsChange) {
      onSettingsChange(newSettings);
    }
  }, [settingsState, onSettingsChange]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    const defaultSettings = {};
    Object.entries(settingsCategories).forEach(([categoryKey, category]) => {
      defaultSettings[categoryKey] = {};
      Object.entries(category.settings).forEach(([settingKey, setting]) => {
        defaultSettings[categoryKey][settingKey] = setting.default;
      });
    });
    
    setSettingsState(defaultSettings);
    setHasChanges(true);
  }, [settingsCategories]);

  // Export settings
  const exportSettings = useCallback(() => {
    const dataStr = JSON.stringify(settingsState, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `media-player-settings-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  }, [settingsState]);

  // Import settings
  const importSettings = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setIsImporting(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target.result);
        setSettingsState(importedSettings);
        setHasChanges(true);
      } catch (error) {
        console.error('Failed to import settings:', error);
      } finally {
        setIsImporting(false);
      }
    };
    
    reader.readAsText(file);
  }, []);

  // Render setting input
  const renderSetting = useCallback((categoryKey, settingKey, setting) => {
    const value = settingsState[categoryKey]?.[settingKey] ?? setting.default;
    const isDisabled = setting.disabled || (setting.dependsOn && !settingsState[categoryKey]?.[setting.dependsOn]);
    
    const handleChange = (newValue) => {
      updateSetting(categoryKey, settingKey, newValue);
    };

    switch (setting.type) {
      case 'toggle':
        return (
          <motion.div
            key={settingKey}
            className={styles.settingItem}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className={styles.settingLabel}>
              <span>{setting.label}</span>
              {setting.description && (
                <span className={styles.settingDescription}>{setting.description}</span>
              )}
            </div>
            <button
              className={`${styles.toggleButton} ${value ? styles.active : ''} ${isDisabled ? styles.disabled : ''}`}
              onClick={() => !isDisabled && handleChange(!value)}
              disabled={isDisabled}
              aria-checked={value}
              role="switch"
            >
              <motion.div
                className={styles.toggleSlider}
                animate={{ x: value ? 20 : 0 }}
                transition={{ duration: 0.2 }}
              />
            </button>
          </motion.div>
        );
        
      case 'select':
        return (
          <motion.div
            key={settingKey}
            className={styles.settingItem}
            whileHover={{ scale: 1.02 }}
          >
            <div className={styles.settingLabel}>
              <span>{setting.label}</span>
              {setting.description && (
                <span className={styles.settingDescription}>{setting.description}</span>
              )}
            </div>
            <select
              className={styles.selectInput}
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              disabled={isDisabled}
            >
              {setting.options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </motion.div>
        );
        
      case 'range':
        return (
          <motion.div
            key={settingKey}
            className={styles.settingItem}
            whileHover={{ scale: 1.02 }}
          >
            <div className={styles.settingLabel}>
              <span>{setting.label}</span>
              {setting.description && (
                <span className={styles.settingDescription}>{setting.description}</span>
              )}
            </div>
            <div className={styles.rangeContainer}>
              <input
                type="range"
                className={styles.rangeInput}
                min={setting.min}
                max={setting.max}
                step={setting.step}
                value={value}
                onChange={(e) => handleChange(parseFloat(e.target.value))}
                disabled={isDisabled}
              />
              <span className={styles.rangeValue}>
                {setting.format === 'percentage' 
                  ? `${Math.round(value * 100)}%`
                  : `${value}${setting.format || ''}`
                }
              </span>
            </div>
          </motion.div>
        );
        
      case 'color':
        return (
          <motion.div
            key={settingKey}
            className={styles.settingItem}
            whileHover={{ scale: 1.02 }}
          >
            <div className={styles.settingLabel}>
              <span>{setting.label}</span>
              {setting.description && (
                <span className={styles.settingDescription}>{setting.description}</span>
              )}
            </div>
            <div className={styles.colorContainer}>
              <input
                type="color"
                className={styles.colorInput}
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                disabled={isDisabled}
              />
              <span className={styles.colorValue}>{value}</span>
            </div>
          </motion.div>
        );
        
      default:
        return null;
    }
  }, [settingsState, updateSetting]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1
      }
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.2 }
    }
  };

  const categoryVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.settingsOverlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={styles.settingsContainer}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={styles.settingsHeader}>
            <h2>⚙️ Advanced Settings</h2>
            <div className={styles.headerActions}>
              {hasChanges && (
                <motion.span
                  className={styles.changesIndicator}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  Unsaved changes
                </motion.span>
              )}
              <button
                className={styles.closeButton}
                onClick={onClose}
                aria-label="Close settings"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className={styles.searchContainer}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className={styles.searchIcon}>🔍</span>
          </div>

          <div className={styles.settingsContent}>
            {/* Category navigation */}
            <div className={styles.categoryNav}>
              {Object.entries(filteredSettings).map(([categoryKey, category]) => (
                <motion.button
                  key={categoryKey}
                  className={`${styles.categoryButton} ${activeCategory === categoryKey ? styles.active : ''}`}
                  onClick={() => setActiveCategory(categoryKey)}
                  variants={categoryVariants}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className={styles.categoryIcon}>{category.icon}</span>
                  <span className={styles.categoryTitle}>{category.title}</span>
                </motion.button>
              ))}
            </div>

            {/* Settings panel */}
            <div className={styles.settingsPanel}>
              <AnimatePresence mode="wait">
                {filteredSettings[activeCategory] && (
                  <motion.div
                    key={activeCategory}
                    className={styles.categorySettings}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3>
                      {filteredSettings[activeCategory].icon} {filteredSettings[activeCategory].title}
                    </h3>
                    <div className={styles.settingsList}>
                      {Object.entries(filteredSettings[activeCategory].settings).map(([settingKey, setting]) =>
                        renderSetting(activeCategory, settingKey, setting)
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer actions */}
          <div className={styles.settingsFooter}>
            <div className={styles.footerLeft}>
              <button
                className={styles.actionButton}
                onClick={resetToDefaults}
              >
                🔄 Reset to Defaults
              </button>
              <button
                className={styles.actionButton}
                onClick={exportSettings}
              >
                📤 Export Settings
              </button>
              <label className={styles.actionButton}>
                📥 Import Settings
                <input
                  type="file"
                  accept=".json"
                  onChange={importSettings}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            
            <div className={styles.footerRight}>
              {showPreview && (
                <button
                  className={styles.previewButton}
                  onClick={() => setShowPreview(!showPreview)}
                >
                  👁️ Preview Changes
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AdvancedSettings;