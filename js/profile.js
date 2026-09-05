document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
    await loadProfileDetail();
    setupProfileTabs();
});

let currentProfileUser = null;

async function loadProfileDetail() {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('id') || '1';

    let users = window.globalUsers || [];
    if (!users || !users.length) {
        try {
            const res = await fetch('data/users.json');
            users = await res.json();
            window.globalUsers = users;
        } catch (e) {
            console.error('Failed to load users.json', e);
        }
    }

    const user = users.find(u => String(u.id) === String(userId)) || users[0];
    if (!user) {
        document.getElementById('profile-name').textContent = 'User Not Found';
        return;
    }

    currentProfileUser = user;
    document.title = `${user.name} - Profile | UIU Social`;

    renderProfileHeader(user);
    renderUserPosts(user);
    renderUserConnections(user, users);
    renderUserGroups(user);
    renderUserAbout(user);
}

// Render profile header
function renderProfileHeader(user) {
    const avatarEl = document.getElementById('profile-avatar');
    if (avatarEl) {
        avatarEl.src = user.avatar;
        avatarEl.alt = user.name;
    }

    document.getElementById('profile-name').textContent = user.name;
    document.getElementById('profile-role').textContent = user.role;
    document.getElementById('profile-dept').textContent = `Dept. of ${user.department}`;

    const statusEl = document.getElementById('profile-status');
    if (statusEl) {
        const isOnline = user.isOnline || user.status === 'Online';
        statusEl.innerHTML = `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background-color:${isOnline ? '#28a745' : '#aaa'};margin-right:6px;"></span>${user.status || (isOnline ? 'Online' : 'Offline')}`;
    }

    const badgesEl = document.getElementById('profile-badges');
    if (badgesEl) {
        const badgeList = [
            user.faculty ? 'Faculty' : 'Student',
            `Dept: ${user.department}`,
            user.isOnline ? 'Active Now' : 'Offline'
        ];
        badgesEl.innerHTML = badgeList.map(b => `<span class="club-tag">${b}</span>`).join('');
    }

    const coverEl = document.getElementById('profile-cover');
    const iconEl = document.getElementById('profile-cover-icon-el');
    if (coverEl && iconEl) {
        if (user.faculty) {
            coverEl.style.background = 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)';
            iconEl.className = 'fa-solid fa-user-shield';
        } else {
            coverEl.style.background = 'linear-gradient(135deg, #f06522 0%, #ff8c00 100%)';
            iconEl.className = 'fa-solid fa-user-graduate';
        }
    }

    document.getElementById('profile-about').textContent = user.about || 'No bio provided yet.';

    const actionsContainer = document.getElementById('profile-actions-container');
    if (actionsContainer) {
        if (String(user.id) === '1') {
            actionsContainer.innerHTML = `
                <button class="btn btn-primary" id="edit-profile-btn">
                    <i class="fa-solid fa-pen-to-square"></i> Edit Profile
                </button>
            `;
            document.getElementById('edit-profile-btn').addEventListener('click', () => {
                showModal('Edit Profile', 'Profile editing modal will open here in the production update!', null);
            });
        } else {
            actionsContainer.innerHTML = `
                <button class="btn btn-primary" id="profile-connect-btn">
                    <i class="fa-solid fa-user-plus"></i> Connect
                </button>
                <button class="btn btn-outline" id="profile-message-btn">
                    <i class="fa-solid fa-message"></i> Message
                </button>
            `;

            const connectBtn = document.getElementById('profile-connect-btn');
            connectBtn.addEventListener('click', () => {
                if (connectBtn.classList.contains('connected')) {
                    connectBtn.classList.remove('connected');
                    connectBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Connect';
                    connectBtn.className = 'btn btn-primary';
                } else {
                    connectBtn.classList.add('connected');
                    connectBtn.innerHTML = '<i class="fa-solid fa-check"></i> Connected';
                    connectBtn.className = 'btn btn-outline';
                }
            });

            document.getElementById('profile-message-btn').addEventListener('click', () => {
                window.location.href = `messages.html?user=${user.id}`;
            });
        }
    }
}

// Render user posts
function renderUserPosts(user) {
    const container = document.getElementById('tab-posts');
    container.innerHTML = '';

    const posts = [
        {
            content: `Excited to present our final semester project in ${user.department}! Big thanks to all teammates and faculty for their guidance.`,
            time: '2 hours ago',
            likes: 24,
            comments: 5
        },
        {
            content: `Attended an inspiring workshop today on cloud architecture & scalable backend design. Learning never stops!`,
            time: 'Yesterday at 4:30 PM',
            likes: 42,
            comments: 11
        }
    ];

    posts.forEach((post) => {
        const postHtml = `
            <div class="club-post-card">
                <div class="club-post-header">
                    <img src="${user.avatar}" class="avatar user-profile-link" data-user-id="${user.id}" style="width:40px;height:40px;cursor:pointer;">
                    <div>
                        <div style="font-weight:600;font-size:14px;" class="user-profile-link" data-user-id="${user.id}">${user.name}</div>
                        <div style="font-size:12px;color:var(--text-muted);">${post.time} • ${user.department} Department</div>
                    </div>
                </div>
                <p style="font-size:14px;color:var(--text-main);line-height:1.6;margin-bottom:12px;">${post.content}</p>
                <div class="club-post-actions">
                    <button class="club-post-action-btn" data-action="like">
                        <i class="fa-regular fa-heart"></i> <span>${post.likes}</span>
                    </button>
                    <button class="club-post-action-btn" data-action="comment">
                        <i class="fa-regular fa-comment"></i> ${post.comments}
                    </button>
                    <button class="club-post-action-btn" data-action="share">
                        <i class="fa-regular fa-share-from-square"></i> Share
                    </button>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', postHtml);
    });

    container.querySelectorAll('[data-action="like"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const icon = btn.querySelector('i');
            const span = btn.querySelector('span');
            if (icon.classList.contains('fa-regular')) {
                icon.classList.replace('fa-regular', 'fa-solid');
                icon.style.color = 'var(--danger-color)';
                span.textContent = parseInt(span.textContent) + 1;
            } else {
                icon.classList.replace('fa-solid', 'fa-regular');
                icon.style.color = '';
                span.textContent = parseInt(span.textContent) - 1;
            }
        });
    });
}

// Render user connections
function renderUserConnections(user, users) {
    const container = document.getElementById('tab-connections');
    const connections = users.filter(u => String(u.id) !== String(user.id));

    let html = '<div class="connections-grid">';
    connections.forEach(conn => {
        html += `
            <div class="connection-card">
                <img src="${conn.avatar}" alt="${conn.name}" class="connection-avatar user-profile-link" data-user-id="${conn.id}" style="cursor:pointer;">
                <div class="fw-600 user-profile-link" data-user-id="${conn.id}" style="cursor:pointer;font-size:15px;margin-bottom:4px;">${conn.name}</div>
                <div class="text-muted text-sm mb-2">${conn.role}</div>
                <span class="club-tag mb-3" style="font-size:11px;">${conn.department}</span>
                <a href="profile.html?id=${conn.id}" class="btn btn-outline w-100" style="font-size:13px;padding:6px 12px;">View Profile</a>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// Render user groups
function renderUserGroups(user) {
    const container = document.getElementById('tab-groups');
    container.innerHTML = `
        <div class="card p-4 mb-3">
            <h4 class="card-title mb-3"><i class="fa-solid fa-users-line text-primary mr-2"></i> Department Communities</h4>
            <div class="activity-item">
                <div class="activity-icon"><i class="fa-solid fa-graduation-cap"></i></div>
                <div>
                    <div style="font-weight:600;font-size:15px;">${user.department} Department Group</div>
                    <div style="font-size:13px;color:var(--text-muted);">Official student & faculty hub for ${user.department}</div>
                </div>
            </div>
        </div>
        <div class="card p-4">
            <h4 class="card-title mb-3"><i class="fa-solid fa-puzzle-piece text-primary mr-2"></i> Joined Clubs</h4>
            <div class="activity-item">
                <div class="activity-icon"><i class="fa-solid fa-laptop-code"></i></div>
                <div>
                    <div style="font-weight:600;font-size:15px;"><a href="club_detail.html?id=1" style="color:inherit;text-decoration:none;">UIU Computer Club</a></div>
                    <div style="font-size:13px;color:var(--text-muted);">Active Member • Tech & Coding</div>
                </div>
            </div>
            <div class="activity-item mt-2">
                <div class="activity-icon"><i class="fa-solid fa-comments"></i></div>
                <div>
                    <div style="font-weight:600;font-size:15px;"><a href="club_detail.html?id=2" style="color:inherit;text-decoration:none;">UIU Debate Club</a></div>
                    <div style="font-size:13px;color:var(--text-muted);">Member • Oratory & Public Speaking</div>
                </div>
            </div>
        </div>
    `;
}

// Render user about
function renderUserAbout(user) {
    const container = document.getElementById('tab-about');
    container.innerHTML = `
        <div class="info-card">
            <h4 class="card-title mb-3"><i class="fa-solid fa-circle-info text-primary mr-2"></i> Personal & Academic Details</h4>
            <div class="info-row">
                <span class="info-label">Full Name</span>
                <span class="info-value">${user.name}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Role</span>
                <span class="info-value">${user.role}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Department</span>
                <span class="info-value">${user.department}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Status</span>
                <span class="info-value">${user.status || (user.isOnline ? 'Online' : 'Offline')}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Institution</span>
                <span class="info-value">United International University</span>
            </div>
            <div class="info-row">
                <span class="info-label">Biography</span>
                <span class="info-value" style="font-weight: normal; max-width: 60%; text-align: right;">${user.about || 'No detailed biography provided.'}</span>
            </div>
        </div>
    `;
}

// Setup profile tabs
function setupProfileTabs() {
    const tabs = document.querySelectorAll('.profile-tabs .tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const tabName = tab.dataset.tab;
            document.getElementById('tab-posts').style.display = 'none';
            document.getElementById('tab-connections').style.display = 'none';
            document.getElementById('tab-groups').style.display = 'none';
            document.getElementById('tab-about').style.display = 'none';

            const activeContent = document.getElementById('tab-' + tabName);
            if (activeContent) activeContent.style.display = 'block';
        });
    });
}