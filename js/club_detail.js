document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
    await loadClubDetail();
    setupTabs();
});

let currentClubId = null;
let currentClub = null;
let postsLoaded = false;
let membersLoaded = false;

async function loadClubDetail() {
    const params = new URLSearchParams(window.location.search);
    currentClubId = parseInt(params.get('id'));
    if (!currentClubId) {
        document.getElementById('club-name').textContent = 'Club not found';
        return;
    }

    try {
        const data = await api(`api/clubs/get.php?id=${currentClubId}`);
        currentClub = data.club;
        renderClubHeader(currentClub);
        renderActivities(currentClub);
        await loadClubPosts();
    } catch (e) {
        console.error('Failed to load club details', e);
        document.getElementById('club-name').textContent = 'Club not found';
    }
}

function renderClubHeader(club) {
    document.title = club.name + ' - UIU Social';

    const cover = document.getElementById('club-cover');
    if (cover) {
        cover.style.background = club.coverColor || '#ccc';
        cover.style.position = 'relative';
    }

    if (club.icon) {
        const iconEl = document.getElementById('club-cover-icon-el');
        if (iconEl) iconEl.className = 'fa-solid ' + club.icon;
    }

    const avatarImg = document.getElementById('club-avatar-img');
    if (avatarImg) {
        avatarImg.src = mediaUrl(club.image || ('assets/images/clubs/' + club.slug + '.png'));
        avatarImg.alt = club.name + ' Logo';
    }

    document.getElementById('club-name').textContent = club.name;
    document.getElementById('club-category').textContent = club.category || 'Club';
    document.getElementById('club-members').textContent = club.members.toLocaleString();
    document.getElementById('club-founded').textContent = club.founded || 'Unknown';
    document.getElementById('club-about').textContent = club.about || 'No description provided.';

    const tagsEl = document.getElementById('club-tags');
    if (tagsEl && club.tags) {
        tagsEl.innerHTML = club.tags.map(tag =>
            '<span class="club-tag">' + escapeHTML(tag) + '</span>'
        ).join('');
    }

    const joinBtn = document.getElementById('club-join-btn');
    if (joinBtn) {
        if (club.membership && club.membership !== 'none') {
            if (club.membership === 'requested') {
                joinBtn.innerHTML = `
                    <div class="d-flex gap-2">
                        <button class="btn btn-outline" disabled><i class="fa-solid fa-clock"></i> Pending Approval</button>
                        <button class="btn btn-outline btn-cancel-join" id="club-cancel-join-btn"><i class="fa-solid fa-xmark"></i> Cancel Request</button>
                    </div>`;
                document.getElementById('club-cancel-join-btn')?.addEventListener('click', async (e) => {
                    if (!guardAction(e)) return;
                    showModal('Cancel Join Request?', 'Are you sure you want to cancel your join request?', async () => {
                        try {
                            await api('api/clubs/leave.php', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ club_id: currentClubId })
                            });
                            toast('Join request cancelled');
                            loadClubDetail();
                        } catch (err) { alert(err.message); }
                    });
                });
            } else {
                joinBtn.innerHTML = '<i class="fa-solid fa-check"></i> Joined';
                joinBtn.disabled = true;
                joinBtn.style.opacity = '0.7';
            }
        } else {
            joinBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Join Club';
            joinBtn.disabled = false;
            joinBtn.style.opacity = '1';

            joinBtn.addEventListener('click', async (e) => {
                if (!guardAction(e)) return;
                showModal(
                    'Join ' + club.name + '?',
                    'Are you sure you want to request membership in ' + club.name + '?',
                    async () => {
                        try {
                            await api('api/clubs/join.php', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ club_id: currentClubId })
                            });
                            joinBtn.innerHTML = '<i class="fa-solid fa-check"></i> Joined';
                            joinBtn.disabled = true;
                            joinBtn.style.opacity = '0.7';
                            toast('Successfully joined club');
                            loadClubDetail();
                        } catch (err) {
                            alert(err.message);
                        }
                    }
                );
            });
        }
    }

    const shareBtn = document.getElementById('club-share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            showModal(
                'Share ' + club.name,
                'Sharing functionality will be available in the next version!',
                null
            );
        });
    }
}

async function loadClubPosts() {
    const postsContainer = document.getElementById('tab-posts');
    if (!postsContainer || !currentClubId) return;

    const isAdmin = isAdminUser();
    const isManager = currentClub.is_manager;
    const canPost = isAdmin || isManager;

    let html = '';

    if (canPost) {
        html += `
            <div class="card mb-4" style="padding:20px;">
                <h4 style="font-size:14px; font-weight:600; margin-bottom:12px;">Create a Post</h4>
                <textarea id="club-post-input" class="form-control" rows="3" placeholder="Share something with your club..." style="font-size:14px;"></textarea>
                <button class="btn btn-primary btn-sm mt-2" id="club-post-btn"><i class="fa-solid fa-paper-plane"></i> Post</button>
            </div>
        `;
    }

    try {
        const data = await api(`api/clubs/get_posts.php?club_id=${currentClubId}`);
        const posts = data.posts || [];

        if (posts.length === 0) {
            html += '<div class="card text-center text-muted p-5"><i class="fa-regular fa-comments mb-3" style="font-size:2rem;"></i><p>No posts yet. Be the first to share something!</p></div>';
        } else {
            html += posts.map(post => renderClubPost(post)).join('');
        }
    } catch (e) {
        console.error('Failed to load posts', e);
        html += '<div class="card text-center text-muted p-5"><p>Failed to load posts.</p></div>';
    }

    postsContainer.innerHTML = html;
    postsLoaded = true;

    if (canPost) {
        const postBtn = document.getElementById('club-post-btn');
        if (postBtn) {
            postBtn.addEventListener('click', async () => {
                const input = document.getElementById('club-post-input');
                if (!input) return;
                const content = input.value.trim();
                if (!content) return;
                try {
                    const fd = new URLSearchParams();
                    fd.append('club_id', currentClubId);
                    fd.append('content', content);
                    await fetch('api/clubs/create_post.php', { method: 'POST', body: fd });
                    toast('Post created');
                    await loadClubPosts();
                } catch (err) {
                    toast(err.message);
                }
            });
        }
    }

    document.querySelectorAll('.club-post-like').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!guardAction(e)) return;
            const postId = btn.dataset.id;
            try {
                const data = await api('api/clubs/like_post.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ post_id: Number(postId) })
                });
                const icon = btn.querySelector('i');
                const countEl = btn.querySelector('.like-count');
                icon.className = data.status === 'liked' ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
                icon.style.color = data.status === 'liked' ? '#e65100' : '';
                if (countEl) countEl.textContent = data.likes;
            } catch (err) { console.error(err); }
        });
    });

    document.querySelectorAll('.club-post-comment-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const postId = btn.dataset.id;
            const section = document.querySelector('.club-post-comments[data-post-id="' + postId + '"]');
            if (section) {
                section.style.display = section.style.display === 'none' ? 'block' : 'none';
            }
        });
    });

    document.querySelectorAll('.club-comment-submit').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!guardAction(e)) return;
            const postId = btn.dataset.id;
            const section = document.querySelector('.club-post-comments[data-post-id="' + postId + '"]');
            if (!section) return;
            const input = section.querySelector('.club-comment-input');
            if (!input) return;
            const content = input.value.trim();
            if (!content) return;
            try {
                await api('api/clubs/comment.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ post_id: Number(postId), content })
                });
                toast('Comment added');
                await loadClubPosts();
            } catch (err) {
                toast(err.message);
            }
        });
    });
}

function renderClubPost(post) {
    const isAdmin = isAdminUser();
    const isOwner = currentUser && String(post.author_id) === String(currentUser.id);
    const canManageClub = isAdmin || isOwner || currentClub?.is_manager;
    let commentsHtml = '';
    if (post.comments && post.comments.length > 0) {
        commentsHtml = post.comments.map(c => `
            <div style="display:flex; gap:8px; margin-bottom:8px; padding:8px; background:var(--bg-body); border-radius:6px;" class="comment-item" data-comment-id="${c.id}">
                <img src="${mediaUrl(c.author_avatar || 'assets/images/students/default.png')}" alt="" class="avatar" style="width:28px; height:28px; flex-shrink:0;">
                <div style="flex:1;">
                    <div style="font-size:12px; font-weight:600;">
                        ${escapeHTML(c.author)}
                        ${canManageClub ? `<span class="club-comment-del comment-action ${isAdmin && !isOwner ? 'admin-del-club-comment' : 'del-club-comment'}" data-id="${c.id}" title="Delete comment" style="cursor:pointer;"><i class="fa-solid ${isAdmin && !isOwner ? 'fa-shield-halved' : 'fa-trash'}"></i></span>` : ''}
                    </div>
                    <div style="font-size:13px; color:var(--text-main);">${escapeHTML(c.content)}</div>
                </div>
            </div>
        `).join('');
    }

    return `
        <div class="card club-post-card mb-4" data-id="${post.id}" style="padding:20px;">
            <div style="display:flex; gap:12px; margin-bottom:12px;">
                <img src="${mediaUrl(post.author_avatar || 'assets/images/students/default.png')}" alt="" class="avatar" style="width:40px; height:40px; flex-shrink:0;">
                <div style="flex:1;">
                    <div style="font-weight:600; font-size:14px;">${escapeHTML(post.author)} <span style="font-size:11px; color:var(--text-muted); font-weight:400;">${escapeHTML(post.role)}</span></div>
                    <div style="font-size:12px; color:var(--text-muted);">${post.time}</div>
                </div>
                ${canManageClub ? `<span class="club-post-del post-stat ${isAdmin && !isOwner ? 'admin-del-club-post' : 'del-club-post'}" data-id="${post.id}" title="Delete post" style="cursor:pointer;"><i class="fa-solid ${isAdmin && !isOwner ? 'fa-shield-halved' : 'fa-trash'}"></i>${isAdmin && !isOwner ? ' <i class="fa-solid fa-trash"></i>' : ''}</span>` : ''}
            </div>
            <p style="font-size:14px; line-height:1.5; margin-bottom:12px;">${escapeHTML(post.content)}</p>
            <div style="display:flex; gap:16px; color:var(--text-muted); font-size:13px;">
                <span class="club-post-like" data-id="${post.id}" style="cursor:pointer;">
                    <i class="${post.liked ? 'fa-solid' : 'fa-regular'} fa-heart" style="${post.liked ? 'color:#e65100;' : ''}"></i> <span class="like-count">${post.likes}</span>
                </span>
                <span class="club-post-comment-toggle" data-id="${post.id}" style="cursor:pointer;">
                    <i class="fa-regular fa-comment"></i> <span class="comment-count">${post.comments_count}</span>
                </span>
            </div>
            <div class="club-post-comments mt-3" data-post-id="${post.id}" style="display:none;">
                <div style="margin-bottom:12px;">${commentsHtml}</div>
                <div>
                    <input type="text" class="form-control club-comment-input" placeholder="Write a comment..." style="font-size:13px; padding:8px 12px;">
                    <button class="btn btn-primary btn-sm mt-1 club-comment-submit" data-id="${post.id}"><i class="fa-solid fa-paper-plane"></i> Reply</button>
                </div>
            </div>
        </div>
    `;
}

function renderActivities(club) {
    const container = document.getElementById('tab-activities');
    if (!container || !club.activities) return;

    const icons = ['fa-trophy', 'fa-laptop-code', 'fa-users', 'fa-calendar-check'];
    container.innerHTML = '';

    if (club.activities.length === 0) {
        container.innerHTML = '<div class="text-muted p-3">No activities listed.</div>';
        return;
    }

    club.activities.forEach((activity, i) => {
        container.innerHTML +=
            '<div class="activity-item">' +
            '<div class="activity-icon">' +
            '<i class="fa-solid ' + (icons[i % icons.length]) + '"></i>' +
            '</div>' +
            '<div>' +
            '<div style="font-weight:600;font-size:14px;">' + escapeHTML(activity) + '</div>' +
            '<div style="font-size:12px;color:var(--text-muted);">Organized by ' + escapeHTML(club.name) + '</div>' +
            '</div>' +
            '</div>';
    });
}

function setupTabs() {
    const tabs = document.querySelectorAll('.profile-tabs .tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const tabName = tab.dataset.tab;
            document.getElementById('tab-posts').style.display = 'none';
            document.getElementById('tab-members').style.display = 'none';
            document.getElementById('tab-activities').style.display = 'none';
            document.getElementById('tab-' + tabName).style.display = 'block';

            if (tabName === 'posts' && currentClubId && !postsLoaded) {
                loadClubPosts();
            }
            if (tabName === 'members' && currentClubId && !membersLoaded) {
                loadClubMembers();
            }
        });
    });
}

async function loadClubMembers() {
    const container = document.getElementById('tab-members');
    if (!container) return;
    
    try {
        const data = await api(`api/clubs/members.php?id=${currentClubId}`);
        const club = data.club;
        const members = club.members || [];
        const isManager = currentClub.is_manager;
        
        if (members.length === 0) {
            container.innerHTML = '<div class="text-center text-muted p-5"><i class="fa-solid fa-users mb-3" style="font-size:2rem;"></i><p>No members yet.</p></div>';
            return;
        }
        
        container.innerHTML = `
            <div class="card p-4">
                <h4>Club Members</h4>
                <div id="club-members-list" class="mt-3"></div>
            </div>
        `;
        
        const listContainer = document.getElementById('club-members-list');
        listContainer.innerHTML = members.map(m => `
            <div class="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                <div class="d-flex align-items-center gap-2">
                    <img src="${mediaUrl(m.avatar)}" class="avatar user-profile-link" data-user-id="${m.id}" style="width:36px;height:36px;object-fit:cover;">
                    <div>
                        <div class="fw-600 user-profile-link" data-user-id="${m.id}">${escapeHTML(m.name)}</div>
                        <div class="text-sm text-muted">${m.member_role === 'owner' ? 'Owner' : (m.member_role === 'admin' ? 'Admin' : 'Member')}</div>
                    </div>
                </div>
                ${isManager && m.member_role !== 'owner' && m.member_role !== 'admin' ? `<button class="btn btn-outline btn-sm" onclick="kickClubMember(${m.id})">Remove</button>` : ''}
            </div>
        `).join('');
        
        membersLoaded = true;
    } catch (e) {
        console.error('Failed to load club members', e);
        container.innerHTML = '<div class="text-center text-muted p-5">Failed to load members.</div>';
    }
}

window.kickClubMember = async function(userId) {
    if (!guardAction()) return;
    showModal('Remove Member?', 'Are you sure you want to remove this member from the club?', async () => {
        try {
            await api('api/clubs/kick.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ club_id: currentClubId, user_id: userId })
            });
            toast('Member removed');
            loadClubMembers();
        } catch (e) { alert(e.message); }
    });
};
