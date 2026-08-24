// ═══ PostHog Analytics Initialization ═══
// Initialize PostHog for event tracking, session replay, and autocapture
// Standalone global script - no ES modules, compatible with multi-script architecture

(async function() {
  'use strict';

  if (window.localEnvLoaded && typeof window.localEnvLoaded.then === 'function') {
    try {
      await window.localEnvLoaded;
    } catch (error) {
      // Ignore failures loading local-env.js; continue with whatever values are available.
    }
  }

  // Poll for PostHog library to be loaded (from CDN script tag)
  var maxRetries = 50; // ~5 seconds at 100ms intervals
  var retryCount = 0;

  if (typeof window.posthog !== 'undefined') {
    initPostHog();
    return;
  }

  var retryInterval = setInterval(function() {
    retryCount++;
    
    if (typeof window.posthog !== 'undefined') {
      clearInterval(retryInterval);
      initPostHog();
      return;
    }
    
    if (retryCount >= maxRetries) {
      clearInterval(retryInterval);
      console.warn('PostHog: CDN script did not load within 5 seconds.');
    }
  }, 100);

  function initPostHog() {
    // Get credentials from window variables (set by local-env.js or Vite env injection)
    var apiKey = window.POSTHOG_KEY || window.VITE_PUBLIC_POSTHOG_KEY;
    var apiHost = window.POSTHOG_HOST || window.VITE_PUBLIC_POSTHOG_HOST;

    // If Vite env vars are injected as strings via HTML, allow fallback to underscored names
    if (!apiKey && window.VITE_PUBLIC_POSTHOG_KEY) {
      apiKey = window.VITE_PUBLIC_POSTHOG_KEY;
    }
    if (!apiHost && window.VITE_PUBLIC_POSTHOG_HOST) {
      apiHost = window.VITE_PUBLIC_POSTHOG_HOST;
    }

    if (!apiKey || !apiHost) {
      console.warn(
        'PostHog: Missing POSTHOG_KEY/POSTHOG_HOST or VITE_PUBLIC_POSTHOG_KEY/VITE_PUBLIC_POSTHOG_HOST. ' +
        'Analytics disabled. Add to local-env.js or .env.local.'
      );
      return;
    }

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
          console.log('PostHog initialized:', {
            apiKey: apiKey.substring(0, 8) + '...',
            host: apiHost,
          });
        },
      });
    } catch (error) {
      console.error('PostHog initialization failed:', error);
    }
  }

  // Expose global helper functions
  window.trackEvent = function(eventName, properties) {
    properties = properties || {};
    if (window.posthog) {
      window.posthog.capture(eventName, properties);
    }
  };

  window.setUserProperties = function(userId, properties) {
    properties = properties || {};
    if (window.posthog) {
      window.posthog.identify(userId, properties);
    }
  };

  window.resetUserSession = function() {
    if (window.posthog) {
      window.posthog.reset();
    }
  };
})();
