// ═══ PostHog Analytics Initialization ═══
// Standalone compatibility loader with detailed debug logging and queued call support.

(function() {
  'use strict';

  var LOG_PREFIX = '[PostHog]';
  var POSTHOG_MODULE_URL = 'https://cdn.jsdelivr.net/npm/posthog-js@latest/dist/module.js';
  var POSTHOG_FALLBACK_URL = 'https://cdn.jsdelivr.net/npm/posthog-js@latest/dist/main.js';

  function debug() {
    if (typeof console !== 'undefined' && typeof console.debug === 'function') {
      console.debug.apply(console, [LOG_PREFIX].concat(Array.prototype.slice.call(arguments)));
    } else if (typeof console !== 'undefined' && typeof console.log === 'function') {
      console.log.apply(console, [LOG_PREFIX].concat(Array.prototype.slice.call(arguments)));
    }
  }

  function info() {
    if (typeof console !== 'undefined' && typeof console.info === 'function') {
      console.info.apply(console, [LOG_PREFIX].concat(Array.prototype.slice.call(arguments)));
    } else if (typeof console !== 'undefined' && typeof console.log === 'function') {
      console.log.apply(console, [LOG_PREFIX].concat(Array.prototype.slice.call(arguments)));
    }
  }

  function warn() {
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn.apply(console, [LOG_PREFIX].concat(Array.prototype.slice.call(arguments)));
    }
  }

  function error() {
    if (typeof console !== 'undefined' && typeof console.error === 'function') {
      console.error.apply(console, [LOG_PREFIX].concat(Array.prototype.slice.call(arguments)));
    }
  }

  function isBrowser() {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }

  function setLoadStatus(value) {
    if (isBrowser()) {
      window.posthogLoadStatus = value;
    }
    debug('PostHog load status:', value);
  }

  function initializePostHogStatus() {
    if (window.posthogLoadStatus !== 'ready' && window.posthogLoadStatus !== 'failed') {
      setLoadStatus('loading');
    }
  }

  function createPostHogStub() {
    var queue = [];

    function stub() {
      var args = Array.prototype.slice.call(arguments);
      queue.push({ name: 'call', args: args });
      debug('Queued posthog() call before SDK loaded.', args);
    }

    function makeMethod(name) {
      return function() {
        var args = Array.prototype.slice.call(arguments);
        queue.push({ name: name, args: args });
        debug('Queued posthog.' + name + ' call before SDK loaded.', args);
      };
    }

    [
      'capture',
      'identify',
      'reset',
      'alias',
      'register',
      'register_once',
      'unregister',
      'opt_out_capturing',
      'opt_in_capturing',
      'clear_opt_in_out',
      'people.set',
      'people.set_once',
      'people.unset',
      'people.increment',
      'people.delete'
    ].forEach(function(name) {
      stub[name] = makeMethod(name);
    });

    stub.__posthogStub = true;
    stub.__queuedCalls = queue;
    return stub;
  }

  function getEnvVars() {
    var apiKey = window.POSTHOG_KEY || window.VITE_PUBLIC_POSTHOG_KEY;
    var apiHost = window.POSTHOG_HOST || window.VITE_PUBLIC_POSTHOG_HOST;

    if (!apiKey && window.VITE_PUBLIC_POSTHOG_KEY) {
      apiKey = window.VITE_PUBLIC_POSTHOG_KEY;
    }
    if (!apiHost && window.VITE_PUBLIC_POSTHOG_HOST) {
      apiHost = window.VITE_PUBLIC_POSTHOG_HOST;
    }

    return { apiKey: apiKey, apiHost: apiHost };
  }

  function waitForLocalEnv() {
    if (window.localEnvLoaded && typeof window.localEnvLoaded.then === 'function') {
      debug('Waiting for local-env.js to finish loading.');
      return window.localEnvLoaded.catch(function(error) {
        warn('local-env.js failed to resolve:', error);
      });
    }
    return Promise.resolve();
  }

  function assignWindowPostHog(posthogImplementation) {
    if (!posthogImplementation) {
      throw new Error('assignWindowPostHog called without a PostHog implementation.');
    }

    var previousQueue = (window.posthog && window.posthog.__queuedCalls) || [];
    debug('Assigning window.posthog global object. queuedCalls=', previousQueue.length);
    window.posthog = posthogImplementation;

    if (previousQueue.length > 0) {
      debug('Flushing queued PostHog calls:', previousQueue.length);
      previousQueue.forEach(function(item) {
        var target = window.posthog;
        if (!target) {
          warn('Cannot flush queued PostHog item because window.posthog is missing.', item);
          return;
        }

        if (item.name === 'call') {
          if (typeof target === 'function') {
            try {
              target.apply(null, item.args);
            } catch (flushError) {
              warn('Error executing queued posthog() call:', flushError);
            }
          } else {
            warn('Queued posthog() call cannot be replayed because loaded PostHog is not callable.');
          }
          return;
        }

        var method = target[item.name];
        if (typeof method === 'function') {
          try {
            method.apply(target, item.args);
          } catch (flushError) {
            warn('Error executing queued posthog.' + item.name + ' call:', flushError);
          }
        } else {
          warn('Loaded PostHog SDK does not expose queued method:', item.name);
        }
      });
    }

    if (typeof window.posthogReadyResolve === 'function') {
      window.posthogReadyResolve(window.posthog);
    }
    return window.posthog;
  }

  function loadModuleScript(url) {
    debug('Attempting dynamic import from:', url);
    return import(url).catch(function(loadError) {
      error('Dynamic import failed for', url, loadError);
      throw loadError;
    });
  }

  function loadFallbackMainJs(url) {
    return new Promise(function(resolve, reject) {
      if (!isBrowser()) {
        reject(new Error('Fallback script loading requires a browser.'));
        return;
      }

      var head = document.head || document.getElementsByTagName('head')[0];
      if (!head) {
        reject(new Error('Document head is not available.'));
        return;
      }

      var originalExports = window.exports;
      var originalModule = window.module;
      window.exports = window.exports || {};
      window.module = window.module || { exports: window.exports };

      var script = document.createElement('script');
      script.src = url;
      script.async = false;
      script.onload = function() {
        debug('Fallback PostHog bundle loaded:', url);
        var moduleNamespace = (window.module && window.module.exports) || window.exports;
        cleanupGlobals();
        if (!moduleNamespace) {
          reject(new Error('Fallback bundle loaded but no module exports were found.'));
          return;
        }
        resolve(moduleNamespace);
      };
      script.onerror = function() {
        cleanupGlobals();
        reject(new Error('Fallback bundle failed to load: ' + url));
      };

      function cleanupGlobals() {
        if (originalExports === undefined) {
          try { delete window.exports; } catch (ignored) { window.exports = undefined; }
        } else {
          window.exports = originalExports;
        }

        if (originalModule === undefined) {
          try { delete window.module; } catch (ignored) { window.module = undefined; }
        } else {
          window.module = originalModule;
        }

        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      }

      head.appendChild(script);
    });
  }

  function getPostHogFromModule(namespace) {
    if (!namespace) {
      return null;
    }
    return namespace.posthog || namespace.default || namespace.PostHog || namespace;
  }

  function initPostHog(apiKey, apiHost) {
    if (!window.posthog) {
      throw new Error('Cannot initialize PostHog because window.posthog is undefined.');
    }
    if (!apiKey || !apiHost) {
      warn('PostHog init skipped because POSTHOG_KEY/POSTHOG_HOST or VITE_PUBLIC_POSTHOG_KEY/VITE_PUBLIC_POSTHOG_HOST is missing.');
      return;
    }
    if (typeof window.posthog.init !== 'function') {
      throw new Error('Loaded PostHog SDK does not expose an init() method.');
    }

    debug('Calling posthog.init() with api_host and api_key.');
    try {
      window.posthog.init(apiKey, {
        api_host: apiHost,
        session_recording: {
          recordCrossOriginIframes: false,
          maskAllInputs: true,
          maskAllText: false,
        },
        autocapture: {
          dom_event_handlers: ['click', 'change'],
          url_ignored_components: [],
          element_allowlist: [],
        },
        capture_pageview: true,
        capture_pageleave: true,
        loaded: function(ph) {
          info('PostHog initialized successfully.');
        },
      });
      info('PostHog init() call completed. window.posthog is ready.');
    } catch (initError) {
      throw new Error('PostHog initialization failed: ' + (initError && initError.message ? initError.message : String(initError)));
    }
  }

  function setupGlobalReadyPromise() {
    if (!window.posthogReady) {
      window.posthogReady = new Promise(function(resolve, reject) {
        window.posthogReadyResolve = resolve;
        window.posthogReadyReject = reject;
      });
    }
  }

  async function loadPostHog() {
    debug('PostHog loader started.');
    initializePostHogStatus();

    await waitForLocalEnv();

    var env = getEnvVars();
    if (!window.posthog) {
      window.posthog = createPostHogStub();
    }

    var namespace = null;
    try {
      namespace = await loadModuleScript(POSTHOG_MODULE_URL);
      debug('Dynamic import succeeded for', POSTHOG_MODULE_URL);
    } catch (primaryError) {
      warn('Dynamic import failed. Falling back to main browser bundle.', primaryError);
      try {
        namespace = await loadFallbackMainJs(POSTHOG_FALLBACK_URL);
        debug('Fallback main.js bundle loaded successfully.');
      } catch (fallbackError) {
        error('Failed to load PostHog via both module import and fallback script.', fallbackError);
        setLoadStatus('failed');
        if (typeof window.posthogReadyReject === 'function') {
          window.posthogReadyReject(fallbackError);
        }
        return;
      }
    }

    var posthogImpl = getPostHogFromModule(namespace);
    if (!posthogImpl) {
      var noExportError = new Error('PostHog module loaded but no usable export was found.');
      error(noExportError);
      if (typeof window.posthogReadyReject === 'function') {
        window.posthogReadyReject(noExportError);
      }
      return;
    }

    assignWindowPostHog(posthogImpl);

    try {
      initPostHog(env.apiKey, env.apiHost);
      setLoadStatus('ready');
    } catch (initError) {
      error(initError);
      setLoadStatus('failed');
      if (typeof window.posthogReadyReject === 'function') {
        window.posthogReadyReject(initError);
      }
    }
  }

  if (!isBrowser()) {
    setLoadStatus('failed');
    return;
  }

  setupGlobalReadyPromise();

  if (!window.posthog) {
    window.posthog = createPostHogStub();
  } else {
    debug('window.posthog already exists before PostHog loader started.');
  }

  loadPostHog().catch(function(loadError) {
    error('Unexpected PostHog loader error:', loadError);
    if (typeof window.posthogReadyReject === 'function') {
      window.posthogReadyReject(loadError);
    }
  });

  window.trackEvent = function(eventName, properties) {
    properties = properties || {};
    if (window.posthog && typeof window.posthog.capture === 'function') {
      window.posthog.capture(eventName, properties);
    } else {
      warn('trackEvent called before PostHog SDK was available. Event queued if supported.');
    }
  };

  window.setUserProperties = function(userId, properties) {
    properties = properties || {};
    if (window.posthog && typeof window.posthog.identify === 'function') {
      window.posthog.identify(userId, properties);
    } else {
      warn('setUserProperties called before PostHog SDK was available.');
    }
  };

  window.resetUserSession = function() {
    if (window.posthog && typeof window.posthog.reset === 'function') {
      window.posthog.reset();
    } else {
      warn('resetUserSession called before PostHog SDK was available.');
    }
  };
})();
