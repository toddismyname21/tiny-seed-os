/**
 * Tiny Seed Farm - PWA Install Prompt Handler
 * Handles the beforeinstallprompt event and provides a custom install UI
 * Optimized for mobile farm workers with large touch targets
 */

(function() {
  'use strict';

  // Store the install prompt event
  let deferredPrompt = null;
  let installBannerShown = false;

  // Configuration
  const CONFIG = {
    // Delay before showing install prompt (ms)
    promptDelay: 20000, // 20 seconds
    // Minimum page views before prompting
    minPageViews: 2,
    // Storage keys
    storageKeys: {
      dismissed: 'tinyseed_install_dismissed',
      installed: 'tinyseed_pwa_installed',
      pageViews: 'tinyseed_page_views',
      lastPrompt: 'tinyseed_last_prompt'
    },
    // Don't prompt again for this many days after dismissal
    dismissalCooldownDays: 7,
    // App name
    appName: 'Tiny Seed Farm'
  };

  /**
   * Initialize the install prompt handler
   */
  function init() {
    // Track page view
    trackPageView();

    // Check if already installed
    if (isPWAInstalled()) {
      console.log('[InstallPrompt] PWA already installed');
      return;
    }

    // Listen for beforeinstallprompt
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful installation
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if we should show install button based on conditions
    if (shouldShowPrompt()) {
      setTimeout(() => {
        showInstallBanner();
      }, CONFIG.promptDelay);
    }

    // Listen for standalone mode changes
    if (window.matchMedia) {
      window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
        if (e.matches) {
          handleAppInstalled();
        }
      });
    }
  }

  /**
   * Handle the beforeinstallprompt event
   */
  function handleBeforeInstallPrompt(e) {
    console.log('[InstallPrompt] beforeinstallprompt fired');

    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();

    // Store the event for later use
    deferredPrompt = e;

    // Show install banner if conditions are met
    if (shouldShowPrompt()) {
      showInstallBanner();
    }
  }

  /**
   * Handle successful installation
   */
  function handleAppInstalled() {
    console.log('[InstallPrompt] App was installed');

    // Mark as installed
    localStorage.setItem(CONFIG.storageKeys.installed, 'true');
    localStorage.setItem('tinyseed_install_date', new Date().toISOString());

    // Clear the deferred prompt
    deferredPrompt = null;

    // Hide install UI
    hideInstallBanner();

    // Show success message
    showInstallSuccess();

    // Track analytics
    trackInstall();
  }

  /**
   * Check if the PWA is already installed
   */
  function isPWAInstalled() {
    // Check localStorage flag
    if (localStorage.getItem(CONFIG.storageKeys.installed) === 'true') {
      return true;
    }

    // Check if running as standalone
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }

    // iOS check
    if (window.navigator.standalone === true) {
      return true;
    }

    // Check for Android TWA
    if (document.referrer.includes('android-app://')) {
      return true;
    }

    return false;
  }

  /**
   * Check if we should show the install prompt
   */
  function shouldShowPrompt() {
    // Don't show if already installed
    if (isPWAInstalled()) {
      return false;
    }

    // Check dismissal cooldown
    const lastDismissed = localStorage.getItem(CONFIG.storageKeys.dismissed);
    if (lastDismissed) {
      const daysSinceDismissal = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissal < CONFIG.dismissalCooldownDays) {
        return false;
      }
    }

    // Check minimum page views
    const pageViews = parseInt(localStorage.getItem(CONFIG.storageKeys.pageViews) || '0');
    if (pageViews < CONFIG.minPageViews) {
      return false;
    }

    return true;
  }

  /**
   * Track page view for engagement tracking
   */
  function trackPageView() {
    const views = parseInt(localStorage.getItem(CONFIG.storageKeys.pageViews) || '0');
    localStorage.setItem(CONFIG.storageKeys.pageViews, (views + 1).toString());
  }

  /**
   * Show the install banner
   */
  function showInstallBanner() {
    if (installBannerShown) return;
    installBannerShown = true;

    // Check if install banner already exists
    let banner = document.getElementById('tinyseed-install-banner');
    if (banner) {
      banner.classList.add('visible');
      return;
    }

    // Create install banner
    banner = document.createElement('div');
    banner.id = 'tinyseed-install-banner';
    banner.innerHTML = `
      <div class="ts-install-content">
        <div class="ts-install-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22V12"/>
            <path d="M12 12c-3-3-4-7-4-7"/>
            <path d="M12 12c3-3 4-7 4-7"/>
            <circle cx="12" cy="4" r="2"/>
          </svg>
        </div>
        <div class="ts-install-text">
          <strong>Install ${CONFIG.appName}</strong>
          <span>Works offline in the field!</span>
        </div>
        <button class="ts-install-btn" id="tinyseed-install-btn">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Install
        </button>
        <button class="ts-install-close" id="tinyseed-install-close" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    `;

    // Add styles
    const styles = document.createElement('style');
    styles.id = 'tinyseed-install-styles';
    styles.textContent = `
      #tinyseed-install-banner {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: #1e293b;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        padding: 16px;
        z-index: 10000;
        transform: translateY(100%);
        transition: transform 0.3s ease;
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
        padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
      }

      #tinyseed-install-banner.visible {
        transform: translateY(0);
      }

      .ts-install-content {
        display: flex;
        align-items: center;
        gap: 12px;
        max-width: 600px;
        margin: 0 auto;
      }

      .ts-install-icon {
        width: 52px;
        height: 52px;
        background: linear-gradient(135deg, #2d5a27, #4a7c43);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .ts-install-icon svg {
        width: 26px;
        height: 26px;
        color: white;
      }

      .ts-install-text {
        flex: 1;
        min-width: 0;
      }

      .ts-install-text strong {
        display: block;
        color: #f8fafc;
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 2px;
      }

      .ts-install-text span {
        display: block;
        color: #94a3b8;
        font-size: 14px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .ts-install-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #2d5a27;
        color: white;
        border: none;
        border-radius: 10px;
        padding: 14px 20px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        flex-shrink: 0;
        min-height: 48px;
        touch-action: manipulation;
      }

      .ts-install-btn svg {
        width: 18px;
        height: 18px;
      }

      .ts-install-btn:hover {
        background: #4a7c43;
      }

      .ts-install-btn:active {
        transform: scale(0.98);
      }

      .ts-install-close {
        background: transparent;
        border: none;
        padding: 12px;
        cursor: pointer;
        color: #64748b;
        border-radius: 8px;
        transition: all 0.2s ease;
        flex-shrink: 0;
        min-width: 48px;
        min-height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        touch-action: manipulation;
      }

      .ts-install-close svg {
        width: 20px;
        height: 20px;
      }

      .ts-install-close:hover {
        background: #334155;
        color: #94a3b8;
      }

      /* iOS-specific install modal */
      #tinyseed-ios-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(15, 23, 42, 0.9);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
      }

      #tinyseed-ios-modal.visible {
        opacity: 1;
        visibility: visible;
      }

      .ts-ios-content {
        background: #1e293b;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 28px;
        max-width: 360px;
        width: 100%;
        text-align: center;
      }

      .ts-ios-icon {
        width: 88px;
        height: 88px;
        background: linear-gradient(135deg, #2d5a27, #4a7c43);
        border-radius: 20px;
        margin: 0 auto 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 8px 32px rgba(45, 90, 39, 0.3);
      }

      .ts-ios-icon svg {
        width: 44px;
        height: 44px;
        color: white;
      }

      .ts-ios-title {
        color: #f8fafc;
        font-size: 22px;
        font-weight: 700;
        margin-bottom: 12px;
      }

      .ts-ios-text {
        color: #94a3b8;
        font-size: 15px;
        line-height: 1.5;
        margin-bottom: 24px;
      }

      .ts-ios-steps {
        text-align: left;
        margin-bottom: 24px;
      }

      .ts-ios-step {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 14px;
        background: #334155;
        border-radius: 12px;
        margin-bottom: 10px;
      }

      .ts-ios-step-num {
        width: 32px;
        height: 32px;
        background: #2d5a27;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
        font-weight: 600;
        flex-shrink: 0;
      }

      .ts-ios-step-text {
        color: #f8fafc;
        font-size: 15px;
        line-height: 1.4;
      }

      .ts-ios-step-text svg {
        display: inline;
        vertical-align: middle;
        margin: 0 4px;
        color: #2d5a27;
      }

      .ts-ios-btn {
        background: #2d5a27;
        color: white;
        border: none;
        border-radius: 12px;
        padding: 16px 28px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        width: 100%;
        min-height: 56px;
        transition: all 0.2s ease;
        touch-action: manipulation;
      }

      .ts-ios-btn:hover {
        background: #4a7c43;
      }

      /* Success toast */
      #tinyseed-install-success {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(-100px);
        background: #22c55e;
        color: white;
        padding: 16px 28px;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 600;
        z-index: 10002;
        display: flex;
        align-items: center;
        gap: 12px;
        transition: transform 0.3s ease;
        box-shadow: 0 4px 20px rgba(34, 197, 94, 0.3);
      }

      #tinyseed-install-success.visible {
        transform: translateX(-50%) translateY(0);
      }

      #tinyseed-install-success svg {
        width: 22px;
        height: 22px;
      }

      @media (max-width: 480px) {
        .ts-install-text span {
          display: none;
        }

        .ts-install-btn {
          padding: 14px 16px;
        }
      }
    `;
    document.head.appendChild(styles);

    // Add to DOM
    document.body.appendChild(banner);

    // Show with animation
    requestAnimationFrame(() => {
      banner.classList.add('visible');
    });

    // Add event listeners
    document.getElementById('tinyseed-install-btn').addEventListener('click', handleInstallClick);
    document.getElementById('tinyseed-install-close').addEventListener('click', handleDismiss);
  }

  /**
   * Hide the install banner
   */
  function hideInstallBanner() {
    const banner = document.getElementById('tinyseed-install-banner');
    if (banner) {
      banner.classList.remove('visible');
      setTimeout(() => banner.remove(), 300);
    }

    const modal = document.getElementById('tinyseed-ios-modal');
    if (modal) {
      modal.classList.remove('visible');
      setTimeout(() => modal.remove(), 300);
    }

    installBannerShown = false;
  }

  /**
   * Handle install button click
   */
  async function handleInstallClick() {
    console.log('[InstallPrompt] Install button clicked');

    // Check if iOS (no beforeinstallprompt support)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (isIOS) {
      showIOSInstallModal();
      return;
    }

    // Check if we have a deferred prompt
    if (!deferredPrompt) {
      console.log('[InstallPrompt] No deferred prompt available');
      showManualInstallInstructions();
      return;
    }

    try {
      // Show the install prompt
      deferredPrompt.prompt();

      // Wait for user response
      const { outcome } = await deferredPrompt.userChoice;
      console.log('[InstallPrompt] User choice:', outcome);

      // Clear the prompt
      deferredPrompt = null;

      if (outcome === 'accepted') {
        // Success handled by appinstalled event
      } else {
        handleDismiss();
      }
    } catch (error) {
      console.error('[InstallPrompt] Error showing prompt:', error);
    }
  }

  /**
   * Show iOS-specific install instructions
   */
  function showIOSInstallModal() {
    let modal = document.getElementById('tinyseed-ios-modal');
    if (modal) {
      modal.classList.add('visible');
      return;
    }

    modal = document.createElement('div');
    modal.id = 'tinyseed-ios-modal';
    modal.innerHTML = `
      <div class="ts-ios-content">
        <div class="ts-ios-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22V12"/>
            <path d="M12 12c-3-3-4-7-4-7"/>
            <path d="M12 12c3-3 4-7 4-7"/>
            <circle cx="12" cy="4" r="2"/>
          </svg>
        </div>
        <div class="ts-ios-title">Install ${CONFIG.appName}</div>
        <div class="ts-ios-text">Add to your home screen for quick access and offline use in the field</div>
        <div class="ts-ios-steps">
          <div class="ts-ios-step">
            <div class="ts-ios-step-num">1</div>
            <div class="ts-ios-step-text">
              Tap the Share button
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            </div>
          </div>
          <div class="ts-ios-step">
            <div class="ts-ios-step-num">2</div>
            <div class="ts-ios-step-text">
              Scroll and tap "Add to Home Screen"
            </div>
          </div>
          <div class="ts-ios-step">
            <div class="ts-ios-step-num">3</div>
            <div class="ts-ios-step-text">
              Tap "Add" in the top right
            </div>
          </div>
        </div>
        <button class="ts-ios-btn" id="tinyseed-ios-close">
          Got it
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    // Add close handler
    document.getElementById('tinyseed-ios-close').addEventListener('click', () => {
      modal.classList.remove('visible');
      setTimeout(() => modal.remove(), 300);
    });

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('visible');
        setTimeout(() => modal.remove(), 300);
      }
    });

    requestAnimationFrame(() => {
      modal.classList.add('visible');
    });
  }

  /**
   * Show manual install instructions for other browsers
   */
  function showManualInstallInstructions() {
    const message = `To install ${CONFIG.appName}:\n\n` +
      '1. Open browser menu (three dots or lines)\n' +
      '2. Select "Install app" or "Add to Home screen"\n' +
      '3. Follow the prompts to install';
    alert(message);
  }

  /**
   * Handle user dismissing the install prompt
   */
  function handleDismiss() {
    console.log('[InstallPrompt] User dismissed install prompt');

    // Record dismissal time
    localStorage.setItem(CONFIG.storageKeys.dismissed, Date.now().toString());

    // Hide the UI
    hideInstallBanner();
  }

  /**
   * Show installation success message
   */
  function showInstallSuccess() {
    let toast = document.getElementById('tinyseed-install-success');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'tinyseed-install-success';
      toast.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        ${CONFIG.appName} installed!
      `;
      document.body.appendChild(toast);
    }

    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });

    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  /**
   * Track installation for analytics
   */
  function trackInstall() {
    // Send to analytics if available
    if (typeof gtag !== 'undefined') {
      gtag('event', 'pwa_install', {
        event_category: 'PWA',
        event_label: CONFIG.appName
      });
    }

    // Track in localStorage
    localStorage.setItem(CONFIG.storageKeys.installed, 'true');
    localStorage.setItem('tinyseed_install_date', new Date().toISOString());

    // Notify service worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'APP_INSTALLED',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Public API for manual install trigger
   */
  window.TinySeedInstall = {
    show: showInstallBanner,
    hide: hideInstallBanner,
    prompt: handleInstallClick,
    isInstalled: isPWAInstalled,
    canInstall: () => deferredPrompt !== null || /iPad|iPhone|iPod/.test(navigator.userAgent),
    reset: () => {
      localStorage.removeItem(CONFIG.storageKeys.dismissed);
      localStorage.removeItem(CONFIG.storageKeys.installed);
      localStorage.removeItem(CONFIG.storageKeys.pageViews);
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
