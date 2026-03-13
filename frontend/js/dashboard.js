/**
 * Dashboard Page — Stats, Command Box, Quick Actions, Activity Feed
 */

function renderDashboard(container) {
  container.innerHTML = `
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-end">
      <div>
        <h1 class="page-title">📡 Dashboard</h1>
        <p class="page-subtitle">Orbit AI — Global lead intelligence overview</p>
      </div>
      <div id="active-account-picker" style="margin-bottom:10px">
        <!-- Account selector will be injected here -->
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-grid" id="stats-grid">
      ${[1,2,3,4].map(() => `
        <div class="stat-card">
          <div class="stat-icon">⏳</div>
          <div class="stat-value">—</div>
          <div class="stat-label">Loading...</div>
        </div>
      `).join('')}
    </div>

    <!-- Quick Discovery Card -->
    <div class="card mb-24" style="background: linear-gradient(135deg, rgba(139,92,246,0.1), rgba(139,92,246,0.02)); border-left: 4px solid var(--accent-primary)">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div class="stat-icon" style="background:var(--accent-primary); color:white">🔍</div>
          <div>
            <h3 style="margin:0">Find New Leads</h3>
            <p style="margin:0; font-size:12px; color:var(--text-secondary)">Search and join Telegram groups specifically for your niche.</p>
          </div>
        </div>
        <button class="btn btn-primary" onclick="navigate('discovery')">Open Group Finder →</button>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions mb-24">
      <button class="btn btn-primary" id="btn-scan">🔍 Scan Groups</button>
      <button class="btn btn-secondary" id="btn-msg">📨 Message 10 Leads</button>
      <button class="btn btn-secondary" id="btn-broadcast">📢 Broadcast to Groups</button>
      <button class="btn btn-secondary" id="btn-followup">🔄 Follow Up</button>
      <button class="btn btn-ghost" id="btn-interested">⭐ Show Interested</button>
      <button class="btn btn-danger btn-sm" id="btn-pause">⏸ Pause</button>
      <button class="btn btn-success btn-sm" id="btn-resume">▶ Resume</button>
    </div>

    <!-- Grid: Activity + Weekly Chart -->
    <div class="grid-2">
      <div class="card">
        <div class="card-title">📋 Recent Activity</div>
        <div class="activity-feed" id="activity-feed">
          <div class="empty-state" style="padding:20px">
            <span class="icon" style="font-size:28px">📭</span>
            <p>No activity yet. Start by scanning groups!</p>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">📊 Weekly Activity</div>
        <div id="weekly-chart" style="padding: 20px 0">Loading...</div>
      </div>
    </div>
  `;

  loadDashboardSummary();
  loadActivityFeed();
  loadWeeklyChart();
  refreshAccountPicker();
  
  // Register refresh callback
  window._dashboardRefresh = () => {
      loadDashboardSummary();
      refreshAccountPicker();
  };



  // Quick action buttons
  document.getElementById('btn-scan').addEventListener('click', async (e) => {
    const accId = getActiveAccountId();
    if (!accId) return;
    const btn = e.currentTarget;
    const oldText = btn.textContent;
    btn.disabled = true; btn.textContent = '🔍 Starting...';
    showToast('🔍 Starting group scan...', 'info');
    const r = await apiFetch('/commands/execute', { method: 'POST', body: JSON.stringify({ account_id: accId, text: 'Scan groups for leads' }) });
    btn.disabled = false; btn.textContent = oldText;
    if (!r.success && r.error) showToast(r.error, 'error');
  });

  document.getElementById('btn-msg').addEventListener('click', async (e) => {
    const accId = getActiveAccountId();
    if (!accId) return;
    const btn = e.currentTarget;
    const oldText = btn.textContent;
    btn.disabled = true; btn.textContent = '📨 Sending...';
    showToast('📨 Sending to 10 new leads...', 'info');
    const r = await apiFetch('/commands/execute', { method: 'POST', body: JSON.stringify({ account_id: accId, text: 'Message 10 new leads' }) });
    btn.disabled = false; btn.textContent = oldText;
    if (!r.success && r.error) showToast(r.error, 'error');
  });

  document.getElementById('btn-broadcast').addEventListener('click', async (e) => {
    navigate('broadcast');
  });

  document.getElementById('btn-followup').addEventListener('click', async (e) => {
    const accId = getActiveAccountId();
    if (!accId) return;
    const btn = e.currentTarget;
    const oldText = btn.textContent;
    btn.disabled = true; btn.textContent = '🔄 Processing...';
    const r = await apiFetch('/commands/execute', { method: 'POST', body: JSON.stringify({ account_id: accId, text: 'Follow up with replied leads' }) });
    btn.disabled = false; btn.textContent = oldText;
    showToast(r.message || r.status || 'Follow-up started', r.success || r.status ? 'success' : 'warning');
  });

  document.getElementById('btn-interested').addEventListener('click', () => navigate('leads'));

  document.getElementById('btn-pause').addEventListener('click', async () => {
    const accId = getActiveAccountId();
    if (!accId) return;
    await apiFetch(`/settings/pause/${accId}`, { method: 'POST' });
    showToast('⏸️ Messaging paused', 'warning');
  });

  document.getElementById('btn-resume').addEventListener('click', async () => {
    const accId = getActiveAccountId();
    if (!accId) return;
    await apiFetch(`/settings/resume/${accId}`, { method: 'POST' });
    showToast('▶️ Messaging resumed', 'success');
  });
}

function getActiveAccountId() {
    // Check localStorage first
    const last = localStorage.getItem('last_active_account');
    if (last) return parseInt(last);
    return null;
}

async function refreshAccountPicker() {
    const container = document.getElementById('active-account-picker');
    if (!container) return;

    const accounts = await apiFetch('/auth/accounts');
    
    if (!accounts || accounts.length === 0) {
        container.innerHTML = `<span style="font-size:12px;color:var(--danger)">No sessions linked.</span>`;
        return;
    }

    let accountId = getActiveAccountId();
    if (!accountId) {
        accountId = accounts[0].id;
        localStorage.setItem('last_active_account', accountId);
    }

    // Fetch profile for this account
    const res = await apiFetch(`/chats/me?account_id=${accountId}`);
    if (res && res.success && res.me) {
        const me = res.me;
        container.innerHTML = `
            <div class="dash-profile-pill">
                <img src="${getFullAvatarUrl(me.avatar_path) || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 48 48\'%3E%3Crect width=\'48\' height=\'48\' fill=\'%23333\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23666\' font-size=\'16\'%3E${me.first_name[0]}%3C/text%3E%3C/svg%3E'}" class="pill-avatar">
                <div class="pill-info">
                    <div class="pill-name">${me.first_name}</div>
                    <div class="pill-status">${me.username ? '@'+me.username : 'Active'}</div>
                </div>
            </div>
        `;
    } else {
        // Fallback to session name if profile fetch fails
        const acc = accounts.find(a => a.id === accountId) || accounts[0];
        container.innerHTML = `
            <div class="dash-profile-pill">
                <div class="pill-icon">👤</div>
                <div class="pill-info">
                    <div class="pill-name">${acc.session_name}</div>
                    <div class="pill-status">Orbit Active</div>
                </div>
            </div>
        `;
    }
}

async function loadDashboardSummary() {
  const data = await apiFetch('/dashboard/summary');
  if (!data || data.error) return;

  const statsConfig = [
    { icon: '👥', value: data.total_leads, label: 'Total Leads Found', accent: 'var(--blue-primary)' },
    { icon: '📨', value: data.messages_sent_today, label: 'Sent Today', accent: 'var(--purple)' },
    { icon: '💬', value: data.replies_today || data.replied, label: 'Total Replies', accent: 'var(--warning)' },
    { icon: '⭐', value: data.accounts_count, label: 'Active Accounts', accent: 'var(--success)' },
  ];

  document.getElementById('stats-grid').innerHTML = statsConfig.map(s => `
    <div class="stat-card" style="--accent:${s.accent}">
      <div class="stat-icon">${s.icon}</div>
      <div class="stat-value">${s.value ?? 0}</div>
      <div class="stat-label">${s.label}</div>
    </div>
  `).join('');
}

async function loadActivityFeed() {
  const data = await apiFetch('/dashboard/stats');
  if (!data || data.error) return;

  const feed = document.getElementById('activity-feed');
  if (!data.recent_activity || data.recent_activity.length === 0) return;

  feed.innerHTML = data.recent_activity.map(a => `
    <div class="activity-item ${a.success ? '' : 'error'}">
      <span class="activity-icon">${activityIcon(a.action)}</span>
      <span class="activity-text">${a.detail}</span>
      <span class="activity-time">${timeAgo(a.timestamp)}</span>
    </div>
  `).join('');
}

function activityIcon(type) {
  const icons = { scan: '🔍', message: '📨', followup: '🔄', reply: '💬', auth: '🔐', error: '❌', pause: '⏸️', resume: '▶️', monitor: '👁️' };
  return icons[type] || '📋';
}

async function loadWeeklyChart() {
  const data = await apiFetch('/dashboard/weekly-stats');
  const container = document.getElementById('weekly-chart');
  if (!data || !data.length) { container.innerHTML = '<p style="color:var(--text-muted);font-size:13px">No data yet.</p>'; return; }

  const maxMsgs = Math.max(...data.map(d => d.messages), 1);
  const maxLeads = Math.max(...data.map(d => d.leads), 1);

  container.innerHTML = `
    <div style="display:flex;align-items:flex-end;gap:10px;height:120px;position:relative">
      ${data.map(d => `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
          <div style="display:flex;gap:2px;align-items:flex-end;width:100%;max-width:32px">
            <div title="${d.messages} messages" style="flex:1;background:var(--blue-primary);border-radius:3px 3px 0 0;height:${Math.round((d.messages/maxMsgs)*90)+4}px;transition:height 0.4s;opacity:0.85"></div>
            <div title="${d.leads} leads" style="flex:1;background:var(--success);border-radius:3px 3px 0 0;height:${Math.round((d.leads/maxLeads)*90)+4}px;transition:height 0.4s;opacity:0.85"></div>
          </div>
          <span style="font-size:11px;color:var(--text-muted)">${d.label}</span>
        </div>
      `).join('')}
    </div>
    <div style="display:flex;gap:16px;margin-top:12px;font-size:12px;color:var(--text-secondary)">
      <span><span style="color:var(--blue-primary)">■</span> Messages</span>
      <span><span style="color:var(--success)">■</span> Leads</span>
    </div>
  `;
}
