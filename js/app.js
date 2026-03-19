// 传染病智能预警平台 - 应用逻辑
(function () {
  'use strict';

  const routes = {
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
    '/event-center': 'page-event-center',
    '/system-admin': 'page-system-admin'
  };

  const publicRoutes = ['/login'];
  const APP_CONFIG = window.APP_CONFIG || {};
  const TRIAL_API_BASE = (APP_CONFIG.ridsApiBaseUrl || '').replace(/\/$/, '');
  const TRIAL_STATE = {
    loading: false,
    loaded: false,
    data: null,
    error: null
  };
  const UI_STATE = {
    sidebarOpen: false
  };

  function isDesktopLayout() {
    return window.innerWidth >= 1024;
  }

  function setSidebarOpen(nextOpen) {
    UI_STATE.sidebarOpen = !!nextOpen;
    applySidebarState();
  }

  function applySidebarState() {
    var sidebar = document.getElementById('app-sidebar');
    var backdrop = document.getElementById('sidebar-backdrop');

    if (!sidebar) return;

    if (sidebar.classList.contains('hidden')) {
      sidebar.classList.remove('translate-x-0');
      sidebar.classList.add('-translate-x-full');
      sidebar.classList.add('pointer-events-none');
      sidebar.classList.remove('pointer-events-auto');
      if (backdrop) backdrop.classList.add('hidden');
      document.body.classList.remove('mobile-drawer-open');
      return;
    }

    if (isDesktopLayout()) {
      sidebar.classList.remove('-translate-x-full');
      sidebar.classList.add('translate-x-0');
      sidebar.classList.remove('pointer-events-none');
      sidebar.classList.add('pointer-events-auto');
      if (backdrop) backdrop.classList.add('hidden');
      document.body.classList.remove('mobile-drawer-open');
      return;
    }

    if (UI_STATE.sidebarOpen) {
      sidebar.classList.remove('-translate-x-full');
      sidebar.classList.add('translate-x-0');
      sidebar.classList.remove('pointer-events-none');
      sidebar.classList.add('pointer-events-auto');
      if (backdrop) backdrop.classList.remove('hidden');
      document.body.classList.add('mobile-drawer-open');
    } else {
      sidebar.classList.remove('translate-x-0');
      sidebar.classList.add('-translate-x-full');
      sidebar.classList.add('pointer-events-none');
      sidebar.classList.remove('pointer-events-auto');
      if (backdrop) backdrop.classList.add('hidden');
      document.body.classList.remove('mobile-drawer-open');
    }
  }

  function navigate(hash) {
    window.location.hash = hash;
  }

  function router() {
    const hash = window.location.hash.slice(1) || '/login';
    const isLoggedIn = sessionStorage.getItem('loggedIn');

    if (!isLoggedIn && !publicRoutes.includes(hash)) {
      navigate('#/login');
      return;
    }
    if (isLoggedIn && hash === '/login') {
      navigate('#/dashboard');
      return;
    }

    const pageId = routes[hash];
    if (!pageId) {
      navigate('#/dashboard');
      return;
    }

    // Hide all pages
    document.querySelectorAll('.page-section').forEach(function (s) {
      s.classList.add('hidden');
    });

    // Show target page
    var target = document.getElementById(pageId);
    if (target) target.classList.remove('hidden');

    // Toggle chrome
    var topbar = document.getElementById('app-topbar');
    var sidebar = document.getElementById('app-sidebar');
    var mainContent = document.getElementById('main-content');
    if (hash === '/login') {
      if (topbar) topbar.classList.add('hidden');
      if (sidebar) sidebar.classList.add('hidden');
      if (mainContent) mainContent.className = 'flex-1';
      UI_STATE.sidebarOpen = false;
    } else {
      if (topbar) topbar.classList.remove('hidden');
      if (sidebar) sidebar.classList.remove('hidden');
      if (mainContent) mainContent.className = 'flex-1 overflow-y-auto';
      UI_STATE.sidebarOpen = false;
    }
    applySidebarState();

    // Update sidebar active
    document.querySelectorAll('[data-nav-link]').forEach(function (link) {
      var linkHash = link.getAttribute('data-nav-link');
      if (linkHash === hash) {
        link.className = 'flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary font-semibold text-sm cursor-pointer';
      } else {
        link.className = 'flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm cursor-pointer';
      }
    });

    // Update topbar user info
    var userNameEl = document.getElementById('topbar-username');
    if (userNameEl && typeof MOCK !== 'undefined') {
      userNameEl.textContent = MOCK.currentUser.name;
    }
    var userAvatarEl = document.getElementById('topbar-avatar');
    if (userAvatarEl && typeof MOCK !== 'undefined') {
      userAvatarEl.textContent = MOCK.currentUser.avatar;
    }

    if (hash !== '/login') {
      if (TRIAL_STATE.loaded && TRIAL_STATE.data) {
        renderTrialDashboard(TRIAL_STATE.data);
      } else if (!TRIAL_STATE.loading) {
        loadTrialDashboard();
      }
    }
  }

  // Login
  function handleLogin(e) {
    e.preventDefault();
    sessionStorage.setItem('loggedIn', 'true');
    navigate('#/dashboard');
  }

  // Logout
  function handleLogout() {
    sessionStorage.removeItem('loggedIn');
    navigate('#/login');
  }

  // Toast notification
  function showToast(message) {
    var toast = document.createElement('div');
    toast.className = 'fixed bottom-6 right-6 bg-primary text-white px-6 py-3 rounded-lg shadow-lg z-[9999] text-sm font-medium animate-fade-in';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(function () { toast.remove(); }, 300);
    }, 2500);
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = value == null || value === '' ? '--' : String(value);
  }

  function toNumber(value) {
    var num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  function formatSignedPercent(value, digits) {
    if (value == null || value === '') return '--';
    var num = toNumber(value);
    var fixed = num.toFixed(digits == null ? 1 : digits);
    return (num > 0 ? '+' : '') + fixed + '%';
  }

  function formatPercent(value, digits) {
    if (value == null || value === '') return '--';
    return toNumber(value).toFixed(digits == null ? 2 : digits) + '%';
  }

  function formatDate(value) {
    if (!value) return '--';
    return String(value).slice(0, 10);
  }

  function formatProjection(value) {
    if (value == null || value === '') return '--';
    var num = toNumber(value);
    return Number.isInteger(num) ? String(num) : String(Number(num.toFixed(1)));
  }

  function getAlertTone(level) {
    switch (level) {
      case 'critical':
        return {
          pill: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
          label: '严重'
        };
      case 'high':
        return {
          pill: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
          label: '高风险'
        };
      case 'medium':
        return {
          pill: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
          label: '中等'
        };
      default:
        return {
          pill: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
          label: '提示'
        };
    }
  }

  function renderWarningRows(alerts) {
    var body = document.getElementById('warning-table-body');
    var mobileList = document.getElementById('warning-mobile-list');
    if (!body) return;

    if (!alerts || !alerts.length) {
      body.innerHTML = '<tr><td colspan="6" class="px-5 py-6 text-center text-sm text-slate-500">暂无试运行预警数据</td></tr>';
      if (mobileList) {
        mobileList.innerHTML = '<div class="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">暂无试运行预警数据</div>';
      }
      return;
    }

    var rowsHtml = alerts.map(function (alert) {
      var tone = getAlertTone(alert.level);
      var source = alert.source || 'RIDs';
      var title = alert.title || alert.message || '未命名预警';
      return [
        '<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">',
        '<td class="px-5 py-3 font-mono text-xs">', alert.id || '--', '</td>',
        '<td class="px-5 py-3"><span class="', tone.pill, ' px-2 py-0.5 rounded-full text-xs font-bold">', tone.label, '</span></td>',
        '<td class="px-5 py-3">', title, '</td>',
        '<td class="px-5 py-3">', source, '</td>',
        '<td class="px-5 py-3"><span class="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-full text-xs font-bold">试运行</span></td>',
        '<td class="px-5 py-3 text-xs text-slate-500">', formatDate(alert.report_date), '</td>',
        '</tr>'
      ].join('');
    }).join('');

    body.innerHTML = rowsHtml;

    if (mobileList) {
      mobileList.innerHTML = alerts.map(function (alert) {
        var tone = getAlertTone(alert.level);
        var source = alert.source || 'RIDs';
        var title = alert.title || alert.message || '未命名预警';
        return [
          '<article class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">',
          '<div class="flex items-start justify-between gap-3">',
          '<div class="min-w-0">',
          '<p class="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">', alert.id || '--', '</p>',
          '<h3 class="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">', title, '</h3>',
          '</div>',
          '<span class="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ', tone.pill, '">', tone.label, '</span>',
          '</div>',
          '<div class="mt-3 grid grid-cols-2 gap-3 text-xs">',
          '<div><p class="text-slate-400">来源</p><p class="mt-1 font-medium text-slate-700 dark:text-slate-200">', source, '</p></div>',
          '<div><p class="text-slate-400">日期</p><p class="mt-1 font-medium text-slate-700 dark:text-slate-200">', formatDate(alert.report_date), '</p></div>',
          '</div>',
          '<p class="mt-3 text-xs leading-6 text-slate-600 dark:text-slate-300">', alert.message || '试运行阶段已捕获该预警，请结合桌面端继续跟踪。', '</p>',
          '</article>'
        ].join('');
      }).join('');
    }
  }

  function renderTrialError(message) {
    var note = message || 'RIDs 试运行数据暂时不可用';
    var statusEl = document.getElementById('trial-connection-status');
    var banner = document.getElementById('trial-connection-banner');

    if (banner) {
      banner.className = 'rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-slate-700 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-slate-200';
    }
    if (statusEl) {
      statusEl.className = 'rounded-full bg-white px-3 py-1 text-rose-600 shadow-sm dark:bg-slate-900 dark:text-rose-300';
      statusEl.textContent = '连接失败';
    }

    setText('trial-note', note);
    setText('trial-data-date', '--');
    setText('warning-data-date', '--');
    setText('trend-trial-note', note);
    renderWarningRows([]);
  }

  function renderTrialDashboard(data) {
    var overview = data && data.overview ? data.overview : {};
    var alerts = data && Array.isArray(data.alerts) ? data.alerts : [];
    var projections = data && data.projections ? data.projections : {};
    var statusEl = document.getElementById('trial-connection-status');
    var banner = document.getElementById('trial-connection-banner');
    var ring = document.getElementById('dashboard-risk-ring');
    var riskLevel = document.getElementById('dashboard-risk-level');
    var criticalCount = alerts.filter(function (item) { return item.level === 'critical'; }).length;
    var highCount = alerts.filter(function (item) { return item.level === 'high'; }).length;
    var riskScore = Math.max(0, Math.min(100, Math.round(toNumber(overview.risk_score))));
    var riskStroke = '#f59e0b';
    var riskTextClass = 'text-xs font-bold text-amber-500';

    if (riskScore >= 75) {
      riskStroke = '#ef4444';
      riskTextClass = 'text-xs font-bold text-rose-500';
    } else if (riskScore < 55) {
      riskStroke = '#3b82f6';
      riskTextClass = 'text-xs font-bold text-blue-500';
    }

    if (banner) {
      banner.className = 'rounded-xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-slate-700 shadow-sm dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-slate-200';
    }
    if (statusEl) {
      statusEl.className = 'rounded-full bg-white px-3 py-1 text-emerald-600 shadow-sm dark:bg-slate-900 dark:text-emerald-300';
      statusEl.textContent = '已连接';
    }

    setText(
      'trial-note',
      ((data.source_label || 'RIDs') + ' x AI_lab 试运行已接通')
    );
    setText('trial-data-date', formatDate(overview.data_date));
    setText('dashboard-kpi-flu-growth', formatSignedPercent(overview.flu_growth_rate, 1));
    setText('dashboard-kpi-flu-count', overview.flu_count);
    setText('dashboard-kpi-fever-growth', formatSignedPercent(overview.fever_growth_rate, 1));
    setText('dashboard-kpi-fever-visits', overview.total_visits);
    setText('dashboard-kpi-ili-change', formatSignedPercent(overview.ili_percent_change, 2));
    setText('dashboard-kpi-ili-percent', formatPercent(overview.ili_percent, 2));
    setText('dashboard-kpi-outbreaks', overview.total_outbreaks);
    setText('dashboard-risk-score', riskScore);
    setText('dashboard-risk-level', overview.risk_level || '待计算');
    setText('warning-total-alerts', alerts.length);
    setText('warning-critical-alerts', criticalCount);
    setText('warning-high-alerts', highCount);
    setText('warning-data-date', formatDate(overview.data_date));
    setText('trend-trial-note', data.trial_note || '试运行说明暂不可用');
    setText('trend-card-1-label', (projections.flu && projections.flu.label) || '流感报告人数预测');
    setText('trend-card-1-value', formatProjection(projections.flu && projections.flu.projected_next));
    setText('trend-card-1-meta', '较当前 ' + formatSignedPercent(projections.flu && projections.flu.change_percent, 1));
    setText('trend-card-2-label', (projections.fever && projections.fever.label) || '发热门诊就诊量预测');
    setText('trend-card-2-value', formatProjection(projections.fever && projections.fever.projected_next));
    setText('trend-card-2-meta', '较当前 ' + formatSignedPercent(projections.fever && projections.fever.change_percent, 1));
    setText('trend-card-3-label', (projections.outbreaks && projections.outbreaks.label) || '学校疫情起数预测');
    setText('trend-card-3-value', formatProjection(projections.outbreaks && projections.outbreaks.projected_next));
    setText('trend-card-3-meta', '较当前 ' + formatSignedPercent(projections.outbreaks && projections.outbreaks.change_percent, 1));

    if (ring) {
      ring.setAttribute('stroke', riskStroke);
      ring.setAttribute('stroke-dasharray', riskScore + ', 100');
    }
    if (riskLevel) {
      riskLevel.className = riskTextClass;
    }

    renderWarningRows(alerts);
  }

  function loadTrialDashboard() {
    if (!TRIAL_API_BASE) {
      TRIAL_STATE.error = new Error('Missing ai4health RIDs API base URL');
      renderTrialError('未配置 RIDs API 地址');
      return;
    }

    TRIAL_STATE.loading = true;
    fetch(TRIAL_API_BASE + '/dashboard?limit=8')
      .then(function (response) {
        if (!response.ok) {
          throw new Error('RIDs API returned ' + response.status);
        }
        return response.json();
      })
      .then(function (data) {
        TRIAL_STATE.loaded = true;
        TRIAL_STATE.data = data;
        TRIAL_STATE.error = null;
        renderTrialDashboard(data);
      })
      .catch(function (error) {
        TRIAL_STATE.error = error;
        renderTrialError(error && error.message ? error.message : 'RIDs 数据读取失败');
      })
      .finally(function () {
        TRIAL_STATE.loading = false;
      });
  }

  // Report modal
  function showReportModal() {
    var modal = document.getElementById('report-modal');
    if (!modal) return;
    // Populate report content
    var contentEl = document.getElementById('report-modal-content');
    if (contentEl && typeof MOCK !== 'undefined') {
      var r = MOCK.sampleReport;
      var html = '<div class="space-y-6 text-sm text-slate-700 dark:text-slate-300">';
      html += '<div class="text-center border-b pb-4 border-slate-200 dark:border-slate-700">';
      html += '<h2 class="text-xl font-bold text-primary dark:text-slate-100">' + r.title + '</h2>';
      html += '<p class="text-slate-500 mt-1">' + r.subtitle + '</p>';
      html += '<p class="text-xs text-slate-400 mt-1">报告编号: ' + r.reportId + ' | 生成日期: ' + r.date + '</p>';
      html += '</div>';
      r.sections.forEach(function (s) {
        html += '<div>';
        html += '<h3 class="font-bold text-primary dark:text-slate-100 mb-2">' + s.title + '</h3>';
        html += '<p class="whitespace-pre-line leading-relaxed">' + s.content + '</p>';
        html += '</div>';
      });
      html += '<div>';
      html += '<h3 class="font-bold text-primary dark:text-slate-100 mb-2">四、各街道发病情况</h3>';
      html += '<table class="w-full text-xs border-collapse border border-slate-200 dark:border-slate-700">';
      html += '<thead><tr class="bg-slate-100 dark:bg-slate-800">';
      html += '<th class="border border-slate-200 dark:border-slate-700 px-3 py-2">街道</th>';
      html += '<th class="border border-slate-200 dark:border-slate-700 px-3 py-2">发病率</th>';
      html += '<th class="border border-slate-200 dark:border-slate-700 px-3 py-2">状态</th>';
      html += '<th class="border border-slate-200 dark:border-slate-700 px-3 py-2">趋势</th>';
      html += '</tr></thead><tbody>';
      r.tableData.forEach(function (row) {
        html += '<tr><td class="border border-slate-200 dark:border-slate-700 px-3 py-2">' + row.grid + '</td>';
        html += '<td class="border border-slate-200 dark:border-slate-700 px-3 py-2">' + row.rate + '</td>';
        html += '<td class="border border-slate-200 dark:border-slate-700 px-3 py-2">' + row.status + '</td>';
        html += '<td class="border border-slate-200 dark:border-slate-700 px-3 py-2">' + row.trend + '</td></tr>';
      });
      html += '</tbody></table>';
      html += '</div>';
      html += '</div>';
      contentEl.innerHTML = html;
    }
    modal.classList.remove('hidden');
  }

  function hideReportModal() {
    var modal = document.getElementById('report-modal');
    if (modal) modal.classList.add('hidden');
  }

  function downloadReport() {
    if (typeof MOCK === 'undefined') return;
    var r = MOCK.sampleReport;
    var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + r.title + '</title>';
    html += '<style>body{font-family:sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#333}';
    html += 'h1{color:#1a355b;text-align:center}h2{color:#1a355b;margin-top:24px}';
    html += 'table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #ddd;padding:8px;text-align:left}';
    html += 'th{background:#f6f7f8}.subtitle{text-align:center;color:#666;margin-top:4px}</style></head><body>';
    html += '<h1>' + r.title + '</h1><p class="subtitle">' + r.subtitle + '</p>';
    html += '<p style="text-align:center;color:#999;font-size:12px">报告编号: ' + r.reportId + ' | 日期: ' + r.date + '</p>';
    r.sections.forEach(function (s) {
      html += '<h2>' + s.title + '</h2><p>' + s.content.replace(/\n/g, '<br>') + '</p>';
    });
    html += '<h2>四、各街道发病情况</h2><table><tr><th>街道</th><th>发病率</th><th>状态</th><th>趋势</th></tr>';
    r.tableData.forEach(function (row) {
      html += '<tr><td>' + row.grid + '</td><td>' + row.rate + '</td><td>' + row.status + '</td><td>' + row.trend + '</td></tr>';
    });
    html += '</table></body></html>';
    var blob = new Blob([html], { type: 'text/html' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = r.title + '.html';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('报告已下载');
  }

  // Event delegation
  function initEvents() {
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-action]');
      if (!el) {
        // nav links
        var navLink = e.target.closest('[data-nav-link]');
        if (navLink) {
          e.preventDefault();
          setSidebarOpen(false);
          navigate('#' + navLink.getAttribute('data-nav-link'));
          return;
        }
        // row links
        var rowLink = e.target.closest('[data-row-link]');
        if (rowLink) {
          navigate('#' + rowLink.getAttribute('data-row-link'));
          return;
        }
        // breadcrumb
        var bc = e.target.closest('[data-breadcrumb]');
        if (bc) {
          e.preventDefault();
          navigate('#' + bc.getAttribute('data-breadcrumb'));
          return;
        }
        // filter buttons
        var fb = e.target.closest('[data-filter-btn]');
        if (fb) {
          var parent = fb.parentElement;
          if (parent) {
            parent.querySelectorAll('[data-filter-btn]').forEach(function (b) {
              b.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800';
            });
            fb.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white';
          }
          return;
        }
        // page buttons
        var pb = e.target.closest('[data-page-btn]');
        if (pb) {
          var pg = pb.parentElement;
          if (pg) {
            pg.querySelectorAll('[data-page-btn]').forEach(function (b) {
              b.className = 'size-7 flex items-center justify-center rounded border border-slate-200 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs hover:bg-slate-50';
            });
            pb.className = 'size-7 flex items-center justify-center rounded border border-primary bg-primary text-white text-xs font-bold';
          }
          return;
        }
        // close modal on backdrop click
        if (e.target.id === 'report-modal') {
          hideReportModal();
        }
        if (e.target.id === 'sidebar-backdrop') {
          setSidebarOpen(false);
        }
        return;
      }

      var action = el.getAttribute('data-action');
      switch (action) {
        case 'login':
          handleLogin(e);
          break;
        case 'logout':
          handleLogout();
          break;
        case 'open-sidebar':
          setSidebarOpen(true);
          break;
        case 'close-sidebar':
          setSidebarOpen(false);
          break;
        case 'export':
        case 'download':
          showReportModal();
          break;
        case 'close-modal':
          hideReportModal();
          break;
        case 'download-report':
          downloadReport();
          break;
        case 'toggle-dark':
          document.documentElement.classList.toggle('dark');
          break;
        default:
          showToast(action + ' - 功能演示');
      }
    });
  }

  // Init
  function init() {
    initEvents();
    window.addEventListener('hashchange', router);
    window.addEventListener('resize', applySidebarState);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
      }
    });
    router();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
