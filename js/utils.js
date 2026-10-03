let currentUser = null;
window.currentUser = null;
window.globalUsers = [];

function mediaUrl(path) {
    if (!path) return 'assets/images/students/default.png';
    if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) return path;
    return path.replace(/^\//, '');
}

function escapeHTML(str) {
    return String(str ?? '').replace(/[&<>"']/g, s => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[s]));
}

function canAct() {
    return !!(currentUser && currentUser.can_act);
}

function isAdminUser() {
    return !!(currentUser && currentUser.is_admin);
}

function isFacultyUser() {
    return !!(currentUser && currentUser.is_faculty);
}

function isGroupModeratorUser() {
    return isAdminUser() || isFacultyUser();
}

function isGuestUser() {
    return !!(currentUser && currentUser.is_guest);
}

const ADMIN_CONTENT_LABELS = {
    post: 'post',
    comment: 'comment',
    club_post: 'club post',
    club_comment: 'club comment',
    announcement: 'announcement',
    announcement_comment: 'announcement comment'
};

function adminDeleteModal(type, id, label, context) {
    const existing = document.getElementById('uiu-admin-delete-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'uiu-admin-delete-modal';
    overlay.className = 'uiu-modal-overlay';
    overlay.innerHTML = `
        <div class="uiu-modal-box admin-delete-box">
            <h3><i class="fa-solid fa-shield-halved"></i> Admin action</h3>
            <p>Remove this ${escapeHTML(ADMIN_CONTENT_LABELS[type] || 'item')}${context ? ' ' + escapeHTML(context) : ''}? The author is notified and the action is recorded in the audit log.</p>
            <label class="admin-delete-label" for="adminDeleteReason">Reason (optional)</label>
            <textarea class="form-control" id="adminDeleteReason" rows="3" placeholder="Spam, harassment, misinformation..."></textarea>
            <div class="uiu-modal-actions mt-3">
                <button type="button" class="btn btn-outline" id="adminDeleteCancel">Cancel</button>
                <button type="button" class="btn btn-primary btn-admin-danger" id="adminDeleteConfirm">
                    <i class="fa-solid fa-trash mr-2"></i>Delete
                </button>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.querySelector('#adminDeleteCancel').onclick = close;
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('#adminDeleteConfirm').onclick = async () => {
        const button = overlay.querySelector('#adminDeleteConfirm');
        button.disabled = true;
        try {
            await api('api/admin/delete_content.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, id: Number(id), reason: overlay.querySelector('#adminDeleteReason').value.trim() })
            });
            close();
            toast(label || 'Content deleted');
            if (typeof window.reloadPosts === 'function') window.reloadPosts();
        } catch (err) {
            alert(err.message);
            button.disabled = false;
        }
    };
    overlay.querySelector('#adminDeleteReason').focus();
}

function adminDeleteContent(type, id, context) {
    if (!isAdminUser()) return;
    adminDeleteModal(type, id, null, context);
}

function adminContentRefresh(target) {
    if (typeof window.reloadPosts === 'function') {
        window.reloadPosts();
        return;
    }
    const card = target?.closest('.post-card, .club-post-card, .announcement-card');
    if (card) {
        card.remove();
        return;
    }
    target?.closest('.comment-item')?.remove();
}

function setupAdminContentTools() {
    document.body.addEventListener('click', (e) => {
        const postDelete = e.target.closest('.admin-del-post');
        if (postDelete) {
            e.preventDefault();
            e.stopPropagation();
            const card = postDelete.closest('.post-card');
            adminDeleteContent('post', card?.dataset.id, 'posted by ' + (card?.querySelector('.post-author a')?.textContent || 'another member'));
            return;
        }

        const clubPostDelete = e.target.closest('.admin-del-club-post, .del-club-post');
        if (clubPostDelete) {
            e.preventDefault();
            e.stopPropagation();
            const postId = clubPostDelete.dataset.id;
            if (clubPostDelete.classList.contains('admin-del-club-post')) {
                adminDeleteContent('club_post', postId, 'posted in a club');
                return;
            }
            showModal('Delete Club Post?', 'Are you sure you want to delete this club post?', async () => {
                try {
                    await api('api/clubs/delete_post.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ post_id: Number(postId) })
                    });
                    toast('Club post deleted');
                    clubPostDelete.closest('.club-post-card')?.remove();
                } catch (err) { alert(err.message); }
            });
            return;
        }

        const clubCommentDelete = e.target.closest('.admin-del-club-comment, .del-club-comment');
        if (clubCommentDelete) {
            e.preventDefault();
            e.stopPropagation();
            const commentId = clubCommentDelete.dataset.id;
            if (clubCommentDelete.classList.contains('admin-del-club-comment')) {
                adminDeleteContent('club_comment', commentId, 'commented on a club post');
                return;
            }
            showModal('Delete Comment?', 'Are you sure you want to delete this comment?', async () => {
                try {
                    await api('api/clubs/delete_comment.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ comment_id: Number(commentId) })
                    });
                    toast('Comment deleted');
                    clubCommentDelete.closest('.comment-item')?.remove();
                } catch (err) { alert(err.message); }
            });
            return;
        }

        const annDelete = e.target.closest('.admin-del-announcement');
        if (annDelete) {
            e.preventDefault();
            e.stopPropagation();
            adminDeleteContent('announcement', annDelete.dataset.id, 'posted as an announcement');
            return;
        }

        const annCommentDelete = e.target.closest('.admin-del-ann-comment');
        if (annCommentDelete) {
            e.preventDefault();
            e.stopPropagation();
            adminDeleteContent('announcement_comment', annCommentDelete.dataset.id, 'commented on an announcement');
            return;
        }

        const commentDelete = e.target.closest('.btn-admin-del-comment');
        if (commentDelete) {
            e.preventDefault();
            e.stopPropagation();
            const item = commentDelete.closest('.comment-item');
            adminDeleteContent('comment', item?.dataset.commentId, 'commented on a post');
            return;
        }

        const ownCommentDelete = e.target.closest('.btn-del-comment, .btn-del-ann-comment');
        if (ownCommentDelete) {
            e.preventDefault();
            e.stopPropagation();
            const isAnnouncement = ownCommentDelete.classList.contains('btn-del-ann-comment');
            const commentId = isAnnouncement
                ? ownCommentDelete.dataset.id
                : ownCommentDelete.closest('.comment-item')?.dataset.commentId;
            if (!commentId) return;
            showModal('Delete Comment?', 'Are you sure you want to delete this comment?', async () => {
                try {
                    await api(isAnnouncement ? 'api/announcements/delete_comment.php' : 'api/posts/delete_comment.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ comment_id: Number(commentId) })
                    });
                    toast('Comment deleted');
                    if (isAnnouncement) location.reload();
                    else adminContentRefresh(ownCommentDelete);
                } catch (err) { alert(err.message); }
            });
        }
    });
}

function isPendingUser() {
    return !!(currentUser && currentUser.is_pending);
}

function showModal(title, message, onConfirm = null) {
    const existingModal = document.getElementById('uiu-global-modal');
    if (existingModal) existingModal.remove();

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'uiu-global-modal';
    modalOverlay.className = 'uiu-modal-overlay';
    modalOverlay.innerHTML = `
        <div class="uiu-modal-box">
            <h3>${escapeHTML(title)}</h3>
            <p>${escapeHTML(message)}</p>
            <div class="uiu-modal-actions">
                <button type="button" class="btn btn-outline" id="uiu-modal-cancel">Cancel</button>
                <button type="button" class="btn btn-primary" id="uiu-modal-ok">OK</button>
            </div>
        </div>`;
    document.body.appendChild(modalOverlay);
    document.getElementById('uiu-modal-cancel').onclick = () => modalOverlay.remove();
    document.getElementById('uiu-modal-ok').onclick = () => {
        if (onConfirm) onConfirm();
        modalOverlay.remove();
    };
}

function toast(message) {
    const existing = document.querySelector('.report-toast');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = 'report-toast show';
    el.innerHTML = `<i class="fa-solid fa-check-circle"></i><span>${escapeHTML(message)}</span>`;
    document.body.appendChild(el);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3500);
}

function guardAction(e) {
    if (canAct()) return true;
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    if (isPendingUser()) {
        showModal('Account pending', 'Your joining request is still pending admin approval.', null);
    } else {
        showModal('Guest access', 'Only registered students and faculty can do this. Please sign in or create an account.', null);
    }
    return false;
}

async function api(url, options = {}) {
    const res = await fetch(url, options);
    let data = {};
    try { data = await res.json(); } catch (e) { data = { error: 'Invalid server response' }; }
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

async function checkAuth() {
    try {
        const data = await fetch('api/auth/me.php').then(r => r.json());
        const isAuthPage = /login\.html|register\.html$/i.test(window.location.pathname);

        if (data.authenticated) {
            currentUser = data.user;
            window.currentUser = currentUser;
            if (isAuthPage) {
                window.location.href = 'index.html';
            }
            return true;
        }
        if (!isAuthPage) {
            window.location.href = 'login.html';
        }
        return false;
    } catch (e) {
        console.error('Auth check failed:', e);
        return false;
    }
}

async function logoutUser() {
    try {
        await fetch('api/auth/logout.php', { method: 'POST' });
    } catch (e) {}
    window.location.href = 'login.html';
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    navItems.forEach(item => {
        item.classList.remove('active');
        const href = item.getAttribute('href');
        if (href === currentPath || (currentPath === 'group_detail.html' && href === 'groups.html') || (currentPath === 'club_detail.html' && href === 'club_hub.html')) {
            item.classList.add('active');
        }
    });

    document.querySelectorAll('.sidebar-footer .sign-out, a.sign-out').forEach(a => {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            logoutUser();
        });
    });

    if (currentUser && !isAdminUser()) {
        document.querySelectorAll('a[href="admin.html"]').forEach(a => a.style.display = 'none');
    }
}

function setupGuestNavigation() {
    if (!currentUser || !isGuestUser()) return;
    const allowedPaths = ['index.html', 'announcements.html'];
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    if (!allowedPaths.includes(currentPath)) {
        window.location.href = 'index.html';
        return;
    }
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        const href = item.getAttribute('href');
        if (!allowedPaths.includes(href)) {
            item.style.display = 'none';
        }
    });
}

function setupPendingBanner() {
    if (!isPendingUser()) return;
    if (document.getElementById('pending-join-banner')) return;
    const header = document.querySelector('.top-header');
    const banner = document.createElement('div');
    banner.id = 'pending-join-banner';
    banner.innerHTML = `<i class="fa-solid fa-hourglass-half"></i> Your joining request is pending. You can browse the site, but actions will unlock after an admin accepts your request.`;
    if (header && header.parentNode) {
        header.insertAdjacentElement('afterend', banner);
    } else {
        document.body.prepend(banner);
    }
}

function setupHeaderUserMenu() {
    const wrap = document.querySelector('.header-user');
    if (!wrap || !currentUser) return;
    wrap.classList.add('header-user-menu-wrap');
    wrap.removeAttribute('data-user-id');
    wrap.innerHTML = `
        <img src="${mediaUrl(currentUser.avatar)}" alt="${escapeHTML(currentUser.name)}" class="avatar header-avatar-img">
        <div class="header-user-dropdown" id="header-user-dropdown">
            <a href="profile.html?id=${currentUser.id}"><i class="fa-regular fa-user"></i> My Profile</a>
            <button type="button" id="edit-profile-open"><i class="fa-solid fa-pen"></i> Edit Profile</button>
            <button type="button" id="header-logout-btn"><i class="fa-solid fa-arrow-right-from-bracket"></i> Logout</button>
        </div>`;

    wrap.addEventListener('click', (e) => {
        e.stopPropagation();
        wrap.classList.toggle('open');
    });
    document.addEventListener('click', () => wrap.classList.remove('open'));

    wrap.querySelector('#header-logout-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        logoutUser();
    });
    wrap.querySelector('#edit-profile-open')?.addEventListener('click', (e) => {
        e.stopPropagation();
        wrap.classList.remove('open');
        openEditProfileModal();
    });
}

function openEditProfileModal() {
    if (!canAct()) {
        guardAction();
        return;
    }
    const overlay = document.createElement('div');
    overlay.className = 'uiu-modal-overlay';
    overlay.id = 'edit-profile-overlay';
    overlay.innerHTML = `
        <div class="uiu-modal-box" style="text-align:left; max-width:440px;">
            <h3>Edit Profile</h3>
            <form id="edit-profile-form">
                <label class="form-label">Name</label>
                <input class="form-control mb-2" name="name" value="${escapeHTML(currentUser.name)}" required>
                <label class="form-label">About</label>
                <textarea class="form-control mb-2" name="about" rows="3">${escapeHTML(currentUser.about || '')}</textarea>
                <label class="form-label">Profile picture</label>
                <input class="form-control mb-2" type="url" name="avatar_url" placeholder="Image URL" value="">
                <input class="form-control mb-2" type="file" name="avatar" accept="image/*">
                <label class="form-label">Cover photo</label>
                <input class="form-control mb-2" type="url" name="cover_url" placeholder="Cover image URL">
                <input class="form-control mb-2" type="file" name="cover_photo" accept="image/*">
                <div class="uiu-modal-actions">
                    <button type="button" class="btn btn-outline" id="edit-profile-cancel">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save</button>
                </div>
            </form>
        </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#edit-profile-cancel').onclick = () => overlay.remove();
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#edit-profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
            const data = await api('api/users/update.php', { method: 'POST', body: fd });
            currentUser = data.user;
            window.currentUser = currentUser;
            overlay.remove();
            toast('Profile updated');
            location.reload();
        } catch (err) {
            alert(err.message);
        }
    });
}

function setupGlobalProfileLinks() {
    document.body.addEventListener('click', (e) => {
        if (e.target.closest('.header-user, .header-user-dropdown, #notif-panel, .chat-list-pane')) return;
        const target = e.target.closest('[data-user-id], .user-profile-link');
        if (!target) return;
        if (e.target.closest('button, input, select, textarea') && !e.target.hasAttribute('data-user-id')) return;
        const userId = target.getAttribute('data-user-id') || target.dataset.userId;
        if (userId) {
            e.preventDefault();
            window.location.href = `profile.html?id=${userId}`;
        }
    });
}

async function loadUsers() {
    try {
        const data = await api('api/users/list.php');
        window.globalUsers = data.users || [];
    } catch (e) {
        window.globalUsers = [];
    }
}

function commentHTML(comment, nested = false) {
    const replies = (comment.replies || []).map(r => commentHTML(r, true)).join('');
    return `
        <div class="comment-item ${nested ? 'comment-reply' : ''}" data-comment-id="${comment.id}" id="comment-${comment.id}">
            <img src="${mediaUrl(comment.avatar)}" alt="" class="avatar user-profile-link" data-user-id="${comment.author_id}" style="width:28px;height:28px;object-fit:cover;">
            <div class="comment-body" style="flex:1;">
                <div class="fw-600 text-sm"><a href="profile.html?id=${comment.author_id}" class="user-profile-link" data-user-id="${comment.author_id}">${escapeHTML(comment.author)}</a></div>
                <div class="text-sm">${escapeHTML(comment.text || comment.content)}</div>
                <button type="button" class="btn-reply-comment text-primary text-sm" data-parent-id="${comment.id}" style="background:none;border:none;padding:0;margin-top:4px;">Reply</button>
                <div class="reply-box" style="display:none;margin-top:8px;">
                    <input type="text" class="form-control reply-input" placeholder="Write a reply..." style="font-size:13px;border-radius:16px;">
                </div>
                ${replies}
            </div>
        </div>`;
}

function postCardHTML(post, extra = '') {
    const badgeClass = post.role === 'FACULTY' || post.role === 'ADMIN' ? 'faculty' : 'student';
    const imageHTML = post.image ? `<img src="${mediaUrl(post.image)}" alt="Post Image" class="post-image mt-2">` : '';
    const commentsListHTML = (post.comments || []).map(c => commentHTML(c)).join('');
    return `
        <div class="card post-card mb-3" data-id="${post.id}" id="post-${post.id}">
            <div class="post-header justify-content-between d-flex">
                <div class="d-flex gap-2">
                    <img src="${mediaUrl(post.avatar)}" alt="" class="avatar user-profile-link" data-user-id="${post.author_id}" style="object-fit:cover;">
                    <div>
                        <div class="post-author fw-600">
                            <a href="profile.html?id=${post.author_id}" class="user-profile-link" data-user-id="${post.author_id}">${escapeHTML(post.author)}</a>
                            <span class="badge ${badgeClass}">${escapeHTML(post.role)}</span>
                        </div>
                        <div class="post-meta text-muted text-sm">${escapeHTML(post.dept)} • ${escapeHTML(post.time)}</div>
                    </div>
                </div>
                <div class="d-flex gap-2">
                    ${extra}
                    <i class="fa-solid fa-flag text-muted action-flag" title="Report this post"></i>
                </div>
            </div>
            <div class="post-content mt-2">
                <p class="m-0">${escapeHTML(post.content)}</p>
                ${imageHTML}
            </div>
            <div class="post-footer mt-3 d-flex justify-content-between align-items-center">
                <div class="d-flex gap-3">
                    <span class="post-stat btn-like ${post.liked ? 'text-primary' : ''}" style="cursor:pointer;">
                        <i class="${post.liked ? 'fa-solid' : 'fa-regular'} fa-thumbs-up"></i>
                        <span class="like-count">${post.likes}</span>
                    </span>
                    <span class="post-stat btn-comment-toggle" style="cursor:pointer;">
                        <i class="fa-regular fa-comment"></i>
                        <span class="comment-count">${(post.comments || []).reduce((n, c) => n + 1 + (c.replies || []).length, 0)}</span>
                    </span>
                </div>
            </div>
            <div class="comments-section mt-3 pt-3 border-top" style="display:none;">
                <div class="comments-list">${commentsListHTML}</div>
                <div class="d-flex gap-2 mt-3">
                    <img src="${mediaUrl(currentUser?.avatar)}" alt="" class="avatar" style="width:32px;height:32px;object-fit:cover;">
                    <input type="text" class="form-control comment-input" placeholder="Write a comment..." style="font-size:14px;border-radius:20px;">
                    <button type="button" class="btn btn-primary btn-add-comment btn-sm" style="border-radius:20px;padding:4px 14px;">Send</button>
                </div>
            </div>
        </div>`;
}

function bindPostInteractions(root = document) {
    root.querySelectorAll('.post-card').forEach(card => {
        if (card.dataset.bound) return;
        card.dataset.bound = '1';
        const postId = card.getAttribute('data-id');

        card.querySelector('.btn-like')?.addEventListener('click', async (e) => {
            if (!guardAction(e)) return;
            try {
                const data = await api('api/posts/like_post.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ post_id: Number(postId) })
                });
                const icon = card.querySelector('.btn-like i');
                const count = card.querySelector('.like-count');
                count.textContent = data.likes;
                card.querySelector('.btn-like').classList.toggle('text-primary', data.status === 'liked');
                icon.className = data.status === 'liked' ? 'fa-solid fa-thumbs-up' : 'fa-regular fa-thumbs-up';
            } catch (err) { alert(err.message); }
        });

        card.querySelector('.btn-comment-toggle')?.addEventListener('click', () => {
            const sec = card.querySelector('.comments-section');
            sec.style.display = sec.style.display === 'none' ? 'block' : 'none';
        });

        card.querySelector('.btn-add-comment')?.addEventListener('click', () => sendComment(card, postId));
        card.querySelector('.comment-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendComment(card, postId);
        });

        card.addEventListener('click', (e) => {
            const replyBtn = e.target.closest('.btn-reply-comment');
            if (replyBtn) {
                const box = replyBtn.parentElement.querySelector('.reply-box');
                box.style.display = box.style.display === 'none' ? 'block' : 'none';
            }
        });
        card.addEventListener('keypress', async (e) => {
            if (e.key !== 'Enter' || !e.target.classList.contains('reply-input')) return;
            if (!guardAction(e)) return;
            const text = e.target.value.trim();
            const parentId = e.target.closest('.comment-item').dataset.commentId;
            if (!text) return;
            try {
                await api('api/posts/add_comment.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ post_id: Number(postId), content: text, parent_id: Number(parentId) })
                });
                e.target.value = '';
                if (typeof window.reloadPosts === 'function') window.reloadPosts();
            } catch (err) { alert(err.message); }
        });

        card.querySelector('.action-flag')?.addEventListener('click', () => {
            if (!guardAction()) return;
            const modal = document.getElementById('reportModal');
            if (!modal) return;
            modal.dataset.postId = postId;
            modal.style.display = 'flex';
            modal.classList.add('show');
        });
    });
}

async function sendComment(card, postId) {
    if (!guardAction()) return;
    const input = card.querySelector('.comment-input');
    const text = input.value.trim();
    if (!text) return;
    try {
        const data = await api('api/posts/add_comment.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post_id: Number(postId), content: text })
        });
        input.value = '';
        const list = card.querySelector('.comments-list');
        list.insertAdjacentHTML('beforeend', commentHTML(data.comment));
        const count = card.querySelector('.comment-count');
        count.textContent = Number(count.textContent) + 1;
    } catch (err) { alert(err.message); }
}

function setupReportModal() {
    const modal = document.getElementById('reportModal');
    if (!modal) return;
    const hide = () => { modal.style.display = 'none'; modal.classList.remove('show'); };
    document.getElementById('reportModalClose')?.addEventListener('click', hide);
    document.getElementById('reportCancelBtn')?.addEventListener('click', hide);
    modal.addEventListener('click', (e) => { if (e.target === modal) hide(); });
    document.getElementById('reportSubmitBtn')?.addEventListener('click', async () => {
        const selected = modal.querySelector('input[name="reportReason"]:checked');
        if (!selected) return;
        const reasonLabel = selected.closest('.report-option')?.querySelector('.report-option-title')?.textContent || selected.value;
        try {
            await api('api/posts/report.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    post_id: Number(modal.dataset.postId),
                    reason: selected.value,
                    reason_label: reasonLabel,
                    details: document.getElementById('reportDetails')?.value || ''
                })
            });
            hide();
            toast('Post reported');
        } catch (err) { alert(err.message); }
    });
}

async function initApp() {
    const ok = await checkAuth();
    if (!ok) return;
    if (/login\.html|register\.html$/i.test(window.location.pathname)) return;
    await loadUsers();
    setupNavigation();
    setupPendingBanner();
    setupHeaderUserMenu();
    setupNotifications();
    setupGlobalProfileLinks();
    setupReportModal();
}

window.mediaUrl = mediaUrl;
window.escapeHTML = escapeHTML;
window.canAct = canAct;
window.guardAction = guardAction;
window.isAdminUser = isAdminUser;
window.isFacultyUser = isFacultyUser;
window.isGroupModeratorUser = isGroupModeratorUser;
window.isGuestUser = isGuestUser;
window.adminDeleteContent = adminDeleteContent;
window.setupAdminContentTools = setupAdminContentTools;
window.showModal = showModal;
window.toast = toast;
window.api = api;
window.initApp = initApp;
window.postCardHTML = postCardHTML;
window.bindPostInteractions = bindPostInteractions;
window.checkAuth = checkAuth;
window.logoutUser = logoutUser;
window.openEditProfileModal = openEditProfileModal;

// ─── NEW FUNCTIONS ───────────────────────────────────────

function timeAgo(isoString) {
    if (!isoString) return '';
    const now = new Date();
    const date = new Date(isoString);
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm ago';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h ago';
    const days = Math.floor(hours / 24);
    return days + 'd ago';
}

function formatDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}

function debounce(fn, ms) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), ms);
    };
}

function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
    } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
    }
    toast('Link copied');
}

function shareLink(url, title) {
    if (navigator.share) {
        navigator.share({ title: title || document.title, url: url || location.href }).catch(() => {});
    } else {
        copyToClipboard(location.href);
    }
}

function openImagePreview(src) {
    const overlay = document.createElement('div');
    overlay.className = 'uiu-modal-overlay';
    overlay.style.cursor = 'zoom-out';
    overlay.innerHTML = `<img src="${mediaUrl(src)}" style="max-width:90vw;max-height:90vh;border-radius:var(--radius-lg);box-shadow:0 24px 60px rgba(0,0,0,0.3);">`;
    overlay.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
}

function setupInfiniteScroll(container, loadMoreFn) {
    if (!container) return;
    let loading = false;
    let page = 1;
    const observer = new IntersectionObserver(async (entries) => {
        if (entries[0].isIntersecting && !loading) {
            loading = true;
            try {
                const hasMore = await loadMoreFn(page++);
                if (!hasMore) observer.disconnect();
            } catch (e) { console.error(e); }
            loading = false;
        }
    }, { rootMargin: '200px' });
    observer.observe(container);
}

function renderSkeleton(type) {
    if (type === 'post') {
        return `<div class="skeleton-post"><div class="skeleton skeleton-avatar"></div><div class="skeleton skeleton-line short"></div><div class="skeleton skeleton-line long"></div><div class="skeleton skeleton-line"></div></div>`;
    }
    if (type === 'card') {
        return `<div class="skeleton" style="height:120px;"></div>`;
    }
    if (type === 'list') {
        return `<div class="skeleton" style="height:60px;margin-bottom:10px;"></div><div class="skeleton" style="height:60px;margin-bottom:10px;"></div><div class="skeleton" style="height:60px;"></div>`;
    }
    return '';
}

// ─── EXTENDED FUNCTIONS ──────────────────────────────────

function postCardHTML(post, extra = '', options = {}) {
    const badgeClass = post.role === 'FACULTY' || post.role === 'ADMIN' ? 'faculty' : 'student';
    const imageHTML = post.image ? `<img src="${mediaUrl(post.image)}" alt="Post Image" class="post-image mt-2">` : '';
    const editedHTML = post.edited_at ? `<span class="text-light text-sm" style="font-size:11px;"> (edited)</span>` : '';
    const commentsListHTML = (post.comments || []).map(c => commentHTML(c)).join('');
    const commentsCount = commentsListHTML ? (post.comments || []).reduce((n, c) => n + 1 + (c.replies || []).length, 0) : 0;
    const shareBtn = canAct() ? `<span class="post-stat btn-share" style="cursor:pointer;" title="Share"><i class="fa-solid fa-share-nodes"></i></span>` : '';
    const saveBtn = canAct() ? `<span class="post-stat btn-save ${post.saved ? 'text-primary' : ''}" style="cursor:pointer;" title="Save"><i class="${post.saved ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i></span>` : '';
    const isOwner = currentUser && post.author_id && String(post.author_id) === String(currentUser.id);
    const isAdmin = isAdminUser();
    const showOwnerDelete = options.showOwnerDelete !== false;
    const ownerTools = isOwner ? `<span class="post-stat btn-edit-post" style="cursor:pointer;" title="Edit"><i class="fa-solid fa-pen"></i></span>${showOwnerDelete ? '<span class="post-stat btn-del-post" style="cursor:pointer;color:var(--danger-color);" title="Delete"><i class="fa-solid fa-trash"></i></span>' : ''}` : '';
    const adminTool = (isAdmin && !isOwner)
        ? `<span class="post-stat admin-del-post" style="cursor:pointer;" title="Delete as administrator"><i class="fa-solid fa-shield-halved"></i> <i class="fa-solid fa-trash"></i></span>`
        : '';
    const reportTool = isAdmin ? '' : '<i class="fa-solid fa-flag text-muted action-flag" title="Report this post"></i>';
    return `
        <div class="card post-card mb-3" data-id="${post.id}" data-content="${escapeHTML(post.content || '')}" id="post-${post.id}">
            <div class="post-header justify-content-between d-flex">
                <div class="d-flex gap-2">
                    <img src="${mediaUrl(post.avatar)}" alt="" class="avatar user-profile-link" data-user-id="${post.author_id}" style="object-fit:cover;">
                    <div>
                        <div class="post-author fw-600">
                            <a href="profile.html?id=${post.author_id}" class="user-profile-link" data-user-id="${post.author_id}">${escapeHTML(post.author)}</a>
                            <span class="badge ${badgeClass}">${escapeHTML(post.role)}</span>
                        </div>
                        <div class="post-meta text-muted text-sm">${escapeHTML(post.dept)} • ${escapeHTML(post.time)}${editedHTML} <span class="text-light" style="font-size:11px;"> • ${post.views_count || 0} views</span></div>
                    </div>
                </div>
                <div class="d-flex gap-2">
                    ${extra}
                    ${ownerTools}
                    ${adminTool}
                    ${reportTool}
                </div>
            </div>
            <div class="post-content mt-2">
                <p class="m-0">${escapeHTML(post.content)}</p>
                ${imageHTML}
            </div>
            <div class="post-footer mt-3 d-flex justify-content-between align-items-center">
                <div class="d-flex gap-3">
                    <span class="post-stat btn-like ${post.liked ? 'text-primary' : ''}" style="cursor:pointer;">
                        <i class="${post.liked ? 'fa-solid' : 'fa-regular'} fa-thumbs-up"></i>
                        <span class="like-count">${post.likes}</span>
                    </span>
                    <span class="post-stat btn-comment-toggle" style="cursor:pointer;">
                        <i class="fa-regular fa-comment"></i>
                        <span class="comment-count">${commentsCount}</span>
                    </span>
                    ${shareBtn}
                    ${saveBtn}
                </div>
            </div>
            <div class="comments-section mt-3 pt-3 border-top" style="display:none;">
                <div class="comments-list">${commentsListHTML}</div>
                <div class="d-flex gap-2 mt-3">
                    <img src="${mediaUrl(currentUser?.avatar)}" alt="" class="avatar" style="width:32px;height:32px;object-fit:cover;">
                    <input type="text" class="form-control comment-input" placeholder="Write a comment..." style="font-size:14px;border-radius:20px;">
                    <button type="button" class="btn btn-primary btn-add-comment btn-sm" style="border-radius:20px;padding:4px 14px;">Send</button>
                </div>
            </div>
        </div>`;
}

function openEditPostModal(postId, currentContent = '') {
    if (!guardAction()) return;

    const existing = document.getElementById('edit-post-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'edit-post-overlay';
    overlay.className = 'uiu-modal-overlay';
    overlay.innerHTML = `
        <div class="uiu-modal-box" style="text-align:left; max-width:520px;">
            <h3>Edit Post</h3>
            <form id="edit-post-form">
                <label class="form-label">Post content</label>
                <textarea class="form-control" name="content" rows="5" required>${escapeHTML(currentContent)}</textarea>
                <div class="uiu-modal-actions mt-3">
                    <button type="button" class="btn btn-outline" id="edit-post-cancel">Cancel</button>
                    <button type="submit" class="btn btn-primary" id="edit-post-save">Save</button>
                </div>
            </form>
        </div>`;
    document.body.appendChild(overlay);

    const form = overlay.querySelector('#edit-post-form');
    const saveButton = overlay.querySelector('#edit-post-save');
    overlay.querySelector('#edit-post-cancel').onclick = () => overlay.remove();
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = form.elements.content.value.trim();
        if (!content) {
            alert('Post content is required');
            return;
        }

        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';
        try {
            await api('api/posts/edit_post.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ post_id: Number(postId), content })
            });
            overlay.remove();
            toast('Post updated');
            if (typeof window.reloadPosts === 'function') window.reloadPosts();
        } catch (err) {
            alert(err.message);
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = 'Save';
        }
    });
}

function commentHTML(comment, nested = false) {
    const replies = (comment.replies || []).map(r => commentHTML(r, true)).join('');
    const isOwner = currentUser && comment.author_id && String(comment.author_id) === String(currentUser.id);
    const isAdmin = isAdminUser() && !isOwner;
    const tools = [
        isOwner ? '<span class="comment-action btn-edit-comment" title="Edit comment"><i class="fa-solid fa-pen"></i></span>' : '',
        isOwner ? '<span class="comment-action btn-del-comment" title="Delete comment"><i class="fa-solid fa-trash"></i></span>' : '',
        isAdmin ? `<span class="comment-action btn-admin-del-comment" title="Delete as administrator"><i class="fa-solid fa-shield-halved"></i></span>` : ''
    ].filter(Boolean).join('');
    const toolsHTML = tools ? `<div class="comment-tools">${tools}</div>` : '';
    return `
        <div class="comment-item ${nested ? 'comment-reply' : ''}" data-comment-id="${comment.id}" data-author-id="${comment.author_id || 0}" id="comment-${comment.id}">
            <img src="${mediaUrl(comment.avatar)}" alt="" class="avatar user-profile-link" data-user-id="${comment.author_id}" style="width:28px;height:28px;object-fit:cover;">
            <div class="comment-body" style="flex:1;">
                <div class="fw-600 text-sm"><a href="profile.html?id=${comment.author_id}" class="user-profile-link" data-user-id="${comment.author_id}">${escapeHTML(comment.author)}</a>${toolsHTML}</div>
                <div class="text-sm">${escapeHTML(comment.text || comment.content)}</div>
                <button type="button" class="btn-reply-comment text-primary text-sm" data-parent-id="${comment.id}" style="background:none;border:none;padding:0;margin-top:4px;">Reply</button>
                <div class="reply-box" style="display:none;margin-top:8px;">
                    <input type="text" class="form-control reply-input" placeholder="Write a reply..." style="font-size:13px;border-radius:20px;">
                </div>
                ${replies}
            </div>
        </div>`;
}

function bindPostInteractions(root = document) {
    root.querySelectorAll('.post-card').forEach(card => {
        if (card.dataset.bound) return;
        card.dataset.bound = '1';
        const postId = card.getAttribute('data-id');

        card.querySelector('.btn-like')?.addEventListener('click', async (e) => {
            if (!guardAction(e)) return;
            try {
                const data = await api('api/posts/like_post.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ post_id: Number(postId) })
                });
                const icon = card.querySelector('.btn-like i');
                const count = card.querySelector('.like-count');
                count.textContent = data.likes;
                card.querySelector('.btn-like').classList.toggle('text-primary', data.status === 'liked');
                icon.className = data.status === 'liked' ? 'fa-solid fa-thumbs-up' : 'fa-regular fa-thumbs-up';
            } catch (err) { alert(err.message); }
        });

        card.querySelector('.btn-share')?.addEventListener('click', () => {
            shareLink(`index.html#post-${postId}`);
        });

        card.querySelector('.btn-save')?.addEventListener('click', async () => {
            if (!guardAction()) return;
            try {
                await api('api/posts/save_post.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ post_id: Number(postId) })
                });
                toast('Post saved');
            } catch (err) { alert(err.message); }
        });

        card.querySelector('.btn-edit-post')?.addEventListener('click', () => {
            openEditPostModal(postId, card.dataset.content || '');
        });

        card.querySelector('.btn-del-post')?.addEventListener('click', () => {
            if (!guardAction()) return;
            showModal('Delete Post?', 'Are you sure you want to delete this post?', async () => {
                try {
                    await api('api/posts/delete.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ post_id: Number(postId) })
                    });
                    toast('Post deleted');
                    if (typeof window.reloadPosts === 'function') window.reloadPosts();
                } catch (err) { alert(err.message); }
            });
        });

        card.querySelector('.btn-comment-toggle')?.addEventListener('click', () => {
            const sec = card.querySelector('.comments-section');
            sec.style.display = sec.style.display === 'none' ? 'block' : 'none';
        });

        card.querySelector('.btn-add-comment')?.addEventListener('click', () => sendComment(card, postId));
        card.querySelector('.comment-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendComment(card, postId);
        });

        card.addEventListener('click', (e) => {
            const replyBtn = e.target.closest('.btn-reply-comment');
            if (replyBtn) {
                const box = replyBtn.parentElement.querySelector('.reply-box');
                box.style.display = box.style.display === 'none' ? 'block' : 'none';
            }
        });
        card.addEventListener('keypress', async (e) => {
            if (e.key !== 'Enter' || !e.target.classList.contains('reply-input')) return;
            if (!guardAction(e)) return;
            const text = e.target.value.trim();
            const parentId = e.target.closest('.comment-item').dataset.commentId;
            if (!text) return;
            try {
                await api('api/posts/add_comment.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ post_id: Number(postId), content: text, parent_id: Number(parentId) })
                });
                e.target.value = '';
                if (typeof window.reloadPosts === 'function') window.reloadPosts();
            } catch (err) { alert(err.message); }
        });

        card.querySelector('.action-flag')?.addEventListener('click', () => {
            if (!guardAction()) return;
            const modal = document.getElementById('reportModal');
            if (!modal) return;
            modal.dataset.postId = postId;
            modal.style.display = 'flex';
            modal.classList.add('show');
        });
    });
}

function notificationIcon(n) {
    const cls = n.icon || 'fa-solid fa-bell';
    const color = n.color || 'var(--primary-color)';
    return `<span class="notif-icon" style="--notif-color:${escapeHTML(color)}"><i class="${escapeHTML(cls)}"></i></span>`;
}

function notificationAvatar(n) {
    if (!n.actor_avatar && !n.actor_name) return '';
    return `<img class="notif-avatar" src="${mediaUrl(n.actor_avatar)}" alt="${escapeHTML(n.actor_name || '')}">`;
}

function notificationItemHTML(n) {
    const link = n.link || '#';
    return `<a class="notif-item ${n.is_read ? '' : 'unread'}" href="${escapeHTML(link)}" data-id="${n.id}">
        ${notificationAvatar(n)}
        <span class="notif-main">
            <strong>${escapeHTML(n.title || '')}</strong>
            <span class="notif-text">${escapeHTML(n.body || '')}</span>
            <em>${escapeHTML(n.time || '')}</em>
        </span>
        ${notificationIcon(n)}
    </a>`;
}

async function setupNotifications() {
    const icon = document.querySelector('.header-icon');
    if (!icon || !currentUser) return;

    let badge = icon.querySelector('.notification-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'notification-badge';
        icon.appendChild(badge);
    }

    const paint = (unread) => {
        badge.textContent = unread > 9 ? '9+' : (unread ? String(unread) : '');
        badge.style.display = unread ? 'flex' : 'none';
    };

    const load = async () => {
        try {
            return await api('api/notifications/index.php?limit=15');
        } catch (e) {
            return { notifications: [], unread: 0 };
        }
    };

    const refreshBadge = async () => {
        const data = await load();
        paint(data.unread);
        return data;
    };

    paint(0);
    refreshBadge();

    const closePanel = () => document.getElementById('notif-panel')?.remove();

    icon.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (document.getElementById('notif-panel')) { closePanel(); return; }

        const data = await load();
        const panel = document.createElement('div');
        panel.id = 'notif-panel';
        panel.className = 'notif-panel';
        panel.innerHTML = `
            <div class="notif-panel-head">
                <strong>Notifications</strong>
                <div>
                    <button type="button" id="notif-mark-all">Mark all read</button>
                    <a href="notifications.html">See all</a>
                </div>
            </div>
            <div class="notif-panel-list">
                ${data.notifications.length
                    ? data.notifications.map(notificationItemHTML).join('')
                    : '<div class="notif-empty"><i class="fa-solid fa-bell-slash"></i><p>No notifications yet</p></div>'}
            </div>`;
        icon.appendChild(panel);

        panel.querySelector('#notif-mark-all')?.addEventListener('click', async (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            try {
                await api('api/notifications/index.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: '{}'
                });
                panel.querySelectorAll('.notif-item').forEach(el => el.classList.remove('unread'));
                paint(0);
                toast('All notifications marked as read');
            } catch (err) {}
        });

        panel.querySelectorAll('.notif-item').forEach(el => {
            el.addEventListener('click', () => {
                el.classList.remove('unread');
                if (typeof scrollToHashTarget === 'function') setTimeout(scrollToHashTarget, 60);
            });
        });

        api('api/notifications/index.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}'
        }).catch(() => {});
        paint(0);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#notif-panel') && !e.target.closest('.header-icon')) closePanel();
    });

    // Keep the badge live
    setInterval(refreshBadge, 30000);
    window.refreshNotificationBadge = refreshBadge;
}

// ─── initApp with new features ───────────────────────────

async function initApp() {
    const ok = await checkAuth();
    if (!ok) return;
    if (/login\.html|register\.html$/i.test(window.location.pathname)) return;
    await loadUsers();
    setupNavigation();
    setupPendingBanner();
    setupHeaderUserMenu();
    setupNotifications();
    setupGlobalSearch();
    setupGlobalProfileLinks();
    setupReportModal();
    setupAdminContentTools();
    setupMobileMenu();
    setupSearchShortcut();
    setupEscapeKey();
    setupHashNavigation();
    setupGuestNavigation();
}

function setupMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    let hamburger = document.querySelector('.mobile-menu-btn');
    if (!hamburger && window.innerWidth < 768) {
        hamburger = document.createElement('button');
        hamburger.className = 'mobile-menu-btn';
        hamburger.innerHTML = '<i class="fa-solid fa-bars"></i>';
        hamburger.style.cssText = 'position:fixed;top:12px;left:12px;z-index:200;background:#fff;border:1px solid var(--border-color);border-radius:8px;padding:8px 10px;cursor:pointer;display:none;';
        document.body.prepend(hamburger);
    }
    if (window.innerWidth < 768) {
        if (hamburger) hamburger.style.display = 'block';
        sidebar.style.transform = 'translateX(-100%)';
        sidebar.style.transition = 'transform 0.2s';
        hamburger.addEventListener('click', () => {
            sidebar.style.transform = sidebar.style.transform === 'translateX(0)' ? 'translateX(-100%)' : 'translateX(0)';
        });
    }
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768) {
            sidebar.style.transform = 'translateX(0)';
            if (hamburger) hamburger.style.display = 'none';
        }
    });
}

const SEARCH_TYPE_META = {
    people: { label: 'People', icon: 'fa-solid fa-user' },
    posts: { label: 'Posts', icon: 'fa-solid fa-newspaper' },
    groups: { label: 'Groups', icon: 'fa-solid fa-users-line' },
    clubs: { label: 'Clubs', icon: 'fa-solid fa-puzzle-piece' },
    events: { label: 'Events', icon: 'fa-regular fa-calendar' }
};

function runGlobalSearch(input) {
    const q = input.value.trim();
    if (q.length < 1) {
        toast('Type something to search');
        return;
    }
    if (window.searchPageSearch && window.searchPageSearch()) {
        input.blur();
        return;
    }
    window.location.href = `search.html?q=${encodeURIComponent(q)}`;
}

function attachGlobalSearch(bar) {
    const input = bar.querySelector('input');
    if (!input || input.dataset.localSearch !== undefined) return;
    input.classList.add('site-search-input');

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            runGlobalSearch(input);
        }
    });
}

function setupGlobalSearch() {
    document.querySelectorAll('.top-header .search-bar').forEach(bar => {
        attachGlobalSearch(bar);
        const input = bar.querySelector('input');
        if (input && !input.dataset.searchPlaceholder) {
            input.dataset.searchPlaceholder = input.placeholder || '';
            input.placeholder = 'Search people, posts, groups, clubs, events...';
            input.setAttribute('title', 'Search people, posts, groups, clubs and events');
        }
    });
}
function setupSearchShortcut() {
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            const search = document.querySelector('.top-header .search-bar input');
            if (search) {
                search.focus();
                search.select();
            }
        }
    });
}

function scrollToHashTarget() {
    const raw = decodeURIComponent(window.location.hash || '').replace(/^#/, '');
    if (!raw) return false;
    const safe = CSS.escape(raw);
    const el = document.getElementById(raw) ||
        document.querySelector(`[data-post-id="${safe}"]`) ||
        document.querySelector(`[data-comment-id="${safe}"]`);
    if (!el) return false;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('flash-highlight');
    setTimeout(() => el.classList.remove('flash-highlight'), 2400);
    return true;
}

function setupHashNavigation() {
    window.addEventListener('hashchange', scrollToHashTarget);
    if (!window.location.hash) return;
    let tries = 0;
    const tick = () => {
        if (scrollToHashTarget() || ++tries > 24) return;
        setTimeout(tick, 250);
    };
    setTimeout(tick, 250);
}

function setupEscapeKey() {
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        document.querySelectorAll('.notif-panel, .uiu-modal-overlay, .header-user-menu-wrap.open').forEach(el => {
            if (el.classList.contains('header-user-menu-wrap')) {
                el.classList.remove('open');
            } else {
                el.remove();
            }
        });
    });
}
