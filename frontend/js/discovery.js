/**
 * Discovery Page — Search and Join Telegram Groups
 */

function renderDiscovery(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">🔍 Group Finder</h1>
        <p class="page-subtitle">Search Telegram for public groups in your niche and join them automatically.</p>
      </div>
    </div>

    <div class="grid-2">
      <!-- Search Control -->
      <div class="card">
        <div class="card-title">🚀 Discovery Console</div>
        <div class="form-group mb-16">
          <label>Target Niche / Keyword</label>
          <input type="text" id="disc-keyword" placeholder='e.g. "IPTV", "Crypto Trading", "Netflix Fans"' style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border); background:var(--bg-secondary); color:var(--text-primary);" />
        </div>
        
        <div class="info-box mb-16" style="background:rgba(139,92,246,0.05); border:1px solid rgba(139,92,246,0.2); padding:12px; border-radius:8px; font-size:13px; color:var(--text-secondary);">
          <span style="font-size:16px; margin-right:8px;">💡</span>
          The AI will search Telegram globally for public groups matching your keyword. For your safety, it joins them slowly to avoid being flagged.
        </div>

        <button class="btn btn-primary btn-lg" id="btn-start-discovery" style="width:100%">
          Search & Join Groups
        </button>
      </div>

      <!-- Activity/Log -->
      <div class="card">
        <div class="card-title">📋 Discovery Logs</div>
        <div id="discovery-logs" style="height:300px; overflow-y:auto; font-family:monospace; font-size:12px; background:var(--bg-secondary); padding:15px; border-radius:8px; border:1px solid var(--border);">
          <div style="color:var(--text-secondary)">Waiting for discovery to start...</div>
        </div>
      </div>
    </div>

    <!-- Recommendations -->
    <div class="card mt-24">
      <div class="card-title">⭐ Recommended Niche Keywords</div>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        ${['IPTV', 'Subscription', 'Streaming', 'Cable', 'Sports Live', 'Movie Fans'].map(k => `
          <button class="btn btn-ghost btn-sm tag-btn" data-tag="${k}">${k}</button>
        `).join('')}
      </div>
    </div>
  `;

  const startBtn = document.getElementById('btn-start-discovery');
  const keywordInput = document.getElementById('disc-keyword');
  const logsContainer = document.getElementById('discovery-logs');

  function addLog(msg, type = 'info') {
    const color = type === 'success' ? 'var(--success)' : (type === 'error' ? 'var(--danger)' : 'var(--text-primary)');
    const div = document.createElement('div');
    div.style.marginBottom = '5px';
    div.innerHTML = `<span style="color:var(--text-secondary)">[${new Date().toLocaleTimeString()}]</span> <span style="color:${color}">${msg}</span>`;
    logsContainer.prepend(div);
  }

  // Tag buttons
  document.querySelectorAll('.tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      keywordInput.value = btn.dataset.tag;
    });
  });

  startBtn.addEventListener('click', async () => {
    const accId = getActiveAccountId();
    if (!accId) {
      showToast('Please select an account first', 'error');
      return;
    }

    const keyword = keywordInput.value.trim();
    if (!keyword) {
      showToast('Please enter a keyword', 'warning');
      return;
    }

    startBtn.disabled = true;
    startBtn.textContent = '🔍 Discovery in Progress...';
    addLog(`Starting discovery for "${keyword}"...`, 'info');
    showToast(`Searching for ${keyword} groups...`, 'info');

    try {
      const result = await apiFetch(`/leads/discover?account_id=${accId}&keyword=${encodeURIComponent(keyword)}`, {
        method: 'POST'
      });

      if (result.status) {
        addLog(`✅ Job queued: ${result.status}`, 'success');
        showToast('Discovery job started in background!', 'success');
      } else {
        addLog(`❌ Failed: ${result.detail || 'Unknown error'}`, 'error');
        showToast('Discovery failed to start.', 'error');
      }
    } catch (err) {
      addLog(`❌ Connection Error`, 'error');
    } finally {
      setTimeout(() => {
        startBtn.disabled = false;
        startBtn.textContent = 'Search & Join Groups';
      }, 3000);
    }
  });

  // Listen for WS updates if on this page
  const originalHandler = window.handleWSMessage;
  window.handleWSMessage = (msg) => {
    if (originalHandler) originalHandler(msg);
    
    if (msg.type === 'discovery_started') {
      addLog(`🔍 Global search initiated for "${msg.niche}"`, 'info');
    }
    if (msg.type === 'group_joined') {
      addLog(`🤝 Successfully joined: ${msg.title}`, 'success');
    }
  };
}

window.renderDiscovery = renderDiscovery;
