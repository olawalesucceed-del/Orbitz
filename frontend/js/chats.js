let allChats = [];
let currentChatFilter = 'all';
let selectedChatId = null;

function getChatAccountId() {
    const select = document.getElementById('chat-account-select');
    if (select && select.value) return parseInt(select.value);
    
    const last = localStorage.getItem('last_active_account');
    if (last) return parseInt(last);
    
    return null;
}

function renderChats(container) {
    container.innerHTML = `
        <div class="chat-hub">
            <!-- Left: Chat List -->
            <div class="chat-list-panel">
                <div class="chat-my-profile" id="current-user-profile">
                    <!-- Profile card injected here -->
                </div>
                <div id="chat-account-picker" style="padding: 0 16px 12px 16px">
                    <!-- Account selector injected here -->
                </div>
                <div class="chat-filters">
                    <button class="chat-filter-btn active" data-filter="all">All</button>
                    <button class="chat-filter-btn" data-filter="private">Users</button>
                    <button class="chat-filter-btn" data-filter="group">Groups</button>
                    <button class="chat-filter-btn" data-filter="channel">Channels</button>
                </div>
                <div class="chat-items" id="chat-items-list">
                    <div style="padding:40px; text-align:center"><div class="spinner"></div></div>
                </div>
            </div>

            <!-- Right: Chat View -->
            <div class="chat-view-panel" id="chat-view-container">
                <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; opacity:0.5">
                    <span style="font-size:64px; margin-bottom:20px">📡</span>
                    <h3>Select a chat to view messages</h3>
                    <p>Access the orbital layer of your Telegram account.</p>
                </div>
            </div>
        </div>
    `;

    // Filter event listeners
    document.querySelectorAll('.chat-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.chat-filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentChatFilter = e.target.dataset.filter;
            renderChatList();
        });
    });

    refreshChatAccountPicker();
    refreshMyProfile();
    loadChats();
}

async function refreshChatAccountPicker() {
    try {
        const container = document.getElementById('chat-account-picker');
        if (!container) return;
        
        const res = await apiFetch('/auth/accounts');
        const accounts = Array.isArray(res) ? res : [];
        
        if (accounts.length === 0) {
            container.innerHTML = `<span style="font-size:12px;color:var(--danger);padding:10px;display:block">No active Telegram sessions found.</span>`;
            return;
        }

        // If only one account, hide the picker
        if (accounts.length === 1) {
            container.style.display = 'none';
            localStorage.setItem('last_active_account', accounts[0].id);
            return;
        }

        container.style.display = 'block';
        container.innerHTML = `
            <label style="font-size:11px; font-weight:700; color:var(--text-muted); display:block; margin-bottom:6px; letter-spacing:0.05em; text-transform:uppercase">Active Sector</label>
            <select id="chat-account-select" class="form-input" style="padding:8px 12px; font-size:13px; width:100%; background:var(--bg-glass-active); border:1px solid var(--accent-primary); color:var(--text-white); border-radius:var(--radius-sm)">
                ${accounts.map(a => `<option value="${a.id}">${a.session_name}</option>`).join('')}
            </select>
        `;
        
        const last = localStorage.getItem('last_active_account');
        if (last) {
            const select = document.getElementById('chat-account-select');
            if (select) select.value = last;
        }
        
        const selectEl = document.getElementById('chat-account-select');
        if (selectEl) {
            selectEl.addEventListener('change', (e) => {
                localStorage.setItem('last_active_account', e.target.value);
                loadChats();
                refreshMyProfile();
            });
        }
    } catch (e) {
        console.error("Picker failed:", e);
    }
}

async function loadChats() {
    try {
        let accountId = getChatAccountId();
        
        const resAcc = await apiFetch('/auth/accounts');
        const accounts = Array.isArray(resAcc) ? resAcc : [];
        
        if (accounts.length > 0) {
            const exists = accounts.find(a => a.id === accountId);
            if (!exists || !accountId) {
                accountId = accounts[0].id;
                localStorage.setItem('last_active_account', accountId);
            }
        }

        if (!accountId) {
            showToast('Authentication required. Please link an account.', 'warning');
            return;
        }

        const res = await apiFetch(`/chats/list?account_id=${accountId}`);
        if (res && res.success) {
            allChats = res.chats || [];
            renderChatList();
            fetchMissingAvatars(accountId);
        } else {
            document.getElementById('chat-items-list').innerHTML = `<div style="padding:40px; text-align:center; color:var(--danger)">${res?.error || 'Failed to sync dialogs.'}</div>`;
        }
    } catch (e) {
        console.error("Load failed:", e);
    }
}

function renderChatList() {
    const list = document.getElementById('chat-items-list');
    if (!list) return;

    let filtered = allChats;
    if (currentChatFilter !== 'all') {
        filtered = allChats.filter(c => c.type === currentChatFilter);
    }

    if (filtered.length === 0) {
        list.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-muted)">No chats found.</div>`;
        return;
    }

    list.innerHTML = filtered.map(chat => {
        const isActive = selectedChatId === chat.id;
        const timeStr = chat.date ? new Date(chat.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        
        return `
            <div class="chat-item ${isActive ? 'active' : ''}" onclick="selectChat(${chat.id})">
                <img class="avatar" src="${getFullAvatarUrl(chat.avatar_path) || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 48 48\'%3E%3Crect width=\'48\' height=\'48\' fill=\'%23333\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23666\' font-size=\'16\'%3E${chat.name[0]}%3C/text%3E%3C/svg%3E'}" id="avatar-${chat.id}">
                <div class="chat-info">
                    <div class="chat-name">${chat.name}</div>
                    <div class="chat-preview">${chat.last_message || 'No messages'}</div>
                </div>
                <div class="chat-meta">
                    <div class="chat-time">${timeStr}</div>
                    ${chat.unread_count > 0 ? `<div class="chat-badge">${chat.unread_count}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

async function selectChat(chatId) {
    selectedChatId = chatId;
    renderChatList(); 

    const chat = allChats.find(c => c.id === chatId);
    const view = document.getElementById('chat-view-container');
    if (!view || !chat) return;

    const isGroup = chat.type === 'group' || chat.type === 'channel';

    view.innerHTML = `
        <div class="chat-view-header" style="display:flex; justify-content:space-between; align-items:center">
            <div style="display:flex; align-items:center; gap:12px">
                <img class="avatar" src="${getFullAvatarUrl(chat.avatar_path) || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 48 48\'%3E%3Crect width=\'48\' height=\'48\' fill=\'%23333\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23666\' font-size=\'12\'%3E${chat.name[0]}%3C/text%3E%3C/svg%3E'}">
                <div>
                    <div class="chat-name" style="font-size:16px">${chat.name}</div>
                    <div style="font-size:12px; color:var(--text-secondary)">${chat.type.toUpperCase()} ${chat.username ? `• @${chat.username}` : ''}</div>
                </div>
            </div>
            ${isGroup ? `<button class="btn btn-ghost btn-sm" onclick="toggleMembers(${chat.id})" style="border:1px solid var(--border-glass)">👥 Members</button>` : ''}
        </div>
        <div style="display:flex; flex:1; overflow:hidden">
            <div style="flex:1; display:flex; flex-direction:column; border-right: 1px solid var(--border-glass)" id="messages-container">
                <div class="chat-messages" id="message-flow">
                    <div style="padding:40px; text-align:center"><div class="spinner"></div></div>
                </div>
                <div class="chat-input-area">
                    <div style="display:flex; gap:12px">
                        <input type="text" placeholder="Type a message..." style="flex:1" id="chat-msg-input">
                        <button class="btn btn-primary" id="chat-send-btn">SEND</button>
                    </div>
                </div>
            </div>
            <div class="chat-members-panel" id="members-panel" style="display:none">
                <div class="members-header">Sector Entities</div>
                <div class="members-list" id="members-list-content">
                    <div style="padding:20px; text-align:center"><div class="spinner"></div></div>
                </div>
            </div>
            <div class="chat-members-panel" id="user-profile-panel" style="display:none; border-left: 1px solid var(--border-glass);">
                <div class="members-header" style="display:flex; justify-content:space-between; align-items:center">
                    <span>Entity Profile</span>
                    <button class="btn btn-ghost btn-sm" style="padding: 2px 6px; border: none; font-size: 14px;" onclick="closeUserProfile()">✕</button>
                </div>
                <div class="members-list" id="user-profile-content">
                    <div style="padding:20px; text-align:center"><div class="spinner"></div></div>
                </div>
            </div>
        </div>
    `;

    loadMessages(chatId);
}

async function toggleMembers(chatId) {
    const profilePanel = document.getElementById('user-profile-panel');
    if (profilePanel) profilePanel.style.display = 'none';

    const panel = document.getElementById('members-panel');
    if (!panel) return;
    
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        loadMembers(chatId);
    } else {
        panel.style.display = 'none';
    }
}

async function loadMembers(chatId) {
    const list = document.getElementById('members-list-content');
    const accountId = getChatAccountId();
    if (!accountId || !list) return;

    const res = await apiFetch(`/chats/members/${chatId}?account_id=${accountId}`);
    if (res && res.success) {
        list.innerHTML = res.participants.map(p => `
            <div class="member-item">
                <div class="member-avatar">${p.first_name[0]}</div>
                <div class="member-info">
                    <div class="member-name">${p.first_name} ${p.last_name || ''}</div>
                    <div class="member-username">${p.username ? '@'+p.username : (p.phone || 'Hidden')}</div>
                </div>
            </div>
        `).join('');
    } else {
        list.innerHTML = `<div style="padding:20px; color:var(--danger); font-size:12px">Failed to retrieve entities. Probably privacy restricted.</div>`;
    }
}

async function loadMessages(chatId) {
    const flow = document.getElementById('message-flow');
    const accountId = getChatAccountId();
    if (!accountId) return;

    const res = await apiFetch(`/chats/messages/${chatId}?account_id=${accountId}`);
    if (res && res.success) {
        renderMessages(res.messages || []);
    } else {
        flow.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-muted)">Failed to fetch messages: ${res?.error || 'Unknown error'}</div>`;
    }
}

async function refreshMyProfile() {
    const container = document.getElementById('current-user-profile');
    if (!container) return;

    const accountId = getChatAccountId();
    if (!accountId) return;

    const res = await apiFetch(`/chats/me?account_id=${accountId}`);
    if (res && res.success && res.me) {
        const me = res.me;
        container.innerHTML = `
            <div class="my-profile-card">
                <img src="${getFullAvatarUrl(me.avatar_path) || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 48 48\'%3E%3Crect width=\'48\' height=\'48\' fill=\'%23333\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' fill=\'%23666\' font-size=\'16\'%3E${me.first_name[0]}%3C/text%3E%3C/svg%3E'}" class="me-avatar">
                <div class="me-info">
                    <div class="me-name">${me.first_name} ${me.last_name || ''}</div>
                    <div class="me-username">@${me.username || 'No Username'}</div>
                </div>
            </div>
        `;
    }
}

function renderMessages(msgs) {
    const flow = document.getElementById('message-flow');
    if (!flow) return;

    if (msgs.length === 0) {
        flow.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-muted)">No recent activity in this sector.</div>`;
        return;
    }

    flow.innerHTML = msgs.map(m => `
        <div class="msg-bubble ${m.direction === 'sent' ? 'msg-out' : 'msg-in'}">
            ${m.direction === 'received' && m.sender_name && m.sender_name !== 'Unknown' ? `<div style="font-size: 11px; font-weight: 700; color: var(--accent-primary); margin-bottom: 4px; opacity: 0.9; cursor: pointer;" onclick="showUserProfile(${m.sender_id})">${m.sender_name}</div>` : ''}
            <div>${m.content}</div>
            <div class="msg-time">${new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
    `).join('');
    
    flow.scrollTop = flow.scrollHeight;
}

async function fetchMissingAvatars(accountId) {
    const chatsToFetch = allChats.filter(c => !c.avatar_path).slice(0, 15);
    for (const chat of chatsToFetch) {
        const res = await apiFetch(`/chats/avatar/${chat.id}?account_id=${accountId}`);
        if (res && res.path) {
            chat.avatar_path = getFullAvatarUrl(res.path);
            const img = document.getElementById(`avatar-${chat.id}`);
            if (img) img.src = chat.avatar_path;
        }
        await new Promise(r => setTimeout(r, 200)); // Rate limit protection
    }
}

async function showUserProfile(userId) {
    const membersPanel = document.getElementById('members-panel');
    if (membersPanel) membersPanel.style.display = 'none';
    
    const panel = document.getElementById('user-profile-panel');
    if (!panel) return;
    
    panel.style.display = 'block';
    const content = document.getElementById('user-profile-content');
    content.innerHTML = '<div style="padding:40px; text-align:center"><div class="spinner"></div></div>';
    
    const accountId = getChatAccountId();
    if (!accountId) return;

    try {
        const res = await apiFetch(`/chats/user/${userId}?account_id=${accountId}`);
        if (res && res.success && res.profile) {
            const p = res.profile;
            const initial = p.first_name ? p.first_name[0] : '?';
            const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Crect width='48' height='48' fill='%23222'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23666' font-size='16'%3E" + initial + "%3C/text%3E%3C/svg%3E";
            const avatarSrc = getFullAvatarUrl(p.avatar_path) || defaultAvatar;

            let html = '<div style="padding: 32px 16px 24px 16px; text-align: center; border-bottom: 1px solid var(--border-glass)">';
            html += '<img src="' + avatarSrc + '" style="width: 88px; height: 88px; border-radius: 50%; object-fit: cover; margin-bottom: 16px; border: 2px solid rgba(255,255,255,0.1); box-shadow: 0 8px 16px rgba(0,0,0,0.3);">';
            html += '<div style="font-size: 18px; font-weight: 800; color: var(--text-white)">' + (p.first_name || '') + ' ' + (p.last_name || '') + '</div>';
            
            if (p.username) {
                html += '<div style="font-size: 13px; color: var(--accent-primary); margin-top: 6px; font-weight:600">@' + p.username + '</div>';
            }
            if (p.phone) {
                html += '<div style="font-size: 13px; color: var(--text-secondary); margin-top: 6px;">' + p.phone + '</div>';
            }
            html += '</div>';

            if (p.about) {
                html += '<div style="padding: 24px 20px;">';
                html += '<div style="font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">Bio</div>';
                html += '<div style="font-size: 14px; color: var(--text-primary); line-height: 1.6; white-space: pre-wrap;">' + p.about + '</div>';
                html += '</div>';
            } else {
                html += '<div style="padding: 24px 20px; text-align:center; color: var(--text-muted); font-size: 13px; font-style: italic;">No bio available.</div>';
            }
            
            content.innerHTML = html;
        } else {
            const errMsg = res?.detail || res?.error || 'Failed to load profile. Please try again.';
            content.innerHTML = '<div style="padding:40px 20px; color:var(--danger); font-size:13px; text-align:center">' + errMsg + '</div>';
        }
    } catch (e) {
        content.innerHTML = '<div style="padding:40px 20px; color:var(--danger); font-size:13px; text-align:center">Network error loading profile.</div>';
    }
}

function closeUserProfile() {
    const panel = document.getElementById('user-profile-panel');
    if (panel) panel.style.display = 'none';
}
