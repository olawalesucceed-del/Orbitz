/**
 * Discovery Page — Search and Join Telegram Groups
 * Fixed: account selector, asyncio import on backend, live WS group log
 */

function renderDiscovery(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">🔍 Group Finder</h1>
        <p class="page-subtitle">Search Telegram globally for any niche or community. Scoutrix joins groups and automatically scans them for buyers.</p>
      </div>
    </div>

    <div class="grid-2" style="gap:20px; margin-bottom:24px;">

      <!-- ── Discovery Console ───────────────────────────────── -->
      <div class="card">
        <div class="card-title" style="margin-bottom:18px;">🚀 Discovery Console</div>

        <div class="form-group mb-16">
          <label>🎯 Account</label>
          <select id="disc-acc-select">
            <option value="">Loading accounts...</option>
          </select>
        </div>

        <div class="form-group mb-16">
          <label>🔑 Target Niches <span style="font-weight:400; color:var(--text-muted);">(comma-separated)</span></label>
          <input type="text" id="disc-keyword"
            placeholder='e.g. "IPTV, Crypto, Fashion, Tech News"' />
        </div>

        <div class="grid-2" style="gap:12px; margin-bottom:16px;">
          <div class="form-group" style="margin-bottom:0;">
            <label>📊 Max Groups to Join</label>
            <select id="disc-limit">
              <option value="3">3 groups</option>
              <option value="5" selected>5 groups</option>
              <option value="10">10 groups</option>
              <option value="20">20 groups</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label>👥 Min Members</label>
            <select id="disc-min-members">
              <option value="0">Any size</option>
              <option value="100">100+</option>
              <option value="500" selected>500+</option>
              <option value="1000">1,000+</option>
              <option value="5000">5,000+</option>
            </select>
          </div>
        </div>

        <div class="form-group mb-16" style="display:flex; align-items:center; gap:12px;">
          <label style="margin:0; display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:600; color:var(--text-secondary);">
            <input type="checkbox" id="disc-include-channels" style="width:16px; height:16px; accent-color:var(--accent-primary);" />
            Include broadcast channels
          </label>
          <label style="margin:0; display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:600; color:var(--text-secondary);">
            <input type="checkbox" id="disc-auto-scan" checked style="width:16px; height:16px; accent-color:var(--accent-primary);" />
            Auto-scan after joining
          </label>
        </div>

        <div style="background:rgba(139,92,246,0.06); border:1px solid rgba(139,92,246,0.2); padding:14px 16px; border-radius:10px; font-size:13px; color:var(--text-secondary); margin-bottom:20px; line-height:1.6;">
          <span style="font-size:16px; margin-right:8px;">💡</span>
          <strong style="color:var(--text-primary);">Multi-niche search:</strong> Enter multiple niches separated by commas.
          Scoutrix will cycle through each and join the best matching groups.
        </div>

        <button class="btn btn-primary btn-lg" id="btn-start-discovery" style="width:100%;">
          🔍 Find &amp; Join Groups
        </button>
      </div>

      <!-- ── Discovery Logs ─────────────────────────────────── -->
      <div class="card">
        <div class="card-title" style="display:flex; align-items:center; margin-bottom:14px;">
          <span>📋 Discovery Log</span>
          <button class="btn btn-ghost btn-sm" id="disc-clear-log" style="margin-left:auto; font-size:11px;">Clear</button>
        </div>
        <div id="discovery-logs" class="ws-log-panel" style="height:320px;">
          <span style="color:var(--text-muted);">[SYSTEM] Group Finder ready. Select an account and enter niches to discover.</span>
        </div>
      </div>
    </div>

    <!-- ── Joined Groups ──────────────────────────────────────── -->
    <div class="card mb-24">
      <div class="card-title" style="display:flex; align-items:center; margin-bottom:18px;">
        <span>🤝 Joined Groups This Session</span>
        <span id="disc-joined-count" style="margin-left:10px; font-size:12px; padding:3px 12px; border-radius:20px; background:var(--bg-secondary); color:var(--text-secondary); font-weight:600; text-transform:none; letter-spacing:0;">0 joined</span>
      </div>
      <div id="disc-joined-list" style="display:flex; flex-wrap:wrap; gap:12px;">
        <div style="color:var(--text-muted); font-size:13px; padding:8px 0;">No groups joined yet — start a discovery scan above.</div>
      </div>
    </div>

    <!-- ── Niche Quick-Pick ──────────────────────────────────── -->
    <div class="card">
      <div class="card-title" style="margin-bottom:16px;">⭐ Popular Niches — Click to Add</div>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        ${['IPTV', 'Crypto Trading', 'NFT', 'E-commerce', 'Tech News', 'Fashion', 'Real Estate',
           'Fitness', 'Gaming', 'Digital Marketing', 'Forex', 'Movie Fans', 'Sports Betting', 'VPN'].map(k => `
          <button class="btn btn-ghost btn-sm disc-tag-btn" data-tag="${k}">${k}</button>
        `).join('')}
      </div>
    </div>
  `;

  // ─── State ─────────────────────────────────────────────────────────────
  let joinedCount = 0;

  // ─── Helpers ───────────────────────────────────────────────────────────
  function addLog(msg, type = 'info') {
    const log = document.getElementById('discovery-logs');
    if (!log) return;
    const colors = { info: 'var(--text-primary)', success: 'var(--success)', error: 'var(--danger)', warning: 'var(--warning)' };
    const icons  = { info: '›', success: '✓', error: '✗', warning: '!' };
    const row = document.createElement('div');
    row.innerHTML = `<span style="color:var(--text-muted);">[${new Date().toLocaleTimeString()}]</span> <span style="color:${colors[type] || colors.info};">[${icons[type] || '›'}] ${msg}</span>`;
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }

  function addJoinedGroup(group) {
    joinedCount++;
    const countEl = document.getElementById('disc-joined-count');
    if (countEl) countEl.textContent = `${joinedCount} joined`;

    const list = document.getElementById('disc-joined-list');
    if (!list) return;

    // Clear placeholder text on first join
    if (joinedCount === 1) list.innerHTML = '';

    const card = document.createElement('div');
    card.style.cssText = `
      display:inline-flex; align-items:center; gap:10px; padding:10px 16px;
      background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.2);
      border-radius:10px; animation:fadeIn 0.4s ease;
    `;
    card.innerHTML = `
      <span style="font-size:20px;">🤝</span>
      <div>
        <div style="font-weight:700; font-size:13px; color:var(--text-white);">${group.title || 'Unknown Group'}</div>
        <div style="font-size:11px; color:var(--text-secondary);">${group.members ? group.members.toLocaleString() + ' members' : group.type || 'Group'}</div>
      </div>
    `;
    list.appendChild(card);
  }

  // ─── Load accounts ──────────────────────────────────────────────────────
  async function loadAccounts() {
    try {
      const res = await apiFetch('/auth/accounts');
      const select = document.getElementById('disc-acc-select');
      if (!select) return;
      if (Array.isArray(res) && res.length > 0) {
        select.innerHTML = res.map(a =>
          `<option value="${a.id}">${a.phone || a.session_name} (ID: ${a.id})</option>`
        ).join('');
        addLog(`Loaded ${res.length} account(s). Ready to discover groups.`, 'success');
      } else {
        select.innerHTML = `<option value="">No accounts found — add one in Settings</option>`;
        addLog('No accounts found. Please add a Telegram account in Settings.', 'warning');
      }
    } catch (e) {
      addLog('Could not load accounts from server.', 'error');
    }
  }

  // ─── Niche tag quick-pick ────────────────────────────────────────────────
  document.querySelectorAll('.disc-tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById('disc-keyword');
      if (!input) return;
      const current = input.value.trim();
      const tags = current ? current.split(',').map(k => k.trim()) : [];
      if (!tags.includes(btn.dataset.tag)) {
        input.value = tags.length ? current + ', ' + btn.dataset.tag : btn.dataset.tag;
      }
    });
  });

  // ─── Clear log ───────────────────────────────────────────────────────────
  document.getElementById('disc-clear-log')?.addEventListener('click', () => {
    const log = document.getElementById('discovery-logs');
    if (log) log.innerHTML = `<span style="color:var(--text-muted);">[SYSTEM] Log cleared.</span>`;
  });

  // ─── Start Discovery ─────────────────────────────────────────────────────
  document.getElementById('btn-start-discovery')?.addEventListener('click', async () => {
    const accId   = document.getElementById('disc-acc-select')?.value;
    const keyword = document.getElementById('disc-keyword')?.value.trim();
    const limit   = parseInt(document.getElementById('disc-limit')?.value || '5');
    const minMembers = parseInt(document.getElementById('disc-min-members')?.value || '0');
    const includeChannels = document.getElementById('disc-include-channels')?.checked;
    const autoScan = document.getElementById('disc-auto-scan')?.checked;

    if (!accId) {
      showToast('Please select an account first', 'warning');
      addLog('No account selected.', 'error');
      return;
    }
    if (!keyword) {
      showToast('Please enter at least one niche keyword', 'warning');
      addLog('No keyword entered.', 'error');
      return;
    }

    const btn = document.getElementById('btn-start-discovery');
    btn.disabled = true;
    btn.innerHTML = `<div class="spinner" style="width:18px;height:18px;border-width:2px;"></div> Searching…`;

    addLog(`Starting discovery for: "${keyword}" (limit: ${limit}, min: ${minMembers} members)`, 'info');
    showToast(`Searching for ${keyword} groups...`, 'info');

    try {
      const params = new URLSearchParams({
        account_id: accId,
        keyword,
        limit,
        min_members: minMembers,
        include_channels: includeChannels ? 'true' : 'false',
        auto_scan: autoScan ? 'true' : 'false',
      });

      const result = await apiFetch(`/leads/discover?${params.toString()}`, { method: 'POST' });

      if (result && result.status) {
        addLog(`✓ ${result.status}`, 'success');
        showToast('Discovery started in background! Check the log for live updates.', 'success');
      } else if (result && result.error) {
        addLog(`Failed: ${result.error}`, 'error');
        showToast(result.error, 'error');
      } else if (result && result.detail) {
        addLog(`Failed: ${result.detail}`, 'error');
        showToast(result.detail, 'error');
      } else {
        addLog('Unexpected response from server.', 'warning');
      }
    } catch (err) {
      addLog('Network error connecting to server.', 'error');
      showToast('Network error', 'error');
    } finally {
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = '🔍 Find &amp; Join Groups';
      }, 4000);
    }
  });

  // ─── WebSocket live updates ───────────────────────────────────────────────
  const _parentHandler = window.handleWSMessage;
  window.handleWSMessage = (msg) => {
    if (_parentHandler) _parentHandler(msg);

    if (msg.type === 'discovery_started') {
      addLog(`🔍 Search initiated for niche: "${msg.niche}"`, 'info');
    }
    if (msg.type === 'group_joined') {
      addLog(`✓ Joined: ${msg.title} (${msg.members?.toLocaleString() || '?'} members)`, 'success');
      addJoinedGroup(msg);
    }
    if (msg.type === 'discovery_complete') {
      addLog(`Discovery complete — ${msg.joined_count} group(s) joined total.`, 'success');
      showToast(`Discovery done! Joined ${msg.joined_count} groups.`, 'success');
    }
    if (msg.type === 'scan_started') {
      addLog(`Auto-scanning newly joined group for leads...`, 'info');
    }
  };

  // ─── Init ─────────────────────────────────────────────────────────────────
  loadAccounts();
}

window.renderDiscovery = renderDiscovery;
