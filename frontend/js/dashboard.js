/**
 * Scoutrix — Executive Dashboard
 * Enterprise Telegram scouting, metrics telemetry, activity audit & controls
 */

window.renderDashboard = function(container) {
  container.innerHTML = `
    <div style="max-width:1100px;margin:0 auto;">

      <!-- Header & Active Session Status -->
      <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:16px;margin-bottom:28px;">
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 8px rgba(16,185,129,0.6);"></span>
            <span style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;">Telethon Core Live</span>
          </div>
          <h1 style="font-size:28px;font-weight:900;color:#0f172a;letter-spacing:-0.03em;margin:0;">
            Operations Dashboard
          </h1>
          <p style="font-size:14px;color:#64748b;margin:4px 0 0 0;">
            Live telemetry, group broadcasting, and audience scouting overview.
          </p>
        </div>
        <div id="active-account-picker"></div>
      </div>

      <!-- Telemetry Metric Cards -->
      <div id="stats-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:24px;">
        ${[1,2,3,4].map(() => `
          <div class="card" style="padding:20px;border-radius:14px;border:1px solid #e2e8f0;background:#ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <span style="font-size:13px;font-weight:600;color:#64748b;">Loading metric...</span>
              <span style="font-size:16px;">⏳</span>
            </div>
            <div style="font-size:32px;font-weight:900;color:#0f172a;letter-spacing:-0.03em;">—</div>
          </div>
        `).join('')}
      </div>

      <!-- Quick Operations Bar -->
      <div class="card" style="padding:18px 20px;border-radius:14px;border:1px solid #e2e8f0;background:#ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.04);margin-bottom:24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <button class="btn btn-primary" id="btn-scan" style="height:40px;padding:0 18px;border-radius:9px;background:#0f172a;color:#fff;font-weight:700;font-size:13px;border:none;box-shadow:0 2px 6px rgba(15,23,42,0.15);">
              🔍 Scan Joined Groups
            </button>
            <button class="btn btn-secondary" id="btn-broadcast" style="height:40px;padding:0 18px;border-radius:9px;background:#f8fafc;border:1.5px solid #e2e8f0;color:#0f172a;font-weight:700;font-size:13px;">
              📢 Group Broadcast
            </button>
            <button class="btn btn-secondary" id="btn-followup" style="height:40px;padding:0 18px;border-radius:9px;background:#f8fafc;border:1.5px solid #e2e8f0;color:#0f172a;font-weight:700;font-size:13px;">
              🔄 Process Follow-Ups
            </button>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <button class="btn btn-ghost btn-sm" id="btn-pause" style="padding:8px 14px;border-radius:8px;font-size:12px;font-weight:700;color:#b45309;background:#fffbeb;border:1px solid #fde68a;">
              ⏸ Pause Outbound
            </button>
            <button class="btn btn-ghost btn-sm" id="btn-resume" style="padding:8px 14px;border-radius:8px;font-size:12px;font-weight:700;color:#15803d;background:#f0fdf4;border:1px solid #bbf7d0;">
              ▶ Resume Outbound
            </button>
          </div>
        </div>
      </div>

      <!-- Main Operational Deck: Activity & Volume -->
      <div class="responsive-grid-deck" style="gap:20px;">
        
        <!-- Live Audit Activity Feed -->
        <div class="card" style="padding:22px;border-radius:14px;border:1px solid #e2e8f0;background:#ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <div>
              <div style="font-size:15px;font-weight:800;color:#0f172a;">Live Transmission Log</div>
              <div style="font-size:12px;color:#64748b;margin-top:2px;">Real-time system events, scans, and messages.</div>
            </div>
            <span style="font-size:11px;font-weight:700;background:#f1f5f9;color:#475569;padding:3px 8px;border-radius:6px;">AUDIT TRAIL</span>
          </div>
          <div class="activity-feed" id="activity-feed" style="max-height:360px;overflow-y:auto;">
            <div style="padding:48px;text-align:center;color:#94a3b8;">
              <div style="font-size:32px;margin-bottom:8px;opacity:0.4;">📭</div>
              <p style="font-size:13px;margin:0;font-weight:600;">No activity recorded yet.</p>
              <span style="font-size:12px;color:#94a3b8;">Start a group scan or broadcast to populate live events.</span>
            </div>
          </div>
        </div>

        <!-- Weekly Transmission Chart -->
        <div class="card" style="padding:22px;border-radius:14px;border:1px solid #e2e8f0;background:#ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.04);display:flex;flex-direction:column;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <div>
              <div style="font-size:15px;font-weight:800;color:#0f172a;">Weekly Performance</div>
              <div style="font-size:12px;color:#64748b;margin-top:2px;">Outreach volume vs captured identities.</div>
            </div>
            <span style="font-size:11px;font-weight:700;background:#eff6ff;color:#2563eb;padding:3px 8px;border-radius:6px;">7-DAY METRICS</span>
          </div>
          <div id="weekly-chart" style="flex:1;min-height:220px;display:flex;align-items:flex-end;justify-content:center;color:#94a3b8;font-size:13px;">
            <div class="spinner" style="border-top-color:#3b82f6;"></div>
          </div>
        </div>

      </div>
    </div>
  `;

  // Load all telemetry
  loadDashboardStats();
  loadActivityFeed();
  loadWeeklyChart();
  loadAccountPill();

  window._dashboardRefresh = () => {
    loadDashboardStats();
    loadActivityFeed();
    loadAccountPill();
  };

  // Quick Action Handlers
  document.getElementById('btn-scan')?.addEventListener('click', async (e) => {
    const accId = getActiveAccountId();
    if (!accId) { showToast('No active account linked. Go to Settings.', 'warning'); return; }
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;display:inline-block;margin-right:6px;border-top-color:#fff;"></span> Scanning...';
    showToast('Starting group sector scan...', 'info');
    const r = await apiFetch('/dashboard/scan', { method: 'POST', body: JSON.stringify({ account_id: accId }) });
    btn.disabled = false;
    btn.innerHTML = '🔍 Scan Joined Groups';
    if (r && r.success) {
      showToast('✅ Group scan initiated in background!', 'success');
      setTimeout(loadActivityFeed, 1500);
    } else {
      showToast(r?.error || 'Scan initialization failed.', 'error');
    }
  });

  document.getElementById('btn-broadcast')?.addEventListener('click', () => navigate('broadcast'));

  document.getElementById('btn-followup')?.addEventListener('click', async (e) => {
    const accId = getActiveAccountId();
    if (!accId) { showToast('No active account linked.', 'warning'); return; }
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;display:inline-block;margin-right:6px;border-top-color:#fff;"></span> Processing...';
    const r = await apiFetch('/dashboard/followup', { method: 'POST', body: JSON.stringify({ account_id: accId }) });
    btn.disabled = false;
    btn.innerHTML = '🔄 Process Follow-Ups';
    showToast(r?.message || (r?.success ? '✅ Follow-up task deployed!' : 'Follow-up failed.'), r?.success ? 'success' : 'warning');
    if (r?.success) setTimeout(loadActivityFeed, 1500);
  });

  document.getElementById('btn-pause')?.addEventListener('click', async () => {
    const accId = getActiveAccountId();
    if (!accId) return;
    await apiFetch(`/settings/pause/${accId}`, { method: 'POST' });
    showToast('⏸ Outbound messaging paused.', 'warning');
  });

  document.getElementById('btn-resume')?.addEventListener('click', async () => {
    const accId = getActiveAccountId();
    if (!accId) return;
    await apiFetch(`/settings/resume/${accId}`, { method: 'POST' });
    showToast('▶ Outbound messaging resumed.', 'success');
  });
};

async function loadAccountPill() {
  const container = document.getElementById('active-account-picker');
  if (!container) return;

  const accounts = await apiFetch('/auth/accounts');
  if (!accounts || accounts.length === 0) {
    container.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;">
        <span style="font-size:12px;font-weight:700;color:#dc2626;">No Telegram Sessions</span>
        <button onclick="navigate('settings')" style="background:#dc2626;color:#fff;border:none;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">Connect →</button>
      </div>`;
    return;
  }

  let accountId = getActiveAccountId();
  if (!accountId) {
    accountId = accounts[0].id;
    localStorage.setItem('last_active_account', accountId);
  }

  const acc = accounts.find(a => a.id === accountId) || accounts[0];
  const initial = (acc.session_name || acc.phone || 'A')[0].toUpperCase();

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;background:#ffffff;border:1.5px solid #e2e8f0;border-radius:12px;padding:6px 14px;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
      <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#0284c7,#2563eb);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px;flex-shrink:0;">
        ${initial}
      </div>
      <div>
        <div style="font-size:13px;font-weight:800;color:#0f172a;line-height:1.2;">${escapeHtml(acc.session_name || acc.phone || 'Session')}</div>
        <div style="font-size:11px;color:#16a34a;font-weight:700;display:flex;align-items:center;gap:4px;margin-top:2px;">
          <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#16a34a;"></span> Connected
        </div>
      </div>
    </div>
  `;
}

async function loadDashboardStats() {
  const data = await apiFetch('/dashboard/summary');
  if (!data || data.error) return;

  const stats = [
    { title: 'Audience Captured', value: data.total_leads ?? 0, badge: 'LEADS', color: '#2563eb', bg: '#eff6ff' },
    { title: 'Transmissions Today', value: data.messages_sent_today ?? 0, badge: 'OUTBOUND', color: '#7c3aed', bg: '#f5f3ff' },
    { title: 'Inbound Responses', value: data.replies_today ?? 0, badge: 'REPLIES', color: '#d97706', bg: '#fffbeb' },
    { title: 'Active Telegram Links', value: data.accounts_count ?? 0, badge: 'NODES', color: '#16a34a', bg: '#f0fdf4' },
  ];

  const grid = document.getElementById('stats-grid');
  if (!grid) return;

  grid.innerHTML = stats.map(s => `
    <div class="card" style="padding:20px;border-radius:14px;border:1px solid #e2e8f0;background:#ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.04);transition:transform 0.2s,box-shadow 0.2s;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">${s.title}</span>
        <span style="font-size:10px;font-weight:800;color:${s.color};background:${s.bg};padding:3px 7px;border-radius:5px;letter-spacing:0.05em;">${s.badge}</span>
      </div>
      <div style="font-size:32px;font-weight:900;color:#0f172a;letter-spacing:-0.03em;font-family:'Outfit',sans-serif;">
        ${s.value.toLocaleString()}
      </div>
    </div>
  `).join('');
}

async function loadActivityFeed() {
  const data = await apiFetch('/dashboard/stats');
  if (!data || data.error) return;
  const feed = document.getElementById('activity-feed');
  if (!feed || !data.recent_activity || data.recent_activity.length === 0) return;

  feed.innerHTML = data.recent_activity.map(a => {
    const isSuccess = a.success;
    return `
      <div style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid #f1f5f9;">
        <span style="font-size:16px;line-height:1.2;flex-shrink:0;">${isSuccess ? '🔹' : '⚠️'}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:600;color:#0f172a;word-break:break-word;">${escapeHtml(a.detail)}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:2px;font-family:monospace;">${timeAgo(a.timestamp)}</div>
        </div>
      </div>`;
  }).join('');
}

async function loadWeeklyChart() {
  const data = await apiFetch('/dashboard/weekly-stats');
  const container = document.getElementById('weekly-chart');
  if (!container) return;
  if (!data || !data.length) {
    container.innerHTML = `<p style="color:#94a3b8;font-size:13px;margin:auto;">No weekly history recorded yet.</p>`;
    return;
  }

  const maxMsgs  = Math.max(...data.map(d => d.messages), 1);
  const maxLeads = Math.max(...data.map(d => d.leads), 1);

  container.innerHTML = `
    <div style="width:100%;display:flex;flex-direction:column;justify-content:flex-end;">
      <div style="display:flex;align-items:flex-end;gap:12px;height:140px;padding-bottom:8px;border-bottom:1px solid #f1f5f9;">
        ${data.map(d => `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
            <div style="display:flex;gap:3px;align-items:flex-end;width:100%;max-width:32px;">
              <div title="${d.messages} transmissions" style="flex:1;background:#2563eb;border-radius:4px 4px 0 0;height:${Math.round((d.messages/maxMsgs)*110)+4}px;transition:height 0.4s;"></div>
              <div title="${d.leads} identities"    style="flex:1;background:#10b981;border-radius:4px 4px 0 0;height:${Math.round((d.leads/maxLeads)*110)+4}px;transition:height 0.4s;"></div>
            </div>
            <span style="font-size:11px;font-weight:700;color:#64748b;">${d.label}</span>
          </div>
        `).join('')}
      </div>
      <div style="display:flex;justify-content:center;gap:20px;margin-top:12px;font-size:12px;color:#64748b;font-weight:600;">
        <span style="display:flex;align-items:center;gap:6px;"><span style="display:inline-block;width:10px;height:10px;background:#2563eb;border-radius:2px;"></span> Transmissions</span>
        <span style="display:flex;align-items:center;gap:6px;"><span style="display:inline-block;width:10px;height:10px;background:#10b981;border-radius:2px;"></span> Captured Leads</span>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
