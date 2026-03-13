/**
 * Settings Page — Telegram auth, limits, templates, and controls
 */

function renderSettings(container) {
  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">⚙️ Orbit Control</h1>
      <p class="page-subtitle">Global configuration, security limits, and AI outreach templates</p>
    </div>

    <!-- Telegram Accounts -->
    <div class="settings-section">
      <div class="flex-between mb-24">
        <h2 style="font-size:20px; font-weight:800; color:var(--text-white)">🔐 Telegram Entities</h2>
        <button class="btn btn-primary btn-sm" id="btn-add-account">+ Add New Entity</button>
      </div>
      <div id="accounts-list" class="grid-2">
        <!-- Accounts will be injected here -->
      </div>
      
      <div id="account-flow-container" class="card mt-24" style="display:none; border:1px solid var(--accent-primary); background: rgba(59, 130, 246, 0.05)">
        <div class="flex-between mb-24">
            <h3 id="flow-title" style="margin:0; font-size:18px">Establish Connection</h3>
            <button class="btn btn-ghost btn-sm" id="btn-close-flow" style="padding:4px 10px">✕</button>
        </div>
        <div id="auth-flow"></div>
      </div>
    </div>

    <!-- Active Account Configuration -->
    <div class="settings-section mt-24">
      <h2 style="font-size:20px; font-weight:800; color:var(--text-white); margin-bottom: 24px">⚙️ Active Configuration</h2>
      <div class="card mb-24">
        <label>Select Identity to Configure</label>
        <select id="settings-account-list" style="max-width:440px">
          <option value="">Loading identities...</option>
        </select>
      </div>

      <div class="grid-2">
        <!-- Scouting Target -->
        <div class="card">
          <div class="card-title">🎯 FOCUS PARAMETERS</div>
          <div class="form-group">
            <label>Industry Vertical (Niche)</label>
            <input type="text" id="target-niche" placeholder="e.g. Fintech, Real Estate, Web3" />
          </div>
          <div class="form-group">
            <label>High-Intent Keywords</label>
            <textarea id="target-keywords" rows="3" placeholder="looking for advice, want to buy, need help with..."></textarea>
          </div>
          <button class="btn btn-primary" id="save-target" style="width:100%">SAVE FOCUS Intel</button>
        </div>

        <!-- Safety Protocols -->
        <div class="card">
          <div class="card-title">🛡️ SECURITY PROTOCOLS</div>
          <div class="form-group">
            <label>Daily Outreach Limit</label>
            <div style="display:flex; align-items:center; gap:16px">
              <input type="range" id="max-msgs" min="5" max="50" value="30" step="1" />
              <span id="max-msgs-val" style="font-weight:800; color:var(--accent-primary); width:30px">30</span>
            </div>
          </div>
          <div class="form-group">
            <label>Interface Delay Range (Seconds)</label>
            <div style="display:flex; align-items:center; gap:12px; margin-top:10px">
                <input type="number" id="min-delay" style="flex:1" placeholder="Min" />
                <span style="color:var(--text-muted)">to</span>
                <input type="number" id="max-delay" style="flex:1" placeholder="Max" />
            </div>
          </div>
          <button class="btn btn-secondary" id="save-limits" style="width:100%">UPDATE PROTOCOLS</button>
        </div>
      </div>

      <!-- Outreach Templates -->
      <div class="card mt-24">
        <div class="card-title">📝 AI OUTREACH TEMPLATES</div>
        <div class="grid-3">
          <div class="form-group">
            <label>Variant Alpha</label>
            <textarea id="template1" rows="5" placeholder="Sequence 1..."></textarea>
          </div>
          <div class="form-group">
            <label>Variant Beta</label>
            <textarea id="template2" rows="5" placeholder="Sequence 2..."></textarea>
          </div>
          <div class="form-group">
            <label>Variant Gamma</label>
            <textarea id="template3" rows="5" placeholder="Sequence 3..."></textarea>
          </div>
        </div>
        <button class="btn btn-primary mt-24" id="save-templates" style="width:100%">SAVE SEQUENCES</button>
      </div>

        <!-- Automation Matrix -->
        <div class="card mt-24" style="border: 1px solid var(--accent-primary); background: rgba(59, 130, 246, 0.05);">
            <div class="flex-between">
            <div>
                <h3 style="margin:0; font-size:20px; color:var(--text-white)">Autonomous Outreach Engine</h3>
                <p style="font-size:14px; color:var(--text-secondary); margin-top:8px; max-width:500px">
                Enable AI to automatically initiate contact with qualified leads discovered during scouting cycles.
                </p>
            </div>
            <div style="display:flex; align-items:center; gap:16px">
                <span id="auto-outreach-label" style="font-size:14px; font-weight:800; color:var(--text-secondary)">OFF</span>
                <label class="toggle">
                    <input type="checkbox" id="auto-outreach-toggle" />
                    <span class="slider"></span>
                </label>
            </div>
            </div>
        </div>
    </div>
  `;

  // --- Logic ---
  loadSettings();
  refreshAccountsList();

  document.getElementById('btn-add-account').addEventListener('click', () => {
    document.getElementById('account-flow-container').style.display = 'block';
    renderApiForm();
  });

  document.getElementById('btn-close-flow').addEventListener('click', () => {
    document.getElementById('account-flow-container').style.display = 'none';
  });

  // Range slider update
  const range = document.getElementById('max-msgs');
  const rangeVal = document.getElementById('max-msgs-val');
  range.addEventListener('input', () => { rangeVal.textContent = range.value; });

  async function loadSettingsAccounts() {
    const list = document.getElementById('settings-account-list');
    if (!list) return;
    const accounts = await apiFetch('/auth/accounts');
    if (!accounts || accounts.length === 0) {
      list.innerHTML = '<option value="">Establish identity first...</option>';
      return;
    }
    list.innerHTML = accounts.map(acc => `<option value="${acc.id}">${acc.session_name} (@${acc.phone || 'Pending'})</option>`).join('');
    
    if (accounts.length > 0) loadSettings(accounts[0].id);

    list.addEventListener('change', (e) => {
      const accId = e.target.value;
      if (accId) loadSettings(accId);
    });
  }
  loadSettingsAccounts();

  document.getElementById('auto-outreach-toggle').addEventListener('change', (e) => {
    document.getElementById('auto-outreach-label').textContent = e.target.checked ? 'ACTIVE' : 'OFF';
  });

  document.getElementById('save-target').addEventListener('click', async () => {
    const accId = document.getElementById('settings-account-list').value;
    if (!accId) { showToast('Target identity required.', 'warning'); return; }
    
    const data = {
      target_niche: document.getElementById('target-niche').value,
      target_keywords: document.getElementById('target-keywords').value,
    };
    const r = await apiFetch(`/settings/${accId}`, { method: 'PUT', body: JSON.stringify(data) });
    showToast(r.success ? 'Intel focus saved.' : 'Save operation failed.', r.success ? 'success' : 'error');
  });

  document.getElementById('save-limits').addEventListener('click', async () => {
    const accId = document.getElementById('settings-account-list').value;
    if (!accId) { showToast('Target identity required.', 'warning'); return; }

    const data = {
      max_messages_per_day: document.getElementById('max-msgs').value,
      min_delay_seconds: document.getElementById('min-delay').value,
      max_delay_seconds: document.getElementById('max-delay').value,
    };
    const r = await apiFetch(`/settings/${accId}`, { method: 'PUT', body: JSON.stringify(data) });
    showToast(r.success ? 'Protocols updated.' : 'Protocol update failed.', r.success ? 'success' : 'error');
  });

  document.getElementById('save-templates').addEventListener('click', async () => {
    const accId = document.getElementById('settings-account-list').value;
    if (!accId) { showToast('Target identity required.', 'warning'); return; }

    const data = {
      outreach_template_1: document.getElementById('template1').value,
      outreach_template_2: document.getElementById('template2').value,
      outreach_template_3: document.getElementById('template3').value,
    };
    const r = await apiFetch(`/settings/${accId}`, { method: 'PUT', body: JSON.stringify(data) });
    showToast(r.success ? 'Outreach sequences indexed.' : 'Sequence update failed.', r.success ? 'success' : 'error');
  });
}

async function loadSettings(accountId) {
  if (!accountId) return;
  const s = await apiFetch(`/settings/${accountId}`);
  if (!s) return;
  
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('target-niche', s.target_niche);
  set('target-keywords', s.target_keywords);
  set('min-delay', s.min_delay_seconds);
  set('max-delay', s.max_delay_seconds);
  set('template1', s.outreach_template_1);
  set('template2', s.outreach_template_2);
  set('template3', s.outreach_template_3);

  const range = document.getElementById('max-msgs');
  if (range && s.max_messages_per_day) {
    range.value = s.max_messages_per_day;
    document.getElementById('max-msgs-val').textContent = s.max_messages_per_day;
  }

  const autoEnabled = s.auto_outreach_enabled === 'true';
  const autoToggle = document.getElementById('auto-outreach-toggle');
  if (autoToggle) autoToggle.checked = autoEnabled;
  const autoLabel = document.getElementById('auto-outreach-label');
  if (autoLabel) autoLabel.textContent = autoEnabled ? 'ACTIVE' : 'OFF';
}

async function refreshAccountsList() {
  const container = document.getElementById('accounts-list');
  const accounts = await apiFetch('/auth/accounts');
  
  if (!accounts || accounts.length === 0) {
    container.innerHTML = `
      <div class="card" style="grid-column: 1 / -1; text-align:center; padding: 60px; background: rgba(255,255,255,0.01)">
        <span style="font-size:48px; display:block; margin-bottom:16px">📡</span>
        <p style="color:var(--text-secondary); margin-bottom: 24px">No orbital entities detected in your system.</p>
        <button class="btn btn-primary" onclick="document.getElementById('btn-add-account').click()">Initialize Connection</button>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  for (const acc of accounts) {
    const status = await apiFetch(`/auth/status/${acc.id}`);
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="flex-between">
        <div style="display:flex; align-items:center; gap:16px">
          <div class="stat-icon" style="background:${status.connected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}; color:${status.connected ? 'var(--success)' : 'var(--danger)'}">
            ${status.connected ? '✅' : '❌'}
          </div>
          <div>
            <div style="font-weight:800; font-size:16px; color:var(--text-white)">${acc.session_name}</div>
            <div style="font-size:13px; color:var(--text-secondary)">${status.phone || 'Interface Pending'}</div>
          </div>
        </div>
        <div style="text-align:right">
          <span style="font-size:10px; font-weight:800; text-transform:uppercase; color:${status.connected ? 'var(--success)' : 'var(--danger)'}">
            ${status.connected ? 'STABLE' : 'OFFLINE'}
          </span>
          <div style="margin-top:8px; display:flex; gap:8px">
             ${!status.connected ? `<button class="btn btn-primary btn-sm" onclick="startLoginFlow(${acc.id}, '${acc.phone || ''}')">RECONNECT</button>` : ''}
             <button class="btn btn-ghost btn-sm" style="color:var(--danger); border-color:rgba(239,68,68,0.2)" onclick="deleteAccount(${acc.id})">PURGE</button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  }
}

// Global functions for inline EventListeners
window.startLoginFlow = (accountId, phone) => {
  currentAccountId = accountId;
  pendingPhone = phone;
  document.getElementById('account-flow-container').style.display = 'block';
  document.getElementById('flow-title').textContent = `Authentication: Entity ${accountId}`;
  renderPhoneForm(document.getElementById('auth-flow'));
};

window.deleteAccount = async (accountId) => {
    if (!confirm('Purge this entity from the system matrix?')) return;
    await apiFetch(`/auth/logout/${accountId}`, { method: 'POST' });
    refreshAccountsList();
};

function renderApiForm() {
    const container = document.getElementById('auth-flow');
    container.innerHTML = `
        <div class="otp-flow">
            <div class="form-group">
                <label>Entity Identification (Label)</label>
                <input type="text" id="new-acc-name" placeholder="e.g. Master Node" />
            </div>
            <div class="form-group">
                <label>Interface Coordinate (Phone with Country Code)</label>
                <div style="display:flex; gap:12px">
                    <input type="tel" id="phone-input" style="flex:1" placeholder="+1234567890" />
                    <button class="btn btn-primary" id="send-code-btn">TRANSMIT CODE</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('send-code-btn').addEventListener('click', async () => {
        const name = document.getElementById('new-acc-name').value.trim();
        const phone = document.getElementById('phone-input').value.trim().replace(/\s+/g,'');
        if (!name || !phone) { showToast('Validation failed. Coordinates missing.', 'warning'); return; }

        const btn = document.getElementById('send-code-btn');
        btn.disabled = true; btn.textContent = 'TRANSMITTING...';

        const res = await apiFetch(`/auth/add?session_name=${encodeURIComponent(name)}`, { method: 'POST' });
        if (res.account_id) {
            currentAccountId = res.account_id;
            refreshAccountsList();
            const r = await apiFetch('/auth/send-code', { method: 'POST', body: JSON.stringify({ account_id: currentAccountId, phone }) });
            btn.disabled = false; btn.textContent = 'TRANSMIT CODE';
            if (r.success) {
                pendingPhone = phone;
                pendingHash = r.phone_code_hash;
                showToast('📱 Transmission received. Code sent.', 'success');
                renderCodeForm(container);
            } else { showToast(`Transmission Error: ${r.error || r.detail}`, 'error'); }
        } else { btn.disabled = false; btn.textContent = 'TRANSMIT CODE'; showToast('Entity initialization failed.', 'error'); }
    });
}
function renderPhoneForm(container) {
    container.innerHTML = `
        <div class="otp-flow">
            <div class="form-group">
                <label>Interface Coordinate (Phone with Country Code)</label>
                <div style="display:flex; gap:12px">
                    <input type="tel" id="phone-input" style="flex:1" placeholder="+1234567890" value="${pendingPhone || ''}" />
                    <button class="btn btn-primary" id="send-code-btn">TRANSMIT CODE</button>
                </div>
                <p style="font-size:12px; color:var(--text-secondary); margin-top:8px">Enter the number with '+' and country code (e.g. +14155552671)</p>
            </div>
        </div>
    `;

    document.getElementById('send-code-btn').addEventListener('click', async () => {
        const phone = document.getElementById('phone-input').value.trim().replace(/\s+/g,'');
        if (!phone) { showToast('Coordinate required.', 'warning'); return; }

        const btn = document.getElementById('send-code-btn');
        btn.disabled = true; btn.textContent = 'TRANSMITTING...';

        const r = await apiFetch('/auth/send-code', { method: 'POST', body: JSON.stringify({ account_id: currentAccountId, phone }) });
        btn.disabled = false; btn.textContent = 'TRANSMIT CODE';
        if (r.success) {
            pendingPhone = phone;
            pendingHash = r.phone_code_hash;
            showToast('📱 Transmission received. Code sent.', 'success');
            renderCodeForm(container);
        } else { showToast(`Transmission Error: ${r.error || r.detail}`, 'error'); }
    });
}

function renderCodeForm(container) {
    container.innerHTML = `
        <div class="otp-flow">
            <div class="form-group">
                <label>Verification Pulse (Enter OTP Code)</label>
                <input type="text" id="otp-input" placeholder="Enter 5-digit code" />
            </div>
            <div class="form-group" id="settings-2fa-group" style="display:none">
                <label>🔒 2FA Security Key (Password)</label>
                <input type="password" id="2fa-input" placeholder="Enter your 2FA password" />
            </div>
            <button class="btn btn-primary" id="verify-code-btn" style="width:100%">VERIFY & STABILIZE</button>
            <button class="btn btn-ghost btn-sm mt-16" id="back-to-phone" style="width:100%">← CHANGE COORDINATES</button>
        </div>
    `;

    document.getElementById('verify-code-btn').addEventListener('click', async () => {
        const code = document.getElementById('otp-input').value.trim();
        const password = document.getElementById('2fa-input').value.trim();
        if (!code) { showToast('Verification code required.', 'warning'); return; }

        const btn = document.getElementById('verify-code-btn');
        btn.disabled = true; btn.textContent = 'STABILIZING...';

        const data = {
            account_id: currentAccountId,
            phone: pendingPhone,
            code,
            phone_code_hash: pendingHash,
            password: password || null
        };

        const r = await apiFetch('/auth/verify-code', { method: 'POST', body: JSON.stringify(data) });
        btn.disabled = false; btn.textContent = 'VERIFY & STABILIZE';

        if (r.success) {
            showToast('🚀 Connection stabilized. Entity online.', 'success');
            document.getElementById('account-flow-container').style.display = 'none';
            refreshAccountsList();
        } else {
            const errorMsg = (r.detail || r.error || '').toLowerCase();
            if (errorMsg.includes('2fa') || errorMsg.includes('two-step') || errorMsg.includes('password is required')) {
                document.getElementById('settings-2fa-group').style.display = 'block';
                showToast('2FA Security required. Please enter your password.', 'info');
            } else {
                showToast(`Stabilization Failed: ${errorMsg}`, 'error');
            }
        }
    });

    document.getElementById('back-to-phone').addEventListener('click', () => renderPhoneForm(container));
}
