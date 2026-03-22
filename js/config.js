(function () {
  'use strict';

  var query = new URLSearchParams(window.location.search);
  var storedApiOrigin = localStorage.getItem('ai4health.apiOrigin');
  var storedApiKey = sessionStorage.getItem('ai4health.apiKey');
  var apiOrigin = query.get('apiOrigin');
  var apiKey = storedApiKey;

  if (apiOrigin == null && storedApiOrigin != null) {
    apiOrigin = storedApiOrigin;
  }

  if (apiOrigin == null) {
    apiOrigin = '';
  }

  apiOrigin = String(apiOrigin || '').replace(/\/$/, '');
  apiKey = String(apiKey || '').trim();
  localStorage.setItem('ai4health.apiOrigin', apiOrigin);

  window.APP_CONFIG = {
    apiOrigin: apiOrigin,
    datasourceBase: apiOrigin + '/api/v1/public/datasources',
    adminBase: apiOrigin + '/api/v1/datasources',
    apiKey: apiKey,
    defaultSource: 'rids',
    dashboardLimit: 8,
    requestTimeoutMs: 15000
  };
})();
