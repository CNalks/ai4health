(function () {
  'use strict';

  var routes = {
    '/login': 'page-login',
    '/dashboard': 'page-dashboard',
    '/command-map': 'page-command-map',
    '/warning-center': 'page-warning-center',
    '/warning-detail': 'page-warning-detail',
    '/trend-prediction': 'page-trend-prediction',
    '/vector-risk': 'page-vector-risk',
    '/respiratory-sim': 'page-respiratory-sim',
    '/task-center': 'page-task-center',
    '/task-detail': 'page-task-detail',
    '/task-templates': 'page-task-templates',
    '/report-generate': 'page-report-generate',
    '/report-edit': 'page-report-edit',
    '/data-sources': 'page-data-sources',
    '/data-quality': 'page-data-quality',
    '/model-center': 'page-model-center',
    '/ai-lab-status': 'page-ai-lab-status',
    '/event-center': 'page-event-center',
    '/system-admin': 'page-system-admin'
  };

  var publicRoutes = ['/login'];
  var liveRoutes = ['/dashboard', '/warning-center', '/trend-prediction', '/data-sources', '/ai-lab-status'];
  var state = {
    source: window.APP_CONFIG.defaultSource,
    dashboard: null,
    dashboardPromise: null,
    dashboardStatus: 'idle',
    runtimeHealth: null,
    errorMessage: '',
    console: {
      datasources: [],
      selectedSlug: window.APP_CONFIG.defaultSource,
      syncStatus: null,
      alerts: [],
      rules: [],
      history: [],
      indicators: [],
      activity: [],
      statusMessage: '等待读取管理接口。',
      statusTone: 'text-slate-500',
      onboardMessage: '尚未提交。',
      onboardTone: 'text-slate-500',
      loading: false
    }
  };

  function parseHashRoute() {
    var rawHash = window.location.hash.slice(1) || '/dashboard';
    var parts = rawHash.split('?');
    var path = parts[0] || '/login';
    var params = new URLSearchParams(parts[1] || '');
    return {
      path: path,
      params: params
    };
  }

  function buildHash(path, params) {
    var query = params && params.toString();
    return '#' + path + (query ? '?' + query : '');
  }

  function navigate(path, params) {
    window.location.hash = buildHash(path, params);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(value) {
    if (!value) {
      return '--';
    }
    return String(value).replace('T', ' ').replace(/\.\d+Z$/, 'Z');
  }

  function formatRelativeTime(value) {
    if (!value) {
      return '--';
    }
    var timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) {
      return formatDate(value);
    }
    var diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
    if (diffMinutes < 1) {
      return '刚刚';
    }
    if (diffMinutes < 60) {
      return diffMinutes + ' 分钟前';
    }
    var diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
      return diffHours + ' 小时前';
    }
    return formatDate(value);
  }

  function colorClasses(name) {
    var map = {
      rose: {
        chip: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
        text: 'text-rose-600',
        accent: 'before:bg-rose-500'
      },
      amber: {
        chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
        text: 'text-amber-600',
        accent: 'before:bg-amber-500'
      },
      yellow: {
        chip: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
        text: 'text-yellow-600',
        accent: 'before:bg-yellow-500'
      },
      emerald: {
        chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
        text: 'text-emerald-600',
        accent: 'before:bg-emerald-500'
      },
      blue: {
        chip: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        text: 'text-blue-600',
        accent: 'before:bg-blue-500'
      },
      slate: {
        chip: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        text: 'text-slate-500',
        accent: 'before:bg-slate-400'
      }
    };
    return map[name] || map.slate;
  }

  function showToast(message) {
    var toast = document.createElement('div');
    toast.className = 'fixed bottom-24 right-4 md:bottom-6 md:right-6 bg-primary text-white px-4 py-3 rounded-xl shadow-lg z-[9999] text-sm font-medium animate-fade-in max-w-xs';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(function () {
        toast.remove();
      }, 300);
    }, 2400);
  }

  function firstPresent(values) {
    for (var index = 0; index < values.length; index += 1) {
      if (values[index]) {
        return values[index];
      }
    }
    return '';
  }

  function summarizeOperationPayload(payload) {
    var source = payload && typeof payload === 'object'
      ? (payload.result && typeof payload.result === 'object' ? payload.result : payload)
      : {};
    var summary = [];
    [
      ['status', source.status],
      ['data date', source.data_date || source.report_date],
      ['indicators', source.indicator_count],
      ['observations', source.observation_count],
      ['series', source.series_count],
      ['alerts', source.alert_count],
      ['rules', source.rule_count]
    ].forEach(function (item) {
      if (item[1] != null && item[1] !== '') {
        summary.push(item);
      }
    });
    return summary;
  }

  function buildRuleGroups(rules) {
    var groups = {};
    rules.forEach(function (item) {
      var key = item.series_name || item.indicator_key || 'ungrouped';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });
    return Object.keys(groups).sort().map(function (key) {
      return {
        name: key,
        items: groups[key]
      };
    });
  }

  function showReportModal() {
    var modal = document.getElementById('report-modal');
    var contentEl = document.getElementById('report-modal-content');
    if (!modal || !contentEl || typeof MOCK === 'undefined') {
      return;
    }

    var report = MOCK.sampleReport;
    var html = '<div class="space-y-6 text-sm text-slate-700 dark:text-slate-300">';
    html += '<div class="text-center border-b pb-4 border-slate-200 dark:border-slate-700">';
    html += '<h2 class="text-xl font-bold text-primary dark:text-slate-100">' + escapeHtml(report.title) + '</h2>';
    html += '<p class="text-slate-500 mt-1">' + escapeHtml(report.subtitle) + '</p>';
    html += '<p class="text-xs text-slate-400 mt-1">报告编号: ' + escapeHtml(report.reportId) + ' | 生成日期: ' + escapeHtml(report.date) + '</p>';
    html += '</div>';
    report.sections.forEach(function (section) {
      html += '<div><h3 class="font-bold text-primary dark:text-slate-100 mb-2">' + escapeHtml(section.title) + '</h3>';
      html += '<p class="whitespace-pre-line leading-relaxed">' + escapeHtml(section.content) + '</p></div>';
    });
    html += '</div>';
    contentEl.innerHTML = html;
    modal.classList.remove('hidden');
  }

  function hideReportModal() {
    var modal = document.getElementById('report-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  function downloadReport() {
    if (typeof MOCK === 'undefined') {
      return;
    }
    var report = MOCK.sampleReport;
    var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + escapeHtml(report.title) + '</title></head><body>';
    html += '<h1>' + escapeHtml(report.title) + '</h1>';
    html += '<p>' + escapeHtml(report.subtitle) + '</p>';
    report.sections.forEach(function (section) {
      html += '<h2>' + escapeHtml(section.title) + '</h2><p>' + escapeHtml(section.content).replace(/\n/g, '<br>') + '</p>';
    });
    html += '</body></html>';
    var blob = new Blob([html], { type: 'text/html' });
    var anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = report.title + '.html';
    anchor.click();
    URL.revokeObjectURL(anchor.href);
    showToast('报告已下载');
  }

  function ensureEnhancementStyles() {
    if (document.getElementById('thread-enhancement-styles')) {
      return;
    }

    var style = document.createElement('style');
    style.id = 'thread-enhancement-styles';
    style.textContent = [
      '.mobile-bottom-nav{box-shadow:0 -10px 30px rgba(15,23,42,.08);backdrop-filter:blur(12px);}',
      '.mobile-nav-link.active{color:#1a355b;background:rgba(26,53,91,.08);}',
      '.trial-banner{background:linear-gradient(135deg,#eff6ff 0%,#ffffff 100%);border:1px solid rgba(59,130,246,.18);}',
      '.dark .trial-banner{background:linear-gradient(135deg,rgba(30,41,59,.9) 0%,rgba(15,23,42,.94) 100%);border-color:rgba(148,163,184,.18);}',
      '.pulse-dot{animation:pulse-dot 1.8s ease-in-out infinite;}',
      '@keyframes pulse-dot{0%{transform:scale(.92);opacity:.6;}50%{transform:scale(1.15);opacity:1;}100%{transform:scale(.92);opacity:.6;}}',
      '.kpi-strip{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:.25rem;margin-left:-.25rem;margin-right:-.25rem;padding-left:.25rem;padding-right:.25rem;}',
      '.kpi-strip > article{min-width:76vw;scroll-snap-align:center;}',
      '.kpi-card{position:relative;overflow:hidden;}',
      '.kpi-card::before{content:"";position:absolute;inset:.75rem auto .75rem .75rem;width:4px;border-radius:999px;background:#1a355b;opacity:.95;}',
      '.mobile-section-card{border:1px solid rgb(226 232 240);border-radius:1rem;background:rgba(255,255,255,.96);padding:1rem;box-shadow:0 10px 25px rgba(15,23,42,.06);}',
      '.dark .mobile-section-card{border-color:rgb(51 65 85);background:rgba(15,23,42,.9);}',
      '.mobile-data-stack{display:grid;gap:.75rem;}',
      '.loading-shell{opacity:.55;pointer-events:none;filter:saturate(.6);}',
      '.source-pill{display:inline-flex;align-items:center;gap:.4rem;padding:.35rem .7rem;border-radius:999px;font-size:.75rem;font-weight:700;}',
      '@media (min-width:768px){.kpi-strip{display:grid;overflow:visible;padding:0;margin:0;scroll-snap-type:none;}.kpi-strip > article{min-width:0;}.mobile-only{display:none !important;}}',
      '@media (max-width:767px){body{padding-bottom:5.5rem;}.desktop-only{display:none !important;}.page-tight{padding:1rem;}.compact-title{font-size:1.375rem;line-height:1.2;}.compact-subtitle{font-size:.85rem;line-height:1.45;}}'
    ].join('');
    document.head.appendChild(style);
  }

  function ensureMobileNavigation() {
    if (document.getElementById('mobile-bottom-nav')) {
      return;
    }

    var nav = document.createElement('nav');
    nav.id = 'mobile-bottom-nav';
    nav.className = 'mobile-bottom-nav mobile-only fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 px-3 py-2 md:hidden';
    nav.innerHTML = [
      '<div class="grid grid-cols-5 gap-2">',
      createMobileNavLink('/dashboard', 'dashboard', '总览'),
      createMobileNavLink('/warning-center', 'warning', '预警'),
      createMobileNavLink('/trend-prediction', 'trending_up', '趋势'),
      createMobileNavLink('/data-sources', 'database', '数据'),
      createMobileNavLink('/system-admin', 'tune', '更多'),
      '</div>'
    ].join('');
    document.body.appendChild(nav);
  }

  function createMobileNavLink(path, icon, label) {
    return [
      '<button type="button" class="mobile-nav-link flex flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-medium text-slate-500 dark:text-slate-300" data-mobile-nav="',
      path,
      '">',
      '<span class="material-symbols-outlined text-[20px] leading-none">',
      icon,
      '</span>',
      '<span class="mt-1">',
      label,
      '</span></button>'
    ].join('');
  }

  function updateMobileNavigation(path) {
    document.querySelectorAll('[data-mobile-nav]').forEach(function (button) {
      if (button.getAttribute('data-mobile-nav') === path) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }

  function applyChrome(path) {
    var topbar = document.getElementById('app-topbar');
    var sidebar = document.getElementById('app-sidebar');
    var mainContent = document.getElementById('main-content');
    if (!topbar || !sidebar || !mainContent) {
      return;
    }

    if (path === '/login') {
      topbar.className = 'hidden';
      sidebar.className = 'hidden';
      mainContent.className = 'flex-1';
      return;
    }

    topbar.className = 'sticky top-0 z-30 h-14 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur flex items-center justify-between px-4 md:px-6 shrink-0';
    sidebar.className = 'hidden md:flex w-60 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-col shrink-0';
    mainContent.className = 'flex-1 overflow-y-auto';
  }

  function updateSidebarActive(path) {
    document.querySelectorAll('[data-nav-link]').forEach(function (link) {
      var target = link.getAttribute('data-nav-link');
      if (target === path) {
        link.className = 'flex items-center gap-3 px-3 py-2 rounded-xl bg-primary/10 text-primary font-semibold text-sm cursor-pointer';
      } else {
        link.className = 'flex items-center gap-3 px-3 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm cursor-pointer';
      }
    });
  }

  function updateTopbarUser() {
    if (typeof MOCK === 'undefined') {
      return;
    }
    var userNameEl = document.getElementById('topbar-username');
    var userAvatarEl = document.getElementById('topbar-avatar');
    if (userNameEl) {
      userNameEl.textContent = MOCK.currentUser.name;
    }
    if (userAvatarEl) {
      userAvatarEl.textContent = MOCK.currentUser.avatar;
    }
  }

  function getRuntimeState(viewModel) {
    if (state.runtimeHealth && state.runtimeHealth.online === false) {
      return {
        label: 'AI_lab 离线',
        dotClass: 'bg-rose-500',
        chipClass: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/30 dark:bg-rose-900/20 dark:text-rose-300'
      };
    }
    if (viewModel && viewModel.meta && viewModel.meta.isLive) {
      return {
        label: 'AI_lab 在线',
        dotClass: 'bg-emerald-500',
        chipClass: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-300'
      };
    }
    if (viewModel) {
      return {
        label: 'AI_lab 演示回退',
        dotClass: 'bg-amber-500',
        chipClass: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-300'
      };
    }
    return {
      label: 'AI_lab 检查中',
      dotClass: 'bg-slate-400',
      chipClass: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
    };
  }

  function updateTopbarRuntime(viewModel) {
    var button = document.getElementById('topbar-ai-lab-status');
    var dot = document.getElementById('topbar-ai-lab-dot');
    var label = document.getElementById('topbar-ai-lab-label');
    if (!button || !dot || !label) {
      return;
    }
    var runtimeState = getRuntimeState(viewModel || state.dashboard);
    button.className = 'hidden sm:flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ' + runtimeState.chipClass;
    dot.className = 'size-2 rounded-full ' + runtimeState.dotClass;
    label.textContent = runtimeState.label;
  }

  function getDatasourceSource(params) {
    var nextSource = params.get('source') || state.source || window.APP_CONFIG.defaultSource;
    state.source = nextSource;
    return nextSource;
  }

  function setLoadingState(isLoading) {
    ['/dashboard', '/warning-center', '/trend-prediction', '/data-sources', '/ai-lab-status'].forEach(function (path) {
      var section = document.getElementById(routes[path]);
      if (section) {
        section.classList.toggle('loading-shell', isLoading);
      }
    });
  }

  function setConsoleStatus(message, tone) {
    state.console.statusMessage = message;
    state.console.statusTone = tone || 'text-slate-500';
  }

  function setOnboardStatus(message, tone) {
    state.console.onboardMessage = message;
    state.console.onboardTone = tone || 'text-slate-500';
  }

  function appendConsoleActivity(title, payload, tone) {
    state.console.activity.unshift({
      title: title,
      payload: payload,
      tone: tone || 'slate',
      at: new Date().toISOString()
    });
    state.console.activity = state.console.activity.slice(0, 8);
  }

  function ensureSelectedDatasource() {
    var list = state.console.datasources || [];
    if (!list.length) {
      state.console.selectedSlug = '';
      return '';
    }
    var exists = list.some(function (item) {
      return item.slug === state.console.selectedSlug;
    });
    if (exists) {
      return state.console.selectedSlug;
    }
    state.console.selectedSlug = list[0].slug;
    return state.console.selectedSlug;
  }

  function getAdminApiKey() {
    return String(window.APP_CONFIG.apiKey || '').trim();
  }

  async function loadConsoleDatasourceDetails(slug) {
    if (!slug) {
      state.console.syncStatus = null;
      state.console.alerts = [];
      state.console.rules = [];
      state.console.history = [];
      state.console.indicators = [];
      return;
    }
    var detailResults = await Promise.all([
      window.AI4HApi.fetchDatasourceSyncStatus(slug),
      window.AI4HApi.fetchDatasourceAlerts(slug, 8),
      window.AI4HApi.fetchDatasourceRules(slug, false),
      window.AI4HApi.fetchDatasourceHistory(slug, 10)
    ]);
    var syncStatus = detailResults[0] || {};
    var stateStore = syncStatus.state_store || {};
    var shouldFetchIndicators = Number(stateStore.indicator_count || 0) > 0 || !!syncStatus.data_date;
    var indicators = [];
    if (shouldFetchIndicators) {
      indicators = await window.AI4HApi.fetchDatasourceIndicators(slug).catch(function () {
        return [];
      });
    }
    state.console.syncStatus = syncStatus;
    state.console.alerts = detailResults[1];
    state.console.rules = detailResults[2];
    state.console.history = detailResults[3];
    state.console.indicators = indicators;
  }

  async function loadConsoleData(force) {
    if (!getAdminApiKey()) {
      state.console.datasources = [];
      state.console.syncStatus = null;
      state.console.alerts = [];
      state.console.rules = [];
      state.console.history = [];
      state.console.indicators = [];
      setConsoleStatus('请先提供 X-API-KEY，才能读取 AI_lab 管理接口。', 'text-amber-600');
      renderAiLabStatusPage(state.dashboard || window.AI4HApi.buildMockViewModel(MOCK));
      return;
    }
    if (state.console.loading && !force) {
      return;
    }

    state.console.loading = true;
    setConsoleStatus('正在读取 datasource 列表...', 'text-slate-500');
    renderAiLabStatusPage(state.dashboard || window.AI4HApi.buildMockViewModel(MOCK));

    try {
      state.console.datasources = await window.AI4HApi.listRegisteredDatasources();
      var selectedSlug = ensureSelectedDatasource();
      await loadConsoleDatasourceDetails(selectedSlug);
      setConsoleStatus('AI_lab 管理接口已同步。', 'text-emerald-600');
    } catch (error) {
      state.console.datasources = [];
      state.console.syncStatus = null;
      state.console.alerts = [];
      state.console.rules = [];
      state.console.history = [];
      state.console.indicators = [];
      setConsoleStatus(error && error.message ? error.message : '读取 AI_lab 管理接口失败。', 'text-rose-600');
    } finally {
      state.console.loading = false;
      renderAiLabStatusPage(state.dashboard || window.AI4HApi.buildMockViewModel(MOCK));
    }
  }

  async function selectConsoleDatasource(slug) {
    state.console.selectedSlug = slug;
    setConsoleStatus('正在读取 ' + slug + ' 的状态...', 'text-slate-500');
    renderAiLabStatusPage(state.dashboard || window.AI4HApi.buildMockViewModel(MOCK));
    try {
      await loadConsoleDatasourceDetails(slug);
      setConsoleStatus('已切换到 datasource `' + slug + '`。', 'text-emerald-600');
    } catch (error) {
      state.console.syncStatus = null;
      state.console.alerts = [];
      state.console.rules = [];
      state.console.history = [];
      state.console.indicators = [];
      setConsoleStatus(error && error.message ? error.message : '读取 datasource 详情失败。', 'text-rose-600');
    }
    renderAiLabStatusPage(state.dashboard || window.AI4HApi.buildMockViewModel(MOCK));
  }

  function readOnboardPayload() {
    var settingsText = (document.getElementById('ai-lab-onboard-settings') || {}).value || '{}';
    var settings;
    try {
      settings = JSON.parse(settingsText || '{}');
    } catch (error) {
      throw new Error('settings JSON 格式不正确');
    }

    var capabilitiesRaw = ((document.getElementById('ai-lab-onboard-capabilities') || {}).value || 'dashboard').split(',');
    var capabilities = capabilitiesRaw.map(function (item) {
      return item.trim();
    }).filter(Boolean);

    return {
      slug: ((document.getElementById('ai-lab-onboard-slug') || {}).value || '').trim(),
      label: ((document.getElementById('ai-lab-onboard-label') || {}).value || '').trim(),
      adapter: ((document.getElementById('ai-lab-onboard-adapter') || {}).value || '').trim(),
      enabled: !!((document.getElementById('ai-lab-onboard-enabled') || {}).checked),
      public_enabled: !!((document.getElementById('ai-lab-onboard-public') || {}).checked),
      overwrite: !!((document.getElementById('ai-lab-onboard-overwrite') || {}).checked),
      capabilities: capabilities.length ? capabilities : ['dashboard'],
      settings: settings
    };
  }

  async function submitOnboardDatasource() {
    var payload = readOnboardPayload();
    if (!payload.slug || !payload.label || !payload.adapter) {
      throw new Error('slug、label、adapter 不能为空');
    }
    var result = await window.AI4HApi.onboardDatasource(payload);
    if (!result || !result.datasource || !result.datasource.slug) {
      throw new Error('AI_lab 返回的注册响应不完整');
    }
    state.console.selectedSlug = result.datasource.slug;
    setOnboardStatus('Datasource `' + result.datasource.slug + '` 注册成功。', 'text-emerald-600');
    appendConsoleActivity('onboard', result, 'emerald');
    await loadConsoleData(true);
    return result;
  }

  async function runDatasourceCommand(action) {
    var slug = state.console.selectedSlug;
    if (!slug) {
      throw new Error('当前没有可操作的 datasource');
    }

    var result;
    if (action === 'sync') {
      result = await window.AI4HApi.syncDatasource(slug, { limit: 8, force: true });
    } else if (action === 'promote') {
      result = await window.AI4HApi.promoteDatasource(slug);
    } else {
      throw new Error('未知操作');
    }

    appendConsoleActivity(action, result, action === 'sync' ? 'blue' : 'amber');
    await loadConsoleData(true);
    return result;
  }

  async function ensureDashboardData(force) {
    if (state.dashboard && !force) {
      return state.dashboard;
    }
    if (state.dashboardPromise && !force) {
      return state.dashboardPromise;
    }

    state.dashboardStatus = 'loading';
    state.errorMessage = '';
    setLoadingState(true);
    updateTopbarRuntime();

    var dashboardTask = window.AI4HApi.fetchDashboard(state.source, window.APP_CONFIG.dashboardLimit)
      .then(function (payload) {
        state.dashboard = payload;
        state.dashboardStatus = 'ready';
        renderLiveSections();
        return payload;
      })
      .catch(function (error) {
        state.dashboard = window.AI4HApi.buildMockViewModel(MOCK);
        state.dashboardStatus = 'fallback';
        state.errorMessage = error && error.message ? error.message : '无法连接 AI_lab';
        renderLiveSections();
        return state.dashboard;
      });

    var healthTask = window.AI4HApi.fetchHealth()
      .then(function (payload) {
        state.runtimeHealth = payload;
        updateTopbarRuntime();
        return payload;
      })
      .catch(function () {
        state.runtimeHealth = {
          online: false,
          service: 'AI_lab',
          checkedAt: new Date().toISOString()
        };
        updateTopbarRuntime();
        return state.runtimeHealth;
      });

    state.dashboardPromise = Promise.all([dashboardTask, healthTask])
      .finally(function () {
        state.dashboardPromise = null;
        setLoadingState(false);
      });

    return state.dashboardPromise;
  }

  function renderLiveSections() {
    if (!state.dashboard) {
      return;
    }
    renderDashboardPage(state.dashboard);
    renderWarningCenter(state.dashboard);
    renderTrendPrediction(state.dashboard);
    renderDatasourcePage(state.dashboard);
    renderAiLabStatusPage(state.dashboard);
    updateTopbarRuntime(state.dashboard);
  }

  function renderConsoleDatasourceList() {
    var container = document.getElementById('ai-lab-console-datasources');
    var selectedEl = document.getElementById('ai-lab-console-selected');
    if (!container || !selectedEl) {
      return;
    }

    var datasources = state.console.datasources || [];
    selectedEl.textContent = state.console.selectedSlug ? ('当前 ' + state.console.selectedSlug) : '未选择';

    if (!datasources.length) {
      container.innerHTML = '<div class="p-5 text-sm text-slate-500">没有可显示的 datasource。先保存 API Key，然后刷新控制台。</div>';
      return;
    }

    container.innerHTML = datasources.map(function (item) {
      var isActive = item.slug === state.console.selectedSlug;
      var activeClass = isActive ? 'border-primary bg-primary/5' : 'border-transparent';
      return [
        '<article class="p-5 border-l-4 ', activeClass, '">',
        '<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">',
        '<div class="space-y-1">',
        '<div class="flex items-center gap-2 flex-wrap">',
        '<h3 class="text-base font-bold">', escapeHtml(item.label), '</h3>',
        '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200">', escapeHtml(item.slug), '</span>',
        '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">', escapeHtml(item.adapter), '</span>',
        '</div>',
        '<p class="text-sm text-slate-500">capabilities: ', escapeHtml((item.capabilities || []).join(', ') || 'dashboard'), '</p>',
        '</div>',
        '<div class="flex flex-wrap gap-2">',
        '<button data-action="ai-lab-select-datasource" data-slug="', escapeHtml(item.slug), '" class="px-3 py-2 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">查看状态</button>',
        '<button data-action="ai-lab-sync-datasource" data-slug="', escapeHtml(item.slug), '" class="px-3 py-2 rounded-lg text-xs font-bold bg-primary text-white">Sync</button>',
        '<button data-action="ai-lab-promote-datasource" data-slug="', escapeHtml(item.slug), '" class="px-3 py-2 rounded-lg text-xs font-bold bg-amber-500 text-white">Promote</button>',
        '</div>',
        '</div>',
        '</article>'
      ].join('');
    }).join('');
  }

  function ensureBanner(container) {
    var banner = container.querySelector('[data-trial-banner]');
    if (!banner) {
      banner = document.createElement('div');
      banner.setAttribute('data-trial-banner', 'true');
      banner.className = 'trial-banner rounded-2xl px-4 py-4 md:px-5 md:py-4';
      container.insertBefore(banner, container.children[1]);
    }
    return banner;
  }

  function renderDashboardPage(viewModel) {
    var section = document.getElementById('page-dashboard');
    if (!section) {
      return;
    }

    var wrapper = section.querySelector('.max-w-7xl');
    if (!wrapper) {
      return;
    }
    wrapper.classList.add('page-tight');

    var title = wrapper.querySelector('h1');
    var subtitle = wrapper.querySelector('p.text-slate-500');
    if (title) title.classList.add('compact-title');
    if (subtitle) subtitle.classList.add('compact-subtitle');

    var banner = ensureBanner(wrapper);
    var liveChip = viewModel.meta.isLive
      ? '<span class="source-pill bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"><span class="pulse-dot inline-block size-2 rounded-full bg-emerald-500"></span>真实数据</span>'
      : '<span class="source-pill bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"><span class="pulse-dot inline-block size-2 rounded-full bg-amber-500"></span>演示回退</span>';
    banner.innerHTML = [
      '<div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">',
      '<div class="space-y-1">',
      '<p class="text-sm font-bold text-primary dark:text-slate-100">',
      escapeHtml(viewModel.meta.sourceLabel),
      ' x AI_lab 数据总览</p>',
      '<p class="text-xs text-slate-600 dark:text-slate-300">',
      escapeHtml(viewModel.meta.note || '已连接 AI_lab datasource 接口'),
      '</p>',
      '</div>',
      '<div class="flex flex-wrap gap-2 items-center">',
      liveChip,
      '<span class="source-pill bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">最新日期 ',
      escapeHtml(viewModel.meta.dataDate || '--'),
      '</span>',
      '<span class="source-pill bg-white text-slate-700 border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">',
      'AI_lab · ',
      escapeHtml(viewModel.meta.schemaVersion || 'runtime'),
      '</span>',
      '<span class="source-pill bg-white text-slate-700 border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">',
      '生成 ',
      escapeHtml(formatRelativeTime(viewModel.meta.generatedAt)),
      '</span>',
      '</div>',
      '</div>'
    ].join('');

    var kpiGrid = wrapper.querySelector('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4');
    if (kpiGrid) {
      kpiGrid.className = 'kpi-strip md:grid md:grid-cols-2 lg:grid-cols-4 gap-4';
      var cards = Array.prototype.slice.call(kpiGrid.children);
      cards.forEach(function (card, index) {
        var item = viewModel.dashboardCards[index];
        var accent = colorClasses(item && item.trend && item.trend.className.indexOf('rose') >= 0 ? 'rose' :
          item && item.trend && item.trend.className.indexOf('amber') >= 0 ? 'amber' :
          item && item.trend && item.trend.className.indexOf('blue') >= 0 ? 'blue' :
          item && item.trend && item.trend.className.indexOf('emerald') >= 0 ? 'emerald' : 'slate');
        card.className = 'kpi-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 pl-7 rounded-2xl shadow-sm';
        if (!item) {
          return;
        }
        card.innerHTML = [
          '<div class="flex items-start justify-between gap-3 mb-3">',
          '<span class="material-symbols-outlined ',
          accent.text,
          '">',
          escapeHtml(item.icon),
          '</span>',
          '<span class="text-xs font-bold px-2.5 py-1 rounded-full ',
          item.trend.className,
          '">',
          escapeHtml(item.trend.text),
          '</span>',
          '</div>',
          '<p class="text-[30px] font-black tracking-tight">',
          escapeHtml(item.value),
          '</p>',
          '<p class="text-sm text-slate-500 mt-1">',
          escapeHtml(item.label),
          '</p>',
          '<p class="mt-3 text-[11px] font-bold text-slate-400 uppercase tracking-wide">',
          'Powered by AI_lab',
          '</p>'
        ].join('');
      });
    }

    var riskCard = wrapper.querySelectorAll('.grid.grid-cols-1.lg\\:grid-cols-3.gap-6 > div')[1];
    if (riskCard) {
      var paths = riskCard.querySelectorAll('path');
      var gauge = Math.max(0, Math.min(100, Number(viewModel.risk.score || 0)));
      if (paths[1]) {
        paths[1].setAttribute('stroke-dasharray', String(gauge) + ', 100');
      }
      var numberEl = riskCard.querySelector('.text-2xl');
      var labelEl = riskCard.querySelector('.text-xs');
      if (numberEl) numberEl.textContent = String(gauge);
      if (labelEl) labelEl.textContent = viewModel.risk.level;
    }

    var freshnessCard = wrapper.querySelector('.bg-white.dark\\:bg-slate-900.border.border-slate-200.dark\\:border-slate-800.rounded-xl.shadow-sm.overflow-hidden');
    if (freshnessCard) {
      var sectionHeader = freshnessCard.querySelector('h3');
      if (sectionHeader) {
        sectionHeader.textContent = '数据线路新鲜度';
      }
      var tbody = freshnessCard.querySelector('tbody');
      var thead = freshnessCard.querySelector('thead tr');
      if (thead) {
        thead.innerHTML = '<th class="px-5 py-3">数据线路</th><th class="px-5 py-3">最新日期</th><th class="px-5 py-3">同步状态</th><th class="px-5 py-3">说明</th><th class="px-5 py-3">标签</th>';
      }
      if (tbody) {
        tbody.innerHTML = viewModel.freshnessRows.slice(0, 5).map(function (row) {
          var palette = colorClasses(row.statusColor);
          return [
            '<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">',
            '<td class="px-5 py-3 font-semibold">', escapeHtml(row.name), '</td>',
            '<td class="px-5 py-3">', escapeHtml(row.zone), '</td>',
            '<td class="px-5 py-3">', escapeHtml(row.type), '</td>',
            '<td class="px-5 py-3 font-bold ', palette.text, '">', escapeHtml(row.risk), '</td>',
            '<td class="px-5 py-3"><span class="px-2 py-0.5 rounded-full text-xs font-bold ', palette.chip, '">', escapeHtml(row.status), '</span></td>',
            '</tr>'
          ].join('');
        }).join('');
      }
    }
  }

  function renderWarningCenter(viewModel) {
    var section = document.getElementById('page-warning-center');
    if (!section) {
      return;
    }
    var wrapper = section.querySelector('.max-w-7xl');
    if (!wrapper) {
      return;
    }
    wrapper.classList.add('page-tight');

    var summaryGrid = wrapper.querySelector('.grid.grid-cols-2.lg\\:grid-cols-4');
    if (summaryGrid) {
      var summaryCards = Array.prototype.slice.call(summaryGrid.children);
      var items = [
        { value: viewModel.alerts.total, label: '活跃预警', tone: 'text-slate-900' },
        { value: viewModel.alerts.critical, label: '严重', tone: 'text-rose-600' },
        { value: viewModel.alerts.high, label: '高风险', tone: 'text-amber-600' },
        { value: viewModel.alerts.currentLines, label: '数据线路正常', tone: 'text-emerald-600' }
      ];
      summaryCards.forEach(function (card, index) {
        var item = items[index];
        if (!item) return;
        card.className = 'mobile-section-card';
        card.innerHTML = '<p class="text-2xl font-black ' + item.tone + '">' + escapeHtml(item.value) + '</p><p class="text-xs text-slate-500 mt-1">' + escapeHtml(item.label) + '</p>';
      });
    }

    var tableShell = wrapper.querySelector('.bg-white.dark\\:bg-slate-900.border.border-slate-200.dark\\:border-slate-800.rounded-xl.shadow-sm.overflow-hidden');
    if (!tableShell) {
      return;
    }

    var engineNote = tableShell.querySelector('[data-warning-engine-note]');
    if (!engineNote) {
      engineNote = document.createElement('div');
      engineNote.setAttribute('data-warning-engine-note', 'true');
      engineNote.className = 'px-5 py-4 border-b border-slate-100 dark:border-slate-800 text-sm text-slate-500';
      tableShell.insertBefore(engineNote, tableShell.firstChild);
    }
    engineNote.innerHTML = [
      '<div class="flex flex-wrap items-center gap-2">',
      '<span class="source-pill bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">AI_lab rule-engine</span>',
      '<span>当前预警由 AI_lab 运行时输出，数据时间 ',
      escapeHtml(viewModel.meta.dataDate || '--'),
      '</span>',
      '</div>'
    ].join('');

    var mobileList = tableShell.querySelector('[data-warning-mobile-list]');
    if (!mobileList) {
      mobileList = document.createElement('div');
      mobileList.setAttribute('data-warning-mobile-list', 'true');
      mobileList.className = 'mobile-data-stack p-4 md:hidden';
      tableShell.insertBefore(mobileList, tableShell.firstChild);
    }

    var tableWrap = tableShell.querySelector('.overflow-x-auto');
    if (tableWrap) {
      tableWrap.classList.add('hidden', 'md:block');
    }

    var tbody = tableShell.querySelector('tbody');
    var thead = tableShell.querySelector('thead tr');
    if (thead) {
      thead.innerHTML = '<th class="px-5 py-3">预警ID</th><th class="px-5 py-3">等级</th><th class="px-5 py-3">指标</th><th class="px-5 py-3">AI_lab 来源</th><th class="px-5 py-3">说明</th><th class="px-5 py-3">数据日期</th><th class="px-5 py-3">时间</th>';
    }
    if (tbody) {
      tbody.innerHTML = viewModel.alerts.rows.slice(0, 8).map(function (row) {
        var palette = colorClasses(row.levelClass);
        var statusPalette = colorClasses(row.statusClass);
        return [
          '<tr data-row-link="/warning-detail" class="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">',
          '<td class="px-5 py-3 font-mono text-xs">', escapeHtml(row.id), '</td>',
          '<td class="px-5 py-3"><span class="px-2 py-0.5 rounded-full text-xs font-bold ', palette.chip, '">', escapeHtml(row.level), '</span></td>',
          '<td class="px-5 py-3">', escapeHtml(row.indicator), '</td>',
          '<td class="px-5 py-3 text-xs font-bold text-blue-600">AI_lab / alerts</td>',
          '<td class="px-5 py-3">', escapeHtml(row.area), '</td>',
          '<td class="px-5 py-3"><span class="px-2 py-0.5 rounded-full text-xs font-bold ', statusPalette.chip, '">', escapeHtml(row.status), '</span></td>',
          '<td class="px-5 py-3 text-xs text-slate-500">', escapeHtml(row.time), '</td>',
          '</tr>'
        ].join('');
      }).join('');
    }

    mobileList.innerHTML = viewModel.alerts.rows.slice(0, 6).map(function (row) {
      var palette = colorClasses(row.levelClass);
      return [
        '<article class="mobile-section-card">',
        '<div class="flex items-start justify-between gap-3">',
        '<div>',
        '<p class="text-xs font-mono text-slate-400">', escapeHtml(row.id), '</p>',
        '<h3 class="text-sm font-bold mt-1">', escapeHtml(row.indicator), '</h3>',
        '<p class="mt-2 text-[11px] font-bold text-blue-600">AI_lab / alerts</p>',
        '</div>',
        '<span class="px-2.5 py-1 rounded-full text-xs font-bold ', palette.chip, '">', escapeHtml(row.level), '</span>',
        '</div>',
        '<p class="text-sm text-slate-500 mt-3">', escapeHtml(row.area), '</p>',
        '<div class="mt-4 flex items-center justify-between text-xs text-slate-400">',
        '<span>数据日期 ', escapeHtml(row.status), '</span>',
        '<span>', escapeHtml(row.time), '</span>',
        '</div>',
        '</article>'
      ].join('');
    }).join('');
  }

  function createTrendPath(values, width, height, topPadding) {
    if (!values.length) {
      return '';
    }
    var min = Math.min.apply(Math, values);
    var max = Math.max.apply(Math, values);
    var span = Math.max(max - min, 1);
    return values.map(function (value, index) {
      var x = values.length === 1 ? 0 : (index / (values.length - 1)) * width;
      var y = topPadding + (1 - ((value - min) / span)) * (height - topPadding * 2);
      return (index === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
    }).join(' ');
  }

  function renderTrendPrediction(viewModel) {
    var section = document.getElementById('page-trend-prediction');
    if (!section) {
      return;
    }

    var wrapper = section.querySelector('.max-w-7xl');
    if (!wrapper) {
      return;
    }
    wrapper.classList.add('page-tight');

    var filterBar = wrapper.querySelector('.flex.flex-wrap.gap-3');
    if (filterBar) {
      filterBar.className = 'grid grid-cols-1 sm:grid-cols-3 gap-3';
      Array.prototype.forEach.call(filterBar.children, function (child) {
        child.classList.add('w-full');
      });
    }

    var enginePanel = wrapper.querySelector('[data-ai-lab-trend-panel]');
    if (!enginePanel) {
      enginePanel = document.createElement('div');
      enginePanel.setAttribute('data-ai-lab-trend-panel', 'true');
      enginePanel.className = 'mobile-section-card';
      wrapper.insertBefore(enginePanel, wrapper.children[2]);
    }
    enginePanel.innerHTML = [
      '<div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">',
      '<div>',
      '<p class="text-xs font-bold uppercase tracking-wide text-slate-500">AI_lab 预测引擎</p>',
      '<h2 class="text-lg font-bold mt-1">当前趋势外推由 AI_lab runtime 生成</h2>',
      '<p class="text-sm text-slate-500 mt-2">模型口径 ',
      escapeHtml(viewModel.meta.schemaVersion || 'rids-dashboard.v2'),
      ' · 输出时间 ',
      escapeHtml(formatRelativeTime(viewModel.meta.generatedAt)),
      '</p>',
      '</div>',
      '<div class="flex flex-wrap gap-2">',
      '<span class="source-pill bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">backend ',
      escapeHtml((viewModel.meta.cache && viewModel.meta.cache.backend) || 'AI_lab'),
      '</span>',
      '<span class="source-pill bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">14 天趋势外推</span>',
      '</div>',
      '</div>'
    ].join('');

    var chartCard = wrapper.querySelector('.bg-white.dark\\:bg-slate-900.border.border-slate-200.dark\\:border-slate-800.rounded-xl.p-6.shadow-sm');
    if (chartCard) {
      var legend = chartCard.querySelector('.flex.gap-4.text-xs');
      if (legend) {
        legend.className = 'flex flex-wrap gap-3 text-xs text-slate-500';
      }

      var trendRows = ((viewModel.trends || {}).respiratory_card || []).slice().reverse();
      var trendValues = trendRows.map(function (row) {
        return Number(row.flu_count || 0);
      });
      var path = createTrendPath(trendValues, 600, 200, 24);
      var latestProjection = viewModel.projections[0] ? Number(viewModel.projections[0].value || 0) : 0;
      var extendedValues = trendValues.concat([latestProjection]);
      var projectionPath = createTrendPath(extendedValues, 600, 200, 24);
      var svg = chartCard.querySelector('svg');
      if (svg) {
        svg.innerHTML = [
          '<path d="', path, '" stroke="#1a355b" stroke-width="3" fill="none" stroke-linecap="round"></path>',
          '<path d="', projectionPath, '" stroke="#ef4444" stroke-width="3" stroke-dasharray="6" fill="none" stroke-linecap="round"></path>',
          '<line x1="520" y1="0" x2="520" y2="200" stroke="#94a3b8" stroke-dasharray="4"></line>',
          '<text x="528" y="18" font-size="10" fill="#94a3b8">预测</text>'
        ].join('');
      }
    }

    var statsGrid = wrapper.querySelector('.grid.grid-cols-1.md\\:grid-cols-3');
    if (statsGrid) {
      Array.prototype.slice.call(statsGrid.children).forEach(function (card, index) {
        var item = viewModel.projections[index];
        if (!item) return;
        card.className = 'mobile-section-card';
        card.innerHTML = [
          '<p class="text-xs text-slate-500 uppercase font-bold">',
          escapeHtml(item.label),
          '</p>',
          '<p class="text-2xl font-black mt-2">',
          escapeHtml(item.value),
          '</p>',
          '<p class="text-xs font-bold mt-1 ',
          item.delta.className,
          '">',
          escapeHtml(item.delta.text),
          '</p>'
        ].join('');
      });
    }
  }

  function renderDatasourcePage(viewModel) {
    var section = document.getElementById('page-data-sources');
    if (!section) {
      return;
    }

    var heading = section.querySelector('h1');
    var subtitle = section.querySelector('p.text-slate-500');
    if (heading) {
      heading.textContent = '数据源与 Onboard 接入';
    }
    if (subtitle) {
      subtitle.textContent = '当前前端已通过 AI_lab datasource 接口读取 ' + viewModel.meta.sourceLabel + ' 数据，并展示 AI_lab 管道状态';
    }

    var statusGrid = section.querySelector('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4');
    if (statusGrid) {
      var cards = Array.prototype.slice.call(statusGrid.children);
      var statusText = (state.runtimeHealth && state.runtimeHealth.online === false) ? '离线' : '在线';
      var cardData = [
        { title: 'AI_lab runtime', subtitle: state.runtimeHealth && state.runtimeHealth.service ? state.runtimeHealth.service : 'AI_lab', metaLeft: '状态', metaRight: statusText, badge: statusText, badgeClass: statusText === '在线' ? 'text-green-500 bg-green-50 dark:bg-green-900/20' : 'text-rose-500 bg-rose-50 dark:bg-rose-900/20' },
        { title: viewModel.meta.sourceLabel, subtitle: 'datasource adapter', metaLeft: '数据日期', metaRight: viewModel.meta.dataDate || '--', badge: '已接入', badgeClass: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
        { title: 'schema', subtitle: viewModel.meta.schemaVersion || 'rids-dashboard.v2', metaLeft: 'backend', metaRight: (viewModel.meta.cache && viewModel.meta.cache.backend) || 'AI_lab', badge: '投影中', badgeClass: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
        { title: '公开输出', subtitle: 'dashboard / alerts', metaLeft: '生成', metaRight: formatRelativeTime(viewModel.meta.generatedAt), badge: String(viewModel.alerts.total), badgeClass: 'text-slate-500 bg-slate-100 dark:bg-slate-800' }
      ];
      cards.forEach(function (card, index) {
        var item = cardData[index];
        if (!item) {
          return;
        }
        card.className = 'mobile-section-card';
        card.innerHTML = [
          '<div class="flex items-center justify-between mb-3">',
          '<span class="text-[10px] font-bold uppercase tracking-widest text-slate-500">', escapeHtml(item.title), '</span>',
          '<span class="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ', item.badgeClass, '">', escapeHtml(item.badge), '</span>',
          '</div>',
          '<h3 class="font-bold">', escapeHtml(item.subtitle), '</h3>',
          '<div class="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 mt-4 text-xs text-slate-500">',
          '<span>', escapeHtml(item.metaLeft), '</span>',
          '<span class="font-bold text-slate-900 dark:text-slate-100">', escapeHtml(item.metaRight), '</span>',
          '</div>'
        ].join('');
      });
    }

    var infoTable = section.querySelector('table');
    if (infoTable) {
      var thead = infoTable.querySelector('thead tr');
      var tbody = infoTable.querySelector('tbody');
      if (thead) {
        thead.innerHTML = '<th class="px-5 py-3">线路</th><th class="px-5 py-3">最新日期</th><th class="px-5 py-3">同步状态</th><th class="px-5 py-3">服务链路</th><th class="px-5 py-3">标签</th>';
      }
      if (tbody) {
        tbody.innerHTML = viewModel.freshnessRows.map(function (row) {
          var palette = colorClasses(row.statusColor);
          return [
            '<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">',
            '<td class="px-5 py-3 font-semibold">', escapeHtml(row.name), '</td>',
            '<td class="px-5 py-3">', escapeHtml(row.zone), '</td>',
            '<td class="px-5 py-3"><span class="px-2 py-0.5 rounded-full text-xs font-bold ', palette.chip, '">', escapeHtml(row.type), '</span></td>',
            '<td class="px-5 py-3 text-xs text-slate-500">ingest → normalize → serve</td>',
            '<td class="px-5 py-3 text-xs font-bold text-blue-600">AI_lab</td>',
            '</tr>'
          ].join('');
        }).join('');
      }
    }

    var liveOnlyBlock = section.querySelector('.grid.grid-cols-1.lg\\:grid-cols-3.gap-6');
    if (liveOnlyBlock) {
      liveOnlyBlock.className = 'grid grid-cols-1 gap-6';
      liveOnlyBlock.innerHTML = [
        '<div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6 space-y-4">',
        '<div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">',
        '<div>',
        '<h3 class="font-bold flex items-center gap-2"><span class="material-symbols-outlined text-primary">hub</span>AI_lab 管道视图</h3>',
        '<p class="text-sm text-slate-500 mt-1">当前页面只显示 live datasource runtime、freshness 和公开输出状态，不再混入 mock 或 demo 运维面板。</p>',
        '</div>',
        '<a href="#/ai-lab-status?source=', escapeHtml(state.source), '" class="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">',
        '<span class="material-symbols-outlined text-base">open_in_new</span>',
        '打开 AI_lab Console',
        '</a>',
        '</div>',
        '<div class="grid grid-cols-1 md:grid-cols-3 gap-4">',
        '<div class="rounded-xl border border-slate-200 dark:border-slate-700 p-4">',
        '<p class="text-xs font-bold uppercase tracking-wide text-slate-500">Live scope</p>',
        '<p class="mt-2 text-sm text-slate-700 dark:text-slate-300">Datasource runtime、schema、freshness 和公开输出都以 AI_lab live API 为准。</p>',
        '</div>',
        '<div class="rounded-xl border border-slate-200 dark:border-slate-700 p-4">',
        '<p class="text-xs font-bold uppercase tracking-wide text-slate-500">Operator actions</p>',
        '<p class="mt-2 text-sm text-slate-700 dark:text-slate-300">Onboard、sync、promote、rules、history 统一收敛到 AI_lab Console，不在这里放假日志或占位告警。</p>',
        '</div>',
        '<div class="rounded-xl border border-slate-200 dark:border-slate-700 p-4">',
        '<p class="text-xs font-bold uppercase tracking-wide text-slate-500">Review gate</p>',
        '<p class="mt-2 text-sm text-slate-700 dark:text-slate-300">公开页只保留真实运行态。任何调试样例、模拟吞吐和静态告警都不再出现在 live 站点。</p>',
        '</div>',
        '</div>',
        '</div>'
      ].join('');
    }
  }

  function renderAiLabStatusPage(viewModel) {
    var section = document.getElementById('page-ai-lab-status');
    if (!section) {
      return;
    }

    var runtimeGrid = document.getElementById('ai-lab-status-runtime');
    var pipelineBody = document.getElementById('ai-lab-status-pipeline');
    var indicatorBox = document.getElementById('ai-lab-console-indicators');
    var metaBox = document.getElementById('ai-lab-status-meta');
    var outputBox = document.getElementById('ai-lab-status-output');
    var consoleStatus = document.getElementById('ai-lab-console-status');
    var consoleOrigin = document.getElementById('ai-lab-console-origin');
    var consoleApiKey = document.getElementById('ai-lab-console-api-key');
    var onboardResult = document.getElementById('ai-lab-onboard-result');
    var runtimeState = getRuntimeState(viewModel);
    var cacheMeta = viewModel.meta.cache || {};
    var syncStatus = state.console.syncStatus || {};
    var activity = state.console.activity || [];
    var alerts = state.console.alerts || [];
    var rules = state.console.rules || [];
    var history = state.console.history || [];
    var indicators = state.console.indicators || [];
    var projections = Array.isArray(viewModel.projections) ? viewModel.projections : [];
    var stateStore = syncStatus.state_store || {};
    var cacheStatus = syncStatus.cache || {};
    var lastOperation = history.length ? history[0] : null;
    var lastSyncOperation = history.find(function (item) {
      return item && item.operation === 'sync';
    }) || null;
    var recentSyncAt = firstPresent([
      syncStatus.synced_at,
      cacheStatus.last_sync,
      stateStore.synced_at,
      lastSyncOperation && (lastSyncOperation.finished_at || lastSyncOperation.created_at)
    ]);
    if (!syncStatus.synced_at && recentSyncAt) {
      syncStatus.synced_at = recentSyncAt;
    }
    var ruleIndex = {};

    rules.forEach(function (item) {
      if (item && item.id) {
        ruleIndex[String(item.id)] = item;
      }
    });

    if (consoleOrigin) {
      consoleOrigin.value = window.APP_CONFIG.apiOrigin || window.location.origin;
    }
    if (consoleApiKey && consoleApiKey.value !== getAdminApiKey()) {
      consoleApiKey.value = getAdminApiKey();
    }
    if (consoleStatus) {
      consoleStatus.className = 'text-sm ' + state.console.statusTone;
      consoleStatus.textContent = state.console.statusMessage;
    }
    if (onboardResult) {
      onboardResult.className = 'text-sm ' + state.console.onboardTone;
      onboardResult.textContent = state.console.onboardMessage;
    }

    if (runtimeGrid) {
      runtimeGrid.innerHTML = [
        { label: '运行状态', value: runtimeState.label, tone: runtimeState.dotClass.indexOf('emerald') >= 0 ? 'text-emerald-600' : runtimeState.dotClass.indexOf('rose') >= 0 ? 'text-rose-600' : 'text-amber-600' },
        { label: '服务名', value: (state.runtimeHealth && state.runtimeHealth.service) || viewModel.meta.runtimeService || 'AI_lab', tone: 'text-slate-900' },
        { label: '数据日期', value: viewModel.meta.dataDate || '--', tone: 'text-slate-900' },
        { label: 'Datasource 数', value: String((state.console.datasources || []).length || 0), tone: 'text-slate-900' }
      ].map(function (item) {
        return '<div class="mobile-section-card"><p class="text-xs font-bold uppercase tracking-wide text-slate-500">' + escapeHtml(item.label) + '</p><p class="text-2xl font-black mt-2 ' + item.tone + '">' + escapeHtml(item.value) + '</p></div>';
      }).join('');
    }

    if (pipelineBody) {
      var operationItems = history.length ? history : activity.map(function (item, index) {
        return {
          id: 'local-' + String(index),
          operation: item.title || 'activity',
          status: item.tone === 'rose' ? 'error' : 'ok',
          summary: item.title || 'activity',
          created_at: item.at,
          finished_at: item.at,
          payload: item.payload || {}
        };
      });
      if (!operationItems.length) {
        pipelineBody.innerHTML = '<div class="text-sm text-slate-500">还没有管理操作记录。执行一次 onboard、sync 或 promote 后会显示结果。</div>';
      } else {
        pipelineBody.innerHTML = operationItems.map(function (item) {
          var tone = item.status === 'error' ? 'rose' : item.operation === 'promote' ? 'amber' : item.operation === 'sync' ? 'blue' : 'emerald';
          var palette = colorClasses(tone);
          var summaryItems = summarizeOperationPayload(item.payload || {});
          var summaryHtml = summaryItems.length ? summaryItems.map(function (entry) {
            return '<span class="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">' + escapeHtml(entry[0]) + ': ' + escapeHtml(String(entry[1])) + '</span>';
          }).join('') : '<span class="text-slate-400">No structured payload summary</span>';
          return [
            '<article class="rounded-xl border border-slate-200 dark:border-slate-700 p-4">',
            '<div class="flex items-center justify-between gap-3">',
            '<span class="px-2 py-1 rounded-full text-xs font-bold ', palette.chip, '">', escapeHtml(item.operation || 'operation'), '</span>',
            '<span class="text-xs text-slate-400">', escapeHtml(formatRelativeTime(item.finished_at || item.created_at)), '</span>',
            '</div>',
            '<p class="mt-3 text-sm font-medium text-slate-900 dark:text-slate-100">', escapeHtml(item.summary || 'No summary'), '</p>',
            '<div class="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">',
            '<span>status: ', escapeHtml(item.status || 'ok'), '</span>',
            '<span>started: ', escapeHtml(formatDate(item.created_at || '--')), '</span>',
            '<span>finished: ', escapeHtml(formatDate(item.finished_at || '--')), '</span>',
            '</div>',
            '<div class="mt-3 flex flex-wrap gap-2 text-xs">', summaryHtml, '</div>',
            '<details class="mt-3 text-xs text-slate-500"><summary class="cursor-pointer font-medium">Payload</summary><pre class="mt-2 whitespace-pre-wrap break-all text-slate-600 dark:text-slate-300">', escapeHtml(JSON.stringify(item.payload || {}, null, 2)), '</pre></details>',
            '</article>'
          ].join('');
        }).join('');
      }
    }

    if (indicatorBox) {
      var indicatorHtml = indicators.length ? indicators.map(function (item) {
        var latest = item.latest_observation || {};
        var latestValue = latest.value == null ? '--' : String(latest.value) + (item.unit ? (' ' + item.unit) : '');
        return [
          '<article class="rounded-xl border border-slate-200 dark:border-slate-700 p-4">',
          '<div class="flex items-start justify-between gap-3">',
          '<div>',
          '<p class="text-sm font-bold">', escapeHtml(item.label || item.indicator_key || '--'), '</p>',
          '<p class="text-xs text-slate-500 mt-1">', escapeHtml(item.indicator_key || '--'), '</p>',
          '</div>',
          '<span class="text-xs font-bold text-slate-400">', escapeHtml(item.frequency || '--'), '</span>',
          '</div>',
          '<div class="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500">',
          '<div><p class="uppercase tracking-wide text-slate-400">Latest value</p><p class="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">', escapeHtml(latestValue), '</p></div>',
          '<div><p class="uppercase tracking-wide text-slate-400">Observed at</p><p class="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">', escapeHtml(formatDate(latest.observed_at || '--')), '</p></div>',
          '<div><p class="uppercase tracking-wide text-slate-400">Observations</p><p class="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">', escapeHtml(String(item.observation_count || 0)), '</p></div>',
          '<div><p class="uppercase tracking-wide text-slate-400">Unit</p><p class="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">', escapeHtml(item.unit || '--'), '</p></div>',
          '</div>',
          '</article>'
        ].join('');
      }).join('') : '<div class="text-sm text-slate-500">No indicators available for the current datasource.</div>';

      var projectionHtml = projections.length ? projections.map(function (item) {
        return [
          '<article class="rounded-xl border border-slate-200 dark:border-slate-700 p-4">',
          '<div class="flex items-start justify-between gap-3">',
          '<div>',
          '<p class="text-sm font-bold">', escapeHtml(item.label || '--'), '</p>',
          '<p class="text-xs text-slate-500 mt-1">method: ', escapeHtml(item.method || '--'), '</p>',
          '</div>',
          '<span class="text-sm font-black text-slate-900 dark:text-slate-100">', escapeHtml(String(item.value == null ? '--' : item.value)), '</span>',
          '</div>',
          '<p class="mt-3 text-xs font-bold ', escapeHtml((item.delta && item.delta.className) || 'text-slate-500'), '">', escapeHtml((item.delta && item.delta.text) || '--'), '</p>',
          '</article>'
        ].join('');
      }).join('') : '<div class="text-sm text-slate-500">No forecast outputs available for the current datasource.</div>';

      indicatorBox.innerHTML = [
        '<div><p class="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Indicators</p>', indicatorHtml, '</div>',
        '<div><p class="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Forecast outputs</p>', projectionHtml, '</div>'
      ].join('');
    }

    if (metaBox) {
      metaBox.innerHTML = [
        ['当前 datasource', state.console.selectedSlug || '--'],
        ['最近同步', syncStatus.synced_at ? formatRelativeTime(syncStatus.synced_at) : '--'],
        ['数据日期', syncStatus.data_date || '--'],
        ['Last sync', cacheStatus.last_sync ? formatRelativeTime(cacheStatus.last_sync) : (stateStore.synced_at ? formatRelativeTime(stateStore.synced_at) : '--')],
        ['Canonical data date', stateStore.data_date || syncStatus.data_date || '--'],
        ['Indicator count', String(stateStore.indicator_count || indicators.length || 0)],
        ['Observation count', String(stateStore.observation_count || 0)],
        ['Cache backend', cacheMeta.backend || 'AI_lab'],
        ['Cache state', cacheStatus.exists ? (cacheStatus.stale ? 'stale' : 'fresh') : 'empty'],
        ['Last operation', lastOperation ? ((lastOperation.operation || 'operation') + ' / ' + (lastOperation.status || 'ok')) : '--'],
        ['Projection state', (syncStatus.promotion && syncStatus.promotion.status) || 'unknown']
      ].map(function (item) {
        return '<div class="flex items-center justify-between gap-3"><span class="text-slate-500">' + escapeHtml(item[0]) + '</span><span class="font-bold text-slate-900 dark:text-slate-100">' + escapeHtml(item[1]) + '</span></div>';
      }).join('');
    }

    if (outputBox) {
      if (!alerts.length) {
        outputBox.innerHTML = '<div class="text-sm text-slate-500">当前 datasource 没有可显示的 alerts。</div>';
      } else {
        outputBox.innerHTML = alerts.map(function (item) {
          var level = item.severity || item.level || 'info';
          var palette = colorClasses(level === 'critical' ? 'rose' : level === 'high' ? 'amber' : level === 'medium' ? 'yellow' : 'blue');
          return [
            '<article class="rounded-xl border border-slate-200 dark:border-slate-700 p-4">',
            '<div class="flex items-start justify-between gap-3">',
            '<div>',
            '<p class="text-sm font-bold">', escapeHtml(item.title || item.datasource || state.console.selectedSlug || 'alert'), '</p>',
            '<p class="text-xs text-slate-500 mt-1">', escapeHtml(item.message || '无说明'), '</p>',
            '</div>',
            '<span class="px-2 py-1 rounded-full text-xs font-bold ', palette.chip, '">', escapeHtml(level), '</span>',
            '</div>',
            '<div class="mt-3 flex items-center justify-between text-xs text-slate-400">',
            '<span>', escapeHtml(item.status || 'new'), '</span>',
            '<span>', escapeHtml(item.created_at || item.report_date || '--'), '</span>',
            '</div>',
            '</article>'
          ].join('');
        }).join('');
      }
    }

    if (outputBox) {
      var ruleGroups = buildRuleGroups(rules);
      var ruleHtml = ruleGroups.length ? ruleGroups.map(function (group) {
        var activeCount = group.items.filter(function (item) {
          return !!item.is_active;
        }).length;
        var severityList = Array.from(new Set(group.items.map(function (item) {
          return item.severity || 'info';
        })));
        return [
          '<article class="rounded-xl border border-slate-200 dark:border-slate-700 p-4">',
          '<div class="flex items-start justify-between gap-3">',
          '<div>',
          '<p class="text-sm font-bold">', escapeHtml(group.name), '</p>',
          '<p class="text-xs text-slate-500 mt-1">', escapeHtml(String(activeCount) + '/' + String(group.items.length) + ' active · ' + severityList.join(', ')), '</p>',
          '</div>',
          '<span class="px-2 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">', escapeHtml(String(group.items.length)), ' rules</span>',
          '</div>',
          '<div class="mt-3 space-y-2">',
          group.items.map(function (item) {
            var palette = colorClasses(item.is_active ? 'emerald' : 'blue');
            return [
              '<div class="rounded-lg border border-slate-100 dark:border-slate-800 px-3 py-2">',
              '<div class="flex items-center justify-between gap-3">',
              '<span class="text-xs font-bold text-slate-700 dark:text-slate-200">', escapeHtml((item.metric || '--') + ' ' + (item.operator || '--') + ' ' + String(item.threshold == null ? '--' : item.threshold)), '</span>',
              '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold ', palette.chip, '">', escapeHtml(item.severity || 'info'), '</span>',
              '</div>',
              '<div class="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-400">',
              '<span>indicator: ', escapeHtml(item.indicator_key || '--'), '</span>',
              '<span>active: ', escapeHtml(String(!!item.is_active)), '</span>',
              '</div>',
              '</div>'
            ].join('');
          }).join(''),
          '</div>',
          '</article>'
        ].join('');
      }).join('') : '<div class="text-sm text-slate-500">No rules available for the current datasource.</div>';

      var alertHtml = alerts.length ? alerts.map(function (item) {
        var level = item.severity || item.level || 'info';
        var palette = colorClasses(level === 'critical' ? 'rose' : level === 'high' ? 'amber' : level === 'medium' ? 'yellow' : 'blue');
        var rule = item.rule_id ? ruleIndex[String(item.rule_id)] : null;
        var ruleContext = rule ? ((rule.metric || '--') + ' ' + (rule.operator || '--') + ' ' + String(rule.threshold == null ? '--' : rule.threshold)) : (item.metric || 'rule unavailable');
        return [
          '<article class="rounded-xl border border-slate-200 dark:border-slate-700 p-4">',
          '<div class="flex items-start justify-between gap-3">',
          '<div>',
          '<p class="text-sm font-bold">', escapeHtml(item.series_name || item.datasource || state.console.selectedSlug || 'alert'), '</p>',
          '<p class="text-xs text-slate-500 mt-1">', escapeHtml(item.content || 'No detail'), '</p>',
          '</div>',
          '<span class="px-2 py-1 rounded-full text-xs font-bold ', palette.chip, '">', escapeHtml(level), '</span>',
          '</div>',
          '<div class="mt-3 grid grid-cols-1 gap-1 text-xs text-slate-400">',
          '<span>rule: ', escapeHtml(ruleContext), '</span>',
          '<span>indicator: ', escapeHtml(item.indicator_key || '--'), '</span>',
          '<span>status: ', escapeHtml(item.status || 'new'), ' | triggered: ', escapeHtml(item.triggered_value == null ? '--' : item.triggered_value), '</span>',
          '<span>created: ', escapeHtml(formatDate(item.created_at || item.report_date || '--')), '</span>',
          '</div>',
          '</article>'
        ].join('');
      }).join('') : '<div class="text-sm text-slate-500">No alerts available for the current datasource.</div>';

      outputBox.innerHTML = [
        '<div class="space-y-4">',
        '<div><p class="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Rules</p>', ruleHtml, '</div>',
        '<div><p class="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Alerts</p>', alertHtml, '</div>',
        '</div>'
      ].join('');
    }

    renderConsoleDatasourceList();
  }

  function showPages(path) {
    document.querySelectorAll('.page-section').forEach(function (section) {
      section.classList.add('hidden');
    });
    var pageId = routes[path];
    var target = document.getElementById(pageId);
    if (target) {
      target.classList.remove('hidden');
    }
  }

  async function router() {
    var route = parseHashRoute();
    var path = route.path;
    var params = route.params;
    var isLoggedIn = sessionStorage.getItem('loggedIn');

    if (!isLoggedIn && path !== '/login') {
      sessionStorage.setItem('loggedIn', 'trial');
      isLoggedIn = 'trial';
    }

    if (!isLoggedIn && !publicRoutes.includes(path)) {
      navigate('/login');
      return;
    }
    if (isLoggedIn && path === '/login') {
      navigate('/dashboard', new URLSearchParams({ source: state.source }));
      return;
    }
    if (!routes[path]) {
      navigate('/dashboard', new URLSearchParams({ source: state.source }));
      return;
    }

    getDatasourceSource(params);
    applyChrome(path);
    showPages(path);
    updateSidebarActive(path);
    updateMobileNavigation(path);
    updateTopbarUser();
    updateTopbarRuntime();

    if (liveRoutes.indexOf(path) >= 0) {
      await ensureDashboardData(false);
      if (path === '/ai-lab-status') {
        await loadConsoleData(false);
      }
    }
  }

  function initEvents() {
    document.addEventListener('click', function (event) {
      var actionEl = event.target.closest('[data-action]');
      if (actionEl) {
        var action = actionEl.getAttribute('data-action');
        switch (action) {
          case 'login':
            sessionStorage.setItem('loggedIn', 'true');
            navigate('/dashboard', new URLSearchParams({ source: state.source }));
            return;
          case 'logout':
            sessionStorage.removeItem('loggedIn');
            navigate('/login');
            return;
          case 'export':
          case 'download':
            showReportModal();
            return;
          case 'close-modal':
            hideReportModal();
            return;
          case 'download-report':
            downloadReport();
            return;
          case 'toggle-dark':
            document.documentElement.classList.toggle('dark');
            return;
          case 'ai-lab-save-api-key':
            var apiKeyInput = document.getElementById('ai-lab-console-api-key');
            window.AI4HApi.setApiKey(apiKeyInput ? apiKeyInput.value : '');
            setConsoleStatus('API Key 已保存到当前会话。', 'text-emerald-600');
            renderAiLabStatusPage(state.dashboard || window.AI4HApi.buildMockViewModel(MOCK));
            return;
          case 'ai-lab-refresh-console':
            loadConsoleData(true).catch(function (error) {
              setConsoleStatus(error && error.message ? error.message : '刷新 AI_lab Console 失败。', 'text-rose-600');
              renderAiLabStatusPage(state.dashboard || window.AI4HApi.buildMockViewModel(MOCK));
            });
            return;
          case 'ai-lab-onboard-submit':
            submitOnboardDatasource().catch(function (error) {
              setOnboardStatus(error && error.message ? error.message : '注册 datasource 失败。', 'text-rose-600');
              renderAiLabStatusPage(state.dashboard || window.AI4HApi.buildMockViewModel(MOCK));
            });
            return;
          case 'ai-lab-select-datasource':
            selectConsoleDatasource(actionEl.getAttribute('data-slug'));
            return;
          case 'ai-lab-sync-datasource':
            state.console.selectedSlug = actionEl.getAttribute('data-slug') || state.console.selectedSlug;
            runDatasourceCommand('sync').catch(function (error) {
              setConsoleStatus(error && error.message ? error.message : 'sync 失败。', 'text-rose-600');
              renderAiLabStatusPage(state.dashboard || window.AI4HApi.buildMockViewModel(MOCK));
            });
            return;
          case 'ai-lab-promote-datasource':
            state.console.selectedSlug = actionEl.getAttribute('data-slug') || state.console.selectedSlug;
            runDatasourceCommand('promote').catch(function (error) {
              setConsoleStatus(error && error.message ? error.message : 'promote 失败。', 'text-rose-600');
              renderAiLabStatusPage(state.dashboard || window.AI4HApi.buildMockViewModel(MOCK));
            });
            return;
          default:
            showToast(action + ' - 功能演示');
            return;
        }
      }

      var navLink = event.target.closest('[data-nav-link]');
      if (navLink) {
        event.preventDefault();
        navigate(navLink.getAttribute('data-nav-link'), new URLSearchParams({ source: state.source }));
        return;
      }

      var mobileNav = event.target.closest('[data-mobile-nav]');
      if (mobileNav) {
        event.preventDefault();
        navigate(mobileNav.getAttribute('data-mobile-nav'), new URLSearchParams({ source: state.source }));
        return;
      }

      var rowLink = event.target.closest('[data-row-link]');
      if (rowLink) {
        navigate(rowLink.getAttribute('data-row-link'), new URLSearchParams({ source: state.source }));
        return;
      }

      var breadcrumb = event.target.closest('[data-breadcrumb]');
      if (breadcrumb) {
        event.preventDefault();
        navigate(breadcrumb.getAttribute('data-breadcrumb'), new URLSearchParams({ source: state.source }));
        return;
      }

      var filterButton = event.target.closest('[data-filter-btn]');
      if (filterButton) {
        var parent = filterButton.parentElement;
        if (parent) {
          parent.querySelectorAll('[data-filter-btn]').forEach(function (button) {
            button.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400';
          });
          filterButton.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white';
        }
        return;
      }

      var pageButton = event.target.closest('[data-page-btn]');
      if (pageButton) {
        var container = pageButton.parentElement;
        if (container) {
          container.querySelectorAll('[data-page-btn]').forEach(function (button) {
            button.className = 'size-7 flex items-center justify-center rounded border border-slate-200 bg-white dark:bg-slate-800 text-slate-600 text-xs';
          });
          pageButton.className = 'size-7 flex items-center justify-center rounded border border-primary bg-primary text-white text-xs font-bold';
        }
        return;
      }

      if (event.target.id === 'report-modal') {
        hideReportModal();
      }
    });
  }

  function init() {
    ensureEnhancementStyles();
    ensureMobileNavigation();
    initEvents();
    window.addEventListener('hashchange', router);
    router();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
