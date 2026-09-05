let globalUsers = [];

// Load users data from JSON
async function loadUsers() {
    try {
        const response = await fetch('data/users.json');
        if (!response.ok) throw new Error('Failed to load users');
        const users = await response.json();
        globalUsers = users;
        window.globalUsers = globalUsers;
    } catch (e) {
        console.error("Error loading users:", e);
    }
}

// Show modal
function showModal(title, message, onConfirm = null) {
    const existingModal = document.getElementById('uiu-global-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'uiu-global-modal';
    modalOverlay.style.position = 'fixed';
    modalOverlay.style.top = '0';
    modalOverlay.style.left = '0';
    modalOverlay.style.width = '100vw';
    modalOverlay.style.height = '100vh';
    modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    modalOverlay.style.display = 'flex';
    modalOverlay.style.alignItems = 'center';
    modalOverlay.style.justifyContent = 'center';
    modalOverlay.style.zIndex = '9999';

    const modalBox = document.createElement('div');
    modalBox.style.backgroundColor = 'white';
    modalBox.style.padding = '24px';
    modalBox.style.borderRadius = '8px';
    modalBox.style.minWidth = '300px';
    modalBox.style.maxWidth = '400px';
    modalBox.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
    modalBox.style.fontFamily = 'inherit';
    modalBox.style.textAlign = 'center';

    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    titleEl.style.margin = '0 0 16px 0';
    titleEl.style.color = '#222';

    const messageEl = document.createElement('p');
    messageEl.textContent = message;
    messageEl.style.margin = '0 0 24px 0';
    messageEl.style.color = '#666';
    messageEl.style.lineHeight = '1.5';

    const actionsDiv = document.createElement('div');
    actionsDiv.style.display = 'flex';
    actionsDiv.style.justifyContent = 'center';
    actionsDiv.style.gap = '12px';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'btn btn-outline';
    cancelBtn.onclick = () => modalOverlay.remove();

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'OK';
    confirmBtn.className = 'btn btn-primary';
    confirmBtn.onclick = () => {
        if (onConfirm) onConfirm();
        modalOverlay.remove();
    };

    actionsDiv.appendChild(cancelBtn);
    actionsDiv.appendChild(confirmBtn);

    modalBox.appendChild(titleEl);
    modalBox.appendChild(messageEl);
    modalBox.appendChild(actionsDiv);

    modalOverlay.appendChild(modalBox);
    document.body.appendChild(modalOverlay);
}

async function initApp() {
    await loadUsers();
    setupNavigation();
    setupGlobalProfileLinks();
}

// Setup navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';

    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href') === currentPath) {
            item.classList.add('active');
        }
    });
}

// Setup global profile links
function setupGlobalProfileLinks() {
    document.body.addEventListener('click', (e) => {
        if (e.target.closest('.chat-list-pane') || e.target.closest('.chat-item')) {
            return;
        }

        const target = e.target.closest('[data-user-id], .user-profile-link, .header-user');
        if (!target) return;

        if (e.target.closest('button, input, select, textarea') && !e.target.classList.contains('user-profile-link') && !e.target.hasAttribute('data-user-id')) {
            return;
        }

        let userId = target.getAttribute('data-user-id') || target.dataset.userId;

        if (!userId) {
            const img = target.tagName === 'IMG' ? target : target.querySelector('img');
            if (img && img.src) {
                const matchedUser = (window.globalUsers || []).find(u => u.avatar && img.src.includes(u.avatar.split('?')[0].replace(/^.*[\\\/]/, '')));
                if (matchedUser) userId = matchedUser.id;
            }
        }

        if (!userId && (target.classList.contains('header-user') || target.closest('.header-user'))) {
            userId = '1';
        }

        if (userId) {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = `profile.html?id=${userId}`;
        }
    });
}

window.globalUsers = globalUsers;
window.loadUsers = loadUsers;
window.initApp = initApp;
window.showModal = showModal;