// ═══ PWA INSTALL PROMPT ═══
// Custom install prompt UI for better user experience

let deferredPrompt;
let installPromptShown = false;

// Listen for beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  
  // Show custom install UI after a delay (don't be too pushy)
  if (!installPromptShown && !isAppInstalled()) {
    setTimeout(() => {
      showInstallPrompt();
      installPromptShown = true;
    }, 5000); // Show after 5 seconds
  }
});

// Check if app is already installed
function isAppInstalled() {
  // Check if running as standalone (installed PWA)
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true ||
         localStorage.getItem('pwa-dismissed') === 'true';
}

// Show custom install prompt
function showInstallPrompt() {
  const promptHtml = `
    <div id="pwa-install-prompt" style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      max-width: 360px;
      background: linear-gradient(135deg, #995dff 0%, #7d48d9 100%);
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 8px 32px rgba(153, 93, 255, 0.4);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
      font-family: var(--font-body);
    ">
      <div style="display: flex; align-items: start; gap: 12px;">
        <div style="
          width: 48px;
          height: 48px;
          background: rgba(255,255,255,0.2);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        ">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </div>
        <div style="flex: 1;">
          <h3 style="color: #fff; font-size: 16px; font-weight: 600; margin-bottom: 4px;">
            Install Equity Trace
          </h3>
          <p style="color: rgba(255,255,255,0.9); font-size: 14px; line-height: 1.4; margin-bottom: 12px;">
            Access your trading journal anytime, even offline. Install for the best experience.
          </p>
          <div style="display: flex; gap: 8px;">
            <button id="pwa-install-btn" style="
              background: #fff;
              color: #995dff;
              border: none;
              padding: 8px 16px;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
            ">
              Install
            </button>
            <button id="pwa-dismiss-btn" style="
              background: rgba(255,255,255,0.2);
              color: #fff;
              border: none;
              padding: 8px 16px;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s;
            ">
              Not now
            </button>
          </div>
        </div>
        <button id="pwa-close-btn" style="
          background: none;
          border: none;
          color: rgba(255,255,255,0.7);
          cursor: pointer;
          padding: 4px;
          margin: -4px;
          line-height: 1;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
    <style>
      @keyframes slideIn {
        from {
          transform: translateY(100px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      #pwa-install-btn:hover {
        background: #f5f5f5;
        transform: translateY(-1px);
      }
      #pwa-dismiss-btn:hover {
        background: rgba(255,255,255,0.3);
      }
      #pwa-close-btn:hover {
        color: #fff;
      }
    </style>
  `;
  
  // Insert into page
  document.body.insertAdjacentHTML('beforeend', promptHtml);
  
  // Add event listeners
  document.getElementById('pwa-install-btn').addEventListener('click', handleInstallClick);
  document.getElementById('pwa-dismiss-btn').addEventListener('click', dismissPrompt);
  document.getElementById('pwa-close-btn').addEventListener('click', dismissPrompt);
}

// Handle install button click
async function handleInstallClick() {
  if (!deferredPrompt) return;
  
  // Show the install prompt
  deferredPrompt.prompt();
  
  // Wait for the user to respond
  const { outcome } = await deferredPrompt.userChoice;
  
  console.log(`User response to install prompt: ${outcome}`);
  
  if (outcome === 'accepted') {
    console.log('PWA install accepted');
  }
  
  // Clear the deferredPrompt
  deferredPrompt = null;
  
  // Remove the prompt UI
  removePromptUI();
}

// Dismiss the prompt
function dismissPrompt() {
  localStorage.setItem('pwa-dismissed', 'true');
  removePromptUI();
}

// Remove prompt UI from DOM
function removePromptUI() {
  const prompt = document.getElementById('pwa-install-prompt');
  if (prompt) {
    prompt.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => prompt.remove(), 300);
  }
}

// Listen for successful installation
window.addEventListener('appinstalled', () => {
  console.log('PWA installed successfully');
  removePromptUI();
  
  // Show success message
  showInstallSuccess();
});

// Show installation success message
function showInstallSuccess() {
  const successHtml = `
    <div id="pwa-success" style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      max-width: 320px;
      background: linear-gradient(135deg, #2ecc8a 0%, #28b67a 100%);
      border-radius: 16px;
      padding: 16px 20px;
      box-shadow: 0 8px 32px rgba(46, 204, 138, 0.4);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
      color: #fff;
      font-family: var(--font-body);
    ">
      <div style="display: flex; align-items: center; gap: 12px;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <div>
          <strong style="display: block; font-size: 15px; margin-bottom: 2px;">
            App installed!
          </strong>
          <span style="font-size: 13px; opacity: 0.9;">
            Launch from your home screen
          </span>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', successHtml);
  
  // Auto-remove after 4 seconds
  setTimeout(() => {
    const success = document.getElementById('pwa-success');
    if (success) {
      success.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => success.remove(), 300);
    }
  }, 4000);
}

// Add slide out animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideOut {
    from {
      transform: translateY(0);
      opacity: 1;
    }
    to {
      transform: translateY(100px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Export for manual triggering
window.triggerInstallPrompt = showInstallPrompt;
