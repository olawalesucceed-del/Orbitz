/**
 * Telegram Buyer Scout — Scans public Telegram group previews for buyers.
 * Detects buying intent messages, extracts @usernames, imports as leads.
 */

function renderWebScout(container) {
  container.innerHTML = `

    <!-- ── Header ──────────────────────────────────────────── -->
    <div class="page-header">
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px;">
        <div>
          <h1 class="page-title">📲 Telegram Buyer Scout</h1>
          <p class="page-subtitle">Scan public Telegram groups for people looking to buy. Automatically detect buying intent and import their @username as a lead.</p>
        </div>
        <span id="ws-status-badge" class="ws-status-badge">⚡ Idle</span>
      </div>
    </div>

    <!-- ── Stats Row ────────────────────────────────────────── -->
    <div id="ws-stats-grid" class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); margin-bottom:28px;">
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(56,189,248,0.15); font-size:22px;">📡</div>
        <div class="stat-value" id="ws-stat-groups">0</div>
        <div class="stat-label">Groups Queued</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(99,102,241,0.15); font-size:22px;">🔎</div>
        <div class="stat-value" id="ws-stat-signals">0</div>
        <div class="stat-label">Signals Found</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(16,185,129,0.15); font-size:22px;">🎯</div>
        <div class="stat-value" id="ws-stat-leads">0</div>
        <div class="stat-label">Buyers Imported</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(245,158,11,0.15); font-size:22px;">📲</div>
        <div class="stat-value" id="ws-stat-tg">0</div>
        <div class="stat-label">With TG Handle</div>
      </div>
    </div>

    <!-- ── Main Grid ────────────────────────────────────────── -->
    <div class="grid-2" style="gap:20px; margin-bottom:24px; align-items:start;">

      <!-- Left: Group Input Panel -->
      <div class="card">
        <div class="card-title" style="display:flex; align-items:center; gap:10px; margin-bottom:18px;">
          <span style="font-size:20px;">📡</span>
          Target Groups
        </div>

        <p style="font-size:13px; color:var(--text-secondary); line-height:1.7; margin-bottom:18px;">
          Add public Telegram groups to scan. Paste a <strong style="color:#38bdf8;">t.me link</strong>,
          group <strong style="color:#38bdf8;">@username</strong>, or pick from suggestions below.
          The scanner reads the public preview and finds buyers.
        </p>

        <!-- Account selector -->
        <div class="form-group mb-16">
          <label>🎯 Telegram Account</label>
          <select id="ws-acc-select"></select>
        </div>

        <!-- Group input -->
        <div class="form-group mb-16">
          <label>📋 Groups to Scan</label>
          <div id="ws-group-tags" class="ws-tags-box" style="min-height:56px;"></div>
          <div style="display:flex; gap:8px; margin-top:8px;">
            <input type="text" id="ws-group-input"
              placeholder="@groupname or t.me/groupname"
              style="flex:1;" />
            <button class="btn btn-ghost btn-sm" id="ws-add-group-btn">+ Add</button>
          </div>
        </div>

        <!-- Niche suggestions -->
        <div class="form-group" style="margin-bottom:20px;">
          <label style="margin-bottom:10px;">💡 Suggested Groups (click to add)</label>
          <div id="ws-suggestions" style="display:flex; flex-wrap:wrap; gap:8px;">
            <span style="color:var(--text-muted); font-size:12px;">Loading suggestions...</span>
          </div>
        </div>

        <!-- Keywords override -->
        <div class="form-group" style="margin-bottom:24px;">
          <label>🔑 Keywords Override <span style="font-weight:400; color:var(--text-muted);">(optional)</span></label>
          <input type="text" id="ws-keywords-input"
            placeholder="buy, price, reseller, how much, looking for..." />
          <div style="font-size:11px; color:var(--text-muted); margin-top:5px;">Leave blank to use account keyword settings</div>
        </div>

        <button class="btn btn-primary btn-lg" id="ws-scan-btn" style="width:100%;">
          📲 Scan Telegram Groups
        </button>
      </div>

      <!-- Right: Live Log + How It Works -->
      <div style="display:flex; flex-direction:column; gap:20px;">

        <!-- How it works -->
        <div class="card" style="background:rgba(56,189,248,0.04); border-color:rgba(56,189,248,0.15);">
          <div class="card-title" style="margin-bottom:14px;">ℹ️ How It Works</div>
          <div style="display:flex; flex-direction:column; gap:12px;">
            ${[
              ['1', '📡', 'Scout opens the public preview of each Telegram group (no login needed)'],
              ['2', '🔎', 'Reads every visible message and scores it for buying intent'],
              ['3', '📲', 'Extracts any @telegram usernames from high-score messages'],
              ['4', '✅', 'Imports matching usernames directly into your Leads pipeline'],
            ].map(([n, icon, text]) => `
              <div style="display:flex; align-items:flex-start; gap:12px;">
                <span style="min-width:24px; height:24px; border-radius:50%; background:rgba(56,189,248,0.15); color:#38bdf8; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center;">${n}</span>
                <span style="font-size:13px; color:var(--text-secondary); line-height:1.6;"><span style="margin-right:6px;">${icon}</span>${text}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Live Log -->
        <div class="card" style="flex:1;">
          <div class="card-title" style="display:flex; align-items:center; margin-bottom:14px;">
            <span>📟 Live Log</span>
            <button class="btn btn-ghost btn-sm" id="ws-clear-log-btn" style="margin-left:auto; font-size:11px;">Clear</button>
          </div>
          <div id="ws-log" class="ws-log-panel" style="height:260px;">
            <span style="color:var(--text-muted);">[SYSTEM] Ready. Add Telegram groups and start scanning.</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Results ───────────────────────────────────────────── -->
    <div class="card">
      <div class="card-title" style="display:flex; align-items:center; margin-bottom:20px;">
        <span>🎯 Detected Buyers</span>
        <span id="ws-results-count"
          style="margin-left:10px; font-size:12px; padding:3px 12px; border-radius:20px;
                 background:var(--bg-secondary); color:var(--text-secondary); font-weight:600;
                 text-transform:none; letter-spacing:0;"></span>
        <button class="btn btn-ghost btn-sm" id="ws-export-btn"
          style="margin-left:auto; display:none; font-size:12px;">⬇ Export CSV</button>
      </div>
      <div id="ws-results-container">
        <div class="ws-empty">
          <div class="ws-empty-icon">📲</div>
          <div class="ws-empty-title">No buyers detected yet</div>
          <div class="ws-empty-sub">Add Telegram groups above and click Scan to start</div>
        </div>
      </div>
    </div>
  `;

  // ─── State ──────────────────────────────────────────────────────────────
  let activeGroups = [];
  let scanResults  = [];
  let totalSignals = 0;
  let totalLeads   = 0;
  let totalTG      = 0;

  // ─── Helpers ────────────────────────────────────────────────────────────
  const $  = (id) => document.getElementById(id);

  function escH(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  function addLog(msg, type = 'info') {
    const log = $('ws-log');
    if (!log) return;
    const c = { info: 'var(--text-primary)', success: 'var(--success)', error: 'var(--danger)', warning: 'var(--warning)' };
    const i = { info: '›', success: '✓', error: '✗', warning: '!' };
    const row = document.createElement('div');
    row.innerHTML = `<span style="color:var(--text-muted);">[${new Date().toLocaleTimeString()}]</span> <span style="color:${c[type] || c.info};">[${i[type] || '›'}] ${msg}</span>`;
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }

  function setStatus(text, cls = '') {
    const b = $('ws-status-badge');
    if (b) { b.textContent = text; b.className = `ws-status-badge ${cls}`; }
  }

  function updateStats() {
    if ($('ws-stat-signals')) $('ws-stat-signals').textContent = totalSignals;
    if ($('ws-stat-leads'))   $('ws-stat-leads').textContent   = totalLeads;
    if ($('ws-stat-tg'))      $('ws-stat-tg').textContent      = totalTG;
    if ($('ws-stat-groups'))  $('ws-stat-groups').textContent  = activeGroups.length;
  }

  // ─── Group Tag Pills ─────────────────────────────────────────────────────
  function renderGroupTags() {
    const box = $('ws-group-tags');
    if (!box) return;
    if ($('ws-stat-groups')) $('ws-stat-groups').textContent = activeGroups.length;

    if (activeGroups.length === 0) {
      box.innerHTML = `<span style="color:var(--text-muted); font-size:13px; align-self:center;">No groups added yet</span>`;
      return;
    }
    box.innerHTML = activeGroups.map(g => `
      <span class="ws-sub-pill">
        📡 ${escH(g)}
        <span class="remove-x ws-remove-group" data-group="${escH(g)}" title="Remove">×</span>
      </span>
    `).join('');
    box.querySelectorAll('.ws-remove-group').forEach(btn => {
      btn.addEventListener('click', () => {
        activeGroups = activeGroups.filter(x => x !== btn.dataset.group);
        renderGroupTags();
        addLog(`Removed group: @${btn.dataset.group}`, 'info');
        updateStats();
      });
    });
  }

  function addGroup(raw) {
    // Strip t.me prefix
    let clean = raw.trim().replace(/^@/, '').replace(/^https?:\/\/t\.me\/s\//i, '').replace(/^https?:\/\/t\.me\//i, '').replace(/^t\.me\/s\//i, '').replace(/^t\.me\//i, '').split('/')[0].split('?')[0].trim();
    if (!clean) return;
    if (!activeGroups.includes(clean)) {
      activeGroups.push(clean);
      renderGroupTags();
      updateStats();
      addLog(`Added group: @${clean}`, 'info');
    }
  }

  // ─── Render Suggestions ──────────────────────────────────────────────────
  function renderSuggestions(groups) {
    const box = $('ws-suggestions');
    if (!box) return;
    if (!groups || groups.length === 0) {
      box.innerHTML = `<span style="color:var(--text-muted); font-size:12px;">No suggestions available</span>`;
      return;
    }
    box.innerHTML = groups.map(g => `
      <button class="btn btn-ghost btn-sm ws-suggestion-btn" data-group="${escH(g)}"
        style="font-size:12px; padding:5px 12px; border-color:rgba(56,189,248,0.2); color:#38bdf8;">
        @${escH(g)}
      </button>
    `).join('');
    box.querySelectorAll('.ws-suggestion-btn').forEach(btn => {
      btn.addEventListener('click', () => addGroup(btn.dataset.group));
    });
  }

  // ─── Results Table ───────────────────────────────────────────────────────
  function renderResults(results) {
    const container = $('ws-results-container');
    const countEl   = $('ws-results-count');
    const exportBtn = $('ws-export-btn');
    if (!container) return;

    const imported = results.filter(r => r.imported);
    if (countEl) countEl.textContent = `${results.length} signals · ${imported.length} buyers imported`;
    if (exportBtn) exportBtn.style.display = results.length > 0 ? 'inline-flex' : 'none';

    if (results.length === 0) {
      container.innerHTML = `
        <div class="ws-empty">
          <div class="ws-empty-icon">🔍</div>
          <div class="ws-empty-title">No buying signals found</div>
          <div class="ws-empty-sub">Try different groups, or adjust your keyword settings.</div>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>Group</th>
              <th>Message Snippet</th>
              <th>Buyer Handle</th>
              <th>Score</th>
              <th>Matched Keywords</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            ${results.map(r => `
              <tr class="ws-result-row">
                <td>
                  <span class="ws-source-tag web" style="background:rgba(56,189,248,0.1); color:#38bdf8; border-color:rgba(56,189,248,0.2);">
                    📡 @${escH(r.group || '?')}
                  </span>
                </td>
                <td style="max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text-secondary);"
                    title="${escH(r.snippet || '')}">
                  ${escH((r.snippet || '').substring(0, 90))}${(r.snippet || '').length > 90 ? '…' : ''}
                </td>
                <td>
                  ${r.username
                    ? `<span class="ws-tg-handle ${r.imported ? '' : 'opacity-60'}">
                        ${r.imported ? '✅' : '👤'} @${escH(r.username)}
                       </span>`
                    : `<span style="color:var(--text-muted); font-size:12px;">No handle found</span>`}
                </td>
                <td>
                  <span class="score-badge ${r.score >= 50 ? 'score-high' : r.score >= 20 ? 'score-med' : 'score-low'}">
                    ${Math.round(r.score)}
                  </span>
                </td>
                <td>
                  ${(r.keywords || []).slice(0, 3).map(k =>
                    `<span class="ws-kw-chip">${escH(k)}</span>`
                  ).join('')}
                </td>
                <td>
                  ${r.url
                    ? `<a href="${escH(r.url)}" target="_blank" rel="noopener"
                         style="color:var(--accent-primary); font-size:12px; font-weight:600; text-decoration:none; white-space:nowrap;">
                         View →</a>`
                    : '—'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;

    // Export CSV
    if (exportBtn) {
      exportBtn.onclick = () => {
        const rows = [['Group', 'Username', 'Score', 'Keywords', 'Snippet', 'URL']];
        results.forEach(r => rows.push([
          r.group || '', r.username || '', Math.round(r.score),
          (r.keywords || []).join('; '), (r.snippet || '').replace(/,/g, ' '),
          r.url || ''
        ]));
        const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
        const a = document.createElement('a');
        a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        a.download = `tg-buyers-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
      };
    }
  }

  // ─── Load Accounts ───────────────────────────────────────────────────────
  async function loadAccounts() {
    try {
      const res = await apiFetch('/auth/accounts');
      const sel = $('ws-acc-select');
      if (!sel) return;
      if (Array.isArray(res) && res.length > 0) {
        sel.innerHTML = res.map(a =>
          `<option value="${a.id}">${a.phone || a.session_name}</option>`
        ).join('');
        loadSuggestions(res[0].id);
        sel.addEventListener('change', () => { if (sel.value) loadSuggestions(sel.value); });
      } else {
        sel.innerHTML = `<option value="">No accounts — add one in Settings</option>`;
        addLog('No accounts found. Add one in Settings first.', 'warning');
      }
    } catch (e) {
      addLog('Could not reach server.', 'error');
    }
  }

  async function loadSuggestions(accountId) {
    if (!accountId) return;
    try {
      const res = await apiFetch(`/web-scout/suggested-groups?account_id=${accountId}`);
      if (res && Array.isArray(res.groups)) {
        renderSuggestions(res.groups);
        addLog(`Loaded ${res.groups.length} suggested groups for your niche.`, 'success');
      }
    } catch {
      // Fallback defaults
      renderSuggestions(['iptv', 'iptvresellers', 'iptvshop', 'buyiptv']);
    }
  }

  // ─── Add Group ───────────────────────────────────────────────────────────
  $('ws-add-group-btn')?.addEventListener('click', () => {
    const inp = $('ws-group-input');
    if (!inp?.value.trim()) { showToast('Enter a group name or t.me link', 'warning'); return; }
    addGroup(inp.value);
    inp.value = '';
  });

  $('ws-group-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); $('ws-add-group-btn')?.click(); }
  });

  // ─── Clear Log ───────────────────────────────────────────────────────────
  $('ws-clear-log-btn')?.addEventListener('click', () => {
    const log = $('ws-log');
    if (log) log.innerHTML = `<span style="color:var(--text-muted);">[SYSTEM] Log cleared.</span>`;
  });

  // ─── Scan ────────────────────────────────────────────────────────────────
  $('ws-scan-btn')?.addEventListener('click', async () => {
    const accId = $('ws-acc-select')?.value;
    if (!accId) { showToast('Please select an account', 'warning'); return; }
    if (activeGroups.length === 0) { showToast('Add at least one Telegram group', 'warning'); return; }

    const kwRaw = ($('ws-keywords-input')?.value || '').trim();
    const keywords = kwRaw ? kwRaw.split(',').map(k => k.trim()).filter(Boolean) : null;

    const btn = $('ws-scan-btn');
    btn.disabled = true;
    btn.classList.add('scanning');
    btn.innerHTML = `<div class="spinner" style="width:18px;height:18px;border-width:2px;"></div> Scanning ${activeGroups.length} group${activeGroups.length !== 1 ? 's' : ''}…`;
    setStatus('⚡ Scanning…', 'running');
    totalSignals = 0; totalLeads = 0; totalTG = 0;
    updateStats();

    addLog(`Starting scan across ${activeGroups.length} group(s): ${activeGroups.map(g => '@' + g).join(', ')}`, 'info');
    if (keywords) addLog(`Keywords: ${keywords.join(', ')}`, 'info');

    try {
      const res = await apiFetch('/web-scout/scan/groups', {
        method: 'POST',
        body: JSON.stringify({
          account_id: parseInt(accId),
          groups: activeGroups,
          keywords
        })
      });

      if (res.status === 'started') {
        addLog(`✓ Scan running in background. Results will appear automatically.`, 'success');
        showToast('Telegram scan started — live results below.', 'info');
      } else {
        addLog(`Failed: ${res.error || res.detail || 'Unknown error'}`, 'error');
        showToast(res.error || 'Scan failed', 'error');
        setStatus('✗ Error', 'error');
        btn.disabled = false;
        btn.classList.remove('scanning');
        btn.textContent = '📲 Scan Telegram Groups';
      }
    } catch (e) {
      addLog('Network error', 'error');
      showToast('Network error', 'error');
      setStatus('✗ Error', 'error');
      btn.disabled = false;
      btn.classList.remove('scanning');
      btn.textContent = '📲 Scan Telegram Groups';
    }
  });

  // ─── WebSocket live updates ───────────────────────────────────────────────
  const _prev = window.handleWSMessage;
  window.handleWSMessage = (msg) => {
    if (_prev) _prev(msg);

    if (msg.type === 'web_scout_started') {
      addLog(`Scanner started across ${(msg.groups || []).length} groups`, 'info');
      setStatus('⚡ Scanning…', 'running');
    }

    if (msg.type === 'web_scout_lead') {
      totalTG++;
      updateStats();
      addLog(`Found buyer: @${msg.username} in @${msg.group} (score: ${Math.round(msg.score || 0)})`, 'success');
    }

    if (msg.type === 'web_scout_complete') {
      const btn = $('ws-scan-btn');
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('scanning');
        btn.textContent = '📲 Scan Telegram Groups';
      }
      totalSignals += msg.signals  || 0;
      totalLeads   += msg.new_leads || 0;
      updateStats();
      setStatus(`✓ Done — ${msg.new_leads} imported`, 'done');
      addLog(`Scan complete! ${msg.signals} signals, ${msg.new_leads} buyers imported.`, 'success');
      showToast(`Scan done! ${msg.new_leads} buyer${msg.new_leads !== 1 ? 's' : ''} added to Leads.`, 'success');

      // Refresh results from leads endpoint
      refreshResults(parseInt($('ws-acc-select')?.value));
    }
  };

  async function refreshResults(accountId) {
    try {
      const leads = await apiFetch(`/leads?account_id=${accountId}`);
      // Show web-sourced leads only
      const webLeads = (leads || []).filter(l => l.source_type === 'web' || l.group_source?.includes('Telegram'));
      if (webLeads.length > 0) {
        scanResults = webLeads.map(l => ({
          username: l.username,
          group: (l.group_source || '').replace('Telegram/t.me/', ''),
          snippet: l.notes || '',
          score: l.score || 0,
          keywords: JSON.parse(l.keywords_matched || '[]'),
          url: l.source_url || '',
          imported: true,
        }));
        renderResults(scanResults);
        totalLeads = webLeads.length;
        updateStats();
      }
    } catch { /* silent */ }
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  loadAccounts();
  addLog('Telegram Buyer Scout ready. Add groups and click Scan.', 'info');
  window._webScoutRefresh = () => loadAccounts();
}

window.renderWebScout = renderWebScout;
