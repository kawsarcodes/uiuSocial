document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
    await setupAnnouncementsPage();
});

let announcements = [];

async function setupAnnouncementsPage() {
    const createBtn = document.getElementById('create-announcement-btn');
    const createCard = document.getElementById('announcement-create-card');
    const cancelButton = document.getElementById('announcement-cancel-btn');
    const submitButton = document.getElementById('announcement-submit-btn');

    if (isGroupModeratorUser()) {
        createBtn.style.display = '';

        document.getElementById('announcement-avatar').src = mediaUrl((currentUser && currentUser.avatar) || 'assets/images/students/default.png');

        createBtn.addEventListener('click', () => {
            createCard.style.display = 'block';
            createBtn.style.display = 'none';
        });

        cancelButton.addEventListener('click', () => {
            createCard.style.display = 'none';
            createBtn.style.display = '';
        });

        submitButton.addEventListener('click', async () => {
            const title = document.getElementById('announcement-title-input').value.trim();
            const content = document.getElementById('announcement-content-input').value.trim();
            if (!title || !content) {
                toast('Title and content are required');
                return;
            }
            submitButton.disabled = true;
            submitButton.innerHTML = 'Posting...';
            try {
                const fd = new FormData();
                fd.append('title', title);
                fd.append('content', content);
                await api('api/announcements/create.php', { method: 'POST', body: fd });
                toast('Announcement posted');
                document.getElementById('announcement-title-input').value = '';
                document.getElementById('announcement-content-input').value = '';
                createCard.style.display = 'none';
                createBtn.style.display = '';
                await loadAnnouncements();
            } catch (err) {
                alert(err.message);
            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = 'Post Announcement';
            }
        });
    } else {
        createCard.style.display = 'none';
    }

    const searchInput = document.querySelector('.top-header .search-bar input');
    if (searchInput) {
        searchInput.addEventListener('input', () => renderAnnouncements(searchInput.value.trim().toLowerCase()));
    }

    await loadAnnouncements();
}

async function loadAnnouncements() {
    try {
        const data = await api('api/announcements/list.php?general=1');
        announcements = data.announcements || [];
        renderAnnouncements();
    } catch (e) {
        console.error('Failed to load announcements', e);
        document.getElementById('announcements-list').innerHTML =
            '<div style="text-align:center;color:var(--text-muted);padding:40px;">Failed to load announcements.</div>';
    }
}

function renderAnnouncements(searchTerm = '') {
    const container = document.getElementById('announcements-list');
    if (!container) return;

    const filtered = announcements.filter(a => {
        if (!searchTerm) return true;
        return (a.title || '').toLowerCase().includes(searchTerm) ||
               (a.content || '').toLowerCase().includes(searchTerm);
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:40px;"><i class="fa-solid fa-bullhorn" style="font-size:48px;margin-bottom:12px;opacity:0.3;"></i><p>No announcements found.</p></div>';
        return;
    }

    container.innerHTML = filtered.map(ann => announcementCardHTML(ann)).join('');

    bindAnnouncementInteractions();
}

function bindAnnouncementInteractions() {
    const container = document.getElementById('announcements-list');
    if (!container) return;

    container.querySelectorAll('.btn-like-announcement').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.closest('.card').dataset.id;
            await toggleLike(id);
        });
    });

    container.querySelectorAll('.btn-delete-announcement').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.closest('.card').dataset.id;
            showModal('Delete Announcement?', 'This action cannot be undone. Are you sure?', async () => {
                try {
                    await api('api/announcements/delete.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: Number(id) })
                    });
                    toast('Announcement deleted');
                    await loadAnnouncements();
                } catch (err) {
                    alert(err.message);
                }
            });
        });
    });

    container.querySelectorAll('.btn-toggle-comments').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.closest('.card').dataset.id;
            const section = document.getElementById('ann-comments-' + id);
            if (section) {
                section.style.display = section.style.display === 'none' ? 'block' : 'none';
            }
        });
    });

    container.querySelectorAll('.btn-send-comment').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const card = btn.closest('.card');
            const id = Number(card.dataset.id);
            const input = card.querySelector('.ann-comment-input');
            const content = input.value.trim();
            if (!content) return;
            try {
                const data = await api('api/announcements/comment.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ announcement_id: id, content })
                });
                input.value = '';
                await loadAnnouncements();
            } catch (err) {
                alert(err.message);
            }
        });
    });

    container.querySelectorAll('.btn-delete-comment').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const cid = Number(btn.dataset.commentId);
            showModal('Delete Comment?', 'Remove this comment?', async () => {
                try {
                    await api('api/announcements/delete_comment.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ comment_id: cid })
                    });
                    toast('Comment deleted');
                    await loadAnnouncements();
                } catch (err) {
                    alert(err.message);
                }
            });
        });
    });
}

const likeCache = {};

async function toggleLike(id) {
    const idStr = String(id);
    if (likeCache[idStr]) return;
    likeCache[idStr] = true;
    try {
        const res = await api('api/announcements/like.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ announcement_id: Number(id) })
        });
        const ann = announcements.find(a => String(a.id) === idStr);
        if (ann) {
            ann.liked = !ann.liked;
            ann.likes = res.likes;
        }
        renderAnnouncements(document.querySelector('.top-header .search-bar input')?.value.trim().toLowerCase() || '');
        delete likeCache[idStr];
    } catch (err) {
        alert(err.message);
        delete likeCache[idStr];
    }
}

function announcementCardHTML(ann) {
    const role = String(ann.author_role || 'student').toUpperCase();
    const badgeClass = (role === 'FACULTY' || role === 'ADMIN') ? 'faculty' : 'student';
    const isModerator = isGroupModeratorUser();
    const canPost = canAct();
    const isCreator = !!ann.can_delete;

    let deleteBtn = '';
    if (isModerator || isCreator) {
        deleteBtn = `<span class="post-stat btn-delete-announcement" style="cursor:pointer;color:var(--danger-color);" title="Delete announcement"><i class="fa-solid fa-trash"></i></span>`;
    }

    const likeIcon = ann.liked ? 'fa-solid' : 'fa-regular';

    const commentsList = (ann.comments || []).map(c => {
        const cRole = String(c.author_role || 'student').toUpperCase();
        // author_id might be named differently in the response
        const cAuthorId = c.author_id || c.user_id;
        const cIsOwner = currentUser && cAuthorId && String(cAuthorId) === String(currentUser.id);
        const cIsModerator = isModerator;
        const cDeleteBtn = (cIsOwner || cIsModerator)
            ? `<span class="btn-delete-comment" data-comment-id="${c.id}" style="cursor:pointer;color:var(--danger-color);margin-left:auto;" title="Delete comment"><i class="fa-solid fa-trash"></i></span>`
            : '';
        return `
            <div class="d-flex gap-2 mb-2">
                <img src="${mediaUrl(c.avatar)}" alt="" class="avatar" style="width:28px;height:28px;object-fit:cover;">
                <div style="flex:1;">
                    <div class="fw-600 text-sm">${escapeHTML(c.author || 'Unknown')}</div>
                    <div class="text-sm text-muted">${escapeHTML(c.content || c.text || '')}</div>
                    <div class="text-xs text-muted" style="font-size:10px;">${escapeHTML(timeAgo(c.created_at))}</div>
                </div>
                ${cDeleteBtn}
            </div>`;
    }).join('');

    const commentInput = canPost
        ? `<div class="d-flex gap-2 mt-2 pt-2 border-top">
            <img src="${mediaUrl(currentUser?.avatar || 'assets/images/students/default.png')}" alt="" class="avatar" style="width:32px;height:32px;object-fit:cover;">
            <input type="text" class="form-control ann-comment-input" placeholder="Write a comment..." style="font-size:14px;border-radius:20px;">
            <button class="btn btn-primary btn-send-comment" style="border-radius:20px;padding:4px 16px;">Send</button>
           </div>`
        : '';

    const commentCount = (ann.comments || []).length;

    return `
        <div class="card post-card mb-3" data-id="${ann.id}">
            <div class="post-header d-flex justify-content-between align-items-center">
                <div class="d-flex gap-2">
                    <img src="${mediaUrl(ann.author_avatar)}" alt="" class="avatar" style="width:40px;height:40px;object-fit:cover;">
                    <div>
                        <div class="post-author fw-600">
                            <a href="profile.html?id=${ann.created_by}" class="user-profile-link" data-user-id="${ann.created_by}">${escapeHTML(ann.author_name)}</a>
                            <span class="badge ${badgeClass}">${escapeHTML(role)}</span>
                        </div>
                        <div class="post-meta text-muted text-sm">${escapeHTML(ann.time || '')}</div>
                    </div>
                </div>
                ${deleteBtn}
            </div>
            <div class="announcement-content mt-2">
                <h5 class="announcement-title" style="font-size:18px;font-weight:600;color:var(--text-main);margin-bottom:8px;">${escapeHTML(ann.title || '')}</h5>
                <p class="m-0 text-muted" style="font-size:14px;line-height:1.6;">${escapeHTML(ann.content || '')}</p>
            </div>
            <div class="post-footer mt-3 d-flex justify-content-between align-items-center">
                <div class="d-flex gap-3">
                    <span class="post-stat btn-like-announcement" style="cursor:pointer;${ann.liked ? 'color:var(--primary-color);' : ''}">
                        <i class="${likeIcon} fa-thumbs-up"></i>
                        <span class="like-count">${ann.likes}</span>
                    </span>
                    <span class="post-stat btn-toggle-comments" style="cursor:pointer;">
                        <i class="fa-regular fa-comment"></i>
                        <span class="comment-count">${commentCount}</span>
                    </span>
                </div>
            </div>
            <div class="comments-section mt-3 pt-3 border-top" id="ann-comments-${ann.id}" style="display:none;">
                <div class="comments-list">
                    ${commentsList || '<span class="text-sm text-muted">No comments yet.</span>'}
                </div>
                ${commentInput}
            </div>
        </div>`;
}
