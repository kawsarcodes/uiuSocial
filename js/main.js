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

    setupReportModal();
});

// Setup localStorage
function setupLocalStorage() {
    if (!localStorage.getItem("uiu_posts")) {
        const initialPosts = [
            {
                id: 1,
                author: "Rafid Nahiyan Farabi",
                role: "FACULTY",
                dept: "CSE",
                time: "2h ago",
                avatar: "/assets/images/faculties/nahiyan-farabi.png?img=15",
                content: "The registration for the upcoming Departmental Cybersecurity & Network Security Seminar is now officially open for all final-year students. Please ensure you secure your spot through the portal before Friday.",
                image: "/assets/images/post-img/cyber-security.png",
                likes: 124,
                liked: false,
                comments: [
                    {
                        id: 101,
                        author: "Mahmudul Hasan Emon",
                        avatar: "/assets/images/students/emon.png?img=20",
                        text: "Thank you sir! Is registration open for 3rd-year students as well?"
                    },
                    {
                        id: 102,
                        author: "Rafid Nahiyan Farabi",
                        avatar: "/assets/images/faculties/nahiyan-farabi.png?img=15",
                        text: "Currently it is restricted to final-year students only. If seats remain open after Thursday, we will extend it to 3rd-year students."
                    },
                    {
                        id: 103,
                        author: "Molla Nabil Basar",
                        avatar: "/assets/images/students/nabil.png?img=20",
                        text: "Can EEE students join this seminar if seats are available?"
                    }
                ]
            },
            {
                id: 2,
                author: "Kawsar Ahmed",
                role: "STUDENT",
                dept: "CSE",
                time: "4h ago",
                avatar: "/assets/images/students/kawsar.png?img=33",
                content: "Does anyone have the notes from the Web Programming lecture this morning? My laptop decided to update right as the teacher started.",
                image: null,
                likes: 42,
                liked: false,
                comments: [
                    {
                        id: 104,
                        author: "Mahmudul Hasan Emon",
                        avatar: "/assets/images/students/emon.png?img=20",
                        text: "I wrote down the key points on Express.js routing. Check your inbox, I just sent the PDF."
                    },
                    {
                        id: 105,
                        author: "Kawsar Ahmed",
                        avatar: "/assets/images/students/kawsar.png?img=33",
                        text: "Got it! Thanks a lot man, saved my day."
                    }
                ]
            },
            {
                id: 3,
                author: "Avijit Saha",
                role: "STUDENT",
                dept: "CSE",
                time: "5h ago",
                avatar: "/assets/images/students/avijit.png?img=15",
                content: "Reminder for CSE 3rd year students: The deadline for submitting your Database Management Systems lab report has been extended to Sunday night.",
                image: null,
                likes: 58,
                liked: false,
                comments: [
                    {
                        id: 106,
                        author: "Mahmudul Hasan Emon",
                        avatar: "/assets/images/students/emon.png?img=20",
                        text: "Thank you so much sir! This extension really helps with our ongoing midterms."
                    },
                    {
                        id: 107,
                        author: "Avijit Saha",
                        avatar: "/assets/images/students/avijit.png?img=15",
                        text: "You're welcome. Make sure the ER diagrams are clearly drawn in the appendix section."
                    }
                ]
            },
            {
                id: 4,
                author: "Mahmudul Hasan Emon",
                role: "STUDENT",
                dept: "CSE",
                time: "6h ago",
                avatar: "/assets/images/students/emon.png?img=20",
                content: "Looking for team members for the upcoming Hackathon! Need someone with good knowledge of Tailwind CSS and ReactJS. DM me if interested.",
                image: null,
                likes: 19,
                liked: false,
                comments: [
                    {
                        id: 108,
                        author: "Molla Nabil Basar",
                        avatar: "/assets/images/students/nabil.png?img=20",
                        text: "I work mostly on backend (Node.js), but let me know if you need someone on the server side!"
                    },
                    {
                        id: 109,
                        author: "Mahmudul Hasan Emon",
                        avatar: "/assets/images/students/emon.png?img=20",
                        text: "That works great! Sent you a message."
                    }
                ]
            },
            {
                id: 5,
                author: "Molla Nabil Basar",
                role: "STUDENT",
                dept: "EEE",
                time: "8h ago",
                avatar: "/assets/images/students/nabil.png?img=20",
                content: "Anyone in the EEE lab right now? Left my digital multimeter near workbench 4, please let me know if anyone spotted it.",
                image: null,
                likes: 8,
                liked: false,
                comments: [
                    {
                        id: 110,
                        author: "Tamim Al Mitul",
                        avatar: "/assets/images/students/mitul.png?img=20",
                        text: "Saw a red multimeter at the lab attendant desk a few minutes ago. Might want to check there!"
                    },
                    {
                        id: 111,
                        author: "Molla Nabil Basar",
                        avatar: "/assets/images/students/nabil.png?img=20",
                        text: "Found it at the desk, thanks Tamim!"
                    }
                ]
            },
            {
                id: 6,
                author: "Tamim Al Mitul",
                role: "STUDENT",
                dept: "BBA",
                time: "12h ago",
                avatar: "/assets/images/students/mitul.png?img=20",
                content: "The annual BBA Business Case Competition registration is closing tomorrow. Make sure your teams submit the executive summary on time!",
                image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=80",
                likes: 87,
                liked: false,
                comments: [
                    {
                        id: 112,
                        author: "Mahmudul Hasan Emon",
                        avatar: "/assets/images/students/emon.png?img=20",
                        text: "Are inter-departmental teams allowed this year?"
                    },
                    {
                        id: 113,
                        author: "Tamim Al Mitul",
                        avatar: "/assets/images/students/mitul.png?img=20",
                        text: "Yes! Each team must have at least one BBA student, but other members can be from CSE or EEE."
                    }
                ]
            },
            {
                id: 7,
                author: "Rafid Nahiyan Farabi",
                role: "FACULTY",
                dept: "CSE",
                time: "1d ago",
                avatar: "/assets/images/faculties/nahiyan-farabi.png?img=15",
                content: "Office hours for this week have been rescheduled to Thursday from 2:00 PM to 4:00 PM. Drop by if you need assistance with your capstone project proposals.",
                image: null,
                likes: 34,
                liked: false,
                comments: [
                    {
                        id: 114,
                        author: "Molla Nabil Basar",
                        avatar: "/assets/images/students/nabil.png?img=20",
                        text: "Sir, should we bring a printed draft of our proposal?"
                    },
                    {
                        id: 115,
                        author: "Rafid Nahiyan Farabi",
                        avatar: "/assets/images/faculties/nahiyan-farabi.png?img=15",
                        text: "Yes, bringing a printed draft or having it ready on your laptop will speed things up."
                    }
                ]
            },
            {
                id: 8,
                author: "Avijit Saha",
                role: "STUDENT",
                dept: "CSE",
                time: "1d ago",
                avatar: "/assets/images/students/avijit.png?img=15",
                content: "Great energy at today's Web Architecture workshop! Remember to review the REST API design guidelines before next week's practical session.",
                image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
                likes: 95,
                liked: false,
                comments: [
                    {
                        id: 116,
                        author: "Kawsar Ahmed",
                        avatar: "/assets/images/students/kawsar.png?img=33",
                        text: "The slide on middleware pattern was really clear. Will the presentation slides be uploaded to the portal?"
                    },
                    {
                        id: 117,
                        author: "Avijit Saha",
                        avatar: "/assets/images/students/avijit.png?img=15",
                        text: "Yes, I uploaded the deck to the course portal under Module 4."
                    }
                ]
            },
            {
                id: 9,
                author: "Mahmudul Hasan Emon",
                role: "STUDENT",
                dept: "CSE",
                time: "2d ago",
                avatar: "/assets/images/students/emon.png?img=20",
                content: "Late-night coding setup for the weekend hackathon prep. React and Tailwind form a fantastic combination for building UI fast!",
                image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80",
                likes: 67,
                liked: false,
                comments: [
                    {
                        id: 118,
                        author: "Tamim Al Mitul",
                        avatar: "/assets/images/students/mitul.png?img=20",
                        text: "Clean setup! What font family are you using in VS Code?"
                    },
                    {
                        id: 119,
                        author: "Mahmudul Hasan Emon",
                        avatar: "/assets/images/students/emon.png?img=20",
                        text: "That is JetBrains Mono with ligatures enabled!"
                    }
                ]
            },
            {
                id: 10,
                author: "Molla Nabil Basar",
                role: "STUDENT",
                dept: "EEE",
                time: "2d ago",
                avatar: "/assets/images/students/nabil.png?img=20",
                content: "Finally completed the IoT sensor node assembly in the robotics lab. Temperature and humidity readings are streaming smoothly to MQTT.",
                image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
                likes: 51,
                liked: false,
                comments: [
                    {
                        id: 120,
                        author: "Rafid Nahiyan Farabi",
                        avatar: "/assets/images/faculties/nahiyan-farabi.png?img=15",
                        text: "Nice work Nabil! Ensure you record power consumption metrics during active transmission."
                    }
                ]
            },
            {
                id: 11,
                author: "Kawsar Ahmed",
                role: "STUDENT",
                dept: "CSE",
                time: "3d ago",
                avatar: "/assets/images/students/kawsar.png?img=33",
                content: "Campus library is surprisingly peaceful this evening. Ideal environment to finish up algorithms reading.",
                image: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80",
                likes: 73,
                liked: false,
                comments: [
                    {
                        id: 121,
                        author: "Molla Nabil Basar",
                        avatar: "/assets/images/students/nabil.png?img=20",
                        text: "Is the 3rd floor quiet zone open past 8 PM today?"
                    },
                    {
                        id: 122,
                        author: "Kawsar Ahmed",
                        avatar: "/assets/images/students/kawsar.png?img=33",
                        text: "Yes, open until 10 PM throughout midterm week."
                    }
                ]
            }

        ];
        localStorage.setItem("uiu_posts", JSON.stringify(initialPosts));
    }

    if (!localStorage.getItem("uiu_reports")) {
        localStorage.setItem("uiu_reports", JSON.stringify([]));
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
        setupInteractions();
    } else if (viewName === "discover") {
        if (rightSidebar) rightSidebar.style.display = "block";
        container.innerHTML = getDiscoverViewHTML();
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
                    <img src="/assets/images/students/kawsar.png?img=11" alt="User" class="avatar">
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
function renderPosts(filterKeyword = "") {
    const postsContainer = document.getElementById("posts-container");
    if (!postsContainer) return;
    const posts = JSON.parse(localStorage.getItem("uiu_posts")) || [];

    postsContainer.innerHTML = "";

    const filteredPosts = posts.filter(post =>
        post.content.toLowerCase().includes(filterKeyword.toLowerCase()) ||
        post.author.toLowerCase().includes(filterKeyword.toLowerCase())
    );

    filteredPosts.forEach(post => {
        const postElement = document.createElement("div");
        postElement.className = "card post-card mb-3";
        postElement.setAttribute("data-id", post.id);

        const badgeClass = post.role === "FACULTY" ? "faculty" : "student";
        const imageHTML = post.image ? `<img src="${post.image}" alt="Post Image" class="post-image mt-2">` : "";

        const commentsListHTML = (post.comments || []).map(comment => `
            <div class="comment-item d-flex gap-2 mt-2 align-items-start">
                <img src="${comment.avatar}" alt="User" class="avatar" style="width: 28px; height: 28px;">
                <div class="comment-body">
                    <div class="fw-600 text-sm">${escapeHTML(comment.author)}</div>
                    <div class="text-sm">${escapeHTML(comment.text)}</div>
                </div>
            </div>
        `).join("");

        postElement.innerHTML = `
            <div class="post-header justify-content-between d-flex">
                <div class="d-flex gap-2">
                    <img src="${post.avatar}" alt="User" class="avatar">
                    <div>
                        <div class="post-author fw-600">${post.author} <span class="badge ${badgeClass}">${post.role}</span></div>
                        <div class="post-meta text-muted text-sm">${post.dept} • ${post.time}</div>
                    </div>
                </div>
                <i class="fa-solid fa-flag text-muted action-flag" style="cursor: pointer;" title="Report this post"></i>
            </div>
            <div class="post-content mt-2">
                <p class="m-0">${escapeHTML(post.content)}</p>
                ${imageHTML}
            </div>
            <div class="post-footer mt-3 d-flex justify-content-between align-items-center">
                <div class="d-flex gap-3">
                    <span class="post-stat btn-like ${post.liked ? 'text-primary' : ''}" style="cursor: pointer;">
                        <i class="${post.liked ? 'fa-solid' : 'fa-regular'} fa-thumbs-up"></i> 
                        <span class="like-count">${post.likes}</span>
                    </span>
                    <span class="post-stat btn-comment-toggle" style="cursor: pointer;">
                        <i class="fa-regular fa-comment"></i> 
                        <span class="comment-count">${(post.comments || []).length}</span>
                    </span>
                </div>
                <i class="fa-solid fa-share-nodes text-muted btn-share" style="cursor: pointer;"></i>
            </div>

            <div class="comments-section mt-3 pt-3 border-top" style="display: block;">
                <div class="comments-list">
                    ${commentsListHTML}
                </div>
                <div class="d-flex gap-2 mt-3">
                    <img src="/assets/images/students/kawsar.png?img=11" alt="User" class="avatar" style="width: 32px; height: 32px;">
                    <input type="text" class="form-control comment-input" placeholder="Write a comment..." style="font-size: 14px; border-radius: 20px;">
                    <button type="button" class="btn btn-primary btn-add-comment btn-sm" style="border-radius: 20px; padding: 4px 14px;">Send</button>
                </div>
            </div>
        `;

        postsContainer.appendChild(postElement);
    });
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

    postBtn.addEventListener("click", () => {
        const text = postInput.value.trim();

        if (!text && !uploadedBase64Image) {
            alert("Please enter text or upload an image to post.");
            return;
        }

        const posts = JSON.parse(localStorage.getItem("uiu_posts")) || [];

        const newPost = {
            id: Date.now(),
            author: "Current User",
            role: "STUDENT",
            time: "Just now",
            avatar: "/assets/images/students/kawsar.png?img=11",
            content: text,
            image: uploadedBase64Image,
            likes: 0,
            liked: false,
            comments: []
        };

        posts.unshift(newPost);
        localStorage.setItem("uiu_posts", JSON.stringify(posts));

        postInput.value = "";
        uploadedBase64Image = null;
        if (mediaInput) mediaInput.value = "";
        if (previewContainer) previewContainer.style.display = "none";

        renderPosts();
    });
}

// Setup interactions
function setupInteractions() {
    const feedSection = document.querySelector(".feed-section");
    if (!feedSection) return;

    feedSection.addEventListener("click", (e) => {
        const likeBtn = e.target.closest(".btn-like");
        const commentToggleBtn = e.target.closest(".btn-comment-toggle");
        const addCommentBtn = e.target.closest(".btn-add-comment");
        const flagBtn = e.target.closest(".action-flag");
        const shareBtn = e.target.closest(".btn-share");

        if (likeBtn) {
            const card = likeBtn.closest(".post-card");
            const postId = Number(card.getAttribute("data-id"));
            toggleLike(postId);
        }

        if (commentToggleBtn) {
            const card = commentToggleBtn.closest(".post-card");
            const commentsSection = card.querySelector(".comments-section");
            commentsSection.style.display = commentsSection.style.display === "none" ? "block" : "none";
        }

        if (addCommentBtn) {
            const card = addCommentBtn.closest(".post-card");
            const postId = Number(card.getAttribute("data-id"));
            const commentInput = card.querySelector(".comment-input");
            const commentText = commentInput.value.trim();

            if (commentText) {
                addComment(postId, commentText);
            }
        }

        if (flagBtn) {
            const card = flagBtn.closest(".post-card");
            const postId = Number(card.getAttribute("data-id"));
            const postAuthor = card.querySelector(".post-author")?.textContent?.trim() || "Unknown";

            const modal = document.getElementById("reportModal");
            if (modal) {
                modal.dataset.postId = postId;
                modal.dataset.postAuthor = postAuthor;
                showReportModal();
            }
        }

        if (shareBtn) {
            const card = shareBtn.closest(".post-card");
            const postId = card.getAttribute("data-id");
            const shareUrl = `${window.location.origin}${window.location.pathname}?post=${postId}`;

            if (navigator.share) {
                navigator.share({
                    title: 'Check out this post on UIU Social',
                    text: 'Check out this post on UIU Social',
                    url: shareUrl
                }).catch(() => { });
            } else {
                navigator.clipboard.writeText(shareUrl).then(() => {
                    showReportToast('Post link copied to clipboard!');
                }).catch(() => {
                    prompt('Copy this link to share:', shareUrl);
                });
            }
        }
    });

    feedSection.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && e.target.classList.contains("comment-input")) {
            const card = e.target.closest(".post-card");
            const postId = Number(card.getAttribute("data-id"));
            const commentText = e.target.value.trim();

            if (commentText) {
                addComment(postId, commentText);
            }
        }
    });
}

// Toggle like
function toggleLike(postId) {
    let posts = JSON.parse(localStorage.getItem("uiu_posts")) || [];
    posts = posts.map(post => {
        if (post.id === postId) {
            post.liked = !post.liked;
            post.likes += post.liked ? 1 : -1;
        }
        return post;
    });
    localStorage.setItem("uiu_posts", JSON.stringify(posts));
    renderPosts();
}

// Add comment
function addComment(postId, text) {
    let posts = JSON.parse(localStorage.getItem("uiu_posts")) || [];

    posts = posts.map(post => {
        if (post.id === postId) {
            if (!post.comments) post.comments = [];
            post.comments.push({
                id: Date.now(),
                author: "Current User",
                avatar: "/assets/images/students/kawsar.png?img=11",
                text: text
            });
        }
        return post;
    });

    localStorage.setItem("uiu_posts", JSON.stringify(posts));
    renderPosts();

    const targetCard = document.querySelector(`.post-card[data-id="${postId}"]`);
    if (targetCard) {
        const commentsSection = targetCard.querySelector(".comments-section");
        commentsSection.style.display = "block";
    }
}

// Discover view HTML
function getDiscoverViewHTML() {
    return `
        <div class="discover-section">
            <div class="card mb-3">
                <h4 class="card-title mb-2"><i class="fa-solid fa-fire text-danger"></i> Trending Topics</h4>
                <div class="d-flex flex-wrap gap-2">
                    <span class="badge" style="background:#f0f2f5; color:#333; padding:8px 12px; cursor:pointer;">#UIUFest2026</span>
                    <span class="badge" style="background:#f0f2f5; color:#333; padding:8px 12px; cursor:pointer;">#MidtermPrep</span>
                    <span class="badge" style="background:#f0f2f5; color:#333; padding:8px 12px; cursor:pointer;">#CSE411Projects</span>
                    <span class="badge" style="background:#f0f2f5; color:#333; padding:8px 12px; cursor:pointer;">#UIURobotics</span>
                </div>
            </div>

            <div class="card mb-3">
                <h4 class="card-title mb-3"><i class="fa-solid fa-puzzle-piece text-primary"></i> Featured Clubs</h4>
                <div class="d-flex flex-column gap-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex gap-2 align-items-center">
                            <img src="/assets/images/clubs/computer-club.png" alt="UIU Computer Club" style="width:40px; height:40px; border-radius:8px; object-fit:cover;">
                            <div>
                                <div class="fw-600">UIU Computer Club</div>
                                <div class="text-muted text-sm">1,240 Members</div>
                            </div>
                        </div>
                        <button class="btn btn-primary btn-sm">Join</button>
                    </div>

                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex gap-2 align-items-center">
                            <img src="/assets/images/clubs/debate-club.png" alt="UIU Debate Club" style="width:40px; height:40px; border-radius:8px; object-fit:cover;">
                            <div>
                                <div class="fw-600">UIU Debate Club</div>
                                <div class="text-muted text-sm">850 Members</div>
                            </div>
                        </div>
                        <button class="btn btn-primary btn-sm">Join</button>
                    </div>

                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex gap-2 align-items-center">
                            <img src="/assets/images/clubs/app-forum.png" alt="App Forum" style="width:40px; height:40px; border-radius:8px; object-fit:cover;">
                            <div>
                                <div class="fw-600">App Forum</div>
                                <div class="text-muted text-sm">450 Members</div>
                            </div>
                        </div>
                        <button class="btn btn-primary btn-sm">Join</button>
                    </div>
                </div>
            </div>

            <div class="card mb-3">
                <h4 class="card-title mb-3"><i class="fa-solid fa-handshake text-primary"></i> Project Partner Finder</h4>
                <div class="p-3" style="background:#f8f9fa; border-radius:8px;">
                    <div class="fw-600">Looking for React Developer</div>
                    <p class="text-muted text-sm m-0">Need 1 member for Web Database Capstone project. CSE Department.</p>
                    <button class="btn btn-action btn-sm mt-2">Contact Poster</button>
                </div>
            </div>
        </div>
    `;
}

// People view HTML
function getPeopleViewHTML() {
    return `
        <div class="people-section" style="width: 100%;">
            <div class="card mb-3 filter-bar">
                <div class="d-flex gap-2 flex-wrap">
                    <button class="btn btn-primary btn-sm active filter-btn" data-filter="all">All</button>
                    <button class="btn btn-action btn-sm filter-btn" data-filter="STUDENT">Students</button>
                    <button class="btn btn-action btn-sm filter-btn" data-filter="FACULTY">Faculty</button>
                </div>
            </div>

            <div class="people-grid" id="peopleCardsContainer"></div>
        </div>
    `;
}

// Initialize people view
function initializePeopleView() {
    'use strict';

    const peopleList = globalUsers.map(u => ({
        name: u.name,
        role: u.faculty ? "FACULTY" : "STUDENT",
        dept: u.department,
        img: u.avatar
    }));

    const container = document.getElementById('peopleCardsContainer');
    if (!container) {
        console.error('People container not found');
        return;
    }

    const filterBtns = document.querySelectorAll('.filter-btn');
    if (!filterBtns.length) {
        console.warn('No filter buttons found');
        return;
    }

    function renderPeople(filter = 'all') {
        let filtered = peopleList;
        if (filter === 'STUDENT') {
            filtered = peopleList.filter(p => p.role === 'STUDENT');
        } else if (filter === 'FACULTY') {
            filtered = peopleList.filter(p => p.role === 'FACULTY');
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="flex:1; text-align:center; padding:2rem; background:#fff; border-radius:8px; border:1px solid #e4e6eb; color:#65676b;">
                    <i class="fa-regular fa-user" style="font-size:2rem; display:block; margin-bottom:0.5rem;"></i>
                    No people found in this category.
                </div>
            `;
            return;
        }

        let html = '';
        filtered.forEach(person => {
            const roleClass = person.role === 'FACULTY' ? 'faculty' : '';
            html += `
                <div class="person-card" style="flex:1 1 calc(50% - 0.5rem); min-width:220px; background:#fff; border-radius:8px; padding:1rem; border:1px solid #e4e6eb; display:flex; flex-direction:column; align-items:center; text-align:center;">
                    <img src="${person.img}" class="avatar" style="width:60px; height:60px; border-radius:50%; object-fit:cover; background:#ddd;" alt="${escapeHTML(person.name)}">
                    <div class="fw-600 mt-2">${escapeHTML(person.name)}</div>
                    <div class="text-muted text-sm mb-2">
                        ${escapeHTML(person.dept)} • 
                        <span class="badge-role ${roleClass}" style="font-size:0.7rem; padding:2px 10px; border-radius:12px; font-weight:600; background:${person.role === 'FACULTY' ? '#ffebe6' : '#e7f3ff'}; color:${person.role === 'FACULTY' ? '#f26522' : '#1877f2'};">
                            ${escapeHTML(person.role)}
                        </span>
                    </div>
                    <button class="btn btn-primary btn-sm w-100 mt-auto"><i class="fa-solid fa-user-plus" style="margin-right: 8px;"></i> Connect</button>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    function setupFilters() {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', function (e) {
                filterBtns.forEach(b => {
                    b.classList.remove('btn-primary', 'active');
                    b.classList.add('btn-action');
                });
                this.classList.remove('btn-action');
                this.classList.add('btn-primary', 'active');

                const filter = this.getAttribute('data-filter') || 'all';
                renderPeople(filter);
            });
        });
    }

    renderPeople('all');
    setupFilters();
}

// Setup search
function setupSearch() {
    const searchInput = document.getElementById("search-input");
    if (!searchInput) return;

    searchInput.addEventListener("input", (e) => {
        if (currentView === "home") {
            renderPosts(e.target.value);
        }
    });
}

// Escape HTML
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// Init login
function initLogin() {
    document.addEventListener('DOMContentLoaded', function () {
        const tabs = document.querySelectorAll('.auth-tab');

        tabs.forEach(tab => {
            tab.addEventListener('click', function () {
                tabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
            });
        });
    });
}

// Global mock interactions
document.addEventListener('DOMContentLoaded', () => {
    const joinButtons = document.querySelectorAll('.btn-join, .btn:contains("Join"), .btn-outline:contains("Join")');
    joinButtons.forEach(btn => {
        if (btn.innerText.trim().toLowerCase() === 'join') {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                if (this.classList.contains('joined')) {
                    this.classList.remove('joined', 'btn-primary');
                    if (this.classList.contains('btn-join')) {
                    } else {
                        this.classList.add('btn-outline');
                    }
                    this.innerText = 'Join';
                } else {
                    this.classList.add('joined');
                    if (!this.classList.contains('btn-join')) {
                        this.classList.remove('btn-outline');
                        this.classList.add('btn-primary');
                    }
                    this.innerText = 'Joined';
                }
            });
        }
    });

    const authForms = document.querySelectorAll('.auth-form');
    authForms.forEach(form => {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const btn = this.querySelector('button[type="submit"]');
            const originalText = btn.innerText;
            btn.innerText = 'Processing...';
            btn.disabled = true;

            setTimeout(() => {
                window.location.href = 'index.html';
            }, 800);
        });
    });
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

// Show report modal
function showReportModal() {
    const modal = document.getElementById("reportModal");
    if (!modal) return;

    modal.querySelectorAll('input[type="radio"]').forEach(radio => radio.checked = false);
    const detailsTextarea = modal.querySelector('#reportDetails');
    if (detailsTextarea) detailsTextarea.value = '';
    const additionalDetails = modal.querySelector('#reportAdditionalDetails');
    if (additionalDetails) additionalDetails.style.display = 'none';

    const subtitle = modal.querySelector('.report-modal-subtitle');
    if (subtitle) {
        subtitle.style.color = '#65676b';
        subtitle.textContent = 'Why are you reporting this post?';
    }

    modal.style.display = "flex";
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
}

// Hide report modal
function hideReportModal() {
    const modal = document.getElementById("reportModal");
    if (!modal) return;

    modal.style.display = "none";
    modal.classList.remove("show");
    document.body.style.overflow = "";
}

// Submit report
function submitReport() {
    const modal = document.getElementById("reportModal");
    if (!modal) return;

    const selectedReason = modal.querySelector('input[name="reportReason"]:checked');
    const details = modal.querySelector('#reportDetails')?.value || '';
    const postId = modal.dataset.postId;
    const postAuthor = modal.dataset.postAuthor;

    if (!selectedReason) {
        const subtitle = modal.querySelector('.report-modal-subtitle');
        if (subtitle) {
            subtitle.style.color = '#dc3545';
            subtitle.textContent = 'Please select a reason for reporting this post.';
            setTimeout(() => {
                subtitle.style.color = '#65676b';
                subtitle.textContent = 'Why are you reporting this post?';
            }, 3000);
        }
        return;
    }

    const reasonLabel = selectedReason.closest('.report-option')?.querySelector('.report-option-title')?.textContent || selectedReason.value;
    const reasonValue = selectedReason.value;

    const reportData = {
        id: Date.now(),
        postId: postId,
        postAuthor: postAuthor,
        reason: reasonValue,
        reasonLabel: reasonLabel,
        details: details || 'No additional details provided.',
        reportedBy: 'Current User',
        reportedAt: new Date().toISOString(),
        status: 'pending'
    };

    let reports = JSON.parse(localStorage.getItem('uiu_reports')) || [];
    reports.push(reportData);
    localStorage.setItem('uiu_reports', JSON.stringify(reports));

    hideReportModal();
    showReportToast(`Post reported for: ${reasonLabel}`);

    console.log('Report submitted:', reportData);
    console.log('Total reports:', reports.length);
}

// Show report toast
function showReportToast(message) {
    const existingToast = document.querySelector('.report-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'report-toast show';
    toast.innerHTML = `
        <i class="fa-solid fa-check-circle"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Setup report modal
function setupReportModal() {
    const closeBtn = document.getElementById('reportModalClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', hideReportModal);
    }

    const cancelBtn = document.getElementById('reportCancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideReportModal);
    }

    const submitBtn = document.getElementById('reportSubmitBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', submitReport);
    }

    const modal = document.getElementById('reportModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideReportModal();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideReportModal();
        }
    });

    const radioOptions = document.querySelectorAll('input[name="reportReason"]');
    radioOptions.forEach(radio => {
        radio.addEventListener('change', function () {
            const detailsContainer = document.getElementById('reportAdditionalDetails');
            if (detailsContainer) {
                detailsContainer.style.display = this.value === 'other' ? 'block' : 'none';
            }
        });
    });
}