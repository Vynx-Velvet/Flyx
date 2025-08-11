/**
 * Connection Optimizer for Media Playback System
 * Implements CDN failover, request batching, and connection optimization
 * Requirements: 5.3, 5.4, 6.2
 */

export class ConnectionOptimizer {
  constructor() {
    this.cdnEndpoints = {
      primary: [],
      fallback: [],
      current: null,
      failedEndpoints: new Set(),
      endpointMetrics: new Map() // endpoint -> { latency, successRate, lastUsed }
    };

    this.requestBatching = {
      enabled: true,
      batchSize: 5,
      batchTimeout: 100, // ms
      pendingRequests: new Map(), // batchKey -> requests[]
      batchTimers: new Map()
    };

    this.connectionPool = {
      maxConnections: 6, // HTTP/1.1 limit
      activeConnections: new Map(), // host -> connection count
      keepAliveTimeout: 30000, // 30 seconds
      connectionReuse: true
    };

    this.optimization = {
      compressionEnabled: true,
      cacheEnabled: true,
      prefetchEnabled: true,
      retryStrategy: 'exponential', // linear, exponential, adaptive
      maxRetries: 3,
      retryDelay: 1000,
      timeoutSettings: {
        connect: 10000,
        request: 30000,
        segment: 15000
      }
    };

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      batchedRequests: 0,
      cdnFailovers: 0,
      averageLatency: 0,
      compressionRatio: 0,
      cacheHitRate: 0,
      connectionReuses: 0
    };

    this.callbacks = {
      onCdnFailover: [],
      onOptimizationApplied: [],
      onConnectionError: [],
      onPerformanceImprovement: []
    };

    // Initialize CDN endpoints
    this.initializeCdnEndpoints();
  }

  /**
   * Initialize CDN endpoints with common streaming CDNs
   */
  initializeCdnEndpoints() {
    // These would be configured based on your actual CDN setup
    this.cdnEndpoints.primary = [
      'https://cdn1.example.com',
      'https://cdn2.example.com'
    ];

    this.cdnEndpoints.fallback = [
      'https://backup-cdn1.example.com',
      'https://backup-cdn2.example.com'
    ];

    // Set initial current endpoint
    if (this.cdnEndpoints.primary.length > 0) {
      this.cdnEndpoints.current = this.cdnEndpoints.primary[0];
    }

    console.log('🌐 Connection Optimizer: Initialized CDN endpoints', {
      primary: this.cdnEndpoints.primary.length,
      fallback: this.cdnEndpoints.fallback.length,
      current: this.cdnEndpoints.current
    });
  }

  /**
   * Add CDN endpoint
   */
  addCdnEndpoint(url, isPrimary = true) {
    const endpoints = isPrimary ? this.cdnEndpoints.primary : this.cdnEndpoints.fallback;
    
    if (!endpoints.includes(url)) {
      endpoints.push(url);
      console.log(`🌐 Added ${isPrimary ? 'primary' : 'fallback'} CDN endpoint: ${url}`);
    }
  }

  /**
   * Remove CDN endpoint
   */
  removeCdnEndpoint(url) {
    this.cdnEndpoints.primary = this.cdnEndpoints.primary.filter(endpoint => endpoint !== url);
    this.cdnEndpoints.fallback = this.cdnEndpoints.fallback.filter(endpoint => endpoint !== url);
    this.cdnEndpoints.failedEndpoints.delete(url);
    this.cdnEndpoints.endpointMetrics.delete(url);
    
    console.log(`🌐 Removed CDN endpoint: ${url}`);
  }

  /**
   * Optimize request with CDN failover and batching
   */
  async optimizeRequest(url, options = {}) {
    const startTime = performance.now();
    this.metrics.totalRequests++;

    try {
      // Apply request batching if enabled
      if (this.requestBatching.enabled && this.shouldBatchRequest(url, options)) {
        return await this.batchRequest(url, options);
      }

      // Apply CDN optimization
      const optimizedUrl = await this.applyCdnOptimization(url);
      
      // Apply connection optimization
      const optimizedOptions = this.applyConnectionOptimization(optimizedUrl, options);
      
      // Make the request with retries
      const response = await this.makeRequestWithRetries(optimizedUrl, optimizedOptions);
      
      // Update metrics
      const latency = performance.now() - startTime;
      this.updateRequestMetrics(optimizedUrl, latency, true);
      this.metrics.successfulRequests++;
      
      return response;

    } catch (error) {
      const latency = performance.now() - startTime;
      this.updateRequestMetrics(url, latency, false);
      this.metrics.failedRequests++;
      
      console.error('🌐 Request optimization failed:', error);
      throw error;
    }
  }

  /**
   * Apply CDN optimization with failover
   */
  async applyCdnOptimization(url) {
    const urlObj = new URL(url);
    const originalHost = urlObj.hostname;

    // If URL is already using a CDN endpoint, return as-is
    if (this.isCdnEndpoint(originalHost)) {
      return url;
    }

    // Try to use current CDN endpoint
    if (this.cdnEndpoints.current && !this.cdnEndpoints.failedEndpoints.has(this.cdnEndpoints.current)) {
      const cdnUrl = this.buildCdnUrl(url, this.cdnEndpoints.current);
      
      // Test CDN endpoint if we haven't used it recently
      if (await this.testCdnEndpoint(this.cdnEndpoints.current)) {
        return cdnUrl;
      }
    }

    // Find best available CDN endpoint
    const bestEndpoint = await this.findBestCdnEndpoint();
    if (bestEndpoint) {
      this.cdnEndpoints.current = bestEndpoint;
      return this.buildCdnUrl(url, bestEndpoint);
    }

    // No CDN available, return original URL
    console.warn('🌐 No CDN endpoints available, using original URL');
    return url;
  }

  /**
   * Check if hostname is a CDN endpoint
   */
  isCdnEndpoint(hostname) {
    const allEndpoints = [...this.cdnEndpoints.primary, ...this.cdnEndpoints.fallback];
    return allEndpoints.some(endpoint => {
      try {
        return new URL(endpoint).hostname === hostname;
      } catch {
        return false;
      }
    });
  }

  /**
   * Build CDN URL
   */
  buildCdnUrl(originalUrl, cdnEndpoint) {
    try {
      const originalUrlObj = new URL(originalUrl);
      const cdnUrlObj = new URL(cdnEndpoint);
      
      // Replace hostname with CDN hostname
      originalUrlObj.hostname = cdnUrlObj.hostname;
      originalUrlObj.protocol = cdnUrlObj.protocol;
      
      if (cdnUrlObj.port) {
        originalUrlObj.port = cdnUrlObj.port;
      }
      
      return originalUrlObj.toString();
    } catch (error) {
      console.error('🌐 Failed to build CDN URL:', error);
      return originalUrl;
    }
  }

  /**
   * Test CDN endpoint availability and performance
   */
  async testCdnEndpoint(endpoint) {
    try {
      const startTime = performance.now();
      const testUrl = `${endpoint}/ping`; // Assuming a ping endpoint
      
      const response = await fetch(testUrl, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      const latency = performance.now() - startTime;
      
      if (response.ok) {
        this.updateEndpointMetrics(endpoint, latency, true);
        return true;
      } else {
        this.updateEndpointMetrics(endpoint, latency, false);
        return false;
      }
    } catch (error) {
      console.warn(`🌐 CDN endpoint test failed for ${endpoint}:`, error);
      this.updateEndpointMetrics(endpoint, 0, false);
      return false;
    }
  }

  /**
   * Find best available CDN endpoint
   */
  async findBestCdnEndpoint() {
    const allEndpoints = [...this.cdnEndpoints.primary, ...this.cdnEndpoints.fallback];
    const availableEndpoints = allEndpoints.filter(endpoint => 
      !this.cdnEndpoints.failedEndpoints.has(endpoint)
    );

    if (availableEndpoints.length === 0) {
      // Reset failed endpoints and try again
      console.log('🌐 Resetting failed CDN endpoints');
      this.cdnEndpoints.failedEndpoints.clear();
      return allEndpoints[0] || null;
    }

    // Test endpoints in parallel
    const testPromises = availableEndpoints.map(async endpoint => {
      const isAvailable = await this.testCdnEndpoint(endpoint);
      return { endpoint, isAvailable };
    });

    const testResults = await Promise.allSettled(testPromises);
    
    // Find best endpoint based on metrics
    let bestEndpoint = null;
    let bestScore = -1;

    for (const result of testResults) {
      if (result.status === 'fulfilled' && result.value.isAvailable) {
        const endpoint = result.value.endpoint;
        const metrics = this.cdnEndpoints.endpointMetrics.get(endpoint);
        
        if (metrics) {
          // Score based on success rate and latency (lower latency is better)
          const score = metrics.successRate * (1000 / (metrics.latency + 100));
          
          if (score > bestScore) {
            bestScore = score;
            bestEndpoint = endpoint;
          }
        } else {
          // No metrics yet, use as fallback
          if (!bestEndpoint) {
            bestEndpoint = endpoint;
          }
        }
      }
    }

    if (bestEndpoint) {
      console.log(`🌐 Selected best CDN endpoint: ${bestEndpoint}`);
    }

    return bestEndpoint;
  }

  /**
   * Update endpoint metrics
   */
  updateEndpointMetrics(endpoint, latency, success) {
    let metrics = this.cdnEndpoints.endpointMetrics.get(endpoint);
    
    if (!metrics) {
      metrics = {
        latency: 0,
        successRate: 0,
        totalRequests: 0,
        successfulRequests: 0,
        lastUsed: 0
      };
    }

    metrics.totalRequests++;
    if (success) {
      metrics.successfulRequests++;
    }
    
    metrics.successRate = metrics.successfulRequests / metrics.totalRequests;
    metrics.latency = (metrics.latency + latency) / 2; // Moving average
    metrics.lastUsed = Date.now();

    this.cdnEndpoints.endpointMetrics.set(endpoint, metrics);

    // Mark as failed if success rate is too low
    if (metrics.totalRequests >= 5 && metrics.successRate < 0.5) {
      console.warn(`🌐 Marking CDN endpoint as failed: ${endpoint} (success rate: ${Math.round(metrics.successRate * 100)}%)`);
      this.cdnEndpoints.failedEndpoints.add(endpoint);
      
      // Trigger CDN failover
      this.triggerCdnFailover(endpoint);
    }
  }

  /**
   * Trigger CDN failover
   */
  async triggerCdnFailover(failedEndpoint) {
    console.log(`🌐 CDN failover triggered for: ${failedEndpoint}`);
    this.metrics.cdnFailovers++;

    // Find alternative endpoint
    const newEndpoint = await this.findBestCdnEndpoint();
    
    if (newEndpoint && newEndpoint !== failedEndpoint) {
      this.cdnEndpoints.current = newEndpoint;
      console.log(`🌐 CDN failover completed: ${failedEndpoint} → ${newEndpoint}`);
      
      this.triggerCallbacks('onCdnFailover', {
        from: failedEndpoint,
        to: newEndpoint,
        reason: 'performance'
      });
    }
  }

  /**
   * Check if request should be batched
   */
  shouldBatchRequest(url, options) {
    // Don't batch certain types of requests
    if (options.method && options.method !== 'GET') {
      return false;
    }

    // Don't batch streaming requests
    if (url.includes('.m3u8') || url.includes('.ts') || url.includes('.mp4')) {
      return false;
    }

    // Don't batch if batching is disabled
    if (!this.requestBatching.enabled) {
      return false;
    }

    return true;
  }

  /**
   * Batch similar requests together
   */
  async batchRequest(url, options) {
    const batchKey = this.getBatchKey(url, options);
    
    return new Promise((resolve, reject) => {
      // Add request to batch
      if (!this.requestBatching.pendingRequests.has(batchKey)) {
        this.requestBatching.pendingRequests.set(batchKey, []);
      }
      
      const batch = this.requestBatching.pendingRequests.get(batchKey);
      batch.push({ url, options, resolve, reject });

      // Set batch timer if not already set
      if (!this.requestBatching.batchTimers.has(batchKey)) {
        const timer = setTimeout(() => {
          this.processBatch(batchKey);
        }, this.requestBatching.batchTimeout);
        
        this.requestBatching.batchTimers.set(batchKey, timer);
      }

      // Process batch if it's full
      if (batch.length >= this.requestBatching.batchSize) {
        clearTimeout(this.requestBatching.batchTimers.get(batchKey));
        this.requestBatching.batchTimers.delete(batchKey);
        this.processBatch(batchKey);
      }
    });
  }

  /**
   * Get batch key for grouping similar requests
   */
  getBatchKey(url, options) {
    try {
      const urlObj = new URL(url);
      const baseUrl = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
      const method = options.method || 'GET';
      return `${method}:${baseUrl}`;
    } catch {
      return `${options.method || 'GET'}:${url}`;
    }
  }

  /**
   * Process a batch of requests
   */
  async processBatch(batchKey) {
    const batch = this.requestBatching.pendingRequests.get(batchKey);
    if (!batch || batch.length === 0) return;

    console.log(`🌐 Processing batch of ${batch.length} requests for: ${batchKey}`);
    
    // Remove batch from pending
    this.requestBatching.pendingRequests.delete(batchKey);
    this.requestBatching.batchTimers.delete(batchKey);

    // Process requests in parallel
    const promises = batch.map(async ({ url, options, resolve, reject }) => {
      try {
        const optimizedUrl = await this.applyCdnOptimization(url);
        const optimizedOptions = this.applyConnectionOptimization(optimizedUrl, options);
        const response = await this.makeRequestWithRetries(optimizedUrl, optimizedOptions);
        resolve(response);
        this.metrics.batchedRequests++;
      } catch (error) {
        reject(error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Apply connection optimization
   */
  applyConnectionOptimization(url, options) {
    const optimizedOptions = { ...options };

    // Apply compression
    if (this.optimization.compressionEnabled) {
      optimizedOptions.headers = {
        ...optimizedOptions.headers,
        'Accept-Encoding': 'gzip, deflate, br'
      };
    }

    // Apply caching
    if (this.optimization.cacheEnabled) {
      optimizedOptions.headers = {
        ...optimizedOptions.headers,
        'Cache-Control': 'max-age=300' // 5 minutes
      };
    }

    // Apply keep-alive for connection reuse
    if (this.connectionPool.connectionReuse) {
      optimizedOptions.headers = {
        ...optimizedOptions.headers,
        'Connection': 'keep-alive'
      };
    }

    // Apply timeouts
    if (!optimizedOptions.signal) {
      const timeoutMs = this.getTimeoutForRequest(url);
      optimizedOptions.signal = AbortSignal.timeout(timeoutMs);
    }

    return optimizedOptions;
  }

  /**
   * Get appropriate timeout for request type
   */
  getTimeoutForRequest(url) {
    if (url.includes('.ts') || url.includes('.m4s')) {
      return this.optimization.timeoutSettings.segment;
    } else if (url.includes('.m3u8')) {
      return this.optimization.timeoutSettings.request;
    } else {
      return this.optimization.timeoutSettings.connect;
    }
  }

  /**
   * Make request with retry logic
   */
  async makeRequestWithRetries(url, options) {
    let lastError;
    let delay = this.optimization.retryDelay;

    for (let attempt = 0; attempt <= this.optimization.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🌐 Retry attempt ${attempt}/${this.optimization.maxRetries} for: ${url}`);
          await this.sleep(delay);
        }

        const response = await fetch(url, options);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Update connection pool metrics
        this.updateConnectionMetrics(url, true);
        
        return response;

      } catch (error) {
        lastError = error;
        console.warn(`🌐 Request attempt ${attempt + 1} failed:`, error.message);
        
        // Update connection pool metrics
        this.updateConnectionMetrics(url, false);
        
        // Calculate next delay based on retry strategy
        if (this.optimization.retryStrategy === 'exponential') {
          delay *= 2;
        } else if (this.optimization.retryStrategy === 'adaptive') {
          delay = this.calculateAdaptiveDelay(attempt, error);
        }
      }
    }

    throw lastError;
  }

  /**
   * Calculate adaptive retry delay based on error type
   */
  calculateAdaptiveDelay(attempt, error) {
    let baseDelay = this.optimization.retryDelay;

    // Longer delay for network errors
    if (error.name === 'NetworkError' || error.message.includes('network')) {
      baseDelay *= 2;
    }

    // Shorter delay for timeout errors
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      baseDelay *= 0.5;
    }

    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay;
    
    return exponentialDelay + jitter;
  }

  /**
   * Update connection metrics
   */
  updateConnectionMetrics(url, success) {
    try {
      const urlObj = new URL(url);
      const host = urlObj.hostname;
      
      if (!this.connectionPool.activeConnections.has(host)) {
        this.connectionPool.activeConnections.set(host, {
          count: 0,
          successCount: 0,
          totalRequests: 0,
          lastUsed: Date.now()
        });
      }
      
      const metrics = this.connectionPool.activeConnections.get(host);
      metrics.totalRequests++;
      
      if (success) {
        metrics.successCount++;
        this.metrics.connectionReuses++;
      }
      
      metrics.lastUsed = Date.now();
    } catch (error) {
      console.warn('Failed to update connection metrics:', error);
    }
  }

  /**
   * Update request metrics
   */
  updateRequestMetrics(url, latency, success) {
    // Update average latency
    this.metrics.averageLatency = (this.metrics.averageLatency + latency) / 2;

    // Update compression ratio (if response includes compression info)
    // This would need to be implemented based on actual response headers
    
    // Update cache hit rate (if response includes cache info)
    // This would need to be implemented based on actual response headers
  }

  /**
   * Sleep utility for delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Enable/disable request batching
   */
  setBatchingEnabled(enabled) {
    this.requestBatching.enabled = enabled;
    console.log(`🌐 Request batching ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set batch size
   */
  setBatchSize(size) {
    this.requestBatching.batchSize = Math.max(1, size);
    console.log(`🌐 Batch size set to: ${this.requestBatching.batchSize}`);
  }

  /**
   * Set retry strategy
   */
  setRetryStrategy(strategy) {
    if (['linear', 'exponential', 'adaptive'].includes(strategy)) {
      this.optimization.retryStrategy = strategy;
      console.log(`🌐 Retry strategy set to: ${strategy}`);
    }
  }

  /**
   * Register callback for optimization events
   */
  on(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event].push(callback);
    }
  }

  /**
   * Unregister callback
   */
  off(event, callback) {
    if (this.callbacks[event]) {
      const index = this.callbacks[event].indexOf(callback);
      if (index > -1) {
        this.callbacks[event].splice(index, 1);
      }
    }
  }

  /**
   * Trigger callbacks for an event
   */
  triggerCallbacks(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} callback:`, error);
        }
      });
    }
  }

  /**
   * Get optimization metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalRequests > 0 ? 
        (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 : 0,
      batchingRate: this.metrics.totalRequests > 0 ?
        (this.metrics.batchedRequests / this.metrics.totalRequests) * 100 : 0
    };
  }

  /**
   * Get CDN status
   */
  getCdnStatus() {
    return {
      current: this.cdnEndpoints.current,
      primary: this.cdnEndpoints.primary,
      fallback: this.cdnEndpoints.fallback,
      failed: Array.from(this.cdnEndpoints.failedEndpoints),
      metrics: Object.fromEntries(this.cdnEndpoints.endpointMetrics),
      failovers: this.metrics.cdnFailovers
    };
  }

  /**
   * Get connection pool status
   */
  getConnectionPoolStatus() {
    const activeConnections = Object.fromEntries(
      Array.from(this.connectionPool.activeConnections.entries()).map(([host, metrics]) => [
        host,
        {
          ...metrics,
          successRate: metrics.totalRequests > 0 ? 
            (metrics.successCount / metrics.totalRequests) * 100 : 0
        }
      ])
    );

    return {
      maxConnections: this.connectionPool.maxConnections,
      activeConnections,
      totalHosts: this.connectionPool.activeConnections.size,
      connectionReuses: this.metrics.connectionReuses
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      batchedRequests: 0,
      cdnFailovers: 0,
      averageLatency: 0,
      compressionRatio: 0,
      cacheHitRate: 0,
      connectionReuses: 0
    };

    console.log('🌐 Connection optimizer metrics reset');
  }

  /**
   * Destroy connection optimizer
   */
  destroy() {
    console.log('🌐 Destroying Connection Optimizer');
    
    // Clear all pending batches
    for (const timer of this.requestBatching.batchTimers.values()) {
      clearTimeout(timer);
    }
    
    this.requestBatching.pendingRequests.clear();
    this.requestBatching.batchTimers.clear();
    
    // Clear metrics
    this.cdnEndpoints.endpointMetrics.clear();
    this.connectionPool.activeConnections.clear();
    
    // Clear callbacks
    Object.keys(this.callbacks).forEach(event => {
      this.callbacks[event] = [];
    });
  }
}

export default ConnectionOptimizer;