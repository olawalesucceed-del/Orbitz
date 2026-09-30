/**
 * Scoutrix — Broadcast Page
 * Send a message to all groups joined by the selected Telegram account.
 */

window.renderBroadcast = function(container) {
  container.innerHTML = `
    <div style="max-width:900px;margin:0 auto;">

      <!-- Header -->
      <div style="margin-bottom:28px;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:12px;">
        <div>
          <h1 style="font-size:26px;font-weight:800;color:#0f172a;margin:0;">📢 Group Broadcast</h1>
          <p style="font-size:14px;color:#64748b;margin:6px 0 0 0;">Send announcements to all groups joined by your Telegram account.</p>
        </div>
        <div id="broadcast-account-picker"></div>
      </div>

      <div class="responsive-grid-deck" style="gap:24px;">

        <!-- Composer -->
        <div class="card" style="border:none;box-shadow:0 4px 20px rgba(0,0,0,0.05);border-radius:16px;display:flex;flex-direction:column;">
          <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:16px;">✏️ Compose Message</div>

          <textarea id="broadcast-content" rows="10"
            placeholder="Write your broadcast message here...&#10;&#10;You can include links, announcements, or promotional text."
            style="resize:vertical;font-size:14px;line-height:1.6;border:1.5px solid #e2e8f0;border-radius:10px;padding:14px;width:100%;box-sizing:border-box;outline:none;font-family:inherit;"></textarea>

          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;margin-bottom:18px;">
            <span style="font-size:12px;color:#94a3b8;">Standard Telegram formatting supported</span>
            <span id="char-count" style="font-size:12px;font-weight:600;color:#64748b;">0 characters</span>
          </div>

          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 14px;margin-bottom:18px;font-size:13px;color:#1e40af;line-height:1.5;">
            ℹ️ This message will be sent to <strong>all groups</strong> your selected account is currently a member of.
          </div>

          <button class="btn btn-primary" id="btn-do-broadcast" style="width:100%;height:46px;font-size:15px;font-weight:700;border-radius:12px;margin-top:auto;">
            🚀 Send Broadcast
          </button>
        </div>

        <!-- History / Logs -->
        <div class="card" style="border:none;box-shadow:0 4px 20px rgba(0,0,0,0.05);border-radius:16px;">
          <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:16px;">📋 Broadcast History</div>
          <div id="broadcast-activity" style="max-height:420px;overflow-y:auto;">
            <div style="padding:48px 20px;text-align:center;color:#94a3b8;">
              <div style="font-size:36px;margin-bottom:10px;opacity:0.5;">📢</div>
              <div style="font-size:13px;font-weight:600;">No broadcasts sent yet</div>
              <p style="font-size:12px;margin-top:4px;">Your broadcast history will appear here.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  const picker    = container.querySelector('#broadcast-account-picker');
  const btnSend   = container.querySelector('#btn-do-broadcast');
  const textarea  = container.querySelector('#broadcast-content');
  const charCount = container.querySelector('#char-count');
  const activity  = container.querySelector('#broadcast-activity');
  let activeAccountId = null;

  textarea.addEventListener('input', () => {
    charCount.textContent = `${textarea.value.length} characters`;
  });

  // Load accounts into picker
  async function loadAccounts() {
    const accounts = await apiFetch('/auth/accounts');
    if (!Array.isArray(accounts) || accounts.length === 0) {
      picker.innerHTML = `<span style="font-size:12px;font-weight:600;color:#ef4444;">⚠ No accounts connected. Go to Settings first.</span>`;
      btnSend.disabled = true;
      return;
    }
    picker.innerHTML = `
      <select id="broadcast-acc-select" style="padding:9px 14px;border-radius:10px;border:1.5px solid #e2e8f0;font-size:14px;font-weight:600;background:#fff;min-width:200px;">
        ${accounts.map(a => `<option value="${a.id}">${a.session_name} (${a.phone || 'Active'})</option>`).join('')}
      </select>`;
    activeAccountId = accounts[0].id;
    localStorage.setItem('last_active_account', activeAccountId);
    picker.querySelector('select').addEventListener('change', (e) => {
      activeAccountId = parseInt(e.target.value);
      localStorage.setItem('last_active_account', activeAccountId);
      loadHistory();
    });
    loadHistory();
  }

  // Load broadcast history from activity logs
  async function loadHistory() {
    activity.innerHTML = `<div style="display:flex;justify-content:center;padding:40px;"><div class="spinner" style="border-top-color:#3b82f6;"></div></div>`;
    const data = await apiFetch('/dashboard/stats');
    if (data && data.recent_activity && data.recent_activity.length > 0) {
      const logs = data.recent_activity.filter(l => l.action === 'broadcast' || l.action === 'message');
      if (logs.length > 0) {
        activity.innerHTML = logs.map(l => `
          <div class="activity-item ${l.success ? '' : 'error'}" style="margin-bottom:4px;">
            <span class="activity-icon">${l.action === 'broadcast' ? '📢' : '📨'}</span>
            <span class="activity-text">${escapeHtml(l.detail)}</span>
            <span class="activity-time">${timeAgo(l.timestamp)}</span>
          </div>`).join('');
        return;
      }
    }
    activity.innerHTML = `
      <div style="padding:40px 20px;text-align:center;color:#94a3b8;">
        <div style="font-size:32px;margin-bottom:8px;opacity:0.5;">📢</div>
        <div style="font-size:13px;font-weight:600;">No broadcast history yet</div>
      </div>`;
  }

  // Send broadcast
  btnSend.addEventListener('click', async () => {
    const msg = textarea.value.trim();
    if (!msg) { showToast('Please write a message before broadcasting.', 'warning'); textarea.focus(); return; }
    if (!activeAccountId) { showToast('Please select a Telegram account.', 'error'); return; }

    btnSend.disabled = true;
    btnSend.innerHTML = '<div class="spinner" style="width:16px;height:16px;display:inline-block;margin-right:8px;border-top-color:#fff;vertical-align:middle;"></div> Broadcasting...';
    showToast('🚀 Sending broadcast...', 'info');

    const res = await apiFetch('/settings/broadcast', {
      method: 'POST',
      body: JSON.stringify({ account_id: activeAccountId, message: msg })
    });

    btnSend.disabled = false;
    btnSend.innerHTML = '🚀 Send Broadcast';

    if (res && res.success) {
      showToast(res.message || '✅ Broadcast sent successfully!', 'success');
      textarea.value = '';
      charCount.textContent = '0 characters';
      setTimeout(loadHistory, 1500);
    } else {
      showToast(res?.error || res?.detail || 'Broadcast failed. Check your Telegram connection.', 'error');
    }
  });

  loadAccounts();
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
