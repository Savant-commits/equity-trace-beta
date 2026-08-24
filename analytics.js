/*
 * analytics.js
 * Single source of truth for analytics tracking (PostHog)
 * - Exposes `window.analytics` with safe wrapper functions
 * - Defensive: never throws or breaks app if PostHog is missing
 * - Detailed console logging for every event
 * - Compatible with non-module, plain script usage
 */
(function (w) {
  if (!w) return;

  // Lightweight safe logger
  function _log(type, msg, data) {
    try {
      const ts = new Date().toISOString();
      if (data !== undefined) console[type] && console[type]('[Analytics]', ts, msg, data);
      else console[type] && console[type]('[Analytics]', ts, msg);
    } catch (e) {}
  }

  // Centralized safe capture call
  function _safeCapture(eventName, props) {
    try {
      const payload = Object.assign({ _ts: new Date().toISOString() }, (props || {}));
      _log('info', "capture ->" + eventName, payload);
      if (w.posthog && typeof w.posthog.capture === 'function') {
        try {
          w.posthog.capture(eventName, payload);
          _log('info', 'sent -> ' + eventName);
        } catch (e) {
          _log('error', 'posthog.capture failed for ' + eventName, e && (e.message || e));
        }
      } else {
        _log('warn', 'posthog unavailable — event skipped -> ' + eventName);
      }
    } catch (err) {
      _log('error', 'analytics unexpected error', err && (err.message || err));
    }
  }

  // Public API
  var api = {
    tradeImported: function (count, source) {
      try {
        var c = Number.isFinite(count) ? count : (Number(count) || 0);
        _safeCapture('trade_imported', { trade_count: c, source: source || 'unknown' });
      } catch (e) { _log('error', 'tradeImported wrapper error', e && e.message); }
    },

    tradeAddedManually: function () {
      try { _safeCapture('trade_added_manually', {}); } catch (e) { _log('error', 'tradeAddedManually wrapper error', e && e.message); }
    },

    journalCreated: function () {
      try { _safeCapture('journal_created', {}); } catch (e) { _log('error', 'journalCreated wrapper error', e && e.message); }
    },

    reportGenerated: function (reportType) {
      try { _safeCapture('report_generated', { report_type: reportType || 'unknown' }); } catch (e) { _log('error', 'reportGenerated wrapper error', e && e.message); }
    },

    calendarViewed: function () {
      try { _safeCapture('calendar_viewed', {}); } catch (e) { _log('error', 'calendarViewed wrapper error', e && e.message); }
    },

    settingsChanged: function (settingName) {
      try { _safeCapture('settings_changed', { setting_name: settingName || '' }); } catch (e) { _log('error', 'settingsChanged wrapper error', e && e.message); }
    },

    accountCreated: function (accountName) {
      try { _safeCapture('account_created', { account_name: accountName || '' }); } catch (e) { _log('error', 'accountCreated wrapper error', e && e.message); }
    }
  };

  // Expose as non-writable global
  try {
    Object.defineProperty(w, 'analytics', { value: api, writable: false, configurable: false });
  } catch (e) {
    w.analytics = api; // fallback in older browsers
  }

  _log('info', 'analytics.js loaded');
})(window);
