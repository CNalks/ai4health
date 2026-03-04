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
    } else {
      if (topbar) topbar.classList.remove('hidden');
      if (sidebar) sidebar.classList.remove('hidden');
      if (mainContent) mainContent.className = 'flex-1 overflow-y-auto';
    }

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
    router();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
