(function () {
  'use strict';

  var query = new URLSearchParams(window.location.search);
  var storedApiOrigin = localStorage.getItem('ai4health.apiOrigin');
  var apiOrigin = query.get('apiOrigin');

  if (apiOrigin == null && storedApiOrigin != null) {
    apiOrigin = storedApiOrigin;
  }

  if (apiOrigin == null) {
    apiOrigin = '';
  }

  apiOrigin = String(apiOrigin || '').replace(/\/$/, '');
  localStorage.setItem('ai4health.apiOrigin', apiOrigin);

  window.APP_CONFIG = {
    apiOrigin: apiOrigin,
    datasourceBase: apiOrigin + '/api/v1/public/datasources',
    defaultSource: 'rids',
    dashboardLimit: 8,
    requestTimeoutMs: 15000
  };
})();
