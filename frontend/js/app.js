/**
 * Scoutrix — Main App Router & Shared Utilities
 */

const API = window.location.protocol === 'file:' ? 'http://localhost:8000' : (window.location.hostname === 'localhost' ? '' : 'https://scoutrix.onrender.com');

function getFullAvatarUrl(path) {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return API + (path.startsWith('/') ? '' : '/') + path;
}
let ws = null;
let wsReconnectTimer = null;
let currentUser = null;
let currentToken = localStorage.getItem('token');

// Auth states for Step 2
let loginPhoneCodeHash = null;
let loginPhoneNumber = null;

// ─── Router ────────────────────────────────────────────────────────────────
const pages = {
  dashboard: () => window.renderDashboard,
  broadcast: () => window.renderBroadcast,
  settings:  () => window.renderSettings,
};

function navigate(page) {
  if (!currentToken) { showAuth(); return; }

  // Update nav highlight
  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.page === page)
  );
  
  const topTitle = document.getElementById('top-bar-title');
  if (topTitle) {
      topTitle.textContent = page.charAt(0).toUpperCase() + page.slice(1);
  }

  const container = document.getElementById('page-container');
  if (!container) return;

  // Show loading spinner
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:60vh;flex-direction:column;gap:20px;animation:fadeIn 0.5s ease">
      <div class="spinner" style="width:48px;height:48px;border-width:4px"></div>
      <div style="font-size:14px;font-weight:700;color:var(--accent-primary);letter-spacing:0.1em;text-transform:uppercase">
        Loading ${page}...
      </div>
    </div>
  `;

  window.location.hash = page;

  // Poll until the render function is available (up to 2s)
  let attempts = 0;
  const maxAttempts = 20;

  function tryRender() {
    const renderFn = pages[page] ? pages[page]() : null;

    if (typeof renderFn === 'function') {
      container.innerHTML = '';
      renderFn(container);
      return;
    }

    attempts++;
    if (attempts < maxAttempts) {
      setTimeout(tryRender, 100);
    } else {
      // Give up and show a friendly error
      container.innerHTML = `
        <div class="card" style="margin-top:40px;text-align:center;padding:60px;max-width:500px;margin-left:auto;margin-right:auto;">
          <div style="font-size:48px;margin-bottom:20px;">⚠️</div>
          <h2 style="color:var(--danger);margin-bottom:12px;">Module Load Failure</h2>
          <p style="color:var(--text-secondary);margin-bottom:24px;">
            The <strong>${page}</strong> module could not be initialized.<br>
            Try a hard refresh (<kbd>Ctrl+Shift+R</kbd>) to reload all scripts.
          </p>
          <button class="btn btn-primary" onclick="location.reload(true)">🔄 Reload Page</button>
        </div>`;
    }
  }

  // Start first attempt after small delay to let browser parse remaining scripts
  setTimeout(tryRender, 80);
}


// ─── WebSocket ──────────────────────────────────────────────────────────────
function connectWS() {
  if (ws && ws.readyState === WebSocket.OPEN) return;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

  ws.onopen = () => {
    document.getElementById('ws-indicator').style.opacity = '1';
    clearTimeout(wsReconnectTimer);
  };

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      handleWSMessage(msg);
    } catch {}
  };

  ws.onclose = () => {
    document.getElementById('ws-indicator').style.opacity = '0.3';
    wsReconnectTimer = setTimeout(connectWS, 5000);
  };

  ws.onerror = () => ws.close();
}

function handleWSMessage(msg) {
  switch (msg.type) {
    case 'new_lead':
      showToast(`📍 Lead Captured: @${msg.username}`, 'success');
      refreshCurrentPage();
      break;
    case 'message_sent':
      showToast(`📨 Outreach sequence deployed: @${msg.username}`, 'info');
      break;
    case 'new_reply':
      showToast(`💬 Inbound comms from @${msg.username}`, 'success');
      addActivityItem({ icon: '💬', text: `Reply from @${msg.username}`, class: 'success' });
      break;
    case 'scan_complete':
      showToast(`✅ Sector scan finished: ${msg.new_leads} identities found.`, 'success');
      addActivityItem({ icon: '✅', text: `Scan complete: ${msg.new_leads} new leads`, class: 'success' });
      refreshCurrentPage();
      break;
    case 'flood_wait':
      showToast(`⚠️ Rate limit hit. Cooling down for ${msg.seconds}s.`, 'warning');
      break;
  }
}

function refreshCurrentPage() {
  const page = window.location.hash.replace('#', '') || 'dashboard';
  if (page === 'dashboard' && window._dashboardRefresh) window._dashboardRefresh();
}

function addActivityItem({ icon, text, class: cls }) {
  const feed = document.getElementById('activity-feed');
  if (!feed) return;
  const item = document.createElement('div');
  item.className = `activity-item ${cls || ''}`;
  const now = new Date();
  item.innerHTML = `
    <span class="activity-icon">${icon}</span>
    <div style="flex:1">
        <span class="activity-text">${text}</span>
        <div class="activity-time">${now.toLocaleTimeString()}</div>
    </div>
  `;
  feed.prepend(item);
  if (feed.children.length > 25) feed.removeChild(feed.lastChild);
}

// ─── Shared Fetch ───────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (currentToken) headers['Authorization'] = `Bearer ${currentToken}`;
    const res = await fetch(`${API}${path}`, { ...options, headers: { ...headers, ...options.headers } });
    if (res.status === 401) { logout(); return { success: false, error: 'Session Expired' }; }
    return await res.json();
  } catch (e) {
    return { success: false, error: 'Network Connectivity Failure' };
  }
}

// ─── Toast ──────────────────────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span style="font-weight:600">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastIn 0.4s ease reverse forwards';
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

// ─── Auth ───────────────────────────────────────────────────────────────────
let qrPollInterval = null;
let currentQrToken = null;

function showAuth() {
  const overlay = document.getElementById('auth-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    document.getElementById('auth-phone-form').style.display = 'none';
    document.getElementById('auth-code-form').style.display = 'none';
    document.getElementById('auth-qr-section').style.display = 'block';
    
    // Play/replay the ocean ship video — mobile-safe
    const video = overlay.querySelector('video');
    if (video) {
      video.currentTime = 0;
      video.muted = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay blocked (e.g. iOS without gesture) — try on first touch
          const tryPlay = () => { video.play().catch(() => {}); document.removeEventListener('touchstart', tryPlay); };
          document.addEventListener('touchstart', tryPlay, { once: true });
        });
      }
    }

    // Reset Tabs for Light Theme
    const tabQr = document.getElementById('tab-qr');
    const tabPhone = document.getElementById('tab-phone');
    if (tabQr && tabPhone) {
        tabQr.style.background = '#ffffff';
        tabQr.style.color = '#0f172a';
        tabQr.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        tabPhone.style.background = 'transparent';
        tabPhone.style.color = '#64748b';
        tabPhone.style.boxShadow = 'none';
    }
    
    startQrFlow();
  }
}

window.logout = function logout() {
  try {
    localStorage.removeItem('token');
    localStorage.clear();
    sessionStorage.clear();
  } catch(e) {}

  currentToken = null;
  if (qrPollInterval) {
    clearInterval(qrPollInterval);
    qrPollInterval = null;
  }

  // Immediately redirect to clean root URL (login screen)
  window.location.replace(window.location.origin + '/');
};

// ─── Dual Auth Tabs ─────────────────────────────────────────────────────────
document.getElementById('tab-qr')?.addEventListener('click', () => {
    document.getElementById('auth-qr-section').style.display = 'block';
    document.getElementById('auth-phone-form').style.display = 'none';
    document.getElementById('auth-code-form').style.display = 'none';
    
    const tabQr = document.getElementById('tab-qr');
    const tabPhone = document.getElementById('tab-phone');
    tabQr.style.background = '#ffffff';
    tabQr.style.color = '#0f172a';
    tabQr.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    tabPhone.style.background = 'transparent';
    tabPhone.style.color = '#64748b';
    tabPhone.style.boxShadow = 'none';
    
    startQrFlow();
});

document.getElementById('tab-phone')?.addEventListener('click', () => {
    document.getElementById('auth-qr-section').style.display = 'none';
    document.getElementById('auth-phone-form').style.display = 'block';
    document.getElementById('auth-code-form').style.display = 'none';
    
    const tabQr = document.getElementById('tab-qr');
    const tabPhone = document.getElementById('tab-phone');
    tabPhone.style.background = '#ffffff';
    tabPhone.style.color = '#0f172a';
    tabPhone.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    tabQr.style.background = 'transparent';
    tabQr.style.color = '#64748b';
    tabQr.style.boxShadow = 'none';
    
    if(qrPollInterval) clearInterval(qrPollInterval);
});

// ─── QR Auth Flow ───────────────────────────────────────────────────────────
async function startQrFlow() {
    if(qrPollInterval) clearInterval(qrPollInterval);
    const container = document.getElementById('qr-code-container');
    const loader = document.getElementById('qr-loader');
    if(!container) return;
    
    container.innerHTML = '<div class="spinner" style="width:32px;height:32px;border-width:3px;border-top-color:#3b82f6;"></div>';
    if(loader) loader.style.display = 'none';
    
    try {
        const res = await apiFetch('/auth/qr/start', { method: 'POST' });
        if(res && res.success) {
            container.innerHTML = '';
            if(typeof QRCode === 'undefined') {
                container.innerHTML = '<div style="color:#ef4444;font-size:13px;padding:10px;">QR library failed to load.<br>Please refresh the page.</div>';
                return;
            }
            new QRCode(container, {
                text: res.url,
                width: 200,
                height: 200,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.H
            });
            currentQrToken = res.token_id;
            if(loader) loader.style.display = 'flex';
            
            // Start Polling
            qrPollInterval = setInterval(pollQrStatus, 2000);
        } else {
            const errMsg = res?.detail || res?.error || 'QR generation failed';
            container.innerHTML = `<div style="color:#ef4444;font-size:13px;padding:10px;text-align:center;">${errMsg}<br><br><button onclick="startQrFlow()" style="padding:8px 16px;background:#0f172a;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;">Retry</button></div>`;
            showToast(errMsg, 'error');
        }
    } catch(e) {
        container.innerHTML = '<div style="color:#ef4444;font-size:13px;padding:10px;text-align:center;">Cannot connect to server.<br>Make sure the backend is running.<br><br><button onclick="startQrFlow()" style="padding:8px 16px;background:#0f172a;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;">Retry</button></div>';
    }
}

async function pollQrStatus() {
    if(!currentQrToken) return;
    try {
        const res = await apiFetch(`/auth/qr/status/${currentQrToken}`);
        if(res && res.status === 'success') {
            clearInterval(qrPollInterval);
            localStorage.setItem('token', res.access_token);
            currentToken = res.access_token;
            document.getElementById('auth-overlay').style.display = 'none';
            showToast('Login successful! Welcome to Scoutrix.', 'success');
            navigate('dashboard');
            setTimeout(show2027AdvisoryModal, 400);
        } else if (res && (res.status === 'timeout' || res.status === 'failed')) {
            clearInterval(qrPollInterval);
            showToast('QR Login expired or failed. Generating a new one...', 'warning');
            startQrFlow();
        }
    } catch(e) {
        // Ignore network blips during polling
    }
}

// Step 1: Request Code (Phone Flow)
document.getElementById('auth-phone-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const rawPhone = document.getElementById('auth-phone').value.trim().replace(/[\s\-()]/g, '');
  const countryCode = (typeof selectedCountryCode !== 'undefined' && selectedCountryCode) ? selectedCountryCode : '+1';
  
  // Build full phone: country code + local number (strip leading zeros)
  const fullPhone = countryCode + rawPhone.replace(/^0+/, '');
  const btn = document.getElementById('auth-phone-submit');
  
  if (!rawPhone) {
    showToast('Please enter your phone number', 'warning');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;margin-right:10px"></div> SENDING...';

  try {
    const res = await apiFetch('/auth/request-login', {
      method: 'POST',
      body: JSON.stringify({ phone: fullPhone })
    });

    if (res && res.success) {
      loginPhoneCodeHash = res.phone_code_hash;
      loginPhoneNumber = fullPhone;
      
      document.getElementById('auth-phone-form').style.display = 'none';
      document.getElementById('auth-code-form').style.display = 'block';
      showToast('Code sent to your Telegram app!', 'success');
    } else {
      showToast(res?.detail || res?.error || 'Failed to send code.', 'error');
    }
  } catch (err) {
    showToast('Network error while requesting code.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send Code →';
  }
});

// Step 2: Verify Code
document.getElementById('auth-code-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = document.getElementById('auth-code').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  const btn = document.getElementById('auth-code-submit');

  if (!code) {
    showToast('Please enter the verification code', 'warning');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;margin-right:10px"></div> VERIFYING...';

  try {
    const res = await apiFetch('/auth/verify-login', {
      method: 'POST',
      body: JSON.stringify({
        phone: loginPhoneNumber,
        code: code,
        phone_code_hash: loginPhoneCodeHash,
        password: password || undefined
      })
    });

    if (res && res.access_token) {
      localStorage.setItem('token', res.access_token);
      currentToken = res.access_token;
      document.getElementById('auth-overlay').style.display = 'none';
      showToast('Login successful! Welcome to Scoutrix.', 'success');
      navigate('dashboard');
      setTimeout(show2027AdvisoryModal, 400);
    } else {
      const errorMsg = (res?.detail || res?.error || '').toLowerCase();
      if (errorMsg.includes('2fa') || errorMsg.includes('two-step') || errorMsg.includes('password is required')) {
        document.getElementById('auth-password-group').style.display = 'block';
        showToast('Two-factor authentication required. Please enter your password below.', 'info');
      } else {
        showToast(res?.detail || res?.error || 'Login verification failed.', 'error');
      }
    }
  } catch (err) {
    showToast('Network error during verification.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Confirm & Login →';
  }
});

document.getElementById('auth-back-btn')?.addEventListener('click', () => {
    document.getElementById('auth-code-form').style.display = 'none';
    document.getElementById('auth-phone-form').style.display = 'block';
    document.getElementById('auth-password-group').style.display = 'none';
});

// ─── 2027 Commercial Advisory Modal ──────────────────────────────────────────
window.show2027AdvisoryModal = function() {
  const modal = document.getElementById('billing-advisory-modal');
  if (!modal) return;
  modal.style.display = 'flex';

  const btn = document.getElementById('btn-ack-advisory');
  if (btn) {
    btn.onclick = () => {
      modal.style.display = 'none';
      sessionStorage.setItem('advisory_2027_shown', 'true');
    };
  }
};

// ─── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(el.dataset.page);
      document.getElementById('sidebar').classList.remove('open');
    });
  });

  document.getElementById('hamburger').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Global helper for other modules
  window.getActiveAccountId = () => {
    const list = document.getElementById('settings-account-list');
    if (list && list.value) return parseInt(list.value);
    const last = localStorage.getItem('last_active_account');
    if (last) return parseInt(last);
    return null;
  };


  if (currentToken) {
    navigate(window.location.hash.replace('#', '') || 'dashboard');
    if (sessionStorage.getItem('advisory_2027_shown') !== 'true') {
      setTimeout(show2027AdvisoryModal, 500);
    }
  } else {
    showAuth();
  }

  connectWS();
  initParticleAnimation(); 
});

// Re-implementing simplified particle animation (Same as before but cleaned up)
function initParticleAnimation() {
    const canvas = document.getElementById('auth-particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize);
    resize();
    for(let i=0; i<40; i++) particles.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, vx: (Math.random()-0.5)*0.5, vy: (Math.random()-0.5)*0.5, r: 2 });
    function animate() {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        particles.forEach(p => {
            p.x += p.vx; p.y += p.vy;
            if(p.x<0||p.x>canvas.width) p.vx*=-1;
            if(p.y<0||p.y>canvas.height) p.vy*=-1;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fillStyle = 'rgba(59,130,246,0.2)'; ctx.fill();
        });
        requestAnimationFrame(animate);
    }
    animate();
}

function timeAgo(iso) {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso + (iso.endsWith('Z') ? '' : 'Z'));
    const m = Math.floor(diff/60000);
    if(m<1) return 'now';
    if(m<60) return m+'m';
    const h = Math.floor(m/60);
    if(h<24) return h+'h';
    return Math.floor(h/24)+'d';
}

function scoreClass(s) { return s>=50?'score-high':(s>=20?'score-med':'score-low'); }
