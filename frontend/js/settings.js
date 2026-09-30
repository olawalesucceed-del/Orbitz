/**
 * Scoutrix — Settings Page
 * Manage connected Telegram accounts, safety limits, message templates, and automation.
 */

window.renderSettings = function(container) {
  container.innerHTML = `
    <div style="max-width:900px; margin:0 auto;">

      <!-- Header -->
      <div style="margin-bottom:28px;">
        <h1 style="font-size:26px;font-weight:800;color:#0f172a;margin:0;">⚙️ Settings</h1>
        <p style="font-size:14px;color:#64748b;margin:6px 0 0 0;">Manage your Telegram accounts and configure outreach automation.</p>
      </div>

      <!-- ① Connected Accounts -->
      <div class="card" style="margin-bottom:24px;border-radius:16px;border:none;box-shadow:0 4px 20px rgba(0,0,0,0.05);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <div>
            <div style="font-size:16px;font-weight:700;color:#0f172a;">📱 Connected Accounts</div>
            <div style="font-size:13px;color:#64748b;margin-top:3px;">Telegram accounts used for outreach and scanning.</div>
          </div>
          <button class="btn btn-primary" id="btn-add-account" style="height:40px;padding:0 18px;border-radius:10px;">
            + Add Account
          </button>
        </div>
        <div id="accounts-list">
          <div style="padding:40px;text-align:center;"><div class="spinner" style="margin:0 auto;border-top-color:#3b82f6;"></div></div>
        </div>

        <!-- Add account flow (hidden by default) -->
        <div id="account-flow-container" style="display:none;margin-top:20px;padding:20px;background:#f0f9ff;border:1.5px solid #bfdbfe;border-radius:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <div style="font-size:15px;font-weight:700;color:#1e40af;" id="flow-title">Connect New Account</div>
            <button class="btn btn-ghost btn-sm" id="btn-close-flow" style="font-size:18px;padding:2px 8px;">✕</button>
          </div>
          <div id="auth-flow"></div>
        </div>
      </div>

      <!-- ② Account Configuration -->
      <div class="card" style="margin-bottom:24px;border-radius:16px;border:none;box-shadow:0 4px 20px rgba(0,0,0,0.05);">
        <div style="margin-bottom:16px;">
          <div style="font-size:16px;font-weight:700;color:#0f172a;">🎯 Account Configuration</div>
          <div style="font-size:13px;color:#64748b;margin-top:3px;">Select an account to configure its targeting and limits.</div>
        </div>

        <div style="margin-bottom:20px;">
          <label style="font-size:13px;font-weight:600;color:#374151;display:block;margin-bottom:6px;">Active Account</label>
          <select id="settings-account-list" style="width:100%;max-width:380px;padding:10px 14px;border-radius:10px;border:1.5px solid #e2e8f0;font-size:14px;font-weight:600;background:#fff;">
            <option value="">Loading accounts...</option>
          </select>
        </div>

        <div class="responsive-grid-2" style="margin-bottom:20px;">
          <!-- Targeting -->
          <div style="background:#f0fdf4;border-radius:12px;padding:18px;border:1px solid #bbf7d0;">
            <div style="font-size:14px;font-weight:700;color:#15803d;margin-bottom:14px;">🎯 Niche & Keywords</div>
            <div class="form-group" style="margin-bottom:12px;">
              <label style="font-size:12px;font-weight:600;color:#374151;">Industry / Niche</label>
              <input type="text" id="target-niche" placeholder="e.g. Real Estate, Crypto, SaaS" style="background:#fff;border:1px solid #d1fae5;"/>
            </div>
            <div class="form-group" style="margin-bottom:14px;">
              <label style="font-size:12px;font-weight:600;color:#374151;">High-Intent Keywords (comma-separated)</label>
              <textarea id="target-keywords" rows="3" placeholder="looking for, need help, recommendations..." style="background:#fff;border:1px solid #d1fae5;resize:none;"></textarea>
            </div>
            <button class="btn btn-success" id="save-target" style="width:100%;height:40px;">Save Targeting</button>
          </div>

          <!-- Safety Limits -->
          <div style="background:#fffbeb;border-radius:12px;padding:18px;border:1px solid #fde68a;">
            <div style="font-size:14px;font-weight:700;color:#b45309;margin-bottom:14px;">🛡️ Safety Limits</div>
            <div class="form-group" style="margin-bottom:12px;">
              <label style="font-size:12px;font-weight:600;color:#374151;">Max Messages Per Day: <span id="max-msgs-val" style="color:#f59e0b;font-weight:800;">30</span></label>
              <input type="range" id="max-msgs" min="5" max="50" value="30" step="1" style="width:100%;accent-color:#f59e0b;cursor:pointer;margin-top:6px;"/>
            </div>
            <div class="form-group" style="margin-bottom:14px;">
              <label style="font-size:12px;font-weight:600;color:#374151;">Delay Between Messages (seconds)</label>
              <div style="display:flex;gap:8px;margin-top:6px;">
                <input type="number" id="min-delay" placeholder="Min (e.g. 60)" style="flex:1;background:#fff;border:1px solid #fde68a;"/>
                <span style="display:flex;align-items:center;color:#64748b;font-size:13px;">–</span>
                <input type="number" id="max-delay" placeholder="Max (e.g. 180)" style="flex:1;background:#fff;border:1px solid #fde68a;"/>
              </div>
            </div>
            <button class="btn btn-secondary" id="save-limits" style="width:100%;height:40px;border:1.5px solid #f59e0b;color:#b45309;background:#fff;">Save Limits</button>
          </div>
        </div>

        <!-- Message Templates -->
        <div style="background:#f5f3ff;border-radius:12px;padding:18px;border:1px solid #ddd6fe;margin-bottom:20px;">
          <div style="font-size:14px;font-weight:700;color:#6d28d9;margin-bottom:4px;">📝 Outreach Templates</div>
          <div style="font-size:12px;color:#7c3aed;margin-bottom:14px;">The system rotates between these when messaging leads.</div>
          <div class="responsive-grid-3" style="margin-bottom:14px;">
            <div>
              <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Variation A</label>
              <textarea id="template1" rows="4" placeholder="Hi! Saw your question in the group and wanted to reach out..." style="width:100%;background:#fff;border:1px solid #ddd6fe;border-radius:8px;padding:10px;font-size:13px;resize:none;box-sizing:border-box;"></textarea>
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Variation B</label>
              <textarea id="template2" rows="4" placeholder="Hey! Quick message regarding what you asked about..." style="width:100%;background:#fff;border:1px solid #ddd6fe;border-radius:8px;padding:10px;font-size:13px;resize:none;box-sizing:border-box;"></textarea>
            </div>
            <div>
              <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Variation C</label>
              <textarea id="template3" rows="4" placeholder="Hello! I noticed you were looking for recommendations..." style="width:100%;background:#fff;border:1px solid #ddd6fe;border-radius:8px;padding:10px;font-size:13px;resize:none;box-sizing:border-box;"></textarea>
            </div>
          </div>
          <button class="btn btn-primary" id="save-templates" style="width:100%;height:42px;background:#7c3aed;border:none;">Save Templates</button>
        </div>

        <!-- Automation Toggle -->
        <div style="background:#f0f9ff;border-radius:12px;padding:18px;border:1px solid #bfdbfe;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:20px;">
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="width:44px;height:44px;border-radius:12px;background:#3b82f6;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">🤖</div>
            <div>
              <div style="font-size:15px;font-weight:700;color:#0f172a;">Automated Outreach Engine</div>
              <div style="font-size:13px;color:#64748b;margin-top:2px;max-width:480px;line-height:1.5;">
                When ON, your account will automatically message qualified leads matching your keywords within daily limits.
              </div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;background:#fff;padding:10px 16px;border-radius:10px;border:1px solid #e2e8f0;">
            <span id="auto-outreach-label" style="font-size:13px;font-weight:800;color:#64748b;">OFF</span>
            <label class="toggle">
              <input type="checkbox" id="auto-outreach-toggle"/>
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <!-- ⏰ Auto-Post Content (Runs Every 30 Minutes) -->
        <div style="background:linear-gradient(135deg, #fefce8, #fffbeb);border-radius:14px;padding:20px;border:1.5px solid #fef08a;box-shadow:0 4px 15px rgba(234,179,8,0.08);">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:14px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:42px;height:42px;border-radius:12px;background:#eab308;color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">
                ⏰
              </div>
              <div>
                <div style="font-size:15px;font-weight:700;color:#854d0e;">Auto-Post Content (30-Min Automation)</div>
                <div style="font-size:12px;color:#a16207;margin-top:2px;">
                  Automatically broadcasts your post to all joined groups on a timer, even when you are away.
                </div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;background:#fff;padding:8px 16px;border-radius:10px;border:1px solid #fde047;">
              <span id="auto-post-label" style="font-size:13px;font-weight:800;color:#a16207;">OFF</span>
              <label class="toggle">
                <input type="checkbox" id="auto-post-toggle"/>
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <div class="form-group" style="margin-bottom:12px;">
            <label style="font-size:12px;font-weight:700;color:#854d0e;">Message / Content to Post</label>
            <textarea id="autopost-content" rows="4" placeholder="Enter the promotional post, offer, announcement, or link you want to automatically publish..." style="width:100%;background:#ffffff;border:1.5px solid #fef08a;border-radius:8px;padding:12px;font-size:13px;resize:vertical;box-sizing:border-box;outline:none;font-family:inherit;"></textarea>
          </div>

          <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:14px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <label style="font-size:12px;font-weight:700;color:#854d0e;white-space:nowrap;">Posting Interval:</label>
              <select id="autopost-interval-select" style="padding:8px 12px;border-radius:8px;border:1px solid #fde047;background:#fff;font-weight:600;font-size:13px;color:#854d0e;">
                <option value="15">Every 15 minutes</option>
                <option value="30" selected>Every 30 minutes (Recommended)</option>
                <option value="45">Every 45 minutes</option>
                <option value="60">Every 1 hour</option>
                <option value="120">Every 2 hours</option>
              </select>
            </div>
            <div id="autopost-last-status" style="font-size:12px;color:#a16207;font-weight:600;">
              Status: Ready
            </div>
          </div>

          <button class="btn btn-primary" id="btn-save-autopost" style="width:100%;height:42px;background:#eab308;border:none;color:#713f12;font-weight:700;font-size:14px;border-radius:8px;box-shadow:0 2px 8px rgba(234,179,8,0.25);">
            💾 Save & Apply Auto-Post Settings
          </button>
        </div>
      </div>

      <!-- ③ Danger Zone -->
      <div class="card" style="border-radius:16px;border:1.5px solid #fecaca;box-shadow:none;background:#fff5f5;">
        <div style="font-size:15px;font-weight:700;color:#dc2626;margin-bottom:8px;">⚠️ Danger Zone</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:14px;">Log out of Scoutrix. Your Telegram accounts will remain connected.</div>
        <button type="button" class="btn btn-danger" id="settings-logout-btn" onclick="window.logout()" style="height:42px;padding:0 24px;border-radius:10px;cursor:pointer;">
          Sign Out of Scoutrix
        </button>
      </div>

    </div>
  `;

  // --- Wire up logic ---
  loadSettingsAccountsList();
  refreshAccountCards();

  document.getElementById('btn-add-account').addEventListener('click', () => {
    document.getElementById('account-flow-container').style.display = 'block';
    renderApiForm();
  });

  document.getElementById('btn-close-flow').addEventListener('click', () => {
    document.getElementById('account-flow-container').style.display = 'none';
  });

  document.getElementById('max-msgs').addEventListener('input', (e) => {
    document.getElementById('max-msgs-val').textContent = e.target.value;
  });

  document.getElementById('auto-outreach-toggle').addEventListener('change', (e) => {
    const label = document.getElementById('auto-outreach-label');
    label.textContent = e.target.checked ? 'ON' : 'OFF';
    label.style.color = e.target.checked ? '#10b981' : '#64748b';
  });

  document.getElementById('auto-post-toggle')?.addEventListener('change', (e) => {
    const label = document.getElementById('auto-post-label');
    if (label) {
      label.textContent = e.target.checked ? 'ON' : 'OFF';
      label.style.color = e.target.checked ? '#15803d' : '#a16207';
    }
  });

  document.getElementById('btn-save-autopost')?.addEventListener('click', async () => {
    const accId = document.getElementById('settings-account-list').value;
    if (!accId) { showToast('Select an account first.', 'warning'); return; }
    
    const message = document.getElementById('autopost-content').value.trim();
    const enabled = document.getElementById('auto-post-toggle').checked;
    const interval = parseInt(document.getElementById('autopost-interval-select').value) || 30;

    if (enabled && !message) {
      showToast('Please enter the message content to post automatically.', 'warning');
      document.getElementById('autopost-content').focus();
      return;
    }

    const btn = document.getElementById('btn-save-autopost');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const r = await apiFetch('/settings/autopost/save', {
      method: 'POST',
      body: JSON.stringify({
        account_id: parseInt(accId),
        message: message,
        interval_minutes: interval,
        enabled: enabled
      })
    });

    btn.disabled = false;
    btn.textContent = '💾 Save & Apply Auto-Post Settings';

    if (r && r.success) {
      showToast(r.message || '✅ Auto-post settings saved!', 'success');
      loadSettings(accId);
    } else {
      showToast(r?.error || r?.detail || 'Failed to save auto-post settings.', 'error');
    }
  });

  document.getElementById('save-target').addEventListener('click', async () => {
    const accId = document.getElementById('settings-account-list').value;
    if (!accId) { showToast('Select an account first.', 'warning'); return; }
    const r = await apiFetch(`/settings/${accId}`, { method: 'PUT', body: JSON.stringify({
      target_niche: document.getElementById('target-niche').value,
      target_keywords: document.getElementById('target-keywords').value,
    })});
    showToast(r.success ? '✅ Targeting saved!' : 'Failed to save targeting.', r.success ? 'success' : 'error');
  });

  document.getElementById('save-limits').addEventListener('click', async () => {
    const accId = document.getElementById('settings-account-list').value;
    if (!accId) { showToast('Select an account first.', 'warning'); return; }
    const r = await apiFetch(`/settings/${accId}`, { method: 'PUT', body: JSON.stringify({
      max_messages_per_day: document.getElementById('max-msgs').value,
      min_delay_seconds: document.getElementById('min-delay').value,
      max_delay_seconds: document.getElementById('max-delay').value,
    })});
    showToast(r.success ? '✅ Safety limits updated!' : 'Failed to update limits.', r.success ? 'success' : 'error');
  });

  document.getElementById('save-templates').addEventListener('click', async () => {
    const accId = document.getElementById('settings-account-list').value;
    if (!accId) { showToast('Select an account first.', 'warning'); return; }
    const r = await apiFetch(`/settings/${accId}`, { method: 'PUT', body: JSON.stringify({
      outreach_template_1: document.getElementById('template1').value,
      outreach_template_2: document.getElementById('template2').value,
      outreach_template_3: document.getElementById('template3').value,
    })});
    showToast(r.success ? '✅ Templates saved!' : 'Failed to save templates.', r.success ? 'success' : 'error');
  });

  document.getElementById('settings-logout-btn')?.addEventListener('click', () => {
    logout();
  });
};

async function loadSettingsAccountsList() {
  const list = document.getElementById('settings-account-list');
  if (!list) return;
  const accounts = await apiFetch('/auth/accounts');
  if (!accounts || accounts.length === 0) {
    list.innerHTML = '<option value="">No accounts connected</option>';
    return;
  }
  list.innerHTML = accounts.map(a => `<option value="${a.id}">${a.session_name} (${a.phone || 'Active'})</option>`).join('');
  loadSettings(accounts[0].id);
  list.addEventListener('change', (e) => { if (e.target.value) loadSettings(e.target.value); });
}

async function loadSettings(accountId) {
  if (!accountId) return;
  const s = await apiFetch(`/settings/${accountId}`);
  if (!s || s.error) return;
  const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
  set('target-niche', s.target_niche);
  set('target-keywords', s.target_keywords);
  set('max-msgs', s.max_messages_per_day);
  set('min-delay', s.min_delay_seconds);
  set('max-delay', s.max_delay_seconds);
  set('template1', s.outreach_template_1);
  set('template2', s.outreach_template_2);
  set('template3', s.outreach_template_3);
  const val = document.getElementById('max-msgs-val');
  if (val) val.textContent = s.max_messages_per_day || 30;
  const toggle = document.getElementById('auto-outreach-toggle');
  const label = document.getElementById('auto-outreach-label');
  if (toggle && label) {
    const on = s.auto_outreach_enabled === 'true' || s.auto_outreach_enabled === true;
    toggle.checked = on;
    label.textContent = on ? 'ON' : 'OFF';
    label.style.color = on ? '#10b981' : '#64748b';
  }

  // Load Auto-Post status
  try {
    const ap = await apiFetch(`/settings/autopost/status/${accountId}`);
    if (ap) {
      const apToggle = document.getElementById('auto-post-toggle');
      const apLabel = document.getElementById('auto-post-label');
      const apContent = document.getElementById('autopost-content');
      const apInterval = document.getElementById('autopost-interval-select');
      const apStatus = document.getElementById('autopost-last-status');

      if (apToggle && apLabel) {
        apToggle.checked = !!ap.enabled;
        apLabel.textContent = ap.enabled ? 'ON' : 'OFF';
        apLabel.style.color = ap.enabled ? '#15803d' : '#a16207';
      }
      if (apContent && ap.message != null) apContent.value = ap.message;
      if (apInterval && ap.interval_minutes) apInterval.value = String(ap.interval_minutes);
      if (apStatus) {
        if (ap.last_status) {
          apStatus.textContent = `Last: ${ap.last_status}`;
        } else if (ap.enabled) {
          apStatus.textContent = `Status: Active (Every ${ap.interval_minutes || 30} mins)`;
        } else {
          apStatus.textContent = `Status: Ready`;
        }
      }
    }
  } catch (err) {
    console.warn('Auto-post status fetch error:', err);
  }
}

async function refreshAccountCards() {
  const container = document.getElementById('accounts-list');
  if (!container) return;
  const accounts = await apiFetch('/auth/accounts');
  if (!accounts || accounts.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:36px;color:#94a3b8;">
        <div style="font-size:40px;margin-bottom:10px;">📱</div>
        <div style="font-size:14px;font-weight:600;color:#475569;margin-bottom:6px;">No accounts connected yet</div>
        <p style="font-size:13px;margin:0;">Click <strong>+ Add Account</strong> above to connect your Telegram account.</p>
      </div>`;
    return;
  }
  container.innerHTML = '';
  for (const acc of accounts) {
    const status = await apiFetch(`/auth/status/${acc.id}`);
    const connected = status && status.connected;
    const card = document.createElement('div');
    card.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;margin-bottom:10px;';
    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:40px;height:40px;border-radius:50%;background:${connected ? '#dcfce7' : '#fee2e2'};display:flex;align-items:center;justify-content:center;font-size:20px;">
          ${connected ? '✅' : '⚠️'}
        </div>
        <div>
          <div style="font-weight:700;font-size:14px;color:#0f172a;">${escapeHtml(acc.session_name)}</div>
          <div style="font-size:12px;color:#64748b;">${escapeHtml(status?.phone || acc.phone || 'Ready')}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:12px;font-weight:700;padding:4px 12px;border-radius:20px;background:${connected ? '#dcfce7' : '#fee2e2'};color:${connected ? '#15803d' : '#dc2626'};">
          ${connected ? 'CONNECTED' : 'OFFLINE'}
        </span>
        ${!connected ? `<button class="btn btn-primary btn-sm" onclick="startLoginFlow(${acc.id}, '${acc.phone || ''}')">Reconnect</button>` : ''}
        <button class="btn btn-danger btn-sm" onclick="deleteAccount(${acc.id})">Remove</button>
      </div>`;
    container.appendChild(card);
  }
}

let currentAccountId = null, pendingPhone = null, pendingHash = null;

window.startLoginFlow = (accountId, phone) => {
  currentAccountId = accountId; pendingPhone = phone;
  document.getElementById('flow-title').textContent = `Reconnect Account #${accountId}`;
  document.getElementById('account-flow-container').style.display = 'block';
  renderPhoneForm(document.getElementById('auth-flow'));
};

window.deleteAccount = async (accountId) => {
  if (!confirm('Remove this account from Scoutrix?')) return;
  await apiFetch(`/auth/logout/${accountId}`, { method: 'POST' });
  showToast('Account removed.', 'info');
  refreshAccountCards();
};

function renderApiForm() {
  const c = document.getElementById('auth-flow');
  c.innerHTML = `
    <div class="form-group"><label style="font-size:13px;font-weight:600;">Account Label</label>
      <input type="text" id="new-acc-name" placeholder="e.g. Sales Account 1"/></div>
    <div class="form-group"><label style="font-size:13px;font-weight:600;">Phone Number (with country code)</label>
      <div style="display:flex;gap:10px;">
        <input type="tel" id="phone-input" style="flex:1;" placeholder="+1234567890"/>
        <button class="btn btn-primary" id="send-code-btn">Send Code →</button>
      </div></div>`;
  document.getElementById('send-code-btn').addEventListener('click', async () => {
    const name = document.getElementById('new-acc-name').value.trim();
    const phone = document.getElementById('phone-input').value.trim().replace(/\s+/g,'');
    if (!name || !phone) { showToast('Enter both label and phone number.', 'warning'); return; }
    const btn = document.getElementById('send-code-btn');
    btn.disabled = true; btn.textContent = 'Sending...';
    const res = await apiFetch(`/auth/add?session_name=${encodeURIComponent(name)}`, { method: 'POST' });
    if (res.account_id) {
      currentAccountId = res.account_id;
      refreshAccountCards();
      const r = await apiFetch('/auth/send-code', { method: 'POST', body: JSON.stringify({ account_id: currentAccountId, phone }) });
      btn.disabled = false; btn.textContent = 'Send Code →';
      if (r.success) { pendingPhone = phone; pendingHash = r.phone_code_hash; showToast('Code sent!', 'success'); renderCodeForm(c); }
      else showToast(`Failed: ${r.error || r.detail}`, 'error');
    } else { btn.disabled = false; btn.textContent = 'Send Code →'; showToast('Failed to create account.', 'error'); }
  });
}

function renderPhoneForm(c) {
  c.innerHTML = `
    <div class="form-group"><label style="font-size:13px;font-weight:600;">Phone Number (with country code)</label>
      <div style="display:flex;gap:10px;">
        <input type="tel" id="phone-input" style="flex:1;" placeholder="+1234567890" value="${pendingPhone || ''}"/>
        <button class="btn btn-primary" id="send-code-btn">Send Code →</button>
      </div>
      <p style="font-size:12px;color:#64748b;margin-top:4px;">Include the '+' and country code e.g. +14155552671</p></div>`;
  document.getElementById('send-code-btn').addEventListener('click', async () => {
    const phone = document.getElementById('phone-input').value.trim().replace(/\s+/g,'');
    if (!phone) { showToast('Enter your phone number.', 'warning'); return; }
    const btn = document.getElementById('send-code-btn');
    btn.disabled = true; btn.textContent = 'Sending...';
    const r = await apiFetch('/auth/send-code', { method: 'POST', body: JSON.stringify({ account_id: currentAccountId, phone }) });
    btn.disabled = false; btn.textContent = 'Send Code →';
    if (r.success) { pendingPhone = phone; pendingHash = r.phone_code_hash; showToast('Code sent!', 'success'); renderCodeForm(c); }
    else showToast(`Failed: ${r.error || r.detail}`, 'error');
  });
}

function renderCodeForm(c) {
  c.innerHTML = `
    <div class="form-group"><label style="font-size:13px;font-weight:600;">Verification Code</label>
      <input type="text" id="otp-input" placeholder="Enter code from Telegram" autocomplete="one-time-code" style="text-align:center;font-size:22px;letter-spacing:8px;font-weight:700;"/></div>
    <div class="form-group" id="settings-2fa-group" style="display:none;"><label style="font-size:13px;font-weight:600;">🔒 2FA Password</label>
      <input type="password" id="2fa-input" placeholder="Enter your 2FA password"/></div>
    <button class="btn btn-primary" id="verify-code-btn" style="width:100%;height:44px;">Verify & Connect →</button>
    <button class="btn btn-ghost btn-sm" id="back-to-phone" style="width:100%;margin-top:8px;">← Change Number</button>`;
  document.getElementById('verify-code-btn').addEventListener('click', async () => {
    const code = document.getElementById('otp-input').value.trim();
    const password = document.getElementById('2fa-input').value.trim();
    if (!code) { showToast('Enter the verification code.', 'warning'); return; }
    const btn = document.getElementById('verify-code-btn');
    btn.disabled = true; btn.textContent = 'Connecting...';
    const r = await apiFetch('/auth/verify-code', { method: 'POST', body: JSON.stringify({
      account_id: currentAccountId, phone: pendingPhone, code, phone_code_hash: pendingHash, password: password || null
    })});
    btn.disabled = false; btn.textContent = 'Verify & Connect →';
    if (r.success) {
      showToast('✅ Account connected successfully!', 'success');
      document.getElementById('account-flow-container').style.display = 'none';
      refreshAccountCards();
      loadSettingsAccountsList();
    } else {
      const err = (r.detail || r.error || '').toLowerCase();
      if (err.includes('2fa') || err.includes('two-step') || err.includes('password')) {
        document.getElementById('settings-2fa-group').style.display = 'block';
        showToast('2FA required. Enter your password above.', 'info');
      } else showToast(`Verification failed: ${err}`, 'error');
    }
  });
  document.getElementById('back-to-phone').addEventListener('click', () => renderPhoneForm(c));
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
