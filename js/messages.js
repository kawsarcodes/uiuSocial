let currentChatUserId = null;
let chatStream = null;
let chatStreamRetry = null;
let chatFallbackTimer = null;
let chatHasMore = false;
let chatLoadingOlder = false;
let chatStreamConnected = false;
let chatPeer = null;
let pendingFile = null;
let replyingTo = null;
let chatSeenIds = new Set();
let chatSyncTimer = null;
let lastSeenMessageId = 0;

const CHAT_MAX_TEXT = 5000;
const CHAT_MAX_FILE_BYTES = 10 * 1024 * 1024;
const CHAT_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const CHAT_ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
    await setupMessagesPage();
});

async function setupMessagesPage() {
    setCurrentUserAvatar();
    await renderChatList();

    const urlParams = new URLSearchParams(window.location.search);
    const initialUserId = urlParams.get('user');
    if (initialUserId) {
        selectChat(initialUserId);
    } else {
        showEmptyState(true);
    }

    document.getElementById('chat-send-btn')?.addEventListener('click', sendTextMessage);

    const inputField = document.getElementById('chat-input-field');
    inputField?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendTextMessage();
        }
    });
    inputField?.addEventListener('input', () => {
        const sendBtn = document.getElementById('chat-send-btn');
        if (sendBtn) sendBtn.classList.toggle('ready', (inputField.value || '').trim().length > 0 || !!pendingFile);
    });

    const toggleInfoBtn = document.getElementById('toggle-info-btn');
    const userInfoPane = document.getElementById('user-info-pane');
    toggleInfoBtn?.addEventListener('click', () => {
        const isHidden = !userInfoPane.style.display || userInfoPane.style.display === 'none';
        userInfoPane.style.display = isHidden ? 'flex' : 'none';
        toggleInfoBtn.classList.toggle('text-primary', isHidden);
    });

    document.getElementById('block-action-btn')?.addEventListener('click', handleBlockToggle);

    const fileInput = document.getElementById('chat-file-input');
    const imageInput = document.getElementById('chat-image-input');
    const attachBtn = document.getElementById('chat-attach-btn');
    const attachImageBtn = document.getElementById('chat-attach-image-btn');

    attachBtn?.addEventListener('click', () => fileInput?.click());
    attachImageBtn?.addEventListener('click', () => imageInput?.click());
    fileInput?.addEventListener('change', (e) => handleFilePicked(e.target.files?.[0]));
    imageInput?.addEventListener('change', (e) => handleFilePicked(e.target.files?.[0]));
    [attachBtn, attachImageBtn].forEach((el) => {
        el?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                el.click();
            }
        });
    });

    document.getElementById('chat-load-older')?.addEventListener('click', loadOlderMessages);

    const container = document.getElementById('chat-messages-container');
    container?.addEventListener('scroll', () => {
        if (container.scrollTop < 40) loadOlderMessages();
    });

    document.getElementById('chat-attachment-tray')?.addEventListener('click', (e) => {
        if (e.target.closest('.chat-attachment-remove')) clearPendingFile();
    });

    // Drag and drop anywhere over the conversation.
    const area = document.querySelector('.chat-area-pane');
    ['dragenter', 'dragover'].forEach((t) => area?.addEventListener(t, (e) => {
        e.preventDefault();
        area.classList.add('chat-drag-active');
    }));
    ['dragleave', 'drop'].forEach((t) => area?.addEventListener(t, (e) => {
        e.preventDefault();
        area.classList.remove('chat-drag-active');
    }));
    area?.addEventListener('drop', (e) => {
        const file = e.dataTransfer?.files?.[0];
        if (file) handleFilePicked(file);
    });

    document.getElementById('chat-messages-container')?.addEventListener('click', (e) => {
        const del = e.target.closest('.msg-delete');
        if (del) deleteOwnMessage(Number(del.dataset.id), del);
        const reply = e.target.closest('.msg-reply');
        if (reply) startReply(Number(reply.dataset.id));
    });

    window.addEventListener('beforeunload', stopChatStream);
    startChatStream();
    scheduleChatSync();
}

function setCurrentUserAvatar() {
    if (!window.currentUser?.avatar) return;
    const src = mediaUrl(window.currentUser.avatar);
    const avatarImg = document.getElementById('current-user-avatar') || document.querySelector('.header-user .avatar');
    if (avatarImg) avatarImg.src = src;
}

function showEmptyState(show) {
    const empty = document.getElementById('chat-empty-state');
    const header = document.getElementById('chat-area-header');
    const messages = document.getElementById('chat-messages-container');
    const inputArea = document.getElementById('chat-input-area');
    const infoPane = document.getElementById('user-info-pane');

    if (empty) empty.style.display = show ? 'flex' : 'none';
    if (header) header.style.display = show ? 'none' : 'flex';
    if (messages) messages.style.display = show ? 'none' : 'flex';
    if (inputArea) inputArea.style.display = show ? 'none' : 'flex';
    if (infoPane) infoPane.style.display = show ? 'none' : 'flex';
}

async function renderChatList() {
    const chatItems = document.getElementById('chat-items-container');
    if (!chatItems) return;
    try {
        const data = await api('api/messages/sync.php');
        const users = data.conversations || [];
        const filter = (document.getElementById('chat-filter-input')?.value || '').toLowerCase();

        chatItems.innerHTML = users.map(u => {
            const active = String(u.id) === String(currentChatUserId) ? ' active' : '';
            const blockedCls = u.blocked ? ' blocked-chat' : '';
            const hay = `${u.name} ${u.preview}`.toLowerCase();
            const hide = filter && !hay.includes(filter) ? ' style="display:none"' : '';
            return `
            <div class="chat-item${active}${blockedCls}" data-user-id="${u.id}" onclick="selectChat(${u.id})" style="cursor:pointer;"${hide}>
                <div class="chat-avatar-wrapper">
                    <img src="${mediaUrl(u.avatar)}" class="avatar" alt="${escapeHTML(u.name)}">
                    <div class="chat-status ${u.is_online ? 'online' : ''}"></div>
                </div>
                <div class="chat-item-content">
                    <div class="chat-item-header">
                        <span class="chat-item-name">${escapeHTML(u.name)}</span>
                        <span class="chat-item-time">${u.last_time || ''}</span>
                    </div>
                    <div class="chat-item-preview">
                        <span class="badge ${u.role === 'faculty' ? 'faculty' : 'student'}" style="font-size:8px;padding:2px 4px;">${String(u.role).toUpperCase()}</span>
                        ${u.blocked ? '<span class="chat-blocked-flag">Blocked</span>' : escapeHTML(u.preview || 'No messages yet')}
                    </div>
                </div>
                ${u.unread ? `<div class="chat-unread-badge">${u.unread > 99 ? '99+' : u.unread}</div>` : ''}
            </div>`;
        }).join('');

        if (!users.length) {
            chatItems.innerHTML = '<div class="text-muted text-center p-3">No users to message yet.</div>';
        }
    } catch (e) {
        console.error('Failed to load conversations', e);
    }
}

let chatSyncPending = false;
function scheduleChatSync() {
    if (chatSyncPending) return;
    chatSyncPending = true;
    setTimeout(async () => {
        chatSyncPending = false;
        await renderChatList();
    }, 250);
}

async function selectChat(userId) {
    userId = Number(userId);
    currentChatUserId = userId;
    chatSeenIds = new Set();
    lastSeenMessageId = 0;
    chatHasMore = false;
    chatPeer = null;
    clearPendingFile();
    setReplyingTo(null);
    showEmptyState(false);

    document.querySelectorAll('.chat-item').forEach(el => {
        el.classList.toggle('active', String(el.dataset.userId) === String(userId));
    });

    const container = document.getElementById('chat-messages-container');
    const loadBtn = document.getElementById('chat-load-older');
    if (container) {
        container.querySelectorAll('.msg-row').forEach(n => n.remove());
        container.querySelectorAll('.chat-day-sep').forEach(n => n.remove());
    }
    if (loadBtn) loadBtn.style.display = 'none';

    await loadChatThread(userId);
    openChatStream(userId);
    scheduleChatSync();
}

async function loadChatThread(userId, { afterId = 0 } = {}) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return null;
    const qs = afterId ? `&after_id=${afterId}` : '';
    try {
        const data = await api(`api/messages/thread.php?user_id=${userId}&limit=50${qs}`);
        const messages = data.messages || [];
        chatHasMore = !!data.has_more;

        // Peer identity comes from the server, so the header works even for a
        // conversation opened straight from a profile link.
        if (!afterId) {
            chatPeer = data.peer;
            applyPeerInfo(data.peer, data.blocked);
        }
        if (data.blocked !== undefined) applyBlockedState(data.blocked);

        if (!afterId) {
            container.querySelectorAll('.msg-row').forEach(n => n.remove());
            container.querySelectorAll('.chat-day-sep').forEach(n => n.remove());
        }

        messages.forEach(msg => {
            if (chatSeenIds.has(String(msg.id))) return;
            chatSeenIds.add(String(msg.id));
            appendMessage(msg, { scroll: !afterId });
        });

        if (!afterId) {
            scrollChatToBottom();
            const loadBtn = document.getElementById('chat-load-older');
            if (loadBtn) loadBtn.style.display = chatHasMore ? '' : 'none';
        }
        if (messages.length) lastSeenMessageId = Math.max(lastSeenMessageId, ...messages.map(m => Number(m.id) || 0));
        return data;
    } catch (e) {
        console.error('Thread load failed', e);
        return null;
    }
}

async function loadOlderMessages() {
    if (!currentChatUserId || !chatHasMore || chatLoadingOlder) return;
    chatLoadingOlder = true;
    const container = document.getElementById('chat-messages-container');
    const btn = document.getElementById('chat-load-older');
    const prevHeight = container ? container.scrollHeight : 0;
    const firstId = container?.querySelector('.msg-row')?.dataset.msgId;
    if (btn) btn.disabled = true;

    try {
        const data = await api(`api/messages/thread.php?user_id=${currentChatUserId}&limit=50&before_id=${firstId}&mark_read=0`);
        const messages = data.messages || [];
        const first = container?.querySelector('.msg-row');
        // Older pages can cross a day boundary, so separators are recomputed
        // from the top of the thread downwards as each page is prepended.
        messages.forEach(msg => {
            if (chatSeenIds.has(String(msg.id))) return;
            chatSeenIds.add(String(msg.id));
            const node = buildMessageNode(msg);
            if (first) {
                const prev = first.previousElementSibling;
                if (!prev || !prev.classList.contains('chat-day-sep') || prev.dataset.day !== msg.day) {
                    const sep = document.createElement('div');
                    sep.className = 'chat-day-sep';
                    sep.dataset.day = msg.day;
                    const label = document.createElement('span');
                    label.textContent = dayLabel(msg.day);
                    sep.appendChild(label);
                    first.insertAdjacentElement('beforebegin', sep);
                }
                first.insertAdjacentElement('beforebegin', node);
            } else {
                appendMessage(msg, { scroll: false });
            }
        });
        chatHasMore = !!data.has_more;
        if (!chatHasMore && btn) btn.style.display = 'none';
        if (container) container.scrollTop = container.scrollHeight - prevHeight;
    } catch (e) {
        console.error('Load older failed', e);
    } finally {
        if (btn) btn.disabled = false;
        chatLoadingOlder = false;
    }
}

function scrollChatToBottom() {
    const container = document.getElementById('chat-messages-container');
    if (container) container.scrollTop = container.scrollHeight;
}

function isNearBottom() {
    const container = document.getElementById('chat-messages-container');
    if (!container) return true;
    return container.scrollHeight - container.scrollTop - container.clientHeight < 120;
}

function dayLabel(day) {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (day === today) return 'Today';
    if (day === yesterday) return 'Yesterday';
    const d = new Date(day + 'T00:00:00');
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function appendMessage(msg, { scroll = true } = {}) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    const loadBtn = document.getElementById('chat-load-older');
    const lastDay = [...container.querySelectorAll('.chat-day-sep')].pop();
    if (!lastDay || lastDay.dataset.day !== msg.day) {
        const sep = document.createElement('div');
        sep.className = 'chat-day-sep';
        sep.dataset.day = msg.day;
        const label = document.createElement('span');
        label.textContent = dayLabel(msg.day);
        sep.appendChild(label);
        container.appendChild(sep);
    }

    const nearBottom = isNearBottom();
    container.appendChild(buildMessageNode(msg));
    if (scroll || nearBottom) scrollChatToBottom();
    if (loadBtn) loadBtn.style.display = chatHasMore ? '' : 'none';
}

function buildMessageNode(msg) {
    const row = document.createElement('div');
    row.className = `msg-row ${msg.mine ? 'sent' : 'received'}${msg.pending ? ' pending' : ''}${msg.failed ? ' failed' : ''}`;
    row.dataset.msgId = msg.id;
    row.dataset.day = msg.day || '';

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';

    if (msg.reply_to) {
        const quoted = document.createElement('div');
        quoted.className = 'msg-quote';
        const snippet = msg.reply_snippet ? escapeHTML(msg.reply_snippet) : 'Message';
        quoted.textContent = snippet.length > 90 ? snippet.slice(0, 90) + '…' : snippet;
        bubble.appendChild(quoted);
    }

    if (msg.message_type === 'image' || msg.message_type === 'file') {
        bubble.appendChild(buildAttachmentNode(msg));
    }
    if (msg.content) {
        const text = document.createElement('div');
        text.className = 'msg-text';
        text.textContent = msg.content;
        bubble.appendChild(text);
    }
    row.appendChild(bubble);

    const meta = document.createElement('div');
    meta.className = 'msg-meta';
    const time = document.createElement('span');
    time.className = 'msg-time';
    time.textContent = msg.time || '';
    meta.appendChild(time);

    if (!msg.pending) {
        const reply = document.createElement('i');
        reply.className = 'fa-solid fa-reply msg-reply';
        reply.dataset.id = msg.id;
        reply.title = 'Reply';
        meta.appendChild(reply);
    }

    if (msg.mine && !msg.pending) {
        const receipt = document.createElement('i');
        receipt.className = 'fa-solid ' + (msg.failed ? 'fa-exclamation-circle msg-status-failed' : (msg.is_read ? 'fa-check-double msg-status-read' : 'fa-check msg-status-sent'));
        receipt.dataset.receiptFor = msg.id;
        meta.appendChild(receipt);

        const del = document.createElement('i');
        del.className = 'fa-solid fa-trash msg-delete';
        del.dataset.id = msg.id;
        del.title = 'Delete message';
        meta.appendChild(del);
    }
    row.appendChild(meta);
    return row;
}

function buildAttachmentNode(msg) {
    const url = `api/messages/attachment.php?id=${encodeURIComponent(msg.id)}`;
    if (msg.message_type === 'image') {
        const wrap = document.createElement('a');
        wrap.className = 'msg-image-link';
        wrap.href = url;
        wrap.target = '_blank';
        wrap.rel = 'noopener';
        const img = document.createElement('img');
        img.className = 'msg-image';
        img.loading = 'lazy';
        img.alt = msg.file_name || 'Image';
        img.src = url;
        wrap.appendChild(img);
        return wrap;
    }

    const link = document.createElement('a');
    link.className = 'msg-file';
    link.href = url;
    link.setAttribute('download', msg.file_name || 'attachment');
    link.innerHTML = `
        <i class="fa-solid ${fileIconFor(msg.file_name)} msg-file-icon"></i>
        <span class="msg-file-meta">
            <span class="msg-file-name"></span>
            <span class="msg-file-size"></span>
        </span>
        <i class="fa-solid fa-download msg-file-dl"></i>`;
    link.querySelector('.msg-file-name').textContent = msg.file_name || 'Attachment';
    link.querySelector('.msg-file-size').textContent = msg.file_size || '';
    return link;
}

function fileIconFor(name = '') {
    const ext = String(name).split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return 'fa-file-pdf';
    if (['doc', 'docx', 'rtf', 'txt'].includes(ext)) return 'fa-file-word';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'fa-file-excel';
    if (['ppt', 'pptx'].includes(ext)) return 'fa-file-powerpoint';
    if (['zip', 'rar', '7z'].includes(ext)) return 'fa-file-zipper';
    return 'fa-file';
}

function updateReceipt(messageId, isRead) {
    const icon = document.querySelector(`[data-receipt-for="${CSS.escape(String(messageId))}"]`);
    if (!icon) return;
    icon.className = 'fa-solid ' + (isRead ? 'fa-check-double msg-status-read' : 'fa-check msg-status-sent');
}

function startReply(messageId) {
    const row = document.querySelector(`.msg-row[data-msg-id="${CSS.escape(String(messageId))}"]`);
    const text = row?.querySelector('.msg-text')?.textContent
        || row?.querySelector('.msg-file-name')?.textContent
        || 'Attachment';
    setReplyingTo({ id: messageId, snippet: text });
    document.getElementById('chat-input-field')?.focus();
}

function setReplyingTo(reply) {
    replyingTo = reply;
    const tray = document.getElementById('chat-attachment-tray');
    if (!tray) return;
    const existing = tray.querySelector('.chat-reply-bar');
    if (existing) existing.remove();
    if (!reply) return;
    const bar = document.createElement('div');
    bar.className = 'chat-reply-bar';
    bar.innerHTML = '<i class="fa-solid fa-reply"></i><span class="chat-reply-text"></span>'
        + '<i class="fa-solid fa-xmark chat-attachment-remove" role="button" title="Cancel reply"></i>';
    const span = bar.querySelector('.chat-reply-text');
    span.textContent = (reply.snippet || '').slice(0, 80) + ((reply.snippet || '').length > 80 ? '…' : '');
    tray.appendChild(bar);
    tray.hidden = false;
}

function handleFilePicked(file) {
    if (!file) return;
    if (!currentChatUserId) {
        alert('Pick a conversation first.');
        return;
    }
    const isImage = file.type.startsWith('image/');
    if (isImage && !CHAT_ALLOWED_IMAGE.includes(file.type)) {
        alert('Images must be JPEG, PNG, GIF or WebP.');
        return;
    }
    if (!isImage && file.type === 'image/svg+xml') {
        alert('SVG images are not allowed.');
        return;
    }
    const max = isImage ? CHAT_MAX_IMAGE_BYTES : CHAT_MAX_FILE_BYTES;
    if (file.size > max) {
        alert(`${isImage ? 'Images' : 'Documents'} must be under ${Math.round(max / 1048576)} MB.`);
        return;
    }
    if (file.size === 0) {
        alert('That file is empty.');
        return;
    }
    pendingFile = file;
    renderPendingTray();
    const input = document.getElementById('chat-input-field');
    if (input) input.placeholder = 'Add a caption (optional)…';
    document.getElementById('chat-send-btn')?.classList.add('ready');
}

function clearPendingFile() {
    pendingFile = null;
    const fileInput = document.getElementById('chat-file-input');
    const imageInput = document.getElementById('chat-image-input');
    if (fileInput) fileInput.value = '';
    if (imageInput) imageInput.value = '';
    renderPendingTray();
    const input = document.getElementById('chat-input-field');
    if (input) input.placeholder = 'Type your message...';
}

function renderPendingTray() {
    const tray = document.getElementById('chat-attachment-tray');
    if (!tray) return;
    tray.querySelectorAll('.chat-attachment-chip').forEach(n => n.remove());

    if (pendingFile) {
        const chip = document.createElement('div');
        chip.className = 'chat-attachment-chip';
        const isImage = pendingFile.type.startsWith('image/');
        chip.innerHTML = `<i class="fa-solid ${isImage ? 'fa-image' : fileIconFor(pendingFile.name)}"></i>`
            + '<span class="chat-attachment-name"></span>'
            + '<span class="chat-attachment-size"></span>'
            + '<i class="fa-solid fa-xmark chat-attachment-remove" role="button" title="Remove attachment"></i>';
        chip.querySelector('.chat-attachment-name').textContent = pendingFile.name;
        chip.querySelector('.chat-attachment-size').textContent = prettySize(pendingFile.size);
        tray.insertBefore(chip, tray.firstChild);
    }

    tray.hidden = !pendingFile && !replyingTo;
}

function prettySize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

function sendTextMessage() {
    if (!guardAction()) return;
    if (!currentChatUserId) return;

    const inputField = document.getElementById('chat-input-field');
    const content = (inputField?.value || '').trim();
    if (!content && !pendingFile) return;
    if (content.length > CHAT_MAX_TEXT) {
        alert(`Message is too long (${CHAT_MAX_TEXT} characters max).`);
        return;
    }

    const file = pendingFile;
    const reply = replyingTo;
    const clientId = 'c' + Date.now() + Math.random().toString(36).slice(2, 8);

    if (inputField) inputField.value = '';
    if (file) clearPendingFile();
    setReplyingTo(null);
    document.getElementById('chat-send-btn')?.classList.remove('ready');

    const tempId = 'tmp-' + clientId;
    appendMessage({
        id: tempId,
        mine: true,
        pending: true,
        content: content || null,
        message_type: file ? (file.type.startsWith('image/') ? 'image' : 'file') : 'text',
        file_name: file ? file.name : null,
        file_size: file ? prettySize(file.size) : null,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        day: new Date().toISOString().slice(0, 10),
    }, { scroll: true });

    sendMessageRequest({ receiverId: currentChatUserId, content, file, replyTo: reply?.id || 0, clientId }, tempId);
}

function sendMessageRequest({ receiverId, content, file, replyTo, clientId }, tempId) {
    const done = (payload) => {
        const node = document.querySelector(`.msg-row[data-msg-id="${CSS.escape(tempId)}"]`);
        if (node) node.remove();
        if (payload?.message) {
            chatSeenIds.add(String(payload.message.id));
            appendMessage(payload.message, { scroll: true });
            lastSeenMessageId = Math.max(lastSeenMessageId, Number(payload.message.id) || 0);
        }
        scheduleChatSync();
    };

    const fail = (message) => {
        const node = document.querySelector(`.msg-row[data-msg-id="${CSS.escape(tempId)}"]`);
        if (node) {
            node.classList.remove('pending');
            node.classList.add('failed');
            const bubble = node.querySelector('.msg-bubble');
            if (bubble && !bubble.querySelector('.msg-error')) {
                const err = document.createElement('div');
                err.className = 'msg-error';
                err.textContent = message;
                bubble.prepend(err);
            }
        }
    };

    // XHR rather than fetch so the upload can report progress.
    const xhr = new XMLHttpRequest();
    const url = 'api/messages/send.php';
    const form = new FormData();
    form.append('receiver_id', receiverId);
    form.append('content', content || '');
    if (replyTo) form.append('reply_to', replyTo);
    form.append('client_id', clientId);
    if (file) form.append('attachment', file, file.name);

    const tempNode = document.querySelector(`.msg-row[data-msg-id="${CSS.escape(tempId)}"]`);
    if (file) {
        const progress = document.createElement('div');
        progress.className = 'msg-progress';
        progress.innerHTML = '<div class="msg-progress-bar"></div>';
        tempNode?.querySelector('.msg-bubble')?.appendChild(progress);

        xhr.upload.addEventListener('progress', (e) => {
            if (!e.lengthComputable) return;
            const pct = Math.round((e.loaded / e.total) * 100);
            const bar = tempNode?.querySelector('.msg-progress-bar');
            if (bar) bar.style.width = pct + '%';
        });
    }

    xhr.open('POST', url);
    xhr.onload = () => {
        let data = {};
        try { data = JSON.parse(xhr.responseText); } catch (e) { data = {}; }
        if (xhr.status >= 200 && xhr.status < 300 && data.success) {
            done(data);
        } else {
            fail(data.error || 'Message could not be sent');
        }
    };
    xhr.onerror = () => fail('Network error, message not sent');
    xhr.send(form);
}

async function deleteOwnMessage(messageId, iconEl) {
    if (!messageId || Number.isNaN(messageId)) return;
    if (!guardAction()) return;
    try {
        await api('api/messages/delete.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message_id: messageId })
        });
        const row = iconEl?.closest('.msg-row');
        row?.remove();
        chatSeenIds.delete(String(messageId));
        scheduleChatSync();
    } catch (err) {
        alert(err.message);
    }
}

function applyPeerInfo(peer, blocked) {
    if (!peer) return;
    const roleClass = peer.role === 'faculty' ? 'faculty' : 'student';
    const headerTitle = document.getElementById('chat-header-title');
    const headerMeta = document.getElementById('chat-header-meta');
    const headerAvatar = document.getElementById('chat-header-avatar');
    const infoAvatar = document.getElementById('info-avatar');
    const infoName = document.getElementById('info-name');
    const infoRole = document.getElementById('info-role');
    const infoBadges = document.getElementById('info-badges');
    const infoProfileBtn = document.getElementById('info-view-profile-btn');

    if (headerTitle) headerTitle.innerHTML = `${escapeHTML(peer.name)} <span class="badge ${roleClass}">${String(peer.role).toUpperCase()}</span>`;
    if (headerMeta) headerMeta.innerHTML = `<span class="dot text-success" style="width:6px;height:6px;"></span> ${escapeHTML(peer.department || '')} • ${peer.is_online ? 'Online' : 'Offline'}`;
    if (headerAvatar) headerAvatar.src = mediaUrl(peer.avatar);
    if (infoAvatar) { infoAvatar.src = mediaUrl(peer.avatar); infoAvatar.dataset.userId = peer.id; }
    if (infoName) { infoName.textContent = peer.name; infoName.dataset.userId = peer.id; }
    if (infoRole) infoRole.textContent = peer.department || '';
    if (infoBadges) infoBadges.innerHTML = `<span class="badge ${roleClass}">${String(peer.role).toUpperCase()}</span>`;
    if (infoProfileBtn) infoProfileBtn.href = `profile.html?id=${peer.id}`;

    const blockBtn = document.getElementById('block-action-btn');
    if (blockBtn) {
        const firstName = (peer.name || 'User').split(' ')[0];
        blockBtn.innerHTML = blocked
            ? `<i class="fa-solid fa-check-circle"></i> Unblock ${escapeHTML(firstName)}`
            : `<i class="fa-solid fa-ban"></i> Block ${escapeHTML(firstName)}`;
        blockBtn.dataset.blocked = blocked ? '1' : '0';
    }
}

function applyBlockedState(blocked) {
    const inputField = document.getElementById('chat-input-field');
    const sendBtn = document.getElementById('chat-send-btn');
    if (blocked) {
        if (inputField) { inputField.disabled = true; inputField.placeholder = 'This conversation is blocked.'; }
        if (sendBtn) { sendBtn.style.opacity = '0.4'; sendBtn.style.pointerEvents = 'none'; }
    } else {
        if (inputField) { inputField.disabled = false; inputField.placeholder = 'Type your message...'; }
        if (sendBtn) { sendBtn.style.opacity = '1'; sendBtn.style.pointerEvents = ''; }
    }
}

async function handleBlockToggle() {
    if (!currentChatUserId) return;
    if (!guardAction()) return;

    const name = chatPeer?.name || 'this user';
    const blockBtn = document.getElementById('block-action-btn');
    const isBlocked = blockBtn?.dataset.blocked === '1';

    showModal(
        isBlocked ? 'Unblock User' : 'Block User',
        isBlocked
            ? `Unblock ${name}? You'll be able to message them again.`
            : `Block ${name}? They won't be able to message you.`,
        async () => {
            try {
                const data = await api('api/messages/block.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: currentChatUserId })
                });
                toast(data.blocked ? 'User blocked' : 'User unblocked');
                applyBlockedState(!!data.blocked);
                scheduleChatSync();
            } catch (err) { alert(err.message); }
        }
    );
}

/* ---------- real-time transport ---------- */

function setConnectionState(state) {
    chatStreamConnected = state === 'live';
    const el = document.getElementById('chat-connection-status');
    if (!el) return;
    const map = {
        live: '<i class="fa-solid fa-circle" style="font-size:7px;color:#28a745;"></i> Live',
        connecting: '<i class="fa-solid fa-circle" style="font-size:7px;color:#ffc107;"></i> Connecting…',
        offline: '<i class="fa-solid fa-circle" style="font-size:7px;color:#dc3545;"></i> Reconnecting…'
    };
    el.innerHTML = map[state] || '';
    el.className = 'chat-connection-status ' + state;
}

function startChatStream() {
    if (chatStream || chatStreamRetry) return;
    openChatStream(currentChatUserId);
}

function openChatStream(peerId) {
    stopChatStream();
    if (!window.EventSource) {
        startPollingFallback();
        return;
    }

    setConnectionState('connecting');
    const url = `api/messages/stream.php?after_id=${lastSeenMessageId}`
        + (peerId ? `&user_id=${peerId}` : '');

    try {
        chatStream = new EventSource(url);
    } catch (e) {
        startPollingFallback();
        return;
    }

    chatStream.addEventListener('ready', () => {
        setConnectionState('live');
        stopPollingFallback();
    });

    chatStream.addEventListener('message', (e) => {
        let msg;
        try { msg = JSON.parse(e.data); } catch (err) { return; }
        lastSeenMessageId = Math.max(lastSeenMessageId, Number(msg.id) || 0);

        if (currentChatUserId && Number(msg.peer_id) === Number(currentChatUserId)) {
            if (chatSeenIds.has(String(msg.id))) return;
            chatSeenIds.add(String(msg.id));
            appendMessage(msg, { scroll: isNearBottom() });
            markThreadRead();
        } else {
            scheduleChatSync();
        }
    });

    chatStream.addEventListener('read', (e) => {
        let data;
        try { data = JSON.parse(e.data); } catch (err) { return; }
        (data.ids || []).forEach(id => updateReceipt(id, true));
    });

    chatStream.addEventListener('refresh', () => scheduleChatSync());

    chatStream.addEventListener('error', () => {
        // EventSource retries on its own; show state and keep a safety net.
        setConnectionState('offline');
        startPollingFallback();
    });
}

function stopChatStream() {
    if (chatStream) {
        try { chatStream.close(); } catch (e) { /* already closed */ }
        chatStream = null;
    }
    if (chatStreamRetry) {
        clearTimeout(chatStreamRetry);
        chatStreamRetry = null;
    }
    stopPollingFallback();
    setConnectionState('offline');
}

function startPollingFallback() {
    if (chatFallbackTimer || !currentChatUserId) return;
    chatFallbackTimer = setInterval(() => {
        if (!chatStreamConnected) loadChatThread(currentChatUserId, { afterId: lastSeenMessageId });
    }, 4000);
}

function stopPollingFallback() {
    if (chatFallbackTimer) {
        clearInterval(chatFallbackTimer);
        chatFallbackTimer = null;
    }
}

let markReadTimer = null;
function markThreadRead() {
    if (markReadTimer) clearTimeout(markReadTimer);
    markReadTimer = setTimeout(() => {
        const unread = [...document.querySelectorAll('.msg-row.received:not(.read) .msg-time')];
        unread.forEach(el => el.closest('.msg-row')?.classList.add('read'));
        if (currentChatUserId) {
            api('api/messages/mark_read.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: currentChatUserId })
            }).then(scheduleChatSync).catch(() => {});
        }
    }, 400);
}
