(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var storedBase = window.localStorage.getItem('ai4health.ridsApiBaseUrl');
  var queryBase = params.get('apiBase');
  var legacyBase = 'http://127.0.0.1:8000/api/v1/public/rids';
  var defaultBase = 'http://127.0.0.1:8000/api/v1/public/datasources/rids';

  if (storedBase && /\/api\/v1\/public\/rids\/?$/.test(storedBase)) {
    storedBase = storedBase.replace(/\/api\/v1\/public\/rids\/?$/, '/api/v1/public/datasources/rids');
    window.localStorage.setItem('ai4health.ridsApiBaseUrl', storedBase);
  }

  var apiBase = queryBase || storedBase || defaultBase;

  if (queryBase) {
    window.localStorage.setItem('ai4health.ridsApiBaseUrl', queryBase);
  } else if (apiBase === legacyBase) {
    apiBase = defaultBase;
  }

  window.APP_CONFIG = Object.assign({}, window.APP_CONFIG, {
    ridsApiBaseUrl: apiBase.replace(/\/$/, '')
  });
})();
