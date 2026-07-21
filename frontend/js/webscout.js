/**
 * Web Scout Page — Detect buyers from Reddit & public web sources
 * Scans for buying intent signals and imports leads with Telegram usernames.
 */

function renderWebScout(container) {
  container.innerHTML = `
    <!-- Page Header -->
    <div class="page-header">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:16px;">
        <div>
          <h1 class="page-title">🌐 Web Scout</h1>
          <p class="page-subtitle">Detect buyers on Reddit and public web pages. Import leads with Telegram usernames directly into your pipeline.</p>
        </div>
        <span id="ws-status-badge" class="ws-status-badge">⚡ Idle</span>
      </div>
    </div>

    <!-- Stat Cards -->
    <div id="ws-stats-grid" class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); margin-bottom:28px;">
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(99,102,241,0.15); font-size:22px;">🌐</div>
        <div class="stat-value" id="ws-stat-signals">0</div>
        <div class="stat-label">Signals Found</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(16,185,129,0.15); font-size:22px;">🎯</div>
        <div class="stat-value" id="ws-stat-leads">0</div>
        <div class="stat-label">Buyers Imported</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(245,158,11,0.15); font-size:22px;">📋</div>
        <div class="stat-value" id="ws-stat-subs">0</div>
        <div class="stat-label">Subreddits Queued</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(14,165,233,0.15); font-size:22px;">📲</div>
        <div class="stat-value" id="ws-stat-tg">0</div>
        <div class="stat-label">With TG Handle</div>
      </div>
    </div>

    <div class="grid-2" style="gap:20px; margin-bottom:24px;">

      <!-- ── Reddit Scanner Card ─────────────────────────────────── -->
      <div class="card">
        <div class="card-title" style="display:flex; align-items:center; gap:10px; margin-bottom:18px;">
          <span style="font-size:20px;">🔴</span>
          Reddit Scanner
          <span style="margin-left:auto; font-size:11px; padding:3px 10px; border-radius:20px; background:rgba(255,69,0,0.12); color:#ff4500; font-weight:700; letter-spacing:0.05em;">FREE API</span>
        </div>

        <p style="font-size:13px; color:var(--text-secondary); margin-bottom:20px; line-height:1.6;">
          Scans subreddit posts &amp; comments for buying intent. Finds posts where people say things like
          <em style="color:#818cf8;">"looking for IPTV"</em> or <em style="color:#818cf8;">"need a reseller panel"</em>.
        </p>

        <div class="form-group mb-16">
          <label>🎯 Account</label>
          <select id="ws-acc-select">
            <option value="">Loading accounts...</option>
          </select>
        </div>

        <div class="form-group mb-16">
          <label>📋 Subreddits to Scan</label>
          <div id="ws-subreddit-tags" class="ws-tags-box"></div>
          <div style="display:flex; gap:8px; margin-top:8px;">
            <input type="text" id="ws-sub-input" placeholder="Add subreddit name (e.g. cordcutters)" style="flex:1;" />
            <button class="btn btn-ghost btn-sm" id="ws-add-sub-btn">+ Add</button>
          </div>
        </div>

        <div class="form-group" style="margin-bottom:20px;">
          <label>🔍 Extra Keywords <span style="font-weight:400; color:var(--text-muted);">(optional, comma-separated)</span></label>
          <input type="text" id="ws-keywords-input" placeholder="buy, price, reseller, subscription..." />
          <div style="font-size:11px; color:var(--text-muted); margin-top:6px;">Leave blank to use your account's saved keyword settings</div>
        </div>

        <button class="btn btn-primary btn-lg" id="ws-scan-reddit-btn" style="width:100%;">
          🌐 Scan Reddit Now
        </button>
      </div>

      <!-- ── Custom URL Scanner Card ────────────────────────────── -->
      <div class="card">
        <div class="card-title" style="display:flex; align-items:center; gap:10px; margin-bottom:18px;">
          <span style="font-size:20px;">🔗</span>
          Custom URL Scanner
        </div>

        <p style="font-size:13px; color:var(--text-secondary); margin-bottom:20px; line-height:1.6;">
          Paste any public forum, web page, or Telegram preview URL. The scanner will extract all text,
          detect buying signals, and pull any <strong style="color:#38bdf8;">@telegram</strong> usernames found.
        </p>

        <div class="form-group mb-16">
          <label>🔗 Target URL</label>
          <input type="url" id="ws-url-input" placeholder="https://t.me/s/iptv" />
        </div>

        <div class="form-group" style="margin-bottom:20px;">
          <label style="margin-bottom:10px;">💡 Quick Examples</label>
          <div style="display:flex; flex-wrap:wrap; gap:8px;">
            ${[
              ['https://t.me/s/iptv', 't.me/s/iptv'],
              ['https://t.me/s/iptvresellers', 't.me/s/iptvresellers'],
              ['https://www.reddit.com/r/IPTV/', 'reddit.com/r/IPTV/'],
            ].map(([url, label]) => `
              <button class="btn btn-ghost btn-sm ws-url-example" data-url="${url}"
                style="font-size:11px; padding:5px 12px; font-weight:600;">${label}</button>
            `).join('')}
          </div>
        </div>

        <button class="btn btn-secondary btn-lg" id="ws-scan-url-btn" style="width:100%; margin-bottom:0;">
          🔗 Scan This URL
        </button>

        <!-- URL scan result -->
        <div id="ws-url-result" class="ws-url-result-box" style="display:none;">
          <div id="ws-url-result-content"></div>
        </div>
      </div>
    </div>

    <!-- ── Live Log ──────────────────────────────────────────────── -->
    <div class="card mb-24">
      <div class="card-title" style="display:flex; align-items:center; margin-bottom:14px;">
        <span>📟 Scanner Log</span>
        <button class="btn btn-ghost btn-sm" id="ws-clear-log-btn" style="margin-left:auto; font-size:11px; padding:5px 12px;">Clear</button>
      </div>
      <div id="ws-log" class="ws-log-panel">
        <span style="color:var(--text-muted);">[SYSTEM] Web Scout ready. Select an account and start a scan.</span>
      </div>
    </div>

    <!-- ── Results Table ─────────────────────────────────────────── -->
    <div class="card">
      <div class="card-title" style="display:flex; align-items:center; margin-bottom:20px;">
        <span>📊 Detected Buyers</span>
        <span id="ws-results-count" style="margin-left:10px; font-size:12px; padding:3px 12px; border-radius:20px; background:var(--bg-secondary); color:var(--text-secondary); font-weight:600; text-transform:none; letter-spacing:0;"></span>
      </div>
      <div id="ws-results-table-container">
        <div class="ws-empty">
          <div class="ws-empty-icon">🌐</div>
          <div class="ws-empty-title">No scan results yet</div>
          <div class="ws-empty-sub">Run a Reddit or URL scan above to start detecting buyers</div>
        </div>
      </div>
    </div>
  `;

  // ─── State ───────────────────────────────────────────────────────────────
  let activeSubreddits = [];
  let scanResults = [];
  let totalSignals = 0;
  let totalLeads = 0;
  let totalTG = 0;

  // ─── Helpers ─────────────────────────────────────────────────────────────
  function addLog(msg, type = 'info') {
    const log = document.getElementById('ws-log');
    if (!log) return;
    const colors = { info: 'var(--text-primary)', success: 'var(--success)', error: 'var(--danger)', warning: 'var(--warning)' };
    const icons  = { info: '›', success: '✓', error: '✗', warning: '!' };
    const row = document.createElement('div');
    row.innerHTML = `<span style="color:var(--text-muted);">[${new Date().toLocaleTimeString()}]</span> <span style="color:${colors[type] || colors.info};">[${icons[type] || '›'}] ${msg}</span>`;
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }

  function updateStats() {
    const el = (id) => document.getElementById(id);
    if (el('ws-stat-signals')) el('ws-stat-signals').textContent = totalSignals;
    if (el('ws-stat-leads'))   el('ws-stat-leads').textContent   = totalLeads;
    if (el('ws-stat-tg'))      el('ws-stat-tg').textContent      = totalTG;
  }

  function setStatus(text, cls = '') {
    const badge = document.getElementById('ws-status-badge');
    if (!badge) return;
    badge.textContent = text;
    badge.className = `ws-status-badge ${cls}`;
  }

  function renderSubredditTags() {
    const container = document.getElementById('ws-subreddit-tags');
    if (!container) return;
    const subsCount = document.getElementById('ws-stat-subs');
    if (subsCount) subsCount.textContent = activeSubreddits.length;

    if (activeSubreddits.length === 0) {
      container.innerHTML = `<span style="color:var(--text-muted); font-size:13px; align-self:center;">No subreddits added yet</span>`;
      return;
    }
    container.innerHTML = activeSubreddits.map(s => `
      <span class="ws-sub-pill">
        r/${escHtml(s)}
        <span class="remove-x ws-remove-sub" data-sub="${escHtml(s)}" title="Remove">×</span>
      </span>
    `).join('');
    container.querySelectorAll('.ws-remove-sub').forEach(btn => {
      btn.addEventListener('click', () => {
        activeSubreddits = activeSubreddits.filter(x => x !== btn.dataset.sub);
        renderSubredditTags();
        addLog(`Removed subreddit: r/${btn.dataset.sub}`, 'info');
      });
    });
  }

  function renderResultsTable(results) {
    const container = document.getElementById('ws-results-table-container');
    const countEl   = document.getElementById('ws-results-count');
    if (!container) return;

    const withTG = results.filter(r => r.has_telegram);
    if (countEl) countEl.textContent = `${results.length} result${results.length !== 1 ? 's' : ''} · ${withTG.length} with Telegram`;

    if (results.length === 0) {
      container.innerHTML = `
        <div class="ws-empty">
          <div class="ws-empty-icon">🔍</div>
          <div class="ws-empty-title">No buyers found</div>
          <div class="ws-empty-sub">Try different subreddits or keywords, or add more sources.</div>
        </div>`;
      return;
    }

    const isReddit = (src) => src && (src.toLowerCase().includes('reddit') || src.startsWith('r/'));

    container.innerHTML = `
      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>Post / Snippet</th>
              <th>Telegram</th>
              <th>Score</th>
              <th>Keywords</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>
            ${results.map(r => `
              <tr class="ws-result-row">
                <td>
                  <span class="ws-source-tag ${isReddit(r.source) ? 'reddit' : 'web'}">
                    ${isReddit(r.source) ? '🔴' : '🌐'} ${escHtml(r.source || 'Web')}
                  </span>
                </td>
                <td style="max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text-secondary);"
                    title="${escHtml(r.title || r.snippet || '')}">
                  ${escHtml((r.title || r.snippet || '').substring(0, 80))}${(r.title || r.snippet || '').length > 80 ? '…' : ''}
                </td>
                <td>
                  ${r.has_telegram
                    ? `<span class="ws-tg-handle">📲 @${escHtml(r.username)}</span>`
                    : `<span style="color:var(--text-muted); font-size:12px;">—</span>`}
                </td>
                <td>
                  <span class="score-badge ${r.score >= 50 ? 'score-high' : r.score >= 20 ? 'score-med' : 'score-low'}">
                    ${Math.round(r.score)}
                  </span>
                </td>
                <td>
                  ${(r.keywords || []).slice(0, 3).map(k =>
                    `<span class="ws-kw-chip">${escHtml(k)}</span>`
                  ).join('')}
                </td>
                <td>
                  ${r.url
                    ? `<a href="${escHtml(r.url)}" target="_blank" rel="noopener"
                         style="color:var(--accent-primary); font-size:13px; font-weight:600; text-decoration:none;">
                         View →</a>`
                    : '—'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  // ─── Load Accounts ────────────────────────────────────────────────────────
  async function loadAccounts() {
    try {
      const res = await apiFetch('/auth/accounts');
      const select = document.getElementById('ws-acc-select');
      if (!select) return;
      if (Array.isArray(res) && res.length > 0) {
        select.innerHTML = res.map(a =>
          `<option value="${a.id}">${a.phone || a.session_name} (ID: ${a.id})</option>`
        ).join('');
        loadSuggestedSubreddits(res[0].id);
        select.addEventListener('change', () => {
          if (select.value) loadSuggestedSubreddits(select.value);
        });
      } else {
        select.innerHTML = `<option value="">No accounts — add one in Settings</option>`;
        addLog('No accounts found. Please add an account in Settings.', 'warning');
      }
    } catch (e) {
      addLog('Could not load accounts.', 'error');
    }
  }

  async function loadSuggestedSubreddits(accountId) {
    if (!accountId) return;
    try {
      const res = await apiFetch(`/web-scout/sources?account_id=${accountId}`);
      if (res && Array.isArray(res.subreddits)) {
        activeSubreddits = [...res.subreddits];
        renderSubredditTags();
        addLog(`Auto-loaded ${res.subreddits.length} subreddits for this niche.`, 'success');
      }
    } catch {
      activeSubreddits = ['IPTV', 'cordcutters', 'fireTV'];
      renderSubredditTags();
    }
  }

  // ─── Add Subreddit ────────────────────────────────────────────────────────
  document.getElementById('ws-add-sub-btn')?.addEventListener('click', () => {
    const input = document.getElementById('ws-sub-input');
    const val = (input?.value || '').trim().replace(/^r\//, '').replace(/\s+/g, '');
    if (!val) { showToast('Enter a subreddit name first', 'warning'); return; }
    if (!activeSubreddits.includes(val)) {
      activeSubreddits.push(val);
      renderSubredditTags();
      addLog(`Added: r/${val}`, 'info');
    } else {
      showToast(`r/${val} already in the list`, 'warning');
    }
    if (input) input.value = '';
  });

  document.getElementById('ws-sub-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('ws-add-sub-btn')?.click(); }
  });

  // ─── Clear Log ────────────────────────────────────────────────────────────
  document.getElementById('ws-clear-log-btn')?.addEventListener('click', () => {
    const log = document.getElementById('ws-log');
    if (log) log.innerHTML = `<span style="color:var(--text-muted);">[SYSTEM] Log cleared.</span>`;
  });

  // ─── URL Examples ─────────────────────────────────────────────────────────
  document.querySelectorAll('.ws-url-example').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById('ws-url-input');
      if (input) { input.value = btn.dataset.url; input.focus(); }
    });
  });

  // ─── Reddit Scan ──────────────────────────────────────────────────────────
  document.getElementById('ws-scan-reddit-btn')?.addEventListener('click', async () => {
    const accId = document.getElementById('ws-acc-select')?.value;
    if (!accId) { showToast('Please select an account first', 'warning'); return; }
    if (activeSubreddits.length === 0) { showToast('Add at least one subreddit', 'warning'); return; }

    const kwRaw = (document.getElementById('ws-keywords-input')?.value || '').trim();
    const keywords = kwRaw ? kwRaw.split(',').map(k => k.trim()).filter(Boolean) : null;

    const btn = document.getElementById('ws-scan-reddit-btn');
    btn.disabled = true;
    btn.classList.add('scanning');
    btn.innerHTML = `<div class="spinner" style="width:18px;height:18px;border-width:2px;"></div> Scanning ${activeSubreddits.length} subreddits...`;
    setStatus('⚡ Running…', 'running');

    addLog(`Starting Reddit scan across: ${activeSubreddits.map(s => 'r/' + s).join(', ')}`, 'info');
    if (keywords) addLog(`Extra keywords: ${keywords.join(', ')}`, 'info');

    try {
      const res = await apiFetch('/web-scout/scan/reddit', {
        method: 'POST',
        body: JSON.stringify({
          account_id: parseInt(accId),
          subreddits: activeSubreddits,
          keywords
        })
      });

      if (res.status === 'started') {
        addLog(`✓ Scan launched! Monitoring ${res.subreddits?.length || activeSubreddits.length} subreddits in background.`, 'success');
        showToast('Reddit scan running in background — results import automatically when done.', 'info');
        // Keep status as running until WS event arrives
      } else {
        addLog(`Scan start failed: ${res.error || res.detail || 'Unknown error'}`, 'error');
        showToast(res.error || 'Scan failed to start', 'error');
        setStatus('✗ Error', 'error');
        btn.disabled = false;
        btn.classList.remove('scanning');
        btn.textContent = '🌐 Scan Reddit Now';
      }
    } catch (e) {
      addLog('Network error while starting scan', 'error');
      showToast('Network error', 'error');
      setStatus('✗ Error', 'error');
      btn.disabled = false;
      btn.classList.remove('scanning');
      btn.textContent = '🌐 Scan Reddit Now';
    }
  });

  // ─── URL Scan ─────────────────────────────────────────────────────────────
  document.getElementById('ws-scan-url-btn')?.addEventListener('click', async () => {
    const accId = document.getElementById('ws-acc-select')?.value;
    const url   = document.getElementById('ws-url-input')?.value?.trim();

    if (!accId) { showToast('Please select an account first', 'warning'); return; }
    if (!url)   { showToast('Please enter a URL to scan', 'warning'); return; }
    if (!url.startsWith('http')) { showToast('URL must start with http:// or https://', 'warning'); return; }

    const btn     = document.getElementById('ws-scan-url-btn');
    const resultEl = document.getElementById('ws-url-result');
    btn.disabled  = true;
    btn.innerHTML = `<div class="spinner" style="width:18px;height:18px;border-width:2px;"></div> Scanning URL…`;
    setStatus('⚡ Scanning URL…', 'running');
    addLog(`Scanning: ${url}`, 'info');

    try {
      const res = await apiFetch('/web-scout/scan/url', {
        method: 'POST',
        body: JSON.stringify({ account_id: parseInt(accId), url })
      });

      if (res.success) {
        totalSignals += res.signals_found || 0;
        totalLeads   += res.new_leads    || 0;
        totalTG      += (res.results || []).filter(r => r.has_telegram).length;
        updateStats();
        setStatus('✓ Done', 'done');
        addLog(`URL scan complete — Signals: ${res.signals_found}, Buyers imported: ${res.new_leads}`, 'success');
        showToast(`URL scan done! ${res.new_leads} buyer${res.new_leads !== 1 ? 's' : ''} detected.`, 'success');

        if (resultEl) {
          resultEl.style.display = 'block';
          document.getElementById('ws-url-result-content').innerHTML = `
            <div style="font-weight:700; color:var(--success); margin-bottom:8px;">✅ Scan Complete</div>
            <div style="font-size:13px; color:var(--text-secondary);">
              <strong style="color:var(--text-primary);">${res.signals_found}</strong> buyer signals found ·
              <strong style="color:var(--success);">${res.new_leads}</strong> leads imported with Telegram handles
            </div>
          `;
        }

        if (res.results?.length > 0) {
          scanResults = [...res.results, ...scanResults];
          renderResultsTable(scanResults);
        }
      } else {
        addLog(`URL scan failed: ${res.error}`, 'error');
        showToast(res.error || 'URL scan failed', 'error');
        setStatus('✗ Error', 'error');
      }
    } catch (e) {
      addLog('Network error during URL scan', 'error');
      showToast('Network error', 'error');
      setStatus('✗ Error', 'error');
    } finally {
      btn.disabled  = false;
      btn.textContent = '🔗 Scan This URL';
    }
  });

  // ─── WebSocket live updates (Reddit background scan) ──────────────────────
  const _parentWSHandler = window.handleWSMessage;
  window.handleWSMessage = (msg) => {
    if (_parentWSHandler) _parentWSHandler(msg);

    if (msg.type === 'web_scout_started') {
      addLog(`Background scan started across ${(msg.subreddits || []).length} subreddits`, 'info');
      setStatus('⚡ Running…', 'running');
    }
    if (msg.type === 'web_scout_complete') {
      const btn = document.getElementById('ws-scan-reddit-btn');
      if (btn) { btn.disabled = false; btn.classList.remove('scanning'); btn.textContent = '🌐 Scan Reddit Now'; }
      totalSignals += msg.signals  || 0;
      totalLeads   += msg.new_leads || 0;
      updateStats();
      setStatus(`✓ Done — ${msg.new_leads} imported`, 'done');
      addLog(`Scan complete! Signals: ${msg.signals}, Buyers imported: ${msg.new_leads}`, 'success');
    }
  };

  // Allow external refresh
  window._webScoutRefresh = () => loadAccounts();

  // ─── Init ─────────────────────────────────────────────────────────────────
  loadAccounts();
  addLog('Web Scout module initialised and ready.', 'info');
}

window.renderWebScout = renderWebScout;
