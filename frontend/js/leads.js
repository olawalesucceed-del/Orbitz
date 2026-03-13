/**
 * Leads Management Page
 */

let allLeads = [];
let currentFilter = 'All';

function renderLeads(container) {
  container.innerHTML = `
    <div class="page-header flex-between" style="flex-wrap:wrap;gap:12px">
      <div>
        <h1 class="page-title">👥 Leads</h1>
        <p class="page-subtitle">All discovered Target prospects from Telegram</p>
      </div>
      <div class="flex gap-8">
        <button class="btn btn-secondary btn-sm" id="leads-refresh">🔄 Refresh</button>
        <button class="btn btn-primary btn-sm" id="leads-sync-btn">☁️ Sync with Telegram</button>
        <a href="${API}/leads/export/csv" class="btn btn-ghost btn-sm" id="btn-export" download>📥 Export CSV</a>
      </div>
    </div>

    <!-- Filters -->
    <div class="filter-row">
      <select id="filter-account">
        <option value="all">All Accounts</option>
        <!-- Accounts will be injected here -->
      </select>
      <select id="filter-status">
        <option value="All">All Statuses</option>
        <option value="New">New</option>
        <option value="Contacted">Contacted</option>
        <option value="Replied">Replied</option>
        <option value="Interested">Interested</option>
        <option value="Client">Client</option>
      </select>
      <select id="filter-score">
        <option value="all">All Scores</option>
        <option value="high">High (50+)</option>
        <option value="med">Medium (20-49)</option>
        <option value="low">Low (< 20)</option>
      </select>
      <input type="text" id="filter-search" placeholder="Search username..." style="max-width:180px" />
      <span id="leads-count" style="color:var(--text-muted);font-size:13px;margin-left:4px">Loading...</span>
    </div>

    <!-- Status count pills -->
    <div id="status-pills" class="command-chips mb-16"></div>

    <!-- Table -->
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Username</th>
            <th>Group</th>
            <th>Score</th>
            <th>Status</th>
            <th>Keywords</th>
            <th>Found</th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="leads-tbody">
          <tr><td colspan="8"><div class="empty-state"><div class="spinner"></div></div></td></tr>
        </tbody>
      </table>
    </div>

    <!-- Message History Modal -->
    <div id="msg-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:500;align-items:center;justify-content:center">
      <div class="card" style="width:90%;max-width:600px;max-height:80vh;overflow-y:auto;position:relative">
        <div class="flex-between mb-16">
          <h3 id="modal-title" style="font-size:16px">Message History</h3>
          <button class="btn btn-ghost btn-sm" id="modal-close">✕</button>
        </div>
        <div id="modal-messages"></div>
      </div>
    </div>
  `;

  window._leadsRefresh = loadLeads;
  loadLeads();
  loadStatusCounts();
  refreshAccountFilter();

  document.getElementById('leads-refresh').addEventListener('click', () => { loadLeads(); loadStatusCounts(); });
  document.getElementById('filter-account').addEventListener('change', () => { loadLeads(); loadStatusCounts(); });
  document.getElementById('filter-status').addEventListener('change', e => { currentFilter = e.target.value; renderTable(); });
  document.getElementById('filter-score').addEventListener('change', renderTable);
  document.getElementById('filter-search').addEventListener('input', renderTable);
  document.getElementById('modal-close').addEventListener('click', () => {
    document.getElementById('msg-modal').style.display = 'none';
  });

  document.getElementById('leads-sync-btn').addEventListener('click', async (e) => {
    const accountId = document.getElementById('filter-account')?.value;
    if (!accountId || accountId === 'all') {
        showToast('Please select a specific Telegram account to sync from', 'warning');
        return;
    }

    const btn = e.currentTarget;
    const oldText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner spinner-xs"></div> Syncing...';
    
    showToast('Importing chats and contacts from Telegram...', 'info');
    
    try {
        const res = await apiFetch(`/leads/sync?account_id=${accountId}`, { method: 'POST' });
        if (res && res.success) {
            showToast(`✅ Sync complete! Imported ${res.synced_count} new leads.`, 'success');
            loadLeads();
            loadStatusCounts();
        } else {
            showToast(res?.error || 'Sync failed', 'error');
        }
    } catch (err) {
        showToast('Sync failed due to network error', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = oldText;
    }
  });
}

async function loadLeads() {
  const accountId = document.getElementById('filter-account')?.value || 'all';
  const url = accountId === 'all' ? '/leads?limit=500' : `/leads?account_id=${accountId}&limit=500`;
  const data = await apiFetch(url);
  if (Array.isArray(data)) {
    allLeads = data;
    renderTable();
  }
}

async function refreshAccountFilter() {
    const select = document.getElementById('filter-account');
    if (!select) return;
    const accounts = await apiFetch('/auth/accounts');
    if (!accounts) return;

    const current = select.value;
    select.innerHTML = '<option value="all">All Accounts</option>' + 
        accounts.map(a => `<option value="${a.id}">${a.session_name}</option>`).join('');
    select.value = current;
}

async function loadStatusCounts() {
  const data = await apiFetch('/leads/count-by-status');
  if (!data) return;
  const pills = document.getElementById('status-pills');
  if (!pills) return;
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  pills.innerHTML = `
    <div class="chip" onclick="filterByStatus('All')">All <strong>${total}</strong></div>
    ${Object.entries(data).map(([s, c]) => `
      <div class="chip" onclick="filterByStatus('${s}')">${s} <strong>${c}</strong></div>
    `).join('')}
  `;
}

function filterByStatus(status) {
  currentFilter = status;
  document.getElementById('filter-status').value = status;
  renderTable();
}

function renderTable() {
  const statusFilter = currentFilter;
  const scoreFilter = document.getElementById('filter-score')?.value || 'all';
  const search = (document.getElementById('filter-search')?.value || '').toLowerCase();

  let filtered = allLeads;
  if (statusFilter !== 'All') filtered = filtered.filter(l => l.status === statusFilter);
  if (scoreFilter === 'high') filtered = filtered.filter(l => l.score >= 50);
  if (scoreFilter === 'med') filtered = filtered.filter(l => l.score >= 20 && l.score < 50);
  if (scoreFilter === 'low') filtered = filtered.filter(l => l.score < 20);
  if (search) filtered = filtered.filter(l => (l.username || '').toLowerCase().includes(search));

  const count = document.getElementById('leads-count');
  if (count) count.textContent = `${filtered.length} lead${filtered.length !== 1 ? 's' : ''}`;

  const tbody = document.getElementById('leads-tbody');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><span class="icon">👤</span><h3>No leads found</h3><p>Try scanning groups to discover leads.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(l => `
    <tr>
      <td>
        <a href="https://t.me/${l.username}" target="_blank" style="color:var(--blue-light);text-decoration:none">
          @${l.username}
        </a>
        ${l.first_name ? `<div style="font-size:11px;color:var(--text-muted)">${l.first_name} ${l.last_name || ''}</div>` : ''}
      </td>
      <td style="color:var(--text-secondary);font-size:12px;max-width:130px;overflow:hidden;text-overflow:ellipsis">${l.group_source || '—'}</td>
      <td><span class="score-badge ${scoreClass(l.score)}">${Math.round(l.score)}</span></td>
      <td>
        <select class="status-select" data-id="${l.id}" style="background:var(--bg-input);border:1px solid var(--border);color:var(--text-primary);border-radius:6px;padding:4px 8px;font-size:12px">
          ${['New','Contacted','Replied','Interested','Client'].map(s =>
            `<option value="${s}" ${l.status === s ? 'selected' : ''}>${s}</option>`
          ).join('')}
        </select>
      </td>
      <td style="max-width:140px">
        ${(l.keywords_matched || []).slice(0,3).map(k => `<span style="font-size:10px;background:var(--blue-soft);color:var(--blue-light);padding:2px 6px;border-radius:4px;margin:1px;display:inline-block">${k}</span>`).join('')}
      </td>
      <td style="color:var(--text-muted);font-size:12px">${timeAgo(l.created_at)}</td>
      <td>
        <input type="text" placeholder="Notes..." value="${l.notes || ''}" data-id="${l.id}"
          style="background:transparent;border:none;border-bottom:1px solid var(--border);border-radius:0;color:var(--text-secondary);font-size:12px;padding:4px 0;width:130px"
          class="notes-input" />
      </td>
      <td>
        <button class="btn btn-ghost btn-sm msg-history-btn" data-id="${l.id}" data-username="${l.username}">💬</button>
      </td>
    </tr>
  `).join('');

  // Status change
  tbody.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', async (e) => {
      const id = e.target.dataset.id;
      const status = e.target.value;
      await apiFetch(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      showToast(`Status updated to ${status}`, 'success');
      await loadStatusCounts();
    });
  });

  // Notes save on blur
  tbody.querySelectorAll('.notes-input').forEach(inp => {
    inp.addEventListener('blur', async (e) => {
      const id = e.target.dataset.id;
      const notes = e.target.value;
      await apiFetch(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ notes }) });
    });
  });

  // Message history
  tbody.querySelectorAll('.msg-history-btn').forEach(btn => {
    btn.addEventListener('click', () => showMessageHistory(btn.dataset.username));
  });
}

async function showMessageHistory(username) {
  const modal = document.getElementById('msg-modal');
  const titleEl = document.getElementById('modal-title');
  const msgsEl = document.getElementById('modal-messages');
  titleEl.textContent = `Messages with @${username}`;
  msgsEl.innerHTML = '<div class="spinner" style="margin:20px auto"></div>';
  modal.style.display = 'flex';

  const msgs = await apiFetch(`/leads/messages/${username}`);
  if (!Array.isArray(msgs) || msgs.length === 0) {
    msgsEl.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px">No messages yet.</p>';
    return;
  }

  msgsEl.innerHTML = msgs.map(m => `
    <div style="display:flex;${m.direction === 'sent' ? 'justify-content:flex-end' : ''};margin-bottom:12px">
      <div style="max-width:80%;background:${m.direction === 'sent' ? 'var(--blue-primary)' : 'var(--bg-card)'};
        border:1px solid var(--border);border-radius:${m.direction === 'sent' ? '12px 12px 0 12px' : '12px 12px 12px 0'};
        padding:10px 14px;">
        <div style="font-size:13px">${m.content}</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:4px">${timeAgo(m.sent_at)}</div>
      </div>
    </div>
  `).join('');
}
