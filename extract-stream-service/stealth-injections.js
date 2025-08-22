// Stealth injections to evade detection
export function stealthInjections(fingerprint) {
  return `
    // Remove webdriver property
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined
    });
    
    // Remove automation indicators
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
    delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
    
    // Chrome object
    if (!window.chrome) {
      window.chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {}
      };
    }
    
    // Permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
    
    // Plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        const pluginData = [
          {
            name: 'Chrome PDF Plugin',
            description: 'Portable Document Format',
            filename: 'internal-pdf-viewer',
            mimeTypes: [{
              type: 'application/x-google-chrome-pdf',
              suffixes: 'pdf',
              description: 'Portable Document Format'
            }]
          },
          {
            name: 'Chrome PDF Viewer',
            description: '',
            filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
            mimeTypes: [{
              type: 'application/pdf',
              suffixes: 'pdf',
              description: ''
            }]
          },
          {
            name: 'Native Client',
            description: '',
            filename: 'internal-nacl-plugin',
            mimeTypes: [
              {
                type: 'application/x-nacl',
                suffixes: '',
                description: 'Native Client Executable'
              },
              {
                type: 'application/x-pnacl',
                suffixes: '',
                description: 'Portable Native Client Executable'
              }
            ]
          }
        ];
        
        const pluginArray = [];
        pluginData.forEach(p => {
          const plugin = {
            name: p.name,
            description: p.description,
            filename: p.filename,
            length: p.mimeTypes.length
          };
          
          p.mimeTypes.forEach((m, i) => {
            plugin[i] = {
              type: m.type,
              suffixes: m.suffixes,
              description: m.description,
              enabledPlugin: plugin
            };
          });
          
          pluginArray.push(plugin);
        });
        
        Object.defineProperty(pluginArray, 'item', {
          value: function(index) {
            return this[index] || null;
          }
        });
        
        Object.defineProperty(pluginArray, 'namedItem', {
          value: function(name) {
            for (let i = 0; i < this.length; i++) {
              if (this[i].name === name) {
                return this[i];
              }
            }
            return null;
          }
        });
        
        Object.defineProperty(pluginArray, 'refresh', {
          value: function() {
            return undefined;
          }
        });
        
        return pluginArray;
      }
    });
    
    // MimeTypes
    Object.defineProperty(navigator, 'mimeTypes', {
      get: () => {
        const mimeArray = [];
        navigator.plugins.forEach(p => {
          for (let i = 0; i < p.length; i++) {
            mimeArray.push(p[i]);
          }
        });
        
        Object.defineProperty(mimeArray, 'item', {
          value: function(index) {
            return this[index] || null;
          }
        });
        
        Object.defineProperty(mimeArray, 'namedItem', {
          value: function(name) {
            for (let i = 0; i < this.length; i++) {
              if (this[i].type === name) {
                return this[i];
              }
            }
            return null;
          }
        });
        
        return mimeArray;
      }
    });
    
    // WebGL Vendor/Renderer
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      if (parameter === 37445) {
        return '${fingerprint.webGL.vendor}';
      }
      if (parameter === 37446) {
        return '${fingerprint.webGL.renderer}';
      }
      return getParameter.apply(this, arguments);
    };
    
    const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function(parameter) {
      if (parameter === 37445) {
        return '${fingerprint.webGL.vendor}';
      }
      if (parameter === 37446) {
        return '${fingerprint.webGL.renderer}';
      }
      return getParameter2.apply(this, arguments);
    };
    
    // Canvas fingerprint protection
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    
    const canvasNoise = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 1;
      canvas.height = 1;
      const imageData = ctx.createImageData(1, 1);
      imageData.data[0] = Math.floor(Math.random() * 256);
      imageData.data[1] = Math.floor(Math.random() * 256);
      imageData.data[2] = Math.floor(Math.random() * 256);
      imageData.data[3] = 255;
      ctx.putImageData(imageData, 0, 0);
      return ctx;
    };
    
    HTMLCanvasElement.prototype.toDataURL = function() {
      const ctx = this.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] = imageData.data[i] + (Math.random() * ${fingerprint.canvas.noise} - ${fingerprint.canvas.noise / 2});
          imageData.data[i + 1] = imageData.data[i + 1] + (Math.random() * ${fingerprint.canvas.noise} - ${fingerprint.canvas.noise / 2});
          imageData.data[i + 2] = imageData.data[i + 2] + (Math.random() * ${fingerprint.canvas.noise} - ${fingerprint.canvas.noise / 2});
        }
        ctx.putImageData(imageData, 0, 0);
      }
      return originalToDataURL.apply(this, arguments);
    };
    
    HTMLCanvasElement.prototype.toBlob = function(callback) {
      const ctx = this.getContext('2d');
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] = imageData.data[i] + (Math.random() * ${fingerprint.canvas.noise} - ${fingerprint.canvas.noise / 2});
          imageData.data[i + 1] = imageData.data[i + 1] + (Math.random() * ${fingerprint.canvas.noise} - ${fingerprint.canvas.noise / 2});
          imageData.data[i + 2] = imageData.data[i + 2] + (Math.random() * ${fingerprint.canvas.noise} - ${fingerprint.canvas.noise / 2});
        }
        ctx.putImageData(imageData, 0, 0);
      }
      return originalToBlob.apply(this, arguments);
    };
    
    // Screen properties
    Object.defineProperty(screen, 'width', { get: () => ${fingerprint.screen.width} });
    Object.defineProperty(screen, 'height', { get: () => ${fingerprint.screen.height} });
    Object.defineProperty(screen, 'availWidth', { get: () => ${fingerprint.screen.availWidth} });
    Object.defineProperty(screen, 'availHeight', { get: () => ${fingerprint.screen.availHeight} });
    Object.defineProperty(screen, 'colorDepth', { get: () => ${fingerprint.screen.colorDepth} });
    Object.defineProperty(screen, 'pixelDepth', { get: () => ${fingerprint.screen.pixelDepth} });
    
    Object.defineProperty(window, 'screenX', { get: () => 0 });
    Object.defineProperty(window, 'screenY', { get: () => 0 });
    Object.defineProperty(window, 'screenLeft', { get: () => 0 });
    Object.defineProperty(window, 'screenTop', { get: () => 0 });
    Object.defineProperty(window, 'outerWidth', { get: () => ${fingerprint.screen.width} });
    Object.defineProperty(window, 'outerHeight', { get: () => ${fingerprint.screen.height} });
    
    // Hardware concurrency
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => ${fingerprint.hardwareConcurrency}
    });
    
    // Device memory
    if (navigator.deviceMemory) {
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => ${fingerprint.deviceMemory}
      });
    }
    
    // Platform
    Object.defineProperty(navigator, 'platform', {
      get: () => '${fingerprint.platform}'
    });
    
    // Remove HeadlessChrome from user agent
    Object.defineProperty(navigator, 'userAgent', {
      get: () => navigator.userAgent.replace('HeadlessChrome', 'Chrome')
    });
    
    // Battery API
    navigator.getBattery = () => Promise.resolve({
      charging: true,
      chargingTime: 0,
      dischargingTime: Infinity,
      level: 1,
      addEventListener: () => {},
      removeEventListener: () => {}
    });
    
    // Connection API
    if (navigator.connection) {
      Object.defineProperty(navigator.connection, 'rtt', { get: () => 50 });
      Object.defineProperty(navigator.connection, 'downlink', { get: () => 10 });
      Object.defineProperty(navigator.connection, 'effectiveType', { get: () => '4g' });
      Object.defineProperty(navigator.connection, 'saveData', { get: () => false });
    }
    
    // Remove automation specific properties
    const propsToDelete = [
      '_Selenium_IDE_Recorder',
      '_selenium',
      'callSelenium',
      '_$webdriverAsyncExecutor',
      '__webdriver_script_fn',
      '__driver_evaluate',
      '__webdriver_evaluate',
      '__selenium_evaluate',
      '__fxdriver_evaluate',
      '__driver_unwrapped',
      '__webdriver_unwrapped',
      '__selenium_unwrapped',
      '__fxdriver_unwrapped',
      '__webdriver_scripts_executed',
      '__webdriver_script_func',
      '__webdriver_script_function',
      '__$webdriverAsyncExecutor',
      '__lastWatirAlert',
      '__lastWatirConfirm',
      '__lastWatirPrompt',
      '$chrome_asyncScriptInfo',
      '$cdc_asdjflasutopfhvcZLmcfl_'
    ];
    
    propsToDelete.forEach(prop => {
      delete window[prop];
      delete document[prop];
    });
    
    // Function toString
    const nativeToStringFunction = Function.prototype.toString;
    Function.prototype.toString = function() {
      if (this === Function.prototype.toString) {
        return 'function toString() { [native code] }';
      }
      return nativeToStringFunction.call(this);
    };
    
    // Console.debug fix
    const originalConsoleDebug = console.debug;
    console.debug = function() {
      if (arguments[0] && arguments[0].includes && arguments[0].includes('HeadlessChrome')) {
        return;
      }
      return originalConsoleDebug.apply(console, arguments);
    };
  `;
}