import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '../FuturisticMediaPlayer.module.css';

/**
 * IntelligentSubtitles - Advanced subtitle component with AI-powered positioning
 * 
 * Features:
 * - Content-aware positioning to avoid obstructing important visual elements
 * - Dynamic styling based on background colors and contrast
 * - Smart text wrapping and line breaking
 * - Multi-language support with appropriate fonts
 * - Accessibility features including high contrast mode
 * - Performance-optimized rendering
 * - Animation and transition effects
 */
const IntelligentSubtitles = ({
  text = '',
  position = { x: 50, y: 85, align: 'center' },
  contentAwareness = null,
  style = {
    fontSize: 'medium',
    background: 'glass',
    animation: true,
    contrast: 'auto'
  },
  animations = true,
  videoRef = null,
  language = 'en',
  accessibility = {
    highContrast: false,
    largeText: false,
    reducedMotion: false
  }
}) => {
  const [displayText, setDisplayText] = useState('');
  const [currentPosition, setCurrentPosition] = useState(position);
  const [backgroundInfo, setBackgroundInfo] = useState({ brightness: 0.5, colors: [] });
  const [isVisible, setIsVisible] = useState(false);
  const [textLines, setTextLines] = useState([]);
  
  const subtitleRef = useRef(null);
  const canvasRef = useRef(null);
  const previousTextRef = useRef('');

  // Font configuration for different languages
  const languageFonts = {
    'en': 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'es': 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'fr': 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'de': 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    'ja': '"Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif',
    'ko': '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
    'zh': '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
    'ar': '"Noto Sans Arabic", "Tahoma", sans-serif',
    'hi': '"Noto Sans Devanagari", "Arial Unicode MS", sans-serif'
  };

  // Font size mapping
  const fontSizes = {
    small: { base: 16, mobile: 14 },
    medium: { base: 20, mobile: 16 },
    large: { base: 24, mobile: 20 },
    xlarge: { base: 28, mobile: 24 }
  };

  // Calculate optimal font size based on screen and user preferences
  const calculateFontSize = useMemo(() => {
    const baseSize = fontSizes[style.fontSize] || fontSizes.medium;
    const screenWidth = window.innerWidth;
    const isMobile = screenWidth < 768;
    
    let size = isMobile ? baseSize.mobile : baseSize.base;
    
    // Apply accessibility adjustments
    if (accessibility.largeText) {
      size *= 1.25;
    }
    
    // Apply responsive scaling
    if (screenWidth < 480) {
      size *= 0.9;
    } else if (screenWidth > 1920) {
      size *= 1.1;
    }
    
    return Math.round(size);
  }, [style.fontSize, accessibility.largeText]);

  // Smart text processing with language-aware line breaking
  const processText = useMemo(() => {
    if (!text) return { lines: [], words: [] };
    
    // Clean HTML tags and decode entities
    const cleanText = text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    
    // Split into words for intelligent wrapping
    const words = cleanText.split(/\s+/).filter(Boolean);
    
    // Smart line breaking based on language and content
    const lines = [];
    let currentLine = '';
    const maxWordsPerLine = language === 'ja' || language === 'ko' || language === 'zh' ? 15 : 8;
    const maxLineLength = 50;
    
    words.forEach((word, index) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      
      if (testLine.length > maxLineLength || (currentLine.split(' ').length >= maxWordsPerLine)) {
        if (currentLine) {
          lines.push(currentLine.trim());
          currentLine = word;
        } else {
          lines.push(word); // Single long word
        }
      } else {
        currentLine = testLine;
      }
      
      // Add remaining text on last iteration
      if (index === words.length - 1 && currentLine) {
        lines.push(currentLine.trim());
      }
    });
    
    return { lines: lines.length > 0 ? lines : [cleanText], words };
  }, [text, language]);

  // Content-aware positioning algorithm
  useEffect(() => {
    if (!contentAwareness || !videoRef?.current || !subtitleRef.current) {
      setCurrentPosition(position);
      return;
    }
    
    const analyzeVideoContent = async () => {
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        canvas.width = 160;
        canvas.height = 90;
        
        // Capture current frame
        ctx.drawImage(video, 0, 0, 160, 90);
        const imageData = ctx.getImageData(0, 0, 160, 90);
        const data = imageData.data;
        
        // Analyze bottom section where subtitles typically appear
        const bottomSection = {
          x: 0,
          y: Math.floor(90 * 0.7), // Bottom 30% of frame
          width: 160,
          height: Math.floor(90 * 0.3)
        };
        
        let totalBrightness = 0;
        let pixelCount = 0;
        const colors = [];
        
        for (let y = bottomSection.y; y < bottomSection.y + bottomSection.height; y++) {
          for (let x = bottomSection.x; x < bottomSection.x + bottomSection.width; x++) {
            const i = (y * 160 + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Calculate brightness using luminance formula
            const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            totalBrightness += brightness;
            pixelCount++;
            
            // Sample colors for adaptive styling
            if (pixelCount % 50 === 0) {
              colors.push({ r, g, b, brightness });
            }
          }
        }
        
        const avgBrightness = totalBrightness / pixelCount;
        
        setBackgroundInfo({
          brightness: avgBrightness,
          colors: colors.slice(0, 10) // Keep top 10 color samples
        });
        
        // Adjust position based on content analysis
        let newPosition = { ...position };
        
        // If bottom area is bright or has important content, move subtitles up
        if (avgBrightness > 0.7 || contentAwareness.hasImportantContent) {
          newPosition.y = Math.max(60, position.y - 10);
        }
        
        // Avoid detected faces or text regions
        if (contentAwareness.detectedRegions?.length > 0) {
          const conflicts = contentAwareness.detectedRegions.filter(region => 
            region.y > 60 && region.confidence > 0.7
          );
          
          if (conflicts.length > 0) {
            newPosition.y = Math.max(50, Math.min(...conflicts.map(r => r.y)) - 5);
          }
        }
        
        setCurrentPosition(newPosition);
        
      } catch (error) {
        console.warn('Content analysis failed:', error);
        setCurrentPosition(position);
      }
    };
    
    const analysisInterval = setInterval(analyzeVideoContent, 2000);
    analyzeVideoContent();
    
    return () => clearInterval(analysisInterval);
  }, [contentAwareness, position, videoRef]);

  // Update display text with smooth transitions
  useEffect(() => {
    if (text === previousTextRef.current) return;
    
    previousTextRef.current = text;
    
    if (!text) {
      setIsVisible(false);
      setTimeout(() => setDisplayText(''), 200);
      return;
    }
    
    if (animations && displayText && text !== displayText) {
      // Fade out old text
      setIsVisible(false);
      setTimeout(() => {
        setDisplayText(text);
        setTextLines(processText.lines);
        setIsVisible(true);
      }, 150);
    } else {
      setDisplayText(text);
      setTextLines(processText.lines);
      setIsVisible(true);
    }
  }, [text, animations, displayText, processText.lines]);

  // Dynamic styling based on background analysis
  const getDynamicStyles = useMemo(() => {
    const baseStyles = {
      fontSize: `${calculateFontSize}px`,
      fontFamily: languageFonts[language] || languageFonts.en,
      lineHeight: language === 'ja' || language === 'ko' || language === 'zh' ? 1.6 : 1.4
    };
    
    // Accessibility overrides
    if (accessibility.highContrast) {
      return {
        ...baseStyles,
        background: 'rgba(0, 0, 0, 0.95)',
        color: '#ffffff',
        border: '2px solid #ffffff',
        textShadow: 'none',
        backdropFilter: 'none'
      };
    }
    
    // Smart contrast based on background analysis
    const isLightBackground = backgroundInfo.brightness > 0.6;
    const needsHighContrast = Math.abs(backgroundInfo.brightness - 0.5) < 0.2;
    
    let backgroundColor, textColor, borderColor, textShadow;
    
    if (style.background === 'glass') {
      backgroundColor = isLightBackground 
        ? 'rgba(0, 0, 0, 0.8)' 
        : 'rgba(0, 0, 0, 0.7)';
      textColor = '#ffffff';
      borderColor = isLightBackground 
        ? 'rgba(255, 255, 255, 0.3)' 
        : 'rgba(255, 255, 255, 0.2)';
      textShadow = '0 2px 4px rgba(0, 0, 0, 0.8)';
    } else if (style.background === 'solid') {
      backgroundColor = isLightBackground ? '#000000' : '#000000';
      textColor = '#ffffff';
      borderColor = 'transparent';
      textShadow = 'none';
    } else { // transparent
      backgroundColor = 'transparent';
      textColor = isLightBackground ? '#000000' : '#ffffff';
      borderColor = 'transparent';
      textShadow = isLightBackground 
        ? '0 0 4px #ffffff, 0 2px 4px rgba(255, 255, 255, 0.8)' 
        : '0 0 4px #000000, 0 2px 4px rgba(0, 0, 0, 0.8)';
    }
    
    // Enhance contrast if needed
    if (needsHighContrast && style.background !== 'solid') {
      backgroundColor = backgroundColor.replace(/,\s*[\d.]+\)/, ', 0.9)');
      textShadow += ', 0 0 8px rgba(0, 0, 0, 0.9)';
    }
    
    return {
      ...baseStyles,
      backgroundColor,
      color: textColor,
      borderColor,
      textShadow,
      backdropFilter: style.background === 'glass' ? 'blur(12px) saturate(180%)' : 'none'
    };
  }, [calculateFontSize, language, accessibility, backgroundInfo, style.background]);

  // Animation variants
  const animationVariants = {
    hidden: {
      opacity: 0,
      y: 10,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: accessibility.reducedMotion ? 0.1 : 0.3,
        ease: 'easeOut',
        staggerChildren: 0.05
      }
    },
    exit: {
      opacity: 0,
      y: -5,
      scale: 1.05,
      transition: {
        duration: accessibility.reducedMotion ? 0.05 : 0.2,
        ease: 'easeIn'
      }
    }
  };

  const lineVariants = {
    hidden: { opacity: 0, y: 5 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: accessibility.reducedMotion ? 0.05 : 0.2 }
    }
  };

  if (!displayText) return null;

  return (
    <>
      {/* Hidden canvas for content analysis */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
        width="160"
        height="90"
      />
      
      {/* Subtitle display */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={subtitleRef}
            className={styles.intelligentSubtitles}
            style={{
              left: `${currentPosition.x}%`,
              bottom: `${100 - currentPosition.y}%`,
              transform: `translateX(-50%)`,
              textAlign: currentPosition.align || 'center'
            }}
            variants={animationVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div
              className={`${styles.subtitleText} ${
                contentAwareness ? styles.contentAware : ''
              }`}
              style={getDynamicStyles}
            >
              {textLines.map((line, index) => (
                <motion.div
                  key={`${line}-${index}`}
                  variants={lineVariants}
                  style={{
                    marginBottom: index < textLines.length - 1 ? '0.2em' : 0
                  }}
                >
                  {line}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default IntelligentSubtitles;