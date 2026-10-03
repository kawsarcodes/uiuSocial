let currentView = "home";

document.addEventListener("DOMContentLoaded", async () => {
    await initApp();
    if (document.getElementById('chat-messages-container') && typeof initMessages === 'function') {
        initMessages();
    }
    if (document.querySelector('.auth-tab') && typeof initLogin === 'function') {
        initLogin();
    }

    if (document.getElementById('profile-view-container') && typeof initProfile === 'function') {
        initProfile();
    }

    if (typeof setupLocalStorage === 'function') setupLocalStorage();
    if (typeof setupHeaderTabs === 'function') setupHeaderTabs();
    if (typeof setupSearch === 'function') setupSearch();

    if (document.getElementById("main-view-container")) {
        renderView("home");
    }

    if (typeof setupGlobalAvatarClicks === 'function') setupGlobalAvatarClicks();
});

// Setup localStorage
function setupLocalStorage() {
    if (!localStorage.getItem('uiu_reports')) {
        localStorage.setItem('uiu_reports', JSON.stringify([]));
    }
}

// Setup header tabs
function setupHeaderTabs() {
    const tabs = document.querySelectorAll(".header-nav-tabs .tab");
    if (!tabs.length) return;
    tabs.forEach(tab => {
        tab.addEventListener("click", (e) => {
            e.preventDefault();
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            const view = tab.getAttribute("data-view");
            renderView(view);
        });
    });
}

// Render view
function renderView(viewName) {
    currentView = viewName;
    const container = document.getElementById("main-view-container");
    const rightSidebar = document.getElementById("right-sidebar");

    if (viewName === "home") {
        if (rightSidebar) rightSidebar.style.display = "block";
        container.innerHTML = getHomeViewHTML();
        renderPosts();
        setupCreatePost();
    } else if (viewName === "people") {
        if (rightSidebar) rightSidebar.style.display = "none";
        container.innerHTML = getPeopleViewHTML();
        setTimeout(() => {
            initializePeopleView();
        }, 0);
    }
}

// Home view HTML
function getHomeViewHTML() {
    return `
        <div class="feed-section">
            <div class="card create-post-card mb-3">
                <div class="d-flex gap-2 mb-2">
                    <img src="${window.currentUser ? mediaUrl(window.currentUser.avatar) : "assets/images/students/default.png"}" alt="User" class="avatar">
                    <input type="text" class="post-input" placeholder="What's on your mind?">
                </div>

                <div id="image-preview-container" class="mb-2" style="display: none; position: relative;">
                    <img id="image-preview" src="" alt="Preview" style="max-height: 220px; width: 100%; object-fit: cover; border-radius: 8px;">
                    <button id="remove-image-btn" type="button" style="position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.6); color: #fff; border: none; border-radius: 50%; width: 26px; height: 26px; cursor: pointer;">&times;</button>
                </div>

                <div class="post-actions d-flex justify-content-between align-items-center">
                    <div class="d-flex gap-2">
                        <input type="file" id="media-upload-input" accept="image/*" style="display: none;">
                        <button type="button" class="btn btn-action" id="media-btn"><i class="fa-regular fa-image" style="margin-right: 6px;"></i> Media</button>
                    </div>
                    <button type="button" class="btn btn-primary" id="submit-post-btn">Post</button>
                </div>
            </div>

            <div class="recent-activity-divider mb-3 text-muted text-sm fw-600">
                <span>Recent Activity</span>
            </div>

            <div id="posts-container"></div>
        </div>
    `;
}

// Render posts
async function renderPosts(filterKeyword = "") {
    const postsContainer = document.getElementById("posts-container");
    if (!postsContainer) return;
    window.reloadPosts = () => renderPosts(filterKeyword);
    postsContainer.innerHTML = '<div class="text-center text-muted p-3"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>';
    try {
        const data = await api('api/posts/get_posts.php');
        const posts = (data.posts || []).filter(post =>
            !filterKeyword ||
            (post.content || '').toLowerCase().includes(filterKeyword.toLowerCase()) ||
            (post.author || '').toLowerCase().includes(filterKeyword.toLowerCase())
        );
        postsContainer.innerHTML = posts.length ? '' : '<div class="text-center text-muted p-4">No posts yet. Be the first to post!</div>';
        posts.forEach(post => postsContainer.insertAdjacentHTML('beforeend', postCardHTML(post)));
        bindPostInteractions(postsContainer);
        if (typeof scrollToHashTarget === 'function') scrollToHashTarget();
    } catch (e) {
        console.error("Error loading posts:", e);
        postsContainer.innerHTML = '<div class="text-center text-muted">Failed to load posts.</div>';
    }
}

// Setup create post
function setupCreatePost() {
    const postInput = document.querySelector(".post-input");
    const postBtn = document.querySelector("#submit-post-btn");
    const mediaBtn = document.querySelector("#media-btn");
    const mediaInput = document.querySelector("#media-upload-input");
    const previewContainer = document.querySelector("#image-preview-container");
    const previewImage = document.querySelector("#image-preview");
    const removeImageBtn = document.querySelector("#remove-image-btn");

    let uploadedBase64Image = null;

    if (!postInput || !postBtn) return;

    if (mediaBtn && mediaInput) {
        mediaBtn.addEventListener("click", () => mediaInput.click());

        mediaInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (event) {
                    uploadedBase64Image = event.target.result;
                    previewImage.src = uploadedBase64Image;
                    previewContainer.style.display = "block";
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (removeImageBtn) {
        removeImageBtn.addEventListener("click", () => {
            uploadedBase64Image = null;
            mediaInput.value = "";
            previewContainer.style.display = "none";
            previewImage.src = "";
        });
    }

    postBtn.addEventListener("click", async (e) => {
        if (!guardAction(e)) return;
        const text = postInput.value.trim();

        if (!text && !uploadedBase64Image && !(mediaInput && mediaInput.files[0])) {
            alert("Please enter text or upload an image to post.");
            return;
        }

        const formData = new FormData();
        formData.append('content', text);
        if (mediaInput && mediaInput.files[0]) {
            formData.append('image', mediaInput.files[0]);
        } else if (uploadedBase64Image) {
            formData.append('image_url', uploadedBase64Image);
        }

        postBtn.disabled = true;
        postBtn.textContent = 'Posting...';
        try {
            await api('api/posts/create_post.php', { method: 'POST', body: formData });
            postInput.value = '';
            uploadedBase64Image = null;
            if (mediaInput) mediaInput.value = '';
            if (previewContainer) previewContainer.style.display = 'none';
            if (previewImage) previewImage.src = '';
            renderPosts();
            toast('Post created!');
        } catch (err) {
            alert(err.message || 'Failed to create post');
        } finally {
            postBtn.disabled = false;
            postBtn.textContent = 'Post';
        }
    });

    document.querySelectorAll('.btn, .btn-outline').forEach(btn => {
        if (btn.innerText.trim() === 'Join Event' || btn.innerText.trim() === 'Join') {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                if (this.innerText === 'Joined') {
                    this.innerText = btn.dataset.originalText || 'Join';
                    this.style.backgroundColor = '';
                    this.style.color = '';
                } else {
                    this.dataset.originalText = this.innerText;
                    this.innerText = 'Joined';
                    this.style.backgroundColor = 'var(--primary-color)';
                    this.style.color = 'white';
                    this.style.borderColor = 'var(--primary-color)';
                }
            });
        }
    });
}

// Setup global avatar clicks
function setupGlobalAvatarClicks() {
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('avatar')) {
            const src = e.target.getAttribute('src');
            if (src) {
                const user = globalUsers.find(u => u.avatar === src);
                if (user) {
                    window.location.href = 'profile.html?id=' + user.id;
                } else if (e.target.dataset.userId) {
                    window.location.href = 'profile.html?id=' + e.target.dataset.userId;
                }
            }
        }
    });
}

// Init profile
function initProfile() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');
    const user = globalUsers.find(u => u.id === userId);

    if (user) {
        document.getElementById('profile-avatar').src = user.avatar;
        document.getElementById('profile-name').innerText = user.name;
        document.getElementById('profile-role').innerText = user.role;
        document.getElementById('profile-dept').innerText = user.department;
        document.getElementById('profile-about').innerText = user.about;

        if (user.faculty) {
            document.getElementById('profile-badges').innerHTML = '<span class="badge faculty" style="background: var(--primary-color); color: white;">FACULTY</span>';
        } else {
            document.getElementById('profile-badges').innerHTML = '<span class="badge student" style="background: var(--primary-color); color: white;">STUDENT</span>';
        }
    }
}

function getPeopleViewHTML() {
    return `
        <div class="people-section w-100">
            <h3 class="mb-3">People in UIU Social</h3>
            <div class="row" id="people-container" style="display: flex; flex-wrap: wrap; gap: 16px;"></div>
        </div>
    `;
}

async function initializePeopleView() {
    const container = document.getElementById("people-container");
    if (!container) return;
    try {
        const data = await api("api/users/list.php");
        const users = data.users.filter(u => u.connection !== "self");
        
        users.sort((a, b) => {
            if (a.connection === "incoming" && b.connection !== "incoming") return -1;
            if (a.connection !== "incoming" && b.connection === "incoming") return 1;
            return 0;
        });

        container.innerHTML = users.map(user => {
            let actionBtn = "";
            if (user.connection === "incoming") {
                actionBtn = `
                    <div class="d-flex gap-2 w-100 mt-2">
                        <button class="btn btn-primary flex-fill btn-sm btn-respond" data-id="${user.id}" data-action="accept">Accept</button>
                        <button class="btn btn-outline flex-fill btn-sm btn-respond" data-id="${user.id}" data-action="reject">Decline</button>
                    </div>
                `;
            } else if (user.connection === "sent") {
                actionBtn = `
                    <div class="d-flex gap-2 w-100 mt-2">
                        <button class="btn btn-pending btn-outline flex-fill btn-sm" disabled style="background:#f8f9fa;" data-id="${user.id}">Pending</button>
                        <button class="btn btn-cancel btn-outline flex-fill btn-sm" data-id="${user.id}" style="background:#dc3545 !important;border-color:#dc3545 !important;color:#fff !important;"><i class="fa-solid fa-xmark"></i> Cancel</button>
                    </div>
                `;
            } else if (user.connection === "connected") {
                actionBtn = `
                    <div class="d-flex gap-2 w-100 mt-2">
                        <button class="btn btn-connected flex-fill btn-sm" data-id="${user.id}" style="background:#28a745 !important;border-color:#28a745 !important;color:#fff !important;">Connected</button>
                        <button class="btn btn-remove flex-fill btn-sm" data-id="${user.id}" style="background:#dc3545 !important;border-color:#dc3545 !important;color:#fff !important;"><i class="fa-solid fa-trash"></i> Remove</button>
                    </div>
                `;
            } else {
                actionBtn = `<button class="btn btn-primary w-100 mt-2 btn-sm btn-connect" data-id="${user.id}"><i class="fa-solid fa-user-plus"></i> Connect</button>`;
            }

            return `
                <div class="card p-3 text-center" style="width: calc(33.333% - 11px); min-width: 200px;">
                    <img src="${mediaUrl(user.avatar)}" class="avatar mb-2 mx-auto user-profile-link" data-user-id="${user.id}" style="width: 80px; height: 80px; cursor: pointer; object-fit: cover;">
                    <div class="fw-600 text-truncate"><a href="profile.html?id=${user.id}" class="user-profile-link text-dark" data-user-id="${user.id}" style="text-decoration: none;">${escapeHTML(user.name)}</a></div>
                    <div class="text-muted text-sm text-truncate">${escapeHTML(user.department)}</div>
                    ${actionBtn}
                </div>
            `;
        }).join("");

        container.querySelectorAll(".btn-connect").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                if (!guardAction(e)) return;
                const id = btn.dataset.id;
                try {
                    await api("api/connections/send.php", {
                        method: "POST", headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({user_id: id})
                    });
                    toast("Connection request sent");
                    initializePeopleView();
                } catch (err) { alert(err.message); }
            });
        });

        container.querySelectorAll(".btn-respond").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                if (!guardAction(e)) return;
                const id = btn.dataset.id;
                const action = btn.dataset.action;
                try {
                    await api("api/connections/respond.php", {
                        method: "POST", headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({user_id: id, action: action})
                    });
                    toast(action === "accept" ? "Connection accepted" : "Request declined");
                    initializePeopleView();
                } catch (err) { alert(err.message); }
            });
        });

        container.querySelectorAll(".btn-cancel").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                if (!guardAction(e)) return;
                const id = btn.dataset.id;
                try {
                    await api("api/connections/remove.php", {
                        method: "POST", headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({user_id: id})
                    });
                    toast("Connection request cancelled");
                    initializePeopleView();
                } catch (err) { alert(err.message); }
            });
        });

        container.querySelectorAll(".btn-remove").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                if (!guardAction(e)) return;
                const id = btn.dataset.id;
                if (!confirm("Remove this connection?")) return;
                try {
                    await api("api/connections/remove.php", {
                        method: "POST", headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({user_id: id})
                    });
                    toast("Connection removed");
                    initializePeopleView();
                } catch (err) { alert(err.message); }
            });
        });

    } catch (e) {
        container.innerHTML = "<div class=\"text-center text-muted w-100\">Failed to load people.</div>";
    }
}