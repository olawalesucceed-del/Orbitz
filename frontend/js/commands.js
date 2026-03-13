/**
 * AI Commands Panel — Terminal-style interface for plain-language commands
 */

const SUGGESTED_COMMANDS = [
  'Scan all joined groups for Target leads',
  'Find new groups to join',
  'Sync Telegram chats',
  'Enable background scanning',
  'Disable background scanning',
  'Send outreach to 5 new leads',
  'Show all interested clients',
  'Show all leads',
  'Stats',
  'Pause messaging',
  'Resume messaging',
];

let commandHistory = [];
let historyIndex = -1;

function renderCommands(container) {
  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">🤖 AI Command Panel</h1>
      <p class="page-subtitle">Type plain-language instructions for the AI to execute</p>
    </div>

    <!-- Account Selector -->
    <div class="card mb-24">
      <div style="display:flex; align-items:center; gap:12px">
        <div class="stat-icon" style="background:rgba(59,130,246,0.1)">🤖</div>
        <div style="flex:1">
          <div style="font-weight:700">Control Account</div>
          <div style="font-size:12px;color:var(--text-secondary)">Pick which account follows these commands</div>
        </div>
        <select id="cmd-account-list" class="stats-select" style="width:200px">
          <option value="">Loading accounts...</option>
        </select>
      </div>
    </div>

    <!-- Quick Chips -->

    <!-- Terminal -->
    <div class="card">
      <div class="flex-between mb-16">
        <div class="card-title" style="margin-bottom:0">🖥️ Command Terminal</div>
        <button class="btn btn-ghost btn-sm" id="clear-terminal">Clear</button>
      </div>

      <div class="terminal" id="terminal">
        <div class="terminal-line">
          <span class="terminal-prefix">Orbit AI</span>
          <span class="terminal-text terminal-info">Ready. Type a command below or click a quick command above.</span>
        </div>
        <div class="terminal-line">
          <span class="terminal-prefix">─────────────</span>
          <span class="terminal-text terminal-info">Examples: "Scan groups for leads" | "Message 10 new leads" | "Pause messaging"</span>
        </div>
      </div>

      <div class="input-group mt-16">
        <input type="text" id="cmd-input" placeholder="Enter a command..." autocomplete="off" />
        <button class="btn btn-primary" id="cmd-send">▶ Run</button>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:8px">
        ↑↓ to navigate history • Enter to run
      </div>
    </div>
  `;

  const terminal = document.getElementById('terminal');
  const input = document.getElementById('cmd-input');
  const sendBtn = document.getElementById('cmd-send');

  // Populate accounts
  async function loadAccounts() {
    const list = document.getElementById('cmd-account-list');
    const accounts = await apiFetch('/auth/accounts');
    if (!accounts || accounts.length === 0) {
      list.innerHTML = '<option value="">No accounts found</option>';
      return;
    }
    list.innerHTML = accounts.map(acc => `<option value="${acc.id}">${acc.session_name} (${acc.phone || 'New'})</option>`).join('');
  }
  loadAccounts();

  // Quick chips
  document.querySelectorAll('.cmd-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      input.value = chip.textContent;
      input.focus();
    });
  });

  // Clear terminal
  document.getElementById('clear-terminal').addEventListener('click', () => {
    terminal.innerHTML = `
      <div class="terminal-line">
        <span class="terminal-prefix">Scout AI</span>
        <span class="terminal-text terminal-info">Terminal cleared. Ready for commands.</span>
      </div>
    `;
  });

  // Run command
  async function runCommand() {
    const text = input.value.trim();
    if (!text) return;

    const accId = document.getElementById('cmd-account-list').value;
    if (!accId) {
      addTerminalLine('Error: Please select an account first.', 'terminal-error');
      return;
    }

    commandHistory.unshift(text);
    historyIndex = -1;

    addTerminalLine(`> ${text}`, 'terminal-prefix');
    input.value = '';
    sendBtn.disabled = true;

    const result = await apiFetch('/commands/execute', {
      method: 'POST',
      body: JSON.stringify({ account_id: parseInt(accId), text })
    });

    sendBtn.disabled = false;

    if (!result) {
      addTerminalLine('Error: Cannot connect to backend.', 'terminal-error');
      return;
    }

    addTerminalLine(result.message || 'Command executed.', result.success ? 'terminal-success' : 'terminal-error');

    // Show additional data if present
    if (result.leads && result.leads.length > 0) {
      addTerminalLine(`─── Results (${result.leads.length}) ───`, 'terminal-info');
      result.leads.slice(0, 10).forEach(l => {
        addTerminalLine(`  @${l.username} — Score: ${l.score} — Status: ${l.status}`, 'terminal-text');
      });
      if (result.leads.length > 10) {
        addTerminalLine(`  ... and ${result.leads.length - 10} more. See Leads page.`, 'terminal-warn');
      }
    }

    if (result.replies && result.replies.length > 0) {
      addTerminalLine(`─── Recent Replies (${result.replies.length}) ───`, 'terminal-info');
      result.replies.forEach(r => {
        addTerminalLine(`  @${r.username}: "${r.message}"`, 'terminal-text');
      });
    }
  }

  sendBtn.addEventListener('click', runCommand);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { runCommand(); return; }
    if (e.key === 'ArrowUp') {
      historyIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
      input.value = commandHistory[historyIndex] || '';
      e.preventDefault();
    }
    if (e.key === 'ArrowDown') {
      historyIndex = Math.max(historyIndex - 1, -1);
      input.value = historyIndex === -1 ? '' : commandHistory[historyIndex];
      e.preventDefault();
    }
  });

  function addTerminalLine(text, cls = 'terminal-text') {
    const line = document.createElement('div');
    line.className = 'terminal-line';
    line.innerHTML = `<span class="${cls}">${escapeHtml(text)}</span>`;
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
  }

  function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
