document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
    await loadProfileDetail();
    setupProfileTabs();
});

let currentProfileUser = null;

async function loadProfileDetail() {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('id');
    if (!userId) {
        document.getElementById('profile-name').textContent = 'No user specified';
        return;
    }

    try {
        const data = await api(`api/users/get.php?id=${userId}`);
        currentProfileUser = data.user;
        renderProfileHeader(data);
        await renderUserPosts(userId);
        renderUserConnections(data.connections);
        renderUserGroups(data.groups, data.clubs);
        renderUserAbout(data.user);
    } catch (e) {
        document.getElementById('profile-name').textContent = 'User not found';
    }
}

function renderProfileHeader(data) {
    const user = data.user;
    const isSelf = data.is_self;

    document.title = `${user.name} - Profile | UIU Social`;

    const avatarEl = document.getElementById('profile-avatar');
    if (avatarEl) {
        avatarEl.src = mediaUrl(user.avatar);
        avatarEl.alt = user.name;
    }

    document.getElementById('profile-name').textContent = user.name;
    document.getElementById('profile-role').textContent = user.role;
    document.getElementById('profile-dept').textContent = `Dept. of ${user.department}`;
    document.getElementById('profile-about').textContent = user.about || 'No bio provided yet.';

    const statusEl = document.getElementById('profile-status');
    if (statusEl) {
        const online = user.is_online;
        statusEl.innerHTML = `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${online ? '#28a745' : '#aaa'};margin-right:5px;"></span>${online ? 'Online' : 'Offline'}`;
    }

    const badgesEl = document.getElementById('profile-badges');
    if (badgesEl) {
        const roleClass = user.role === 'faculty' ? 'faculty' : 'student';
        badgesEl.innerHTML = `<span class="badge ${roleClass}">${user.role.toUpperCase()}</span>`;
    }

    const coverEl = document.getElementById('profile-cover');
    if (coverEl) {
        if (user.cover_photo) {
            coverEl.style.backgroundImage = `url('${mediaUrl(user.cover_photo)}')`;
            coverEl.style.backgroundSize = 'cover';
            coverEl.style.backgroundPosition = 'center';
            const iconWrap = coverEl.querySelector('.club-cover-icon');
            if (iconWrap) iconWrap.style.display = 'none';
        } else if (user.role === 'faculty') {
            coverEl.style.background = 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)';
            const iconEl = document.getElementById('profile-cover-icon-el');
            if (iconEl) iconEl.className = 'fa-solid fa-user-shield';
        } else {
            coverEl.style.background = 'linear-gradient(135deg, #f06522 0%, #ff8c00 100%)';
        }
    }

    const actionsContainer = document.getElementById('profile-actions-container');
    if (!actionsContainer) return;

    if (isSelf) {
        actionsContainer.innerHTML = `
            <button class="btn btn-primary" id="edit-profile-btn">
                <i class="fa-solid fa-pen-to-square"></i> Edit Profile
            </button>`;
        document.getElementById('edit-profile-btn').addEventListener('click', () => openEditProfileModal());
    } else {
        // Determine connection status
        const myId = window.currentUser?.id;
        let connStatus = 'none';
        // Check from data.connections - if profile user is in our connections list we're connected
        const userConns = data.connections || [];
        if (userConns.some(c => String(c.id) === String(myId))) {
            connStatus = 'connected';
        }

        // Also check from globalUsers connection data
        const globalUser = (window.globalUsers || []).find(u => String(u.id) === String(user.id));
        if (globalUser) connStatus = globalUser.connection || connStatus;

        const buttons = [];

        if (connStatus === 'connected') {
            buttons.push(`<button class="btn" id="profile-connect-btn" data-status="connected" style="background:#28a745 !important;border-color:#28a745 !important;color:#fff !important;">✓ Connected</button>`);
            buttons.push(`<button class="btn" id="profile-remove-btn" data-action="remove" style="background:#dc3545 !important;border-color:#dc3545 !important;color:#fff !important;"><i class="fa-solid fa-trash"></i> Remove</button>`);
        } else if (connStatus === 'sent') {
            buttons.push(`<button class="btn btn-outline" id="profile-connect-btn" data-status="sent" disabled>Pending</button>`);
            buttons.push(`<button class="btn" id="profile-cancel-btn" data-action="cancel" style="background:#6c757d !important;border-color:#6c757d !important;color:#fff !important;"><i class="fa-solid fa-xmark"></i> Cancel</button>`);
        } else if (connStatus === 'incoming') {
            buttons.push(`<button class="btn btn-primary" id="profile-connect-btn" data-status="incoming"><i class="fa-solid fa-user-check"></i> Accept</button>`);
            buttons.push(`<button class="btn btn-outline" id="profile-decline-btn" data-action="decline"><i class="fa-solid fa-xmark"></i> Decline</button>`);
        } else {
            buttons.push(`<button class="btn btn-primary" id="profile-connect-btn" data-status="none"><i class="fa-solid fa-user-plus"></i> Connect</button>`);
            buttons.push(`<button class="btn btn-outline" id="profile-message-btn"><i class="fa-solid fa-message"></i> Message</button>`);
        }

        actionsContainer.innerHTML = buttons.join('');

        const connectBtn = document.getElementById('profile-connect-btn');
        const messageBtn = document.getElementById('profile-message-btn');

        connectBtn?.addEventListener('click', async (e) => {
            if (!guardAction(e)) return;
            const status = connectBtn.dataset.status;
            if (status === 'none') {
                try {
                    await api('api/connections/send.php', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id: user.id })
                    });
                    toast('Connection request sent');
                    actionsContainer.innerHTML = `
                        <button class="btn btn-outline" id="profile-connect-btn" data-status="sent" disabled>Pending</button>
                        <button class="btn" id="profile-cancel-btn" data-action="cancel" style="background:#6c757d !important;border-color:#6c757d !important;color:#fff !important;"><i class="fa-solid fa-xmark"></i> Cancel</button>
                        <button class="btn btn-outline" id="profile-message-btn"><i class="fa-solid fa-message"></i> Message</button>`;
                    bindProfileButtons();
                } catch (err) { alert(err.message); }
            } else if (status === 'incoming') {
                try {
                    await api('api/connections/respond.php', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id: user.id, action: 'accept' })
                    });
                    toast('Connection accepted');
                    actionsContainer.innerHTML = `
                        <button class="btn" id="profile-connect-btn" data-status="connected" style="background:#28a745 !important;border-color:#28a745 !important;color:#fff !important;">✓ Connected</button>
                        <button class="btn" id="profile-remove-btn" data-action="remove" style="background:#dc3545 !important;border-color:#dc3545 !important;color:#fff !important;"><i class="fa-solid fa-trash"></i> Remove</button>
                        <button class="btn btn-outline" id="profile-message-btn"><i class="fa-solid fa-message"></i> Message</button>`;
                    bindProfileButtons();
                } catch (err) { alert(err.message); }
            }
        });

        function bindProfileButtons() {
            const cb = document.getElementById('profile-connect-btn');
            const mb = document.getElementById('profile-message-btn');
            const rb = document.getElementById('profile-remove-btn');
            const cab = document.getElementById('profile-cancel-btn');
            const dab = document.getElementById('profile-decline-btn');

            cb?.addEventListener('click', async (e) => {
                if (!guardAction(e)) return;
                const status = cb.dataset.status;
                if (status === 'none') {
                    try {
                        await api('api/connections/send.php', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ user_id: user.id })
                        });
                        toast('Connection request sent');
                        cb.textContent = 'Pending';
                        cb.dataset.status = 'sent';
                        cb.disabled = true;
                        cb.outerHTML = cb.outerHTML;
                        bindProfileButtons();
                        const cancelBtn = document.getElementById('profile-cancel-btn');
                        cancelBtn?.addEventListener('click', async (e) => {
                            if (!guardAction(e)) return;
                            try {
                                await api('api/connections/remove.php', {
                                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ user_id: user.id })
                                });
                                toast('Connection request cancelled');
                                actionsContainer.innerHTML = `
                                    <button class="btn btn-primary" id="profile-connect-btn" data-status="none"><i class="fa-solid fa-user-plus"></i> Connect</button>
                                    <button class="btn btn-outline" id="profile-message-btn"><i class="fa-solid fa-message"></i> Message</button>`;
                                bindProfileButtons();
                            } catch (err) { alert(err.message); }
                        });
                    } catch (err) { alert(err.message); }
                } else if (status === 'incoming') {
                    try {
                        await api('api/connections/respond.php', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ user_id: user.id, action: 'accept' })
                        });
                        toast('Connection accepted');
                        actionsContainer.innerHTML = `
                            <button class="btn" id="profile-connect-btn" data-status="connected" style="background:#28a745 !important;border-color:#28a745 !important;color:#fff !important;">✓ Connected</button>
                            <button class="btn" id="profile-remove-btn" data-action="remove" style="background:#dc3545 !important;border-color:#dc3545 !important;color:#fff !important;"><i class="fa-solid fa-trash"></i> Remove</button>
                            <button class="btn btn-outline" id="profile-message-btn"><i class="fa-solid fa-message"></i> Message</button>`;
                        bindProfileButtons();
                    } catch (err) { alert(err.message); }
                }
            });

            rb?.addEventListener('click', async (e) => {
                if (!guardAction(e)) return;
                if (!confirm('Remove this connection? You will no longer see each other in your connections list.')) return;
                try {
                    await api('api/connections/remove.php', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id: user.id })
                    });
                    toast('Connection removed');
                    actionsContainer.innerHTML = `
                        <button class="btn btn-primary" id="profile-connect-btn" data-status="none"><i class="fa-solid fa-user-plus"></i> Connect</button>
                        <button class="btn btn-outline" id="profile-message-btn"><i class="fa-solid fa-message"></i> Message</button>`;
                    bindProfileButtons();
                } catch (err) { alert(err.message); }
            });

            cab?.addEventListener('click', async (e) => {
                if (!guardAction(e)) return;
                try {
                    await api('api/connections/remove.php', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id: user.id })
                    });
                    toast('Connection request cancelled');
                    actionsContainer.innerHTML = `
                        <button class="btn btn-primary" id="profile-connect-btn" data-status="none"><i class="fa-solid fa-user-plus"></i> Connect</button>
                        <button class="btn btn-outline" id="profile-message-btn"><i class="fa-solid fa-message"></i> Message</button>`;
                    bindProfileButtons();
                } catch (err) { alert(err.message); }
            });

            dab?.addEventListener('click', async (e) => {
                if (!guardAction(e)) return;
                try {
                    await api('api/connections/respond.php', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id: user.id, action: 'reject' })
                    });
                    toast('Request declined');
                    actionsContainer.innerHTML = `
                        <button class="btn btn-primary" id="profile-connect-btn" data-status="none"><i class="fa-solid fa-user-plus"></i> Connect</button>
                        <button class="btn btn-outline" id="profile-message-btn"><i class="fa-solid fa-message"></i> Message</button>`;
                    bindProfileButtons();
                } catch (err) { alert(err.message); }
            });

            mb?.addEventListener('click', () => {
                window.location.href = `messages.html?user=${user.id}`;
            });
        }

        bindProfileButtons();
    }
}

async function renderUserPosts(userId) {
    const container = document.getElementById('tab-posts');
    if (!container) return;
    container.innerHTML = '<div class="text-muted text-center p-3">Loading posts...</div>';
    try {
        const data = await api(`api/posts/get_posts.php?user_id=${userId}`);
        const posts = data.posts || [];
        if (posts.length === 0) {
            container.innerHTML = '<div class="text-muted text-center p-3">No posts yet.</div>';
            return;
        }
        container.innerHTML = '';
        posts.forEach(post => {
            container.insertAdjacentHTML('beforeend', postCardHTML(post));
        });
        bindPostInteractions(container);
        window.reloadPosts = () => renderUserPosts(userId);
    } catch (e) {
        container.innerHTML = '<div class="text-muted text-center p-3">Failed to load posts.</div>';
    }
}

function renderUserConnections(connections) {
    const container = document.getElementById('tab-connections');
    if (!container) return;
    if (!connections || connections.length === 0) {
        container.innerHTML = '<div class="text-muted text-center p-3">No connections yet.</div>';
        return;
    }
    container.innerHTML = `<div class="connections-grid">${connections.map(conn => `
        <div class="connection-card">
            <img src="${mediaUrl(conn.avatar)}" alt="${escapeHTML(conn.name)}" class="connection-avatar user-profile-link" data-user-id="${conn.id}" style="cursor:pointer;">
            <div class="fw-600 user-profile-link" data-user-id="${conn.id}" style="cursor:pointer;font-size:15px;margin-bottom:4px;">${escapeHTML(conn.name)}</div>
            <div class="text-muted text-sm mb-2">${escapeHTML(conn.role)}</div>
            <span class="club-tag mb-3" style="font-size:11px;">${escapeHTML(conn.department)}</span>
            <a href="profile.html?id=${conn.id}" class="btn btn-outline w-100" style="font-size:13px;padding:6px 12px;">View Profile</a>
        </div>
    `).join('')}</div>`;
}

function renderUserGroups(groups, clubs) {
    const container = document.getElementById('tab-groups');
    if (!container) return;

    const groupsHTML = (groups && groups.length) ? groups.map(g => `
        <div class="activity-item">
            <div class="activity-icon"><i class="fa-solid fa-users-line"></i></div>
            <div>
                <div style="font-weight:600;font-size:15px;"><a href="group_detail.html?id=${g.id}" style="color:inherit;text-decoration:none;">${escapeHTML(g.name)}</a></div>
                <div style="font-size:13px;color:var(--text-muted);">${escapeHTML(g.category || 'Group')}</div>
            </div>
        </div>
    `).join('') : '<div class="text-muted text-sm">Not in any groups</div>';

    const clubsHTML = (clubs && clubs.length) ? clubs.map(c => `
        <div class="activity-item">
            <div class="activity-icon"><i class="fa-solid fa-puzzle-piece"></i></div>
            <div>
                <div style="font-weight:600;font-size:15px;"><a href="club_detail.html?slug=${c.slug}" style="color:inherit;text-decoration:none;">${escapeHTML(c.name)}</a></div>
                <div style="font-size:13px;color:var(--text-muted);">Club Member</div>
            </div>
        </div>
    `).join('') : '<div class="text-muted text-sm">Not in any clubs</div>';

    container.innerHTML = `
        <div class="card p-4 mb-3">
            <h4 class="card-title mb-3"><i class="fa-solid fa-users-line text-primary mr-2"></i> Department Groups</h4>
            ${groupsHTML}
        </div>
        <div class="card p-4">
            <h4 class="card-title mb-3"><i class="fa-solid fa-puzzle-piece text-primary mr-2"></i> Joined Clubs</h4>
            ${clubsHTML}
        </div>`;
}

function renderUserAbout(user) {
    const container = document.getElementById('tab-about');
    if (!container) return;
    container.innerHTML = `
        <div class="info-card">
            <h4 class="card-title mb-3"><i class="fa-solid fa-circle-info text-primary mr-2"></i> Personal & Academic Details</h4>
            <div class="info-row"><span class="info-label">Full Name</span><span class="info-value">${escapeHTML(user.name)}</span></div>
            <div class="info-row"><span class="info-label">Role</span><span class="info-value">${escapeHTML(user.role)}</span></div>
            <div class="info-row"><span class="info-label">Email</span><span class="info-value">${escapeHTML(user.email)}</span></div>
            ${user.student_id ? `<div class="info-row"><span class="info-label">Student ID</span><span class="info-value">${escapeHTML(user.student_id)}</span></div>` : ''}
            <div class="info-row"><span class="info-label">Department</span><span class="info-value">${escapeHTML(user.department)}</span></div>
            <div class="info-row"><span class="info-label">Status</span><span class="info-value">${user.is_online ? '<span style="color:#28a745;">Online</span>' : 'Offline'}</span></div>
            <div class="info-row"><span class="info-label">Institution</span><span class="info-value">United International University</span></div>
            <div class="info-row"><span class="info-label">Biography</span><span class="info-value" style="font-weight:normal;max-width:60%;text-align:right;">${escapeHTML(user.about || 'No bio provided.')}</span></div>
            <div class="info-row"><span class="info-label">Member Since</span><span class="info-value">${new Date(user.created_at).toLocaleDateString('en-US', {year:'numeric',month:'long'})}</span></div>
        </div>`;
}

function setupProfileTabs() {
    const tabs = document.querySelectorAll('.profile-tabs .tab');
    const sections = ['posts', 'connections', 'groups', 'about'];
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const tabName = tab.dataset.tab;
            sections.forEach(s => {
                const el = document.getElementById('tab-' + s);
                if (el) el.style.display = s === tabName ? 'block' : 'none';
            });
        });
    });
}