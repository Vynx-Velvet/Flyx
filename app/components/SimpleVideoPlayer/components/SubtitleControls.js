import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SubtitleControls = ({
  subtitles,
  availableLanguages,
  activeSubtitle,
  subtitlesVisible,
  fontSize,
  fontColor,
  backgroundColor,
  position,
  onSelectSubtitle,
  onToggleSubtitles,
  onUpdateStyle,
  loading,
  hasSubtitles
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const fontSizeOptions = [
    { value: 12, label: 'Small' },
    { value: 16, label: 'Medium' },
    { value: 20, label: 'Large' },
    { value: 24, label: 'Extra Large' }
  ];

  const colorOptions = [
    { value: '#ffffff', label: 'White', color: '#ffffff' },
    { value: '#ffff00', label: 'Yellow', color: '#ffff00' },
    { value: '#00ff00', label: 'Green', color: '#00ff00' },
    { value: '#ff0000', label: 'Red', color: '#ff0000' },
    { value: '#00ffff', label: 'Cyan', color: '#00ffff' },
    { value: '#ff00ff', label: 'Magenta', color: '#ff00ff' }
  ];

  const backgroundOptions = [
    { value: 'rgba(0, 0, 0, 0.8)', label: 'Dark', preview: '#000000' },
    { value: 'rgba(0, 0, 0, 0.5)', label: 'Semi-Dark', preview: '#000000' },
    { value: 'rgba(0, 0, 0, 0)', label: 'Transparent', preview: 'transparent' },
    { value: 'rgba(255, 255, 255, 0.8)', label: 'Light', preview: '#ffffff' }
  ];

  const positionOptions = [
    { value: 'bottom', label: 'Bottom' },
    { value: 'top', label: 'Top' },
    { value: 'center', label: 'Center' }
  ];

  if (!hasSubtitles && !loading) {
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      position: 'relative'
    }}>
      {/* Subtitle Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggleSubtitles}
        disabled={!activeSubtitle}
        style={{
          background: subtitlesVisible && activeSubtitle ? 'rgba(0, 245, 255, 0.3)' : 'rgba(255,255,255,0.1)',
          border: subtitlesVisible && activeSubtitle ? '2px solid #00f5ff' : '1px solid rgba(255,255,255,0.2)',
          color: subtitlesVisible && activeSubtitle ? '#00f5ff' : 'white',
          padding: '8px 12px',
          borderRadius: '8px',
          cursor: activeSubtitle ? 'pointer' : 'not-allowed',
          fontSize: '14px',
          transition: 'all 0.3s ease',
          opacity: activeSubtitle ? 1 : 0.5,
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
        title={activeSubtitle ? (subtitlesVisible ? 'Hide subtitles' : 'Show subtitles') : 'No subtitles selected'}
      >
        <span>{subtitlesVisible ? '👁️' : '👁️‍🗨️'}</span>
        <span style={{ fontSize: '12px' }}>CC</span>
      </motion.button>

      {/* Language Selection Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowLanguageMenu(!showLanguageMenu)}
        disabled={loading || availableLanguages.length === 0}
        style={{
          background: activeSubtitle ? 'rgba(0, 245, 255, 0.2)' : 'rgba(255,255,255,0.1)',
          border: activeSubtitle ? '2px solid rgba(0, 245, 255, 0.5)' : '1px solid rgba(255,255,255,0.2)',
          color: activeSubtitle ? '#00f5ff' : 'white',
          padding: '8px 12px',
          borderRadius: '8px',
          cursor: availableLanguages.length > 0 ? 'pointer' : 'not-allowed',
          fontSize: '12px',
          transition: 'all 0.3s ease',
          opacity: availableLanguages.length > 0 ? 1 : 0.5,
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          minWidth: '80px'
        }}
        title="Select subtitle language"
      >
        {loading ? (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            ⚡
          </motion.span>
        ) : (
          <>
            <span>{activeSubtitle?.flag || '🌐'}</span>
            <span>{activeSubtitle?.language || 'Subtitles'}</span>
          </>
        )}
      </motion.button>

      {/* Settings Button */}
      {activeSubtitle && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowSettings(!showSettings)}
          style={{
            background: showSettings ? 'rgba(0, 245, 255, 0.3)' : 'rgba(255,255,255,0.1)',
            border: showSettings ? '2px solid #00f5ff' : '1px solid rgba(255,255,255,0.2)',
            color: showSettings ? '#00f5ff' : 'white',
            padding: '8px 12px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(10px)'
          }}
          title="Subtitle settings"
        >
          ⚙️
        </motion.button>
      )}

      {/* Language Selection Menu */}
      <AnimatePresence>
        {showLanguageMenu && availableLanguages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '0',
              marginBottom: '0.5rem',
              background: 'rgba(0, 0, 0, 0.95)',
              border: '2px solid rgba(0, 245, 255, 0.3)',
              borderRadius: '12px',
              padding: '0.75rem',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
              zIndex: 1000,
              minWidth: '200px'
            }}
          >
            <div style={{
              fontSize: '12px',
              color: '#00f5ff',
              fontWeight: '600',
              marginBottom: '0.5rem',
              textAlign: 'center'
            }}>
              Select Language
            </div>
            
            {/* Off Option */}
            <motion.button
              whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
              onClick={() => {
                onSelectSubtitle(null);
                setShowLanguageMenu(false);
              }}
              style={{
                width: '100%',
                padding: '0.5rem',
                background: !activeSubtitle ? 'rgba(0, 245, 255, 0.2)' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: !activeSubtitle ? '#00f5ff' : 'white',
                cursor: 'pointer',
                fontSize: '12px',
                marginBottom: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease'
              }}
            >
              <span>❌</span>
              <span>Off</span>
            </motion.button>

            {availableLanguages.map((lang) => {
              const isActive = activeSubtitle?.langcode === lang.langcode;
              
              return (
                <motion.button
                  key={lang.langcode}
                  whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                  onClick={() => {
                    // Find the full subtitle object from the subtitles array
                    const selectedSubtitle = subtitles.find(s => s.langcode === lang.langcode);
                    if (selectedSubtitle) {
                      onSelectSubtitle(selectedSubtitle);
                    }
                    setShowLanguageMenu(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: isActive ? 'rgba(0, 245, 255, 0.2)' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: isActive ? '#00f5ff' : 'white',
                    cursor: 'pointer',
                    fontSize: '12px',
                    marginBottom: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.language}</span>
                  {isActive && <span style={{ marginLeft: 'auto', fontSize: '10px' }}>✓</span>}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Menu */}
      <AnimatePresence>
        {showSettings && activeSubtitle && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              bottom: '100%',
              right: '0',
              marginBottom: '0.5rem',
              background: 'rgba(0, 0, 0, 0.95)',
              border: '2px solid rgba(0, 245, 255, 0.3)',
              borderRadius: '12px',
              padding: '1rem',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
              zIndex: 1000,
              minWidth: '250px'
            }}
          >
            <div style={{
              fontSize: '12px',
              color: '#00f5ff',
              fontWeight: '600',
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              Subtitle Settings
            </div>

            {/* Font Size */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.8)',
                marginBottom: '0.5rem'
              }}>
                Font Size
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.25rem'
              }}>
                {fontSizeOptions.map((option) => (
                  <motion.button
                    key={option.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onUpdateStyle({ fontSize: option.value })}
                    style={{
                      padding: '0.4rem',
                      background: fontSize === option.value ? 'rgba(0, 245, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                      border: fontSize === option.value ? '1px solid #00f5ff' : '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '6px',
                      color: fontSize === option.value ? '#00f5ff' : 'white',
                      cursor: 'pointer',
                      fontSize: '10px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {option.label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Font Color */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.8)',
                marginBottom: '0.5rem'
              }}>
                Font Color
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.25rem'
              }}>
                {colorOptions.map((option) => (
                  <motion.button
                    key={option.value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onUpdateStyle({ fontColor: option.value })}
                    style={{
                      padding: '0.4rem',
                      background: fontColor === option.value ? 'rgba(0, 245, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                      border: fontColor === option.value ? '2px solid #00f5ff' : '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: option.color,
                      border: '1px solid rgba(255, 255, 255, 0.3)'
                    }} />
                    <span style={{ color: 'white', fontSize: '9px' }}>{option.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Background */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.8)',
                marginBottom: '0.5rem'
              }}>
                Background
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.25rem'
              }}>
                {backgroundOptions.map((option) => (
                  <motion.button
                    key={option.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onUpdateStyle({ backgroundColor: option.value })}
                    style={{
                      padding: '0.4rem',
                      background: backgroundColor === option.value ? 'rgba(0, 245, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                      border: backgroundColor === option.value ? '1px solid #00f5ff' : '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '6px',
                      color: backgroundColor === option.value ? '#00f5ff' : 'white',
                      cursor: 'pointer',
                      fontSize: '10px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {option.label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Position */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.8)',
                marginBottom: '0.5rem'
              }}>
                Position
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.25rem'
              }}>
                {positionOptions.map((option) => (
                  <motion.button
                    key={option.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onUpdateStyle({ position: option.value })}
                    style={{
                      padding: '0.4rem',
                      background: position === option.value ? 'rgba(0, 245, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                      border: position === option.value ? '1px solid #00f5ff' : '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '6px',
                      color: position === option.value ? '#00f5ff' : 'white',
                      cursor: 'pointer',
                      fontSize: '10px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {option.label}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close menus */}
      {(showLanguageMenu || showSettings) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999
          }}
          onClick={() => {
            setShowLanguageMenu(false);
            setShowSettings(false);
          }}
        />
      )}
    </div>
  );
};

export default SubtitleControls;