let currentChatUserId = null;
let toggleListenersInitialized = false;

const messagesData = {
    1: [
        { id: 1, sender: 'them', text: "Hello! I've had a chance to look over your initial proposal for the AI Ethics seminar. It's a very robust start.", time: "09:15 AM", type: 'text' },
        { id: 2, sender: 'me', text: "Thank you, Sir. I was concerned about the section regarding algorithmic bias, do you think it needs more empirical data?", time: "09:42 AM", type: 'text', read: true },
        { id: 3, sender: 'them', text: "The draft for the research paper looks promising. Let's actually strengthen that section. I've attached some relevant case studies from the MIT lab that might help.", time: "10:42 AM", type: 'file', fileName: "MIT_AI_Ethics_Case_Study.pdf", fileSize: "2.4 MB" }
    ],
    2: [
        { id: 1, sender: 'them', text: "Are we still meeting at the Lab for the project?", time: "Yesterday", type: 'text' }
    ]
};

// User preferences
const userPreferences = {
    1: { muted: false, encrypted: true },
    2: { muted: false, encrypted: false }
};

let blockedUsers = [];

// Load blocked users
function loadBlockedUsers() {
    try {
        const stored = localStorage.getItem('blockedUsers');
        blockedUsers = stored ? JSON.parse(stored) : [];
    } catch (e) {
        blockedUsers = [];
    }
}

// Save blocked users
function saveBlockedUsers() {
    try {
        localStorage.setItem('blockedUsers', JSON.stringify(blockedUsers));
    } catch (e) {
        console.error('Failed to save blocked users:', e);
    }
}

// Check if user is blocked
function isUserBlocked(userId) {
    return blockedUsers.includes(userId.toString());
}

// Get blocked icon
function getBlockedIcon(style = 'fa-solid', size = '16px') {
    return `<i class="${style} fa-ban" style="color: #dc3545; font-size: ${size};"></i>`;
}

document.addEventListener('DOMContentLoaded', async () => {
    loadBlockedUsers();
    await initApp();
    setupMessagesPage();
});

// Setup messages page
function setupMessagesPage() {
    renderChatList();

    const urlParams = new URLSearchParams(window.location.search);
    const initialUserId = urlParams.get('user') || 1;

    if (window.globalUsers && window.globalUsers.length > 0) {
        selectChat(initialUserId);
    }

    const sendBtn = document.getElementById('chat-send-btn');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendTextMessage);
    }

    const inputField = document.getElementById('chat-input-field');
    if (inputField) {
        inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendTextMessage();
            }
        });
    }

    const imageBtn = document.querySelector('.chat-input-actions .fa-image');
    const imageInput = document.createElement('input');
    imageInput.type = 'file';
    imageInput.accept = 'image/*';
    imageInput.style.display = 'none';
    document.body.appendChild(imageInput);

    if (imageBtn) {
        imageBtn.addEventListener('click', () => {
            imageInput.click();
        });
    }

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            sendImageMessage(file);
        }
    });

    const toggleInfoBtn = document.getElementById('toggle-info-btn');
    const userInfoPane = document.getElementById('user-info-pane');

    if (toggleInfoBtn && userInfoPane) {
        toggleInfoBtn.addEventListener('click', () => {
            if (userInfoPane.style.display === 'none' || userInfoPane.style.display === '') {
                userInfoPane.style.display = 'flex';
                toggleInfoBtn.classList.add('text-primary');
            } else {
                userInfoPane.style.display = 'none';
                toggleInfoBtn.classList.remove('text-primary');
            }
        });
    }

    setupToggleSwitches();

    const blockBtn = document.getElementById('block-action-btn');
    if (blockBtn) {
        blockBtn.addEventListener('click', function () {
            if (currentChatUserId) {
                const user = window.globalUsers.find(u => u.id == currentChatUserId);
                const userName = user ? user.name : 'User';
                const isBlocked = isUserBlocked(currentChatUserId);

                if (isBlocked) {
                    showModal(
                        'Unblock User',
                        `Are you sure you want to unblock ${userName}? You'll be able to message them again.`,
                        () => {
                            unblockUser(currentChatUserId);
                            updateBlockButton();
                            updateChatInput();
                            showToast(`${userName} has been unblocked`, 'success');
                        }
                    );
                } else {
                    showModal(
                        'Block User',
                        `Are you sure you want to block ${userName}? They won't be able to message you and you won't see their messages.`,
                        () => {
                            blockUser(currentChatUserId);
                            updateBlockButton();
                            updateChatInput();
                            showToast(`${userName} has been blocked`, 'danger');
                        }
                    );
                }
            }
        });
    }
}

// Block user
function blockUser(userId) {
    const userIdStr = userId.toString();
    if (!blockedUsers.includes(userIdStr)) {
        blockedUsers.push(userIdStr);
        saveBlockedUsers();
    }
}

// Unblock user
function unblockUser(userId) {
    const userIdStr = userId.toString();
    blockedUsers = blockedUsers.filter(id => id !== userIdStr);
    saveBlockedUsers();
}

// Update block button
function updateBlockButton() {
    const blockBtn = document.getElementById('block-action-btn');
    if (!blockBtn || !currentChatUserId) return;

    const isBlocked = isUserBlocked(currentChatUserId);
    const user = window.globalUsers.find(u => u.id == currentChatUserId);
    const userName = user ? user.name : 'User';
    const firstName = userName.split(' ')[0];

    if (isBlocked) {
        blockBtn.innerHTML = `<i class="fa-solid fa-check-circle"></i> Unblock ${firstName}`;
        blockBtn.style.color = '#28a745';
        blockBtn.style.borderColor = '#28a745';
        blockBtn.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
    } else {
        blockBtn.innerHTML = `<i class="fa-solid fa-ban"></i> Block ${firstName}`;
        blockBtn.style.color = '';
        blockBtn.style.borderColor = '';
        blockBtn.style.backgroundColor = '';
    }
}

// Update chat input based on block status
function updateChatInput() {
    const inputField = document.getElementById('chat-input-field');
    const sendBtn = document.getElementById('chat-send-btn');
    const inputWrapper = document.querySelector('.chat-input-wrapper');
    const inputActions = document.querySelector('.chat-input-actions');

    if (!inputField || !currentChatUserId) return;

    const isBlocked = isUserBlocked(currentChatUserId);

    if (isBlocked) {
        inputField.disabled = true;
        inputField.placeholder = 'This contact is blocked. You cannot send messages.';
        inputField.style.opacity = '0.6';
        inputField.style.cursor = 'not-allowed';

        if (sendBtn) {
            sendBtn.style.opacity = '0.4';
            sendBtn.style.cursor = 'not-allowed';
            sendBtn.style.pointerEvents = 'none';
        }

        if (inputActions) {
            inputActions.style.opacity = '0.4';
            inputActions.style.pointerEvents = 'none';
        }

        const chatArea = document.querySelector('.chat-area-pane');
        let blockedBanner = document.getElementById('blocked-banner');
        if (!blockedBanner) {
            blockedBanner = document.createElement('div');
            blockedBanner.id = 'blocked-banner';
            blockedBanner.style.cssText = `
                background: #dc3545;
                color: white;
                padding: 10px 16px;
                text-align: center;
                font-size: 14px;
                font-weight: 500;
                border-radius: 8px;
                margin: 8px 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
            `;
            const chatMessages = document.getElementById('chat-messages-container');
            if (chatMessages) {
                chatMessages.parentNode.insertBefore(blockedBanner, chatMessages);
            }
        }
        blockedBanner.innerHTML = `
            <i class="fa-solid fa-ban"></i>
            This contact is blocked. You cannot send messages.
            <button onclick="unblockUserFromBanner()" style="
                background: white;
                color: #dc3545;
                border: none;
                padding: 4px 12px;
                border-radius: 4px;
                font-weight: 600;
                cursor: pointer;
                font-size: 12px;
            ">UNBLOCK</button>
        `;
        blockedBanner.style.display = 'flex';

    } else {
        inputField.disabled = false;
        inputField.placeholder = 'Type your message...';
        inputField.style.opacity = '1';
        inputField.style.cursor = 'text';

        if (sendBtn) {
            sendBtn.style.opacity = '1';
            sendBtn.style.cursor = 'pointer';
            sendBtn.style.pointerEvents = 'auto';
        }

        if (inputActions) {
            inputActions.style.opacity = '1';
            inputActions.style.pointerEvents = 'auto';
        }

        const blockedBanner = document.getElementById('blocked-banner');
        if (blockedBanner) {
            blockedBanner.remove();
        }
    }
}

// Unblock user from banner
function unblockUserFromBanner() {
    if (currentChatUserId) {
        const user = window.globalUsers.find(u => u.id == currentChatUserId);
        const userName = user ? user.name : 'User';

        showModal(
            'Unblock User',
            `Are you sure you want to unblock ${userName}? You'll be able to message them again.`,
            () => {
                unblockUser(currentChatUserId);
                updateBlockButton();
                updateChatInput();
                showToast(`${userName} has been unblocked`, 'success');
            }
        );
    }
}

// Show modal
function showModal(title, message, onConfirm) {
    const existingModal = document.getElementById('custom-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const overlay = document.createElement('div');
    overlay.id = 'custom-modal';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
        backdrop-filter: blur(4px);
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        border-radius: 16px;
        padding: 32px;
        max-width: 420px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.3s ease;
    `;

    if (!document.getElementById('modal-animations')) {
        const style = document.createElement('style');
        style.id = 'modal-animations';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from {
                    transform: translateY(20px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }

    const isBlockAction = title.toLowerCase().includes('block');
    const iconColor = isBlockAction ? '#dc3545' : '#28a745';
    const icon = isBlockAction ? 'fa-solid fa-ban' : 'fa-solid fa-check-circle';

    modal.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="
                width: 56px;
                height: 56px;
                border-radius: 50%;
                background: ${isBlockAction ? 'rgba(220, 53, 69, 0.1)' : 'rgba(40, 167, 69, 0.1)'};
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 16px;
            ">
                <i class="${icon}" style="font-size: 24px; color: ${iconColor};"></i>
            </div>
            <h3 style="margin: 0 0 8px 0; font-size: 20px; color: #1a1a2e;">${title}</h3>
            <p style="margin: 0; color: #6c757d; font-size: 14px; line-height: 1.6;">${message}</p>
        </div>
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button onclick="this.closest('#custom-modal').remove()" style="
                padding: 10px 24px;
                border: 1px solid #dee2e6;
                background: white;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 500;
                color: #495057;
                transition: all 0.2s;
                font-size: 14px;
            " onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='white'">
                Cancel
            </button>
            <button id="modal-confirm-btn" style="
                padding: 10px 24px;
                border: none;
                background: ${isBlockAction ? '#dc3545' : '#28a745'};
                color: white;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.2s;
                font-size: 14px;
            " onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
                ${isBlockAction ? 'Yes, Block' : 'Yes, Unblock'}
            </button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });

    const confirmBtn = document.getElementById('modal-confirm-btn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            overlay.remove();
            if (typeof onConfirm === 'function') {
                onConfirm();
            }
        });
    }

    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

// Setup toggle switches
function setupToggleSwitches() {
    const toggleSwitches = document.querySelectorAll('.toggle-switch');

    if (toggleListenersInitialized) {
        toggleSwitches.forEach((toggle, index) => {
            if (currentChatUserId && userPreferences[currentChatUserId]) {
                const prefKey = index === 0 ? 'muted' : 'encrypted';
                if (userPreferences[currentChatUserId][prefKey]) {
                    toggle.classList.add('on');
                } else {
                    toggle.classList.remove('on');
                }
            }
        });
        return;
    }

    toggleSwitches.forEach((toggle, index) => {
        if (currentChatUserId && userPreferences[currentChatUserId]) {
            const prefKey = index === 0 ? 'muted' : 'encrypted';
            if (userPreferences[currentChatUserId][prefKey]) {
                toggle.classList.add('on');
            } else {
                toggle.classList.remove('on');
            }
        }

        toggle.addEventListener('click', function (e) {
            e.stopPropagation();
            this.classList.toggle('on');

            if (currentChatUserId) {
                if (!userPreferences[currentChatUserId]) {
                    userPreferences[currentChatUserId] = { muted: false, encrypted: false };
                }
                const prefKey = index === 0 ? 'muted' : 'encrypted';
                const isOn = this.classList.contains('on');
                userPreferences[currentChatUserId][prefKey] = isOn;

                const prefItem = this.closest('.pref-item');
                if (prefItem) {
                    const label = prefItem.querySelector('span');
                    if (label) {
                        const status = isOn ? 'ON' : 'OFF';
                        showToast(`${label.textContent} turned ${status}`, isOn ? 'success' : 'info');
                    }
                }
            }
        });
    });

    toggleListenersInitialized = true;
}

// Show toast notification
function showToast(message, type = 'info') {
    const existingToasts = document.querySelectorAll('.toast-message');
    existingToasts.forEach(toast => toast.remove());

    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
        `;
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = 'toast-message';
    const colors = {
        success: '#28a745',
        info: '#17a2b8',
        warning: '#ffc107',
        danger: '#dc3545'
    };
    toast.style.cssText = `
        background: ${colors[type] || colors.info};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
        min-width: 200px;
        text-align: center;
        pointer-events: auto;
    `;
    toast.textContent = message;

    if (!document.getElementById('toast-animations')) {
        const style = document.createElement('style');
        style.id = 'toast-animations';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            toast.remove();
            if (toastContainer.children.length === 0) {
                toastContainer.remove();
            }
        }, 300);
    }, 2000);
}

// Render chat list
function renderChatList() {
    const chatItemsContainer = document.querySelector('.chat-items');
    if (!chatItemsContainer) return;

    chatItemsContainer.innerHTML = '';

    const chatUsers = window.globalUsers.slice(0, 5);

    chatUsers.forEach((user, index) => {
        const userMessages = messagesData[user.id] || [];
        const lastMessage = userMessages.length > 0
            ? userMessages[userMessages.length - 1].text
            : `Say hi to ${user.name.split(' ')[0]}...`;

        const time = userMessages.length > 0 ? userMessages[userMessages.length - 1].time : "Just now";

        const isBlocked = isUserBlocked(user.id);
        const blockedIndicator = isBlocked ? ` ${getBlockedIcon('fa-solid', '14px')}` : '';
        const blockedPreview = isBlocked ? 'This contact is blocked' : lastMessage;

        const chatItemHtml = `
            <div class="chat-item ${user.id == currentChatUserId ? 'active' : ''} ${index === 0 ? 'unread' : ''}" data-user-id="${user.id}">
                <div class="chat-avatar-wrapper">
                    <img src="${user.avatar}" class="avatar">
                    <div class="chat-status online"></div>
                </div>
                <div class="chat-item-content">
                    <div class="chat-item-header">
                        <span class="chat-item-name">${user.name}${blockedIndicator}</span>
                        <span class="chat-item-time">${time}</span>
                    </div>
                    <div class="chat-item-preview">
                        <span class="badge ${user.role.toLowerCase().includes('student') ? 'student' : 'faculty'}" style="font-size: 8px; padding: 2px 4px;">${user.role.toUpperCase()}</span>
                        ${isBlocked ? `<span style="color: #dc3545;">  Blocked</span>` : blockedPreview}
                    </div>
                </div>
            </div>
        `;
        chatItemsContainer.insertAdjacentHTML('beforeend', chatItemHtml);
    });

    document.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', function () {
            const userId = parseInt(this.getAttribute('data-user-id'));
            selectChat(userId);

            document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            this.classList.remove('unread');
        });
    });
}

// Select chat
function selectChat(userId) {
    currentChatUserId = userId.toString();
    const user = window.globalUsers.find(u => u.id == userId);
    if (!user) return;

    const chatAvatar = document.getElementById('chat-header-avatar');
    if (chatAvatar) {
        chatAvatar.src = user.avatar;
        chatAvatar.setAttribute('data-user-id', user.id);
        chatAvatar.classList.add('user-profile-link');
        chatAvatar.style.cursor = 'pointer';
    }

    const chatTitle = document.getElementById('chat-header-title');
    if (chatTitle) {
        const isBlocked = isUserBlocked(userId);
        const blockedIndicator = isBlocked ? ` ${getBlockedIcon('fa-solid', '16px')}` : '';
        chatTitle.innerHTML = `${user.name} <span class="badge ${user.role.toLowerCase().includes('student') ? 'student' : 'faculty'}" style="background:transparent; border:1px solid var(--badge-faculty-text);">${user.role.toUpperCase()}</span>${blockedIndicator}`;
        chatTitle.setAttribute('data-user-id', user.id);
        chatTitle.classList.add('user-profile-link');
        chatTitle.style.cursor = 'pointer';
    }

    const infoAvatar = document.getElementById('info-avatar');
    if (infoAvatar) {
        infoAvatar.src = user.avatar;
        infoAvatar.setAttribute('data-user-id', user.id);
        infoAvatar.classList.add('user-profile-link');
        infoAvatar.style.cursor = 'pointer';
    }

    const infoName = document.getElementById('info-name');
    if (infoName) {
        infoName.textContent = user.name;
        infoName.setAttribute('data-user-id', user.id);
        infoName.classList.add('user-profile-link');
        infoName.style.cursor = 'pointer';
    }

    const infoRole = document.getElementById('info-role');
    if (infoRole) infoRole.textContent = user.department || "Computer Science & Engineering";

    const infoBadges = document.getElementById('info-badges');
    if (infoBadges) {
        infoBadges.innerHTML = `<span class="badge" style="background: var(--primary-color); color: white;">${user.role.toUpperCase()}</span>`;
    }

    const infoBtn = document.getElementById('info-view-profile-btn');
    if (infoBtn) {
        infoBtn.href = `profile.html?id=${user.id}`;
    }

    renderMessages(userId);
    updateToggleStates();
    updateBlockButton();
    updateChatInput();
}

// Update toggle states
function updateToggleStates() {
    const toggleSwitches = document.querySelectorAll('.toggle-switch');
    toggleSwitches.forEach((toggle, index) => {
        if (currentChatUserId && userPreferences[currentChatUserId]) {
            const prefKey = index === 0 ? 'muted' : 'encrypted';
            if (userPreferences[currentChatUserId][prefKey]) {
                toggle.classList.add('on');
            } else {
                toggle.classList.remove('on');
            }
        }
    });
}

// Render messages
function renderMessages(userId) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    const isBlocked = isUserBlocked(userId);

    if (isBlocked) {
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 32px 40px 40px 40px; text-align: center; color: #6c757d;">
                <div style="width: 280px; height: 280px; border-radius: 50%; display: flex; margin-top: -20px; align-items: center; justify-content: center;">
                    <img src="assets/images/svg/no-item.svg" alt="Blocked">
                </div>
                <h3 style="color: #dc3545; margin: 0 0 8px 0;">Contact Blocked</h3>
                <p style="margin: 0 0 16px 0; color: #6c757d;">You have blocked this user. You cannot see their messages.</p>
                <button onclick="unblockUserFromBanner()" style="padding: 8px 20px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">Unblock User</button>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="chat-date-divider">
            <span>Today</span>
        </div>
    `;

    const messages = messagesData[userId] || [];

    messages.forEach(msg => {
        const rowClass = msg.sender === 'me' ? 'msg-row sent' : 'msg-row received';
        const statusIcon = msg.read ? `<i class="fa-solid fa-check-double text-primary"></i>` : `<i class="fa-solid fa-check"></i>`;
        const timeHtml = msg.sender === 'me'
            ? `<span class="msg-time">${msg.time} ${statusIcon}</span>`
            : `<span class="msg-time">${msg.time}</span>`;

        let contentHtml = '';
        if (msg.type === 'text') {
            contentHtml = `<div class="msg-bubble">${msg.text}</div>`;
        } else if (msg.type === 'file') {
            contentHtml = `
                <div class="msg-bubble">${msg.text}</div>
                <div class="msg-attachment">
                    <i class="fa-regular fa-file-pdf msg-attachment-icon"></i>
                    <div class="msg-attachment-info">
                        <div class="msg-attachment-name">${msg.fileName}</div>
                        <div class="msg-attachment-meta">${msg.fileSize} • Document</div>
                    </div>
                    <i class="fa-solid fa-download msg-attachment-download"></i>
                </div>
            `;
        } else if (msg.type === 'image') {
            contentHtml = `
                <div class="msg-bubble" style="padding: 4px; background: transparent;">
                    <img src="${msg.imageUrl}" style="max-width: 250px; border-radius: 8px; cursor: pointer;" onclick="showModal('Image Preview', 'Image preview functionality can be expanded here.')">
                </div>
            `;
        }

        const msgHtml = `
            <div class="${rowClass}">
                <div>
                    ${contentHtml}
                    ${timeHtml}
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', msgHtml);
    });

    container.scrollTop = container.scrollHeight;
}

// Send text message
function sendTextMessage() {
    const input = document.getElementById('chat-input-field');
    const text = input.value.trim();
    if (!text || !currentChatUserId) return;

    if (isUserBlocked(currentChatUserId)) {
        showToast('You cannot send messages to a blocked contact', 'danger');
        return;
    }

    if (!messagesData[currentChatUserId]) {
        messagesData[currentChatUserId] = [];
    }

    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    messagesData[currentChatUserId].push({
        id: Date.now(),
        sender: 'me',
        text: text,
        time: timeString,
        type: 'text',
        read: false
    });

    input.value = '';
    renderMessages(currentChatUserId);
    renderChatList();
}

// Send image message
function sendImageMessage(file) {
    if (!file || !currentChatUserId) return;

    if (isUserBlocked(currentChatUserId)) {
        showToast('You cannot send images to a blocked contact', 'danger');
        return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
        const imageUrl = e.target.result;

        if (!messagesData[currentChatUserId]) {
            messagesData[currentChatUserId] = [];
        }

        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        messagesData[currentChatUserId].push({
            id: Date.now(),
            sender: 'me',
            text: "Sent an image",
            imageUrl: imageUrl,
            time: timeString,
            type: 'image',
            read: false
        });

        renderMessages(currentChatUserId);
        renderChatList();
    };

    reader.readAsDataURL(file);
}