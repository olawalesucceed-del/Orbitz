/**
 * Broadcast Page — Drafting and sending messages to all joined groups
 */

function renderBroadcast(container) {
  container.innerHTML = `
    <div class="page-header flex-between" style="align-items:flex-end">
      <div>
        <h1 class="page-title">📢 Broadcast Intelligence</h1>
        <p class="page-subtitle">Multi-account global messaging to all active Telegram communities</p>
      </div>
      <div id="broadcast-account-picker" style="margin-bottom:10px">
        <!-- Account selector injected here -->
      </div>
    </div>

    <div class="grid-2">
      <!-- Broadcast Console -->
      <div class="card" style="display:flex; flex-direction:column; justify-content: space-between">
        <div>
          <div class="card-title">📝 COMPOSE TRANSMISSION</div>
          <div class="form-group mb-16">
            <label>Message Content (AI Optimized)</label>
            <textarea id="broadcast-content" rows="10" placeholder="Type your strategic broadcast message here..."></textarea>
          </div>
          
          <div class="card" style="background:rgba(59, 130, 246, 0.05); border:1px solid rgba(59, 130, 246, 0.1); padding:16px; margin-bottom: 24px">
            <p style="font-size:13px; color:var(--text-secondary); line-height: 1.6">
                <strong style="color:var(--accent-primary)">Attention:</strong> Transmission will be delivered to <span style="color:var(--text-white); font-weight:700">ALL</span> joined groups associated with this account.
            </p>
          </div>
        </div>

        <button class="btn btn-primary btn-lg" id="btn-do-broadcast" style="width:100%">
          🚀 INITIATE BROADCAST
        </button>
      </div>

      <!-- Real-time Transmission Logs -->
      <div class="card">
        <div class="card-title">📋 TRANSMISSION LOGS</div>
        <div class="activity-feed" id="broadcast-activity" style="max-height: 440px; overflow-y: auto;">
          <div class="empty-state">
            <span class="icon">📡</span>
            <p>Ready for deployment. Select an account to view previous transmission logs.</p>
          </div>
        </div>
      </div>
    </div>
  `;

  // --- Logic ---
  const accPicker = container.querySelector('#broadcast-account-picker');
  const btnLaunch = container.querySelector('#btn-do-broadcast');
  const textarea = container.querySelector('#broadcast-content');
  const activityFeed = container.querySelector('#broadcast-activity');

  let activeAccountId = null;

  async function loadAccounts() {
    const accounts = await apiFetch('/auth/accounts');
    if (Array.isArray(accounts) && accounts.length > 0) {
      accPicker.innerHTML = `
        <div class="form-group" style="margin:0">
        <select id="broadcast-acc-select" style="width:200px">
          ${accounts.map(a => `<option value="${a.id}">${a.session_name} (@${a.phone})</option>`).join('')}
        </select>
        </div>
      `;
      activeAccountId = accounts[0].id;
      accPicker.querySelector('select').addEventListener('change', (e) => {
        activeAccountId = e.target.value;
        loadBroadcastHistory();
      });
      loadBroadcastHistory();
    } else {
      accPicker.innerHTML = '<span style="color:var(--danger); font-size:12px">No Accounts Connected</span>';
      btnLaunch.disabled = true;
    }
  }

  async function loadBroadcastHistory() {
    if (!activeAccountId) return;
    
    activityFeed.innerHTML = '<div style="display:flex; justify-content:center; padding:40px"><div class="spinner"></div></div>';
    
    const data = await apiFetch('/dashboard/summary'); 
    if (data && data.recent_logs) {
      const broadcastLogs = data.recent_logs.filter(l => l.action_type === 'broadcast' || l.action_type === 'error');
      activityFeed.innerHTML = broadcastLogs.length > 0 ? '' : '<div class="empty-state"><p>No recent broadcasts for this account.</p></div>';
      broadcastLogs.forEach(l => {
        const item = document.createElement('div');
        item.className = `activity-item ${l.success ? '' : 'error'}`;
        item.innerHTML = `
          <span class="activity-icon">${l.action_type === 'broadcast' ? '📢' : '❌'}</span>
          <span class="activity-text">${l.detail}</span>
          <span class="activity-time">${timeAgo(l.timestamp)}</span>
        `;
        activityFeed.appendChild(item);
      });
    } else {
        activityFeed.innerHTML = '<div class="empty-state"><p>Stats inaccessible.</p></div>';
    }
  }

  btnLaunch.addEventListener('click', async () => {
    const msg = textarea.value.trim();
    if (!msg) {
      showToast('Transmission requires content.', 'warning');
      return;
    }

    if (!activeAccountId) {
      showToast('Target account required.', 'error');
      return;
    }

    btnLaunch.disabled = true;
    btnLaunch.innerHTML = '<div class="spinner" style="width:18px;height:18px;margin-right:10px"></div> DEPLOYING...';
    showToast('🚀 Broadcast sequence initiated.', 'info');

    const res = await apiFetch('/commands/execute', {
      method: 'POST',
      body: JSON.stringify({
        account_id: activeAccountId,
        text: `Broadcast to groups: ${msg}`
      })
    });

    btnLaunch.disabled = false;
    btnLaunch.innerHTML = '🚀 INITIATE BROADCAST';

    if (res.status || res.success) {
      showToast(res.status || 'Broadcast complete!', 'success');
      textarea.value = '';
      setTimeout(loadBroadcastHistory, 2000);
    } else {
      showToast(res.error || 'Transmission failed.', 'error');
    }
  });

  loadAccounts();
}

window.renderBroadcast = renderBroadcast;
