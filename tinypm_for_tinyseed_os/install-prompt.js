/**
 * TinyPM PWA Install Prompt Handler
 * Handles the beforeinstallprompt event and provides a custom install UI
 */

(function() {
  'use strict';

  // Store the install prompt event
  let deferredPrompt = null;
  let installButtonShown = false;

  // Configuration
  const CONFIG = {
    // Delay before showing install prompt (ms)
    promptDelay: 30000, // 30 seconds
    // Minimum page views before prompting
    minPageViews: 2,
    // Storage keys
    storageKeys: {
      dismissed: 'tinypm_install_dismissed',
      installed: 'tinypm_pwa_installed',
      pageViews: 'tinypm_page_views',
      lastPrompt: 'tinypm_last_prompt'
    },
    // Don't prompt again for this many days after dismissal
    dismissalCooldownDays: 7
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
      // Delay showing the prompt
      setTimeout(() => {
        showInstallButton();
      }, CONFIG.promptDelay);
    }

    // Also listen for standalone mode changes
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

    // Show install button if conditions are met
    if (shouldShowPrompt()) {
      showInstallButton();
    }
  }

  /**
   * Handle successful installation
   */
  function handleAppInstalled() {
    console.log('[InstallPrompt] App was installed');

    // Mark as installed
    localStorage.setItem(CONFIG.storageKeys.installed, 'true');

    // Clear the deferred prompt
    deferredPrompt = null;

    // Hide install UI
    hideInstallButton();

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
   * Show the install button
   */
  function showInstallButton() {
    if (installButtonShown) return;
    installButtonShown = true;

    // Check if install banner already exists
    let banner = document.getElementById('tinypm-install-banner');
    if (banner) {
      banner.classList.add('visible');
      return;
    }

    // Create install banner
    banner = document.createElement('div');
    banner.id = 'tinypm-install-banner';
    banner.innerHTML = `
      <div class="install-banner-content">
        <div class="install-banner-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </div>
        <div class="install-banner-text">
          <strong>Install TinyPM</strong>
          <span>Get the full app experience - works offline!</span>
        </div>
        <button class="install-banner-btn" id="tinypm-install-btn">Install</button>
        <button class="install-banner-close" id="tinypm-install-close" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    `;

    // Add styles
    const styles = document.createElement('style');
    styles.textContent = `
      #tinypm-install-banner {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: #1e2130;
        border-top: 1px solid #2a2d3e;
        padding: 12px 16px;
        z-index: 10000;
        transform: translateY(100%);
        transition: transform 0.3s ease;
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
      }

      #tinypm-install-banner.visible {
        transform: translateY(0);
      }

      .install-banner-content {
        display: flex;
        align-items: center;
        gap: 12px;
        max-width: 600px;
        margin: 0 auto;
      }

      .install-banner-icon {
        width: 44px;
        height: 44px;
        background: linear-gradient(135deg, #6366f1, #a855f7);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .install-banner-icon svg {
        color: white;
      }

      .install-banner-text {
        flex: 1;
        min-width: 0;
      }

      .install-banner-text strong {
        display: block;
        color: #f0f0f5;
        font-size: 15px;
        font-weight: 600;
      }

      .install-banner-text span {
        display: block;
        color: #a0a4b8;
        font-size: 13px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .install-banner-btn {
        background: #6366f1;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 10px 20px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }

      .install-banner-btn:hover {
        background: #818cf8;
      }

      .install-banner-btn:active {
        transform: scale(0.98);
      }

      .install-banner-close {
        background: transparent;
        border: none;
        padding: 8px;
        cursor: pointer;
        color: #6b6f82;
        border-radius: 6px;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }

      .install-banner-close:hover {
        background: #252839;
        color: #a0a4b8;
      }

      /* iOS-specific install modal */
      #tinypm-ios-install-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(15, 17, 23, 0.9);
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

      #tinypm-ios-install-modal.visible {
        opacity: 1;
        visibility: visible;
      }

      .ios-modal-content {
        background: #1e2130;
        border: 1px solid #2a2d3e;
        border-radius: 20px;
        padding: 24px;
        max-width: 340px;
        text-align: center;
      }

      .ios-modal-icon {
        width: 80px;
        height: 80px;
        background: linear-gradient(135deg, #6366f1, #a855f7);
        border-radius: 18px;
        margin: 0 auto 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .ios-modal-icon svg {
        width: 40px;
        height: 40px;
        color: white;
      }

      .ios-modal-title {
        color: #f0f0f5;
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 12px;
      }

      .ios-modal-text {
        color: #a0a4b8;
        font-size: 15px;
        line-height: 1.5;
        margin-bottom: 20px;
      }

      .ios-modal-steps {
        text-align: left;
        margin-bottom: 20px;
      }

      .ios-modal-step {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: #252839;
        border-radius: 10px;
        margin-bottom: 8px;
      }

      .ios-modal-step-num {
        width: 28px;
        height: 28px;
        background: #6366f1;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 600;
        flex-shrink: 0;
      }

      .ios-modal-step-text {
        color: #f0f0f5;
        font-size: 14px;
      }

      .ios-modal-step-text svg {
        display: inline;
        vertical-align: middle;
        margin: 0 4px;
      }

      .ios-modal-btn {
        background: #6366f1;
        color: white;
        border: none;
        border-radius: 12px;
        padding: 14px 24px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        width: 100%;
        transition: all 0.2s ease;
      }

      .ios-modal-btn:hover {
        background: #818cf8;
      }

      /* Success toast */
      #tinypm-install-success {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(-100px);
        background: #22c55e;
        color: white;
        padding: 14px 24px;
        border-radius: 12px;
        font-size: 15px;
        font-weight: 600;
        z-index: 10002;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: transform 0.3s ease;
        box-shadow: 0 4px 20px rgba(34, 197, 94, 0.3);
      }

      #tinypm-install-success.visible {
        transform: translateX(-50%) translateY(0);
      }

      @media (max-width: 480px) {
        .install-banner-text span {
          display: none;
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
    document.getElementById('tinypm-install-btn').addEventListener('click', handleInstallClick);
    document.getElementById('tinypm-install-close').addEventListener('click', handleDismiss);
  }

  /**
   * Hide the install button
   */
  function hideInstallButton() {
    const banner = document.getElementById('tinypm-install-banner');
    if (banner) {
      banner.classList.remove('visible');
      setTimeout(() => banner.remove(), 300);
    }

    const modal = document.getElementById('tinypm-ios-install-modal');
    if (modal) {
      modal.remove();
    }

    installButtonShown = false;
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
      // Try to show manual instructions
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
        // User dismissed - record this
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
    let modal = document.getElementById('tinypm-ios-install-modal');
    if (modal) {
      modal.classList.add('visible');
      return;
    }

    modal = document.createElement('div');
    modal.id = 'tinypm-ios-install-modal';
    modal.innerHTML = `
      <div class="ios-modal-content">
        <div class="ios-modal-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </div>
        <div class="ios-modal-title">Install TinyPM</div>
        <div class="ios-modal-text">Add TinyPM to your home screen for the best experience</div>
        <div class="ios-modal-steps">
          <div class="ios-modal-step">
            <div class="ios-modal-step-num">1</div>
            <div class="ios-modal-step-text">
              Tap the Share button
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            </div>
          </div>
          <div class="ios-modal-step">
            <div class="ios-modal-step-num">2</div>
            <div class="ios-modal-step-text">
              Scroll down and tap "Add to Home Screen"
            </div>
          </div>
          <div class="ios-modal-step">
            <div class="ios-modal-step-num">3</div>
            <div class="ios-modal-step-text">
              Tap "Add" to install
            </div>
          </div>
        </div>
        <button class="ios-modal-btn" onclick="document.getElementById('tinypm-ios-install-modal').classList.remove('visible')">
          Got it
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('visible');
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
    alert('To install TinyPM:\n\n1. Open browser menu (three dots)\n2. Select "Install app" or "Add to Home screen"\n3. Follow the prompts to install');
  }

  /**
   * Handle user dismissing the install prompt
   */
  function handleDismiss() {
    console.log('[InstallPrompt] User dismissed install prompt');

    // Record dismissal time
    localStorage.setItem(CONFIG.storageKeys.dismissed, Date.now().toString());

    // Hide the UI
    hideInstallButton();
  }

  /**
   * Show installation success message
   */
  function showInstallSuccess() {
    let toast = document.getElementById('tinypm-install-success');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'tinypm-install-success';
      toast.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        TinyPM installed successfully!
      `;
      document.body.appendChild(toast);
    }

    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });

    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Track installation for analytics
   */
  function trackInstall() {
    // Send to analytics if available
    if (window.gtag) {
      window.gtag('event', 'pwa_install', {
        event_category: 'PWA',
        event_label: 'TinyPM'
      });
    }

    // Track in localStorage
    localStorage.setItem(CONFIG.storageKeys.installed, 'true');
    localStorage.setItem('tinypm_install_date', new Date().toISOString());
  }

  /**
   * Public API for manual install trigger
   */
  window.TinyPMInstall = {
    show: showInstallButton,
    hide: hideInstallButton,
    prompt: handleInstallClick,
    isInstalled: isPWAInstalled,
    canInstall: () => deferredPrompt !== null || /iPad|iPhone|iPod/.test(navigator.userAgent)
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
