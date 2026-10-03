document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
    setupJoinButtons();
    setupFilterButtons();
    setupCreateGroupButton();
    setupLoadMore();
});


function setupJoinButtons() {
    const groupsGrid = document.querySelector('.groups-grid');
    const groupsSide = document.querySelector('.groups-side');

    [groupsGrid, groupsSide].forEach(container => {
        if (!container) return;
        container.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-join');
            if (!btn || btn.classList.contains('joined')) return;

            const card = btn.closest('.group-card') || btn.closest('.algo-group');
            const groupName = card ? (card.querySelector('.group-title') || card.querySelector('.group-title-overlay') || card.querySelector('.algo-title'))?.textContent : 'this group';

            showModal(
                `Join ${groupName}?`,
                `Are you sure you want to request to join ${groupName}? Your request will be sent to the group admins for approval.`,
                () => {
                    btn.textContent = 'Requested';
                    btn.classList.add('joined');
                    btn.disabled = true;
                }
            );
        });
    });
}


function setupFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-btn');

    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterButtons.forEach(b => b.classList.remove('active'));

            const selectedBtn = e.currentTarget;
            selectedBtn.classList.add('active');

            const filterValue = selectedBtn.getAttribute('data-filter');

            const gridCards = document.querySelectorAll('.groups-grid .group-card');

            gridCards.forEach(card => {
                const cardCategory = card.getAttribute('data-category') || '';
                const isEnrolled = card.getAttribute('data-enrolled') === 'true';

                let match = false;

                if (filterValue === 'all') {
                    match = true;
                } else if (filterValue === 'enrolled') {
                    match = isEnrolled;
                } else {
                    const categories = cardCategory.split(',').map(c => c.trim());
                    match = categories.includes(filterValue);
                }

                card.style.display = match ? '' : 'none';
            });
        });
    });

    const topFilterBtn = Array.from(document.querySelectorAll('.btn-outline')).find(b => b.textContent.includes('Filter'));
    if (topFilterBtn) {
        topFilterBtn.addEventListener('click', () => {
            showModal(
                'Advanced Filters',
                'Advanced filtering options (by semester, enrollment, tags) will be available in the full release.',
                null
            );
        });
    }
}


// CREATE GROUP BUTTON & MODAL
function setupCreateGroupButton() {
    const createGroupBtn = Array.from(document.querySelectorAll('.btn-primary')).find(b => b.textContent.includes('Create Group'));
    if (!createGroupBtn) return;

    createGroupBtn.addEventListener('click', () => {
        openCreateGroupModal();
    });
}

function openCreateGroupModal() {
    const icons = [
        'fa-code', 'fa-database', 'fa-brain', 'fa-robot',
        'fa-book', 'fa-flask', 'fa-chart-line', 'fa-graduation-cap'
    ];
    let iconPickerHtml = '';
    icons.forEach((icon, i) => {
        const border = i === 0 ? 'var(--primary-color)' : '#e2e8f0';
        const color = i === 0 ? 'var(--primary-color)' : '#888';
        const sel = i === 0 ? 'selected' : '';
        iconPickerHtml += '<div class="icon-opt ' + sel + '" data-icon="' + icon + '" ' +
            'style="width:40px;height:40px;border-radius:8px;border:2px solid ' + border + ';' +
            'display:flex;align-items:center;justify-content:center;cursor:pointer;' +
            'color:' + color + ';font-size:16px;transition:all 0.15s ease;">' +
            '<i class="fa-solid ' + icon + '"></i></div>';
    });

    const overlay = document.createElement('div');
    overlay.id = 'create-group-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);' +
        'display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(4px);';

    overlay.innerHTML = `
        <div style="background:white;border-radius:16px;padding:32px;width:460px;max-width:95vw;
                    box-shadow:0 24px 60px rgba(0,0,0,0.2);">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">                
                <div>
                    <h3 style="margin:0;font-size:18px;">Create New Group</h3>
                    <p style="margin:0;font-size:13px;color:#777;">Fill in the details for your group</p>
                </div>
            </div>

            <form id="create-group-form">
                <div style="margin-bottom:16px;">
                    <label style="font-size:13px;font-weight:600;color:#444;display:block;margin-bottom:6px;">
                        Group Name <span style="color:red;">*</span>
                    </label>
                    <input id="cg-name" type="text" placeholder="e.g. Web Programming Study Group"
                        style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:8px;
                               font-size:14px;outline:none;box-sizing:border-box;">
                </div>

                <div style="margin-bottom:16px;">
                    <label style="font-size:13px;font-weight:600;color:#444;display:block;margin-bottom:6px;">
                        Department
                    </label>
                    <select id="cg-dept"
                        style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:8px;
                               font-size:14px;outline:none;box-sizing:border-box;background:white;">
                        <option value="cs">Computer Science</option>
                        <option value="ee">Electrical Engineering</option>
                        <option value="bba">Business Administration</option>
                        <option value="math">Mathematics</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                
                <div style="margin-bottom:24px;">
                    <label style="font-size:13px;font-weight:600;color:#444;display:block;margin-bottom:6px;">Description</label>
                    <textarea id="cg-desc" rows="3" placeholder="What is this group about?"
                        style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:8px;
                               font-size:14px;outline:none;box-sizing:border-box;resize:vertical;font-family:inherit;"></textarea>
                </div>

                <div style="display:flex;gap:12px;justify-content:flex-end;">
                    <button type="button" id="cg-cancel"
                        style="padding:10px 24px;border:1.5px solid #e2e8f0;border-radius:8px;
                               background:white;color:#555;font-size:14px;font-weight:600;cursor:pointer;">
                        Cancel
                    </button>
                    <button type="submit"
                        style="padding:10px 24px;border:none;border-radius:8px;
                               background:var(--primary-color);color:white;font-size:14px;font-weight:600;cursor:pointer;">
                        <i class="fa-solid fa-plus"></i> Create Group
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeCreateGroupModal();
    });

    document.getElementById('cg-cancel').addEventListener('click', closeCreateGroupModal);

    document.getElementById('create-group-form').addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('cg-name').value.trim();
        if (!name) {
            document.getElementById('cg-name').style.borderColor = 'red';
            document.getElementById('cg-name').placeholder = 'Group name is required!';
            return;
        }

        const dept = document.getElementById('cg-dept').value;
        const desc = document.getElementById('cg-desc').value.trim() || 'A new group created by you.';
        const selectedIcon = document.querySelector('.icon-opt.selected')?.dataset.icon || 'fa-users';

        addGroupCard({
            name,
            desc,
            icon: selectedIcon,
            category: dept,
            isEnrolled: true,
            members: '1 Member',
            isAdmin: true
        });

        closeCreateGroupModal();
    });
}

function closeCreateGroupModal() {
    const overlay = document.getElementById('create-group-overlay');
    if (overlay) overlay.remove();
}


// SINGLE UNIFIED ADD GROUP CARD FUNCTION
function addGroupCard(options) {
    const grid = document.querySelector('.groups-grid');
    if (!grid) return;

    const {
        name,
        desc,
        icon = 'fa-users',
        imageUrl = null,
        members = '1 Member',
        category = 'other',
        isEnrolled = false,
        isAdmin = false
    } = options;

    const card = document.createElement('div');
    card.className = 'group-card';
    card.setAttribute('data-category', category);
    card.setAttribute('data-enrolled', isEnrolled ? 'true' : 'false');

    let headerContent = '';
    if (imageUrl) {
        headerContent = `
            <div class="group-image-header" style="background: linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url('${imageUrl}') center/cover no-repeat;">
                <div class="group-title-overlay">${name}</div>
            </div>`;
    } else {
        headerContent = `
            <div class="group-icon"><i class="fa-solid ${icon}"></i></div>
            <div class="group-title">${name}</div>`;
    }

    const buttonHtml = isAdmin
        ? `<button class="btn-join joined" disabled>Admin</button>`
        : `<button class="btn-join">Join</button>`;

    card.innerHTML = `
        ${headerContent}
        <div class="group-desc">${desc}</div>
        <div class="group-footer">
            <span class="group-members">${members}</span>
            ${buttonHtml}
        </div>
    `;

    card.style.opacity = '0';
    card.style.transform = 'translateY(16px)';
    card.style.transition = 'opacity 0.35s ease, transform 0.35s ease';

    grid.appendChild(card);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        });
    });
}


// LOAD MORE GROUPS BUTTON
function setupLoadMore() {
    const loadMoreBtn = document.querySelector('.load-more-btn');
    if (!loadMoreBtn) return;

    loadMoreBtn.addEventListener('click', () => {
        const extraGroups = [
            {
                name: 'Web Programming Lab',
                desc: 'Hands-on HTML, CSS & JS projects for CSE students.',
                imageUrl: '/assets/images/groups/web.png',
                members: '94 Members',
                category: 'cs'
            },
            {
                name: 'EEE Project Hub',
                desc: 'Collaborative project space for EEE department students.',
                imageUrl: '/assets/images/groups/electronics.png',
                members: '62 Members',
                category: 'ee'
            },
            {
                name: 'BBA Study Circle',
                desc: 'Business case discussions and exam prep for BBA students.',
                imageUrl: '/assets/images/groups/bba.png',
                members: '110 Members',
                category: 'bba'
            }
        ];

        extraGroups.forEach(group => addGroupCard(group));

        loadMoreBtn.textContent = 'No More Groups';
        loadMoreBtn.disabled = true;
        loadMoreBtn.style.opacity = '0.5';
    });
}