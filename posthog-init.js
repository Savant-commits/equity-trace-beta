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

  // Load the PostHog module if a global instance is not already available.
  var posthogModuleUrl = 'https://cdn.jsdelivr.net/npm/posthog-js@latest/dist/module.js';

  try {
    if (typeof window.posthog !== 'undefined') {
      initPostHog();
      return;
    }

    var modulePromise = import(posthogModuleUrl)
      .then(function(module) {
        var ph = module.posthog || module.default || module.PostHog || module;
        if (ph) {
          window.posthog = ph;
          console.log('PostHog module loaded:', posthogModuleUrl);
          initPostHog();
          return ph;
        }
        throw new Error('PostHog module did not expose a usable export.');
      })
      .catch(function(error) {
        console.warn('PostHog dynamic import failed:', error);
        console.warn('PostHog: CDN script did not load within 5 seconds.');
      });

    // If the browser does not support dynamic import, fall back to waiting for a global.
    modulePromise.catch(function() {});
  } catch (error) {
    console.warn('PostHog: dynamic import is not supported in this browser.', error);
    console.warn('PostHog: CDN script did not load within 5 seconds.');
  }

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
