document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
    await loadClubDetail();
    setupTabs();
});

// Load & render club data
async function loadClubDetail() {
    const params = new URLSearchParams(window.location.search);
    const clubId = parseInt(params.get('id'));

    let clubs = [];
    try {
        const res = await fetch('data/clubs.json');
        clubs = await res.json();
    } catch (e) {
        console.error('Failed to load clubs.json', e);
        document.getElementById('club-name').textContent = 'Club not found';
        return;
    }

    const club = clubs.find(c => c.id === clubId);
    if (!club) {
        document.getElementById('club-name').textContent = 'Club not found';
        return;
    }

    document.title = club.name + ' - UIU Social';

    renderClubHeader(club);
    renderPosts(club);
    renderActivities(club);
}

// Render header
function renderClubHeader(club) {
    const cover = document.getElementById('club-cover');
    cover.style.background = club.coverColor;
    cover.style.position = 'relative';

    if (club.icon) {
        document.getElementById('club-cover-icon-el').className = 'fa-solid ' + club.icon;
    }

    const avatarImg = document.getElementById('club-avatar-img');
    if (avatarImg) {
        avatarImg.src = club.image || ('assets/images/clubs/' + club.slug + '.png');
        avatarImg.alt = club.name + ' Logo';
    }

    document.getElementById('club-name').textContent = club.name;
    document.getElementById('club-category').textContent = club.category;
    document.getElementById('club-members').textContent = club.members.toLocaleString();
    document.getElementById('club-founded').textContent = club.founded;
    document.getElementById('club-about').textContent = club.about;

    const tagsEl = document.getElementById('club-tags');
    tagsEl.innerHTML = club.tags.map(tag =>
        '<span class="club-tag">' + tag + '</span>'
    ).join('');

    const joinBtn = document.getElementById('club-join-btn');
    joinBtn.addEventListener('click', () => {
        showModal(
            'Join ' + club.name + '?',
            'Are you sure you want to request membership in ' + club.name + '? The club admin will review your request.',
            () => {
                joinBtn.innerHTML = '<i class="fa-solid fa-check"></i> Requested';
                joinBtn.disabled = true;
                joinBtn.style.opacity = '0.7';
            }
        );
    });

    document.getElementById('club-share-btn').addEventListener('click', () => {
        showModal(
            'Share ' + club.name,
            'Sharing functionality will be available in the next version!',
            null
        );
    });
}

// Render posts
function renderPosts(club) {
    const postsContainer = document.getElementById('tab-posts');
    postsContainer.innerHTML = '';

    if (!club.recentPosts || club.recentPosts.length === 0) {
        postsContainer.innerHTML = '<div class="card text-center text-muted p-5"><p>No posts yet.</p></div>';
        return;
    }

    postsContainer.innerHTML +=
        '<div class="advisor-badge mb-3 user-profile-link" data-user-id="6" style="cursor:pointer;">' +
        '<i class="fa-solid fa-chalkboard-teacher"></i>' +
        '<div>' +
        '<div style="font-size:12px;color:var(--text-muted);font-weight:600;">FACULTY ADVISOR</div>' +
        '<div style="font-weight:600;font-size:14px;">' + club.advisor + '</div>' +
        '</div>' +
        '</div>';

    club.recentPosts.forEach((post, idx) => {
        const postHtml =
            '<div class="club-post-card">' +
            '<div class="club-post-header">' +
            '<img src="' + post.avatar + '" class="avatar user-profile-link" style="width:40px;height:40px;cursor:pointer;">' +
            '<div>' +
            '<div style="font-weight:600;font-size:14px;cursor:pointer;" class="user-profile-link">' + post.author + '</div>' +
            '<div style="font-size:12px;color:var(--text-muted);">' + post.time + ' • ' + club.name + '</div>' +
            '</div>' +
            '</div>' +
            '<p style="font-size:14px;color:var(--text-main);line-height:1.6;margin-bottom:4px;">' + post.content + '</p>' +
            '<div class="post-comments" id="comments-' + idx + '">' +
            '<p class="text-muted">No comments yet.</p>' +
            '</div>' +
            '<div class="club-post-actions">' +
            '<button class="club-post-action-btn" data-post="' + idx + '" data-action="like">' +
            '<i class="fa-regular fa-heart"></i> ' + post.likes +
            '</button>' +
            '<button class="club-post-action-btn" data-post="' + idx + '" data-action="comment">' +
            '<i class="fa-regular fa-comment"></i> ' + post.comments +
            '</button>' +
            '<button class="club-post-action-btn" data-action="share">' +
            '<i class="fa-regular fa-share-from-square"></i> Share' +
            '</button>' +
            '</div>' +
            '</div>';
        postsContainer.insertAdjacentHTML('beforeend', postHtml);
    });

    postsContainer.querySelectorAll('[data-action="like"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const icon = btn.querySelector('i');
            if (icon.classList.contains('fa-regular')) {
                icon.classList.replace('fa-regular', 'fa-solid');
                icon.style.color = 'var(--danger-color)';
                const num = parseInt(btn.textContent.trim()) + 1;
                btn.innerHTML = '<i class="fa-solid fa-heart" style="color:var(--danger-color);"></i> ' + num;
            }
        });
    });

    postsContainer.querySelectorAll('[data-action="comment"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const postIdx = btn.getAttribute('data-post');
            const commentContainer = document.getElementById('comments-' + postIdx);
            if (!commentContainer) return;

            let inputArea = commentContainer.querySelector('.comment-input');
            if (!inputArea) {
                inputArea = document.createElement('div');
                inputArea.className = 'comment-input';
                inputArea.innerHTML = `
                    <textarea placeholder='Add a comment...' style='width:100%;margin-top:4px;'></textarea>
                    <button class='btn btn-primary' style='margin-top:4px;'>Post</button>
                `;
                commentContainer.appendChild(inputArea);

                const textarea = inputArea.querySelector('textarea');
                const postBtn = inputArea.querySelector('button');
                postBtn.addEventListener('click', () => {
                    const text = textarea.value.trim();
                    if (text) {
                        const newComment = document.createElement('div');
                        newComment.className = 'single-comment';
                        newComment.textContent = text;
                        commentContainer.insertBefore(newComment, inputArea);

                        let count = parseInt(btn.textContent.trim().split(' ')[1]) || 0;
                        count += 1;
                        btn.innerHTML = '<i class="fa-regular fa-comment"></i> ' + count;
                        textarea.value = '';
                    }
                });
            } else {
                inputArea.style.display = inputArea.style.display === 'none' ? 'block' : 'none';
            }
        });
    });
}

// Render activities
function renderActivities(club) {
    const container = document.getElementById('tab-activities');
    const icons = ['fa-trophy', 'fa-laptop-code', 'fa-users', 'fa-calendar-check'];

    container.innerHTML = '';
    club.activities.forEach((activity, i) => {
        container.innerHTML +=
            '<div class="activity-item">' +
            '<div class="activity-icon">' +
            '<i class="fa-solid ' + (icons[i % icons.length]) + '"></i>' +
            '</div>' +
            '<div>' +
            '<div style="font-weight:600;font-size:14px;">' + activity + '</div>' +
            '<div style="font-size:12px;color:var(--text-muted);">Organized by ' + club.name + '</div>' +
            '</div>' +
            '</div>';
    });
}

// Setup tabs
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
        });
    });
}