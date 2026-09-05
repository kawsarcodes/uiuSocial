// club_hub.js - Club Hub logic

let allClubs = [];
let isShowingAll = false;
let selectedCategory = 'All';

document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
    await setupClubHubPage();
});

// Setup club hub page
async function setupClubHubPage() {
    try {
        const res = await fetch('data/clubs.json');
        allClubs = await res.json();
    } catch (e) {
        console.error('Failed to load data/clubs.json', e);
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

    // Announcement actions
    const actionItems = document.querySelectorAll('.ann-action-item');
    actionItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const icon = item.querySelector('i');
            if (icon.classList.contains('fa-heart')) {
                icon.classList.replace('fa-regular', 'fa-solid');
                icon.style.color = '#e65100';
            } else {
                showModal(
                    'Comment',
                    'Commenting on announcements is coming soon.',
                    null
                );
            }
        });
    });
}

// Render clubs grid
function renderClubsGrid() {
    const grid = document.getElementById('clubs-grid');
    if (!grid) return;

    let filtered = allClubs;

    if (selectedCategory !== 'All') {
        filtered = allClubs.filter(c => c.category === selectedCategory);
    }

    let displayList = filtered;
    if (!isShowingAll && selectedCategory === 'All') {
        displayList = filtered.slice(0, 5);
    }

    if (displayList.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #888; padding: 24px;">No clubs found in category "${selectedCategory}".</div>`;
        return;
    }

    grid.innerHTML = displayList.map(club => {
        const memberCount = club.members >= 1000 ? (club.members / 1000).toFixed(1) + 'k' : club.members;
        const logoSrc = club.image || `assets/images/clubs/${club.slug}.png`;

        return `
            <div class="club-card" data-club-id="${club.id}">
                <div class="club-logo-wrap" style="background-color:${club.iconBg || '#f5f5f5'};">
                    <img src="${logoSrc}" alt="${club.name} Logo" class="club-logo-img">
                </div>
                <h4 class="club-name">${club.name}</h4>
                <div class="club-members"><i class="fa-regular fa-user"></i> ${memberCount} Members</div>
                <button class="btn btn-explore w-100" data-club-id="${club.id}">Explore</button>
            </div>
        `;
    }).join('');

    grid.querySelectorAll('.btn-explore').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const clubId = e.currentTarget.dataset.clubId;
            window.location.href = `club_detail.html?id=${clubId}`;
        });
    });
}