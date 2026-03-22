(function () {
  'use strict';

  function safeNumber(value, digits) {
    var num = Number(value);
    if (!Number.isFinite(num)) {
      return 0;
    }
    return typeof digits === 'number' ? Number(num.toFixed(digits)) : num;
  }

  function classifyRisk(score) {
    if (score >= 80) return '高风险';
    if (score >= 60) return '中高风险';
    if (score >= 40) return '中风险';
    return '低风险';
  }

  function normalizeLevel(level) {
    var normalized = String(level || 'info').toLowerCase();
    if (normalized === 'critical') return '严重';
    if (normalized === 'high') return '高风险';
    if (normalized === 'medium') return '中等';
    if (normalized === 'info') return '提示';
    return normalized;
  }

  function levelColor(level) {
    var normalized = String(level || 'info').toLowerCase();
    if (normalized === 'critical') return 'rose';
    if (normalized === 'high') return 'amber';
    if (normalized === 'medium') return 'yellow';
    return 'blue';
  }

  function relativeTrend(value, suffix, positiveClass, negativeClass) {
    var num = safeNumber(value, 1);
    var klass = num >= 0 ? positiveClass : negativeClass;
    var prefix = num > 0 ? '+' : '';
    return {
      text: prefix + num + suffix,
      className: klass
    };
  }

  function buildApiViewModel(raw) {
    var overview = raw.overview || {};
    var alerts = Array.isArray(raw.alerts) ? raw.alerts : [];
    var freshness = Array.isArray(raw.freshness) ? raw.freshness : [];
    var projections = raw.projections || {};
    var criticalCount = alerts.filter(function (item) { return item.level === 'critical'; }).length;
    var highCount = alerts.filter(function (item) { return item.level === 'high'; }).length;
    var currentLineCount = freshness.filter(function (item) { return item.status === 'current'; }).length;
    var riskScore = safeNumber(overview.risk_score);
    var riskLevel = overview.risk_level || classifyRisk(riskScore);

    return {
      mode: 'live',
      meta: {
        source: raw.source || 'rids',
        sourceLabel: raw.source_label || 'RIDs',
        generatedAt: raw.generated_at || '',
        note: raw.trial_note || '',
        dataDate: overview.data_date || '',
        isLive: true,
        runtimeMode: raw.trial_mode ? 'trial' : 'formal',
        schemaVersion: raw.schema_version || '',
        runtimeService: 'AI_lab',
        cache: raw.cache || {}
      },
      dashboardCards: [
        {
          icon: 'vaccines',
          label: '流感报告人数',
          value: safeNumber(overview.flu_count),
          trend: relativeTrend(overview.flu_growth_rate, '%', 'text-rose-600 bg-rose-50', 'text-emerald-600 bg-emerald-50')
        },
        {
          icon: 'clinical_notes',
          label: '发热门诊就诊量',
          value: safeNumber(overview.total_visits),
          trend: relativeTrend(overview.fever_growth_rate, '%', 'text-amber-600 bg-amber-50', 'text-emerald-600 bg-emerald-50')
        },
        {
          icon: 'monitor_heart',
          label: 'ILI 占比',
          value: safeNumber(overview.ili_percent, 2) + '%',
          trend: relativeTrend(overview.ili_percent_change, ' pct', 'text-blue-600 bg-blue-50', 'text-emerald-600 bg-emerald-50')
        },
        {
          icon: 'school',
          label: '学校疫情起数',
          value: safeNumber(overview.total_outbreaks),
          trend: relativeTrend(overview.school_growth_rate, '%', 'text-rose-600 bg-rose-50', 'text-emerald-600 bg-emerald-50')
        }
      ],
      risk: {
        score: riskScore,
        level: riskLevel
      },
      freshnessRows: freshness.map(function (item) {
        return {
          tableName: item.table_name || '',
          name: item.label,
          zone: item.latest_date || '--',
          type: item.is_current ? '同步正常' : '待追更',
          risk: item.is_current ? '最新' : '延迟',
          status: item.is_current ? '当前' : '滞后',
          statusColor: item.is_current ? 'emerald' : 'amber'
        };
      }),
      alerts: {
        total: alerts.length,
        critical: criticalCount,
        high: highCount,
        currentLines: currentLineCount,
        rows: alerts.map(function (item, index) {
          return {
            id: item.id || ('ALT-' + (index + 1)),
            level: normalizeLevel(item.level),
            levelClass: levelColor(item.level),
            indicator: item.title || '监测提示',
            area: item.message || '',
            source: item.source || raw.source || 'rids',
            engine: 'AI_lab rule-engine',
            status: item.report_date || overview.data_date || '--',
            statusClass: 'slate',
            time: item.report_date || overview.data_date || '--'
          };
        })
      },
      projections: [
        {
          label: projections.flu && projections.flu.label ? projections.flu.label : '流感报告人数',
          value: projections.flu ? safeNumber(projections.flu.projected_next, 1) : 0,
          method: projections.flu && projections.flu.method ? projections.flu.method : 'recent_average_delta',
          delta: projections.flu ? relativeTrend(projections.flu.change_percent, '%', 'text-rose-600', 'text-emerald-600') : { text: '0%', className: 'text-slate-500' }
        },
        {
          label: projections.fever && projections.fever.label ? projections.fever.label : '发热门诊就诊量',
          value: projections.fever ? safeNumber(projections.fever.projected_next, 1) : 0,
          method: projections.fever && projections.fever.method ? projections.fever.method : 'recent_average_delta',
          delta: projections.fever ? relativeTrend(projections.fever.change_percent, '%', 'text-amber-600', 'text-emerald-600') : { text: '0%', className: 'text-slate-500' }
        },
        {
          label: projections.outbreaks && projections.outbreaks.label ? projections.outbreaks.label : '学校疫情起数',
          value: projections.outbreaks ? safeNumber(projections.outbreaks.projected_next, 1) : 0,
          method: projections.outbreaks && projections.outbreaks.method ? projections.outbreaks.method : 'recent_average_delta',
          delta: projections.outbreaks ? relativeTrend(projections.outbreaks.change_percent, '%', 'text-rose-600', 'text-emerald-600') : { text: '0%', className: 'text-slate-500' }
        }
      ],
      trends: raw.trends || {}
    };
  }

  function buildMockViewModel(mock) {
    return {
      mode: 'mock',
      meta: {
        source: 'demo',
        sourceLabel: '演示模式',
        generatedAt: '',
        note: '当前展示的是离线演示数据。连接 AI_lab 后会自动切换为真实监测数据。',
        dataDate: '',
        isLive: false,
        schemaVersion: 'demo',
        runtimeService: 'AI_lab',
        cache: {}
      },
      dashboardCards: [
        {
          icon: 'crisis_alert',
          label: mock.dashboardKPIs.criticalAlerts.label,
          value: mock.dashboardKPIs.criticalAlerts.value,
          trend: { text: mock.dashboardKPIs.criticalAlerts.trend, className: 'text-rose-600 bg-rose-50' }
        },
        {
          icon: 'warning',
          label: mock.dashboardKPIs.highRiskWarnings.label,
          value: mock.dashboardKPIs.highRiskWarnings.value,
          trend: { text: mock.dashboardKPIs.highRiskWarnings.trend, className: 'text-amber-600 bg-amber-50' }
        },
        {
          icon: 'task_alt',
          label: mock.dashboardKPIs.activeTasks.label,
          value: mock.dashboardKPIs.activeTasks.value,
          trend: { text: mock.dashboardKPIs.activeTasks.completion, className: 'text-blue-600 bg-blue-50' }
        },
        {
          icon: 'schedule',
          label: mock.dashboardKPIs.overdueAlerts.label,
          value: mock.dashboardKPIs.overdueAlerts.value,
          trend: { text: 'demo', className: 'text-slate-500 bg-slate-100' }
        }
      ],
      risk: {
        score: 72,
        level: '中高风险'
      },
      freshnessRows: mock.communities.slice(0, 5).map(function (item) {
        return {
          name: item.name,
          zone: item.zone,
          type: item.type,
          risk: item.risk,
          status: item.status,
          statusColor: item.status === '严重' ? 'rose' : item.status === '高风险' ? 'amber' : item.status === '中等' ? 'yellow' : 'blue'
        };
      }),
      alerts: {
        total: mock.warnings.length,
        critical: mock.warnings.filter(function (item) { return item.level === '严重'; }).length,
        high: mock.warnings.filter(function (item) { return item.level === '高风险'; }).length,
        currentLines: 3,
        rows: mock.warnings
      },
      projections: [
        { label: '预测 7 天峰值', value: 12.4, delta: { text: '+34%', className: 'text-rose-600' } },
        { label: '模型可信度', value: 94.2, delta: { text: '高置信度', className: 'text-emerald-600' } },
        { label: '增长率', value: 2.8, delta: { text: '加速上升期', className: 'text-amber-600' } }
      ],
      trends: {}
    };
  }

  async function fetchDashboard(source, limit) {
    var controller = new AbortController();
    var timer = setTimeout(function () {
      controller.abort();
    }, window.APP_CONFIG.requestTimeoutMs);

    try {
      var response = await fetch(
        window.APP_CONFIG.datasourceBase + '/' + encodeURIComponent(source) + '/dashboard?limit=' + encodeURIComponent(limit || window.APP_CONFIG.dashboardLimit),
        { signal: controller.signal }
      );

      if (!response.ok) {
        throw new Error('Dashboard request failed with status ' + response.status);
      }

      var raw = await response.json();
      return buildApiViewModel(raw);
    } finally {
      clearTimeout(timer);
    }
  }

  function buildAdminHeaders() {
    var headers = {
      'Content-Type': 'application/json'
    };
    var apiKey = String(window.APP_CONFIG.apiKey || '').trim();
    if (apiKey) {
      headers['X-API-KEY'] = apiKey;
    }
    return headers;
  }

  function setApiKey(value) {
    var nextValue = String(value || '').trim();
    window.APP_CONFIG.apiKey = nextValue;
    sessionStorage.setItem('ai4health.apiKey', nextValue);
    return nextValue;
  }

  async function fetchAdminJson(path, options) {
    var controller = new AbortController();
    var timer = setTimeout(function () {
      controller.abort();
    }, window.APP_CONFIG.requestTimeoutMs);

    try {
      var requestOptions = Object.assign({}, options || {});
      requestOptions.signal = controller.signal;
      requestOptions.headers = Object.assign({}, buildAdminHeaders(), requestOptions.headers || {});
      var response = await fetch(
        window.APP_CONFIG.adminBase + path,
        requestOptions
      );

      if (!response.ok) {
        var errorText = '';
        try {
          var errorJson = await response.json();
          errorText = errorJson && errorJson.detail ? errorJson.detail : JSON.stringify(errorJson);
        } catch (ignored) {
          errorText = await response.text();
        }
        throw new Error(errorText || ('Request failed with status ' + response.status));
      }

      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function listRegisteredDatasources() {
    return fetchAdminJson('');
  }

  async function fetchDatasourceSyncStatus(slug) {
    return fetchAdminJson('/' + encodeURIComponent(slug) + '/sync-status');
  }

  async function fetchDatasourceAlerts(slug, limit) {
    return fetchAdminJson('/' + encodeURIComponent(slug) + '/alerts?limit=' + encodeURIComponent(limit || 20));
  }

  async function syncDatasource(slug, options) {
    options = options || {};
    var params = new URLSearchParams();
    params.set('limit', String(options.limit || 8));
    if (options.force) {
      params.set('force', 'true');
    }
    return fetchAdminJson('/' + encodeURIComponent(slug) + '/sync?' + params.toString(), {
      method: 'POST'
    });
  }

  async function promoteDatasource(slug) {
    return fetchAdminJson('/' + encodeURIComponent(slug) + '/promote', {
      method: 'POST'
    });
  }

  async function onboardDatasource(payload) {
    return fetchAdminJson('/onboard', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async function fetchHealth() {
    var controller = new AbortController();
    var timer = setTimeout(function () {
      controller.abort();
    }, window.APP_CONFIG.requestTimeoutMs);

    try {
      var response = await fetch(
        window.APP_CONFIG.apiOrigin + '/health',
        { signal: controller.signal }
      );

      if (!response.ok) {
        throw new Error('Health request failed with status ' + response.status);
      }

      var raw = await response.json();
      return {
        online: raw && raw.status === 'ok',
        service: raw && raw.service ? raw.service : 'AI_lab',
        checkedAt: new Date().toISOString()
      };
    } finally {
      clearTimeout(timer);
    }
  }

  window.AI4HApi = {
    fetchDashboard: fetchDashboard,
    fetchHealth: fetchHealth,
    buildMockViewModel: buildMockViewModel,
    setApiKey: setApiKey,
    listRegisteredDatasources: listRegisteredDatasources,
    fetchDatasourceSyncStatus: fetchDatasourceSyncStatus,
    fetchDatasourceAlerts: fetchDatasourceAlerts,
    syncDatasource: syncDatasource,
    promoteDatasource: promoteDatasource,
    onboardDatasource: onboardDatasource
  };
})();
