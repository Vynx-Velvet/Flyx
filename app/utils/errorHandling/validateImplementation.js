/**
 * Validation script for the error handling system
 * Tests basic functionality without requiring a test framework
 */

import { ErrorTypes, ErrorSeverity, ErrorCategory } from './ErrorTypes.js';
import { ErrorClassifier } from './ErrorClassifier.js';
import { RecoveryStrategies } from './RecoveryStrategies.js';
import { DiagnosticLogger } from './DiagnosticLogger.js';
import { UserFriendlyMessages } from './UserFriendlyMessages.js';
import { ErrorReportingSystem } from './ErrorReportingSystem.js';
import { MediaErrorHandler } from './MediaErrorHandler.js';

function validateErrorTypes() {
  console.log('✓ Validating ErrorTypes...');
  
  // Check that all error types are defined
  const requiredTypes = [
    'EXTRACTION', 'PLAYBACK', 'SUBTITLE', 'SYSTEM'
  ];
  
  requiredTypes.forEach(type => {
    if (!ErrorTypes[type]) {
      throw new Error(`Missing error type: ${type}`);
    }
  });
  
  // Check extraction errors
  const extractionErrors = [
    'IFRAME_NAVIGATION_FAILED', 'SERVER_HASH_EXHAUSTED', 'ANTI_BOT_DETECTED',
    'PLAY_BUTTON_NOT_FOUND', 'CLOUDNESTRA_ACCESS_BLOCKED', 'SHADOWLANDS_CORS_ERROR'
  ];
  
  extractionErrors.forEach(error => {
    if (!ErrorTypes.EXTRACTION[error]) {
      throw new Error(`Missing extraction error: ${error}`);
    }
  });
  
  console.log('✓ ErrorTypes validation passed');
}

function validateErrorClassifier() {
  console.log('✓ Validating ErrorClassifier...');
  
  // Test HLS error classification
  const hlsError = {
    type: 'hlsError',
    details: 'fragLoadError',
    fatal: true
  };
  
  const classified = ErrorClassifier.classify(hlsError, { source: 'playback' });
  
  if (classified.type !== ErrorTypes.PLAYBACK.HLS_NETWORK_ERROR) {
    throw new Error('HLS error classification failed');
  }
  
  if (!classified.timestamp || !classified.recoverable !== undefined) {
    throw new Error('Missing required classification properties');
  }
  
  // Test extraction error classification
  const extractionError = new Error('iframe navigation failed');
  const extractionClassified = ErrorClassifier.classify(extractionError, { source: 'extraction' });
  
  if (extractionClassified.type !== ErrorTypes.EXTRACTION.IFRAME_NAVIGATION_FAILED) {
    throw new Error('Extraction error classification failed');
  }
  
  console.log('✓ ErrorClassifier validation passed');
}

function validateRecoveryStrategies() {
  console.log('✓ Validating RecoveryStrategies...');
  
  const recoveryStrategies = new RecoveryStrategies();
  
  // Test retry count management
  const errorType = ErrorTypes.PLAYBACK.SEGMENT_LOAD_FAILED;
  
  if (recoveryStrategies.getRetryCount(errorType) !== 0) {
    throw new Error('Initial retry count should be 0');
  }
  
  recoveryStrategies.incrementRetryCount(errorType);
  if (recoveryStrategies.getRetryCount(errorType) !== 1) {
    throw new Error('Retry count increment failed');
  }
  
  recoveryStrategies.resetRetryCount(errorType);
  if (recoveryStrategies.getRetryCount(errorType) !== 0) {
    throw new Error('Retry count reset failed');
  }
  
  console.log('✓ RecoveryStrategies validation passed');
}

function validateDiagnosticLogger() {
  console.log('✓ Validating DiagnosticLogger...');
  
  const logger = new DiagnosticLogger();
  
  // Test basic logging
  const classifiedError = {
    type: ErrorTypes.PLAYBACK.HLS_NETWORK_ERROR,
    severity: ErrorSeverity.MEDIUM,
    originalError: new Error('Test error'),
    metadata: {}
  };
  
  const logEntry = logger.logError(classifiedError, { test: 'context' });
  
  if (!logEntry.id || !logEntry.timestamp || !logEntry.sessionId) {
    throw new Error('Missing required log entry properties');
  }
  
  if (logger.logs.length !== 1) {
    throw new Error('Log entry was not added to logs array');
  }
  
  // Test export functionality
  const diagnosticData = logger.exportDiagnosticData();
  if (!diagnosticData.sessionId || !diagnosticData.logs || !diagnosticData.summary) {
    throw new Error('Diagnostic data export incomplete');
  }
  
  console.log('✓ DiagnosticLogger validation passed');
}

function validateUserFriendlyMessages() {
  console.log('✓ Validating UserFriendlyMessages...');
  
  const classifiedError = {
    type: ErrorTypes.PLAYBACK.HLS_NETWORK_ERROR,
    severity: ErrorSeverity.MEDIUM,
    retryable: true,
    recoverable: true,
    timestamp: new Date().toISOString()
  };
  
  const userMessage = UserFriendlyMessages.getErrorMessage(classifiedError);
  
  if (!userMessage.title || !userMessage.message || !userMessage.actions) {
    throw new Error('User message missing required properties');
  }
  
  if (!Array.isArray(userMessage.actions) || userMessage.actions.length === 0) {
    throw new Error('User message actions should be a non-empty array');
  }
  
  // Test progress messages
  const progressMessage = UserFriendlyMessages.getProgressMessage('retry', 50);
  if (!progressMessage.includes('50%')) {
    throw new Error('Progress message should include percentage');
  }
  
  console.log('✓ UserFriendlyMessages validation passed');
}

function validateErrorReportingSystem() {
  console.log('✓ Validating ErrorReportingSystem...');
  
  const reportingSystem = new ErrorReportingSystem();
  
  // Test report creation
  const classifiedError = {
    type: ErrorTypes.PLAYBACK.HLS_NETWORK_ERROR,
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.RETRY_REQUIRED,
    originalError: new Error('Test error'),
    recoverable: true,
    retryable: true,
    metadata: {}
  };
  
  const report = reportingSystem.createErrorReport(classifiedError, { test: 'context' });
  
  if (!report.id || !report.timestamp || !report.error || !report.environment) {
    throw new Error('Error report missing required properties');
  }
  
  // Test feedback form creation
  const feedbackForm = reportingSystem.createFeedbackForm(classifiedError);
  if (!feedbackForm.fields || !Array.isArray(feedbackForm.fields)) {
    throw new Error('Feedback form should have fields array');
  }
  
  console.log('✓ ErrorReportingSystem validation passed');
}

function validateMediaErrorHandler() {
  console.log('✓ Validating MediaErrorHandler...');
  
  const errorHandler = new MediaErrorHandler();
  
  // Test listener management
  const testListener = () => {};
  
  errorHandler.addErrorListener(testListener);
  if (!errorHandler.errorListeners.has(testListener)) {
    throw new Error('Error listener was not added');
  }
  
  errorHandler.removeErrorListener(testListener);
  if (errorHandler.errorListeners.has(testListener)) {
    throw new Error('Error listener was not removed');
  }
  
  // Test recovery listener management
  errorHandler.addRecoveryListener(testListener);
  if (!errorHandler.recoveryListeners.has(testListener)) {
    throw new Error('Recovery listener was not added');
  }
  
  errorHandler.removeRecoveryListener(testListener);
  if (errorHandler.recoveryListeners.has(testListener)) {
    throw new Error('Recovery listener was not removed');
  }
  
  console.log('✓ MediaErrorHandler validation passed');
}

async function validateIntegration() {
  console.log('✓ Validating integration...');
  
  const errorHandler = new MediaErrorHandler();
  
  // Test basic error handling flow
  const testError = new Error('Test integration error');
  const context = { source: 'test', movieId: '123' };
  
  try {
    const result = await errorHandler.handleError(testError, context);
    
    if (!result.classifiedError || !result.userMessage) {
      throw new Error('Error handling result incomplete');
    }
    
    if (typeof result.canRetry !== 'boolean' || typeof result.canRecover !== 'boolean') {
      throw new Error('Error handling result missing boolean flags');
    }
    
    console.log('✓ Integration validation passed');
  } catch (error) {
    console.error('Integration validation failed:', error);
    throw error;
  }
}

// Run all validations
async function runValidation() {
  console.log('🚀 Starting error handling system validation...\n');
  
  try {
    validateErrorTypes();
    validateErrorClassifier();
    validateRecoveryStrategies();
    validateDiagnosticLogger();
    validateUserFriendlyMessages();
    validateErrorReportingSystem();
    validateMediaErrorHandler();
    await validateIntegration();
    
    console.log('\n✅ All validations passed! Error handling system is working correctly.');
    
    // Test a few real-world scenarios
    console.log('\n🧪 Testing real-world scenarios...');
    
    const errorHandler = new MediaErrorHandler();
    
    // Test HLS error
    const hlsError = {
      type: 'hlsError',
      details: 'fragLoadError',
      fatal: false,
      frag: { url: 'test.ts', level: 1 }
    };
    
    const hlsResult = await errorHandler.handleError(hlsError, { source: 'playback' });
    console.log('✓ HLS error handling:', hlsResult.userMessage.title);
    
    // Test extraction error
    const extractionError = new Error('iframe navigation failed');
    const extractionResult = await errorHandler.handleError(extractionError, { source: 'extraction' });
    console.log('✓ Extraction error handling:', extractionResult.userMessage.title);
    
    // Test subtitle error
    const subtitleError = new Error('VTT parse failed');
    const subtitleResult = await errorHandler.handleError(subtitleError, { source: 'subtitle' });
    console.log('✓ Subtitle error handling:', subtitleResult.userMessage.title);
    
    console.log('\n🎉 Error handling system validation completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Validation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Export for use in other files
export { runValidation };

// Run validation if this file is executed directly
if (typeof window === 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
  runValidation();
}