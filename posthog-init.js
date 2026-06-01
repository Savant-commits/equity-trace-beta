// ═══ PostHog Analytics Initialization ═══
// Initialize PostHog for event tracking, session replay, and autocapture

import posthog from 'posthog-js';

/**
 * Initialize PostHog with Vite environment variables
 * Requires VITE_PUBLIC_POSTHOG_KEY and VITE_PUBLIC_POSTHOG_HOST in .env.local
 */
export function initializePostHog() {
  // Get PostHog credentials from environment variables
  const apiKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
  const apiHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;

  // Only initialize if credentials are provided
  if (!apiKey || !apiHost) {
    console.warn(
      'PostHog: Missing VITE_PUBLIC_POSTHOG_KEY or VITE_PUBLIC_POSTHOG_HOST. ' +
      'Analytics disabled. Add these to your .env.local file.'
    );
    return null;
  }

  try {
    posthog.init(apiKey, {
      api_host: apiHost,
      
      // ── SESSION REPLAY ──
      session_recording: {
        recordCrossOriginIframes: false,
        // Mask sensitive input fields (passwords, tokens, etc.)
        maskAllInputs: true,
        // Mask text in elements with these classes
        maskAllText: false,
      },

      // ── AUTOCAPTURE ──
      autocapture: {
        // Capture clicks, page views, form submissions, etc.
        dom_event_handlers: ['click', 'change'],
        url_ignored_components: [], // Ignore certain URL patterns if needed
        element_allowlist: [], // Leave empty to capture all
      },

      // ── GENERAL CONFIG ──
      // Capture page views automatically
      capture_pageview: true,
      // Capture navigation events
      capture_pageleave: true,
      // Load feature flags
      loaded: (ph) => {
        console.log('PostHog initialized:', {
          apiKey: apiKey.substring(0, 8) + '...',
          host: apiHost,
        });
      },
    });

    return posthog;
  } catch (error) {
    console.error('PostHog initialization failed:', error);
    return null;
  }
}

/**
 * Track a custom event
 * @param {string} eventName - Name of the event
 * @param {Object} properties - Event properties
 */
export function trackEvent(eventName, properties = {}) {
  if (window.posthog) {
    window.posthog.capture(eventName, properties);
  }
}

/**
 * Set user properties for identification
 * @param {string} userId - Unique user identifier
 * @param {Object} properties - User properties
 */
export function setUserProperties(userId, properties = {}) {
  if (window.posthog) {
    window.posthog.identify(userId, properties);
  }
}

/**
 * Reset user session (e.g., on logout)
 */
export function resetUserSession() {
  if (window.posthog) {
    window.posthog.reset();
  }
}
