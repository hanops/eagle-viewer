'use strict';

function isStandaloneDisplay() {
  return !!(window.navigator.standalone || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches));
}

function isIosLikeDevice() {
  var ua = window.navigator.userAgent || '';
  var platform = window.navigator.platform || '';
  return /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
}

function shouldShowInstallCoach() {
  if (window.innerWidth > 768) return false;
  if (!isIosLikeDevice()) return false;
  if (isStandaloneDisplay()) return false;
  var dismissedUntil = Number(localStorage.getItem('eagle-viewer-install-coach-dismissed-until') || 0);
  return !dismissedUntil || dismissedUntil < Date.now();
}

function hideInstallCoach() {
  var coach = document.getElementById('installCoach');
  if (!coach) return;
  coach.hidden = true;
  document.body.classList.remove('install-coach-visible');
}

function showInstallCoach() {
  var coach = document.getElementById('installCoach');
  if (!coach) return;
  coach.hidden = false;
  document.body.classList.add('install-coach-visible');
}

function refreshInstallCoach() {
  var standalone = isStandaloneDisplay();
  document.body.classList.toggle('app-standalone', standalone);
  document.body.classList.toggle('ios-browser', isIosLikeDevice() && !standalone);
  if (shouldShowInstallCoach()) showInstallCoach();
  else hideInstallCoach();
}

function setupInstallCoach() {
  var coach = document.getElementById('installCoach');
  if (!coach || coach._bound) return;
  coach._bound = true;
  refreshInstallCoach();

  var close = document.getElementById('installCoachClose');
  if (close) {
    close.onclick = function() {
      var sevenDays = 7 * 24 * 60 * 60 * 1000;
      localStorage.setItem('eagle-viewer-install-coach-dismissed-until', String(Date.now() + sevenDays));
      hideInstallCoach();
    };
  }

  window.addEventListener('resize', refreshInstallCoach);
  if (window.matchMedia) {
    var standaloneQuery = window.matchMedia('(display-mode: standalone)');
    if (standaloneQuery.addEventListener) standaloneQuery.addEventListener('change', refreshInstallCoach);
    else if (standaloneQuery.addListener) standaloneQuery.addListener(refreshInstallCoach);
  }
}

function setupMobilePullRefresh() {
  var body = document.getElementById('contentBody');
  if (!body || body._pullRefreshBound) return;
  body._pullRefreshBound = true;
  var indicator = document.createElement('div');
  indicator.className = 'pull-refresh';
  indicator.innerHTML = '<span></span><strong>下拉刷新</strong>';
  document.body.appendChild(indicator);

  var startY = 0;
  var pullDistance = 0;
  var pulling = false;
  var armed = false;
  var threshold = 76;

  function isEnabledTarget(target) {
    if (window.innerWidth > 768) return false;
    if (state.reloadInFlight) return false;
    if (!body.contains(target)) return false;
    if (target.closest('button, a, input, textarea, select, summary, .inspector, .utility-panel, .preview-overlay')) return false;
    return body.scrollTop <= 0;
  }

  function setIndicator(distance, ready, refreshing) {
    indicator.classList.toggle('visible', distance > 8 || refreshing);
    indicator.classList.toggle('ready', !!ready);
    indicator.classList.toggle('refreshing', !!refreshing);
    indicator.style.transform = 'translate3d(-50%,' + Math.min(42, Math.round(distance * 0.48)) + 'px,0)';
    indicator.querySelector('strong').textContent = refreshing ? '正在刷新' : (ready ? '松开刷新' : '下拉刷新');
  }

  function resetIndicator() {
    pullDistance = 0;
    pulling = false;
    armed = false;
    setIndicator(0, false, false);
  }

  body.addEventListener('touchstart', function(e) {
    if (e.touches.length !== 1 || !isEnabledTarget(e.target)) return;
    startY = e.touches[0].clientY;
    pullDistance = 0;
    pulling = true;
    armed = false;
  }, { passive: true });

  body.addEventListener('touchmove', function(e) {
    if (!pulling || e.touches.length !== 1) return;
    var dy = e.touches[0].clientY - startY;
    if (dy <= 0) {
      resetIndicator();
      return;
    }
    pullDistance = Math.min(128, dy);
    armed = pullDistance >= threshold;
    setIndicator(pullDistance, armed, false);
    if (pullDistance > 12) e.preventDefault();
  }, { passive: false });

  body.addEventListener('touchend', async function() {
    if (!pulling) return;
    if (!armed) {
      resetIndicator();
      return;
    }
    pulling = false;
    setIndicator(threshold, true, true);
    try {
      await api.reloadLibrary();
    } finally {
      setTimeout(resetIndicator, 260);
    }
  }, { passive: true });

  body.addEventListener('touchcancel', resetIndicator, { passive: true });

  body.addEventListener('pointerdown', function(e) {
    if (e.pointerType === 'touch' || e.button !== 0 || !isEnabledTarget(e.target)) return;
    startY = e.clientY;
    pullDistance = 0;
    pulling = true;
    armed = false;
    try { body.setPointerCapture(e.pointerId); } catch (err) {}
  });

  body.addEventListener('pointermove', function(e) {
    if (!pulling || e.pointerType === 'touch') return;
    var dy = e.clientY - startY;
    if (dy <= 0) {
      resetIndicator();
      return;
    }
    pullDistance = Math.min(128, dy);
    armed = pullDistance >= threshold;
    setIndicator(pullDistance, armed, false);
    if (pullDistance > 12) e.preventDefault();
  });

  body.addEventListener('pointerup', async function(e) {
    if (!pulling || e.pointerType === 'touch') return;
    if (!armed) {
      resetIndicator();
      return;
    }
    pulling = false;
    setIndicator(threshold, true, true);
    try {
      await api.reloadLibrary();
    } finally {
      setTimeout(resetIndicator, 260);
    }
  });

  body.addEventListener('pointercancel', resetIndicator);
}
