// club_hub.js - Club Hub logic - DB-connected

let allClubs = [];
let isShowingAll = false;
let selectedCategory = 'All';

document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
    await setupClubHubPage();
});

async function setupClubHubPage() {
    try {
        const data = await api('api/clubs/list.php');
        allClubs = data.clubs || [];
    } catch (e) {
        console.error('Failed to load clubs', e);
    }

    renderClubsGrid();

    // View All toggle
    const viewAllBtn = document.getElementById('view-all-clubs');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', (e) => {
            e.preventDefault();
            isShowingAll = !isShowingAll;
            if (isShowingAll) {
                viewAllBtn.innerHTML = 'Show Less <i class="fa-solid fa-chevron-up ml-1"></i>';
                document.getElementById('clubs-section-title').textContent = 'All Campus Clubs';
                document.getElementById('clubs-subtitle').textContent = `Showing all ${allClubs.length} registered campus organizations`;
            } else {
                viewAllBtn.innerHTML = 'View All <i class="fa-solid fa-arrow-right ml-1"></i>';
                document.getElementById('clubs-section-title').textContent = 'Featured Clubs';
                document.getElementById('clubs-subtitle').textContent = 'Most active and popular clubs this semester';
            }
            renderClubsGrid();
        });
    }

    // Category pills
    const categoryPills = document.querySelectorAll('.category-pills .pill');
    categoryPills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            categoryPills.forEach(p => p.classList.remove('active'));
            e.target.classList.add('active');
            selectedCategory = e.target.textContent.trim();
            renderClubsGrid();
        });
    });

    // Load latest announcements
    await loadLatestAnnouncements();
}

function renderClubsGrid() {
    const grid = document.getElementById('clubs-grid');
    if (!grid) return;

    let filtered = allClubs;
    if (selectedCategory !== 'All') {
        filtered = allClubs.filter(c => (c.category || '').toLowerCase() === selectedCategory.toLowerCase());
    }

    let displayList = filtered;
    if (!isShowingAll && selectedCategory === 'All') {
        displayList = filtered.slice(0, 6);
    }

    if (displayList.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #888; padding: 24px;">No clubs found in category "${selectedCategory}".</div>`;
        return;
    }

    grid.innerHTML = displayList.map(club => {
        const memberCount = club.members >= 1000 ? (club.members / 1000).toFixed(1) + 'k' : club.members;
        const logoSrc = club.image || `assets/images/clubs/${club.slug}.png`;
        const membership = club.membership || 'none';
        const isMember = membership === 'member';
        const isRequested = membership === 'requested';
        const isAdmin = club.is_manager;

        // Build the action area: max 2 buttons
        let btnHTML = '';
        if (isMember || isAdmin) {
            // State: already a member / admin
            btnHTML = `
                <div class="d-flex gap-2 w-100">
                    <button class="btn btn-action flex-fill btn-sm" disabled><i class="fa-solid fa-check"></i> Joined</button>
                    <button class="btn btn-outline flex-fill btn-sm btn-explore" data-club-id="${club.id}">Explore</button>
                </div>`;
        } else if (isRequested) {
            // State: request pending
            btnHTML = `
                <div class="d-flex gap-2 w-100">
                    <button class="btn btn-outline flex-fill btn-sm btn-cancel-club-request" data-id="${club.id}">Cancel</button>
                    <button class="btn btn-outline flex-fill btn-sm btn-explore" data-club-id="${club.id}">Explore</button>
                </div>`;
        } else {
            // State: not a member
            btnHTML = `
                <div class="d-flex gap-2 w-100">
                    <button class="btn btn-primary flex-fill btn-sm btn-join-club" data-id="${club.id}" data-name="${escapeHTML(club.name)}"><i class="fa-solid fa-plus"></i> Join</button>
                    <button class="btn btn-outline flex-fill btn-sm btn-explore" data-club-id="${club.id}">Explore</button>
                </div>`;
        }

        return `
            <div class="club-card" data-club-id="${club.id}">
                <div class="club-logo-wrap" style="background-color:${club.icon_bg || club.iconBg || '#f5f5f5'};">
                    <img src="${mediaUrl(logoSrc)}" alt="${escapeHTML(club.name)} Logo" class="club-logo-img">
                </div>
                <h4 class="club-name">${escapeHTML(club.name)}</h4>
                <div class="club-members"><i class="fa-regular fa-user"></i> ${memberCount} Members</div>
                <div class="club-card-footer">
                    ${btnHTML}
                </div>
            </div>
        `;
    }).join('');

    // Single delegated handler for Explore (replaces .btn-explore + .btn-view-club)
    grid.querySelectorAll('.btn-explore').forEach(btn => {
        btn.addEventListener('click', (e) => {
            window.location.href = `club_detail.html?id=${e.currentTarget.dataset.clubId}`;
        });
    });

    // Join handler
    grid.querySelectorAll('.btn-join-club').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!guardAction(e)) return;
            const id = btn.dataset.id;
            const name = btn.dataset.name;
            showModal(
                `Join ${name}?`,
                `Your request will be sent to the club admin for approval.`,
                async () => {
                    try {
                        await api('api/clubs/join.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ club_id: Number(id) })
                        });
                        toast('Join request sent!');
                        setupClubHubPage();
                    } catch (err) { alert(err.message); }
                }
            );
        });
    });

    // Cancel request handler
    grid.querySelectorAll('.btn-cancel-club-request').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!guardAction(e)) return;
            const id = btn.dataset.id;
            showModal(
                'Cancel Join Request?',
                'Are you sure you want to cancel your join request?',
                async () => {
                    try {
                        await api('api/clubs/leave.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ club_id: id })
                        });
                        toast('Join request cancelled');
                        setupClubHubPage();
                    } catch (err) { alert(err.message); }
                }
            );
        });
    });
}

async function loadLatestAnnouncements() {
    const container = document.querySelector('.announcements-feed');
    if (!container) return;
    const isAdmin = isAdminUser();
    try {
        const data = await api('api/announcements/list.php');
        const items = data.announcements || [];
        if (items.length === 0) return;
        container.innerHTML = items.map(a => `
            <div class="card announcement-card mb-3" data-id="${a.id}">
                <div class="announcement-header d-flex gap-2">
                    <img src="${mediaUrl(a.club_image || 'assets/images/clubs/default.png')}" alt="" class="avatar" style="width:40px;height:40px;object-fit:cover;border-radius:8px;">
                    <div style="flex:1;">
                        <div class="fw-600 text-sm">${escapeHTML(a.club_name || 'UIU Social')}</div>
                        <div class="text-muted text-sm">${escapeHTML(a.time || '')}</div>
                    </div>
                    ${isAdmin ? `<span class="admin-del-announcement post-stat" data-id="${a.id}" title="Delete as administrator" style="cursor:pointer;"><i class="fa-solid fa-shield-halved"></i> <i class="fa-solid fa-trash"></i></span>` : ''}
                </div>
                <div class="announcement-content mt-2">
                    <p class="m-0">${escapeHTML(a.content)}</p>
                </div>
                <div class="announcement-footer mt-3 d-flex gap-3">
                    <span class="ann-action-item btn-like-ann" data-id="${a.id}" style="cursor:pointer;display:flex;align-items:center;gap:6px;">
                        <i class="${a.liked ? 'fa-solid' : 'fa-regular'} fa-heart" style="color:${a.liked ? '#e65100' : 'inherit'}"></i>
                        <span class="ann-like-count">${a.likes || 0}</span>
                    </span>
                    <span class="ann-action-item btn-comment-toggle-ann" data-id="${a.id}" style="cursor:pointer;display:flex;align-items:center;gap:6px;">
                        <i class="fa-regular fa-comment"></i>
                        <span class="ann-comment-count">${a.comments_count || 0}</span>
                    </span>
                </div>
                <div class="comments-section mt-3 pt-3 border-top" style="display:none;">
                    <div class="comments-list" id="ann-comments-${a.id}"></div>
                    <div class="d-flex gap-2 mt-3">
                        <img src="${mediaUrl(currentUser?.avatar)}" alt="" class="avatar" style="width:32px;height:32px;object-fit:cover;">
                        <input type="text" class="form-control ann-comment-input" placeholder="Write a comment..." style="font-size:14px;border-radius:20px;">
                        <button type="button" class="btn btn-primary btn-add-ann-comment btn-sm" data-ann-id="${a.id}" style="border-radius:20px;padding:4px 14px;">Send</button>
                    </div>
                </div>
            </div>
        `).join('');

        for (const a of items) {
            const card = container.querySelector(`.announcement-card[data-id="${a.id}"]`);
            if (!card) continue;

            card.querySelector('.btn-like-ann')?.addEventListener('click', async (e) => {
                if (!guardAction(e)) return;
                try {
                    const data = await api('api/announcements/like.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ announcement_id: Number(a.id) })
                    });
                    const icon = card.querySelector('.btn-like-ann i');
                    const countEl = card.querySelector('.ann-like-count');
                    icon.classList.toggle('fa-regular', data.status !== 'liked');
                    icon.classList.toggle('fa-solid', data.status === 'liked');
                    if (data.status === 'liked') { icon.style.color = '#e65100'; }
                    else { icon.style.color = ''; }
                    if (countEl) countEl.textContent = data.likes || 0;
                } catch (err) { console.error(err); }
            });

            card.querySelector('.btn-comment-toggle-ann')?.addEventListener('click', () => {
                const sec = card.querySelector('.comments-section');
                const isOpen = sec.style.display !== 'none';
                sec.style.display = isOpen ? 'none' : 'block';
                if (!isOpen) loadAnnouncementComments(a.id, card);
            });

            card.querySelector('.btn-add-ann-comment')?.addEventListener('click', (e) => {
                sendAnnComment(e.currentTarget);
            });

            card.querySelector('.ann-comment-input')?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') sendAnnComment(e.target.nextElementSibling);
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
                    const card = e.target.closest('.announcement-card');
                    const annId = card.dataset.id;
                    await api('api/announcements/comment.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ announcement_id: Number(annId), content: text, parent_id: Number(parentId) })
                    });
                    e.target.value = '';
                    loadAnnouncementComments(annId, card);
                } catch (err) { alert(err.message); }
            });
        }
    } catch (e) {
        console.error('Announcements load failed', e);
    }
}

async function loadAnnouncementComments(annId, card) {
    const list = card.querySelector(`#ann-comments-${annId}`);
    if (!list || list.dataset.loaded) return;
    try {
        const data = await api('api/announcements/comments.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ announcement_id: Number(annId) })
        });
        const comments = data.comments || [];
        list.innerHTML = comments.map(c => annCommentHTML(c)).join('');
        list.dataset.loaded = '1';
    } catch (e) {
        console.error('Failed to load comments', e);
    }
}

function annCommentHTML(comment, nested = false) {
    const replies = (comment.replies || []).map(r => annCommentHTML(r, true)).join('');
    const isOwner = currentUser && comment.author_id && String(comment.author_id) === String(currentUser.id);
    const isAdmin = isAdminUser() && !isOwner;
    const tools = [
        isOwner ? `<span class="comment-action btn-del-ann-comment" data-id="${comment.id}" title="Delete comment"><i class="fa-solid fa-trash"></i></span>` : '',
        isAdmin ? `<span class="comment-action admin-del-ann-comment" data-id="${comment.id}" title="Delete as administrator"><i class="fa-solid fa-shield-halved"></i></span>` : ''
    ].filter(Boolean).join('');
    return `
        <div class="comment-item ${nested ? 'comment-reply' : ''}" data-comment-id="${comment.id}" id="comment-${comment.id}">
            <img src="${mediaUrl(comment.avatar)}" alt="" class="avatar user-profile-link" data-user-id="${comment.author_id}" style="width:28px;height:28px;object-fit:cover;">
            <div class="comment-body" style="flex:1;">
                <div class="fw-600 text-sm"><a href="profile.html?id=${comment.author_id}" class="user-profile-link" data-user-id="${comment.author_id}">${escapeHTML(comment.author)}</a>${tools ? `<span class="comment-tools">${tools}</span>` : ''}</div>
                <div class="text-sm">${escapeHTML(comment.text || comment.content)}</div>
                <button type="button" class="btn-reply-comment text-primary text-sm" data-parent-id="${comment.id}" style="background:none;border:none;padding:0;margin-top:4px;">Reply</button>
                <div class="reply-box" style="display:none;margin-top:8px;">
                    <input type="text" class="form-control reply-input" placeholder="Write a reply..." style="font-size:13px;border-radius:16px;">
                </div>
                ${replies}
            </div>
        </div>`;
}

function sendAnnComment(btn) {
    const card = btn.closest('.announcement-card');
    const input = card.querySelector('.ann-comment-input');
    const text = input.value.trim();
    if (!text) return;
    if (!guardAction()) return;
    const annId = card.dataset.id;
    try {
        api('api/announcements/comment.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ announcement_id: Number(annId), content: text })
        }).then(() => {
            input.value = '';
            loadAnnouncementComments(annId, card);
            const countEl = card.querySelector('.ann-comment-count');
            if (countEl) countEl.textContent = Number(countEl.textContent) + 1;
            toast('Comment posted');
        }).catch(err => alert(err.message));
    } catch (err) { alert(err.message); }
}