document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
    loadNotifications();

    document.getElementById('mark-all-read')?.addEventListener('click', async () => {
        try {
            await api('api/notifications/index.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
            await loadNotifications();
            if (typeof refreshNotificationBadge === 'function') refreshNotificationBadge();
            toast('All marked as read');
        } catch (e) { alert(e.message); }
    });

    document.getElementById('clear-all')?.addEventListener('click', async () => {
        if (!confirm('Delete all notifications?')) return;
        try {
            await api('api/notifications/index.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) });
            await loadNotifications();
            if (typeof refreshNotificationBadge === 'function') refreshNotificationBadge();
            toast('Notifications cleared');
        } catch (e) { alert(e.message); }
    });

    const filterSelect = document.getElementById('notif-filter');
    filterSelect?.addEventListener('change', () => loadNotifications(filterSelect.value));

    const searchInput = document.getElementById('notif-filter-input');
    searchInput?.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        document.querySelectorAll('.notif-page-item').forEach(item => {
            item.style.display = (item.textContent || '').toLowerCase().includes(q) ? '' : 'none';
        });
    });
});

let notifFilter = 'all';

async function loadNotifications(filter = null) {
    if (filter) notifFilter = filter;
    const list = document.getElementById('notif-list');
    if (!list) return;
    list.innerHTML = '<div class="text-center text-muted p-4"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>';
    try {
        const data = await api('api/notifications/index.php?limit=100');
        const all = data.notifications || [];
        const items = notifFilter === 'unread' ? all.filter(n => !n.is_read) : all;
        const unreadCount = data.unread || 0;

        const countEl = document.getElementById('notif-unread-count');
        if (countEl) countEl.textContent = unreadCount ? `${unreadCount} unread` : 'All caught up';

        if (!items.length) {
            list.innerHTML = notifFilter === 'unread' && all.length
                ? '<div class="empty-state"><i class="fa-solid fa-check-double"></i><h4>No unread notifications</h4></div>'
                : '<div class="empty-state"><i class="fa-solid fa-bell-slash"></i><h4>No notifications</h4><p>Activity on your posts, groups and clubs will show up here.</p></div>';
            return;
        }

        const now = new Date();
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const isNew = (n) => new Date(n.created_at.replace(' ', 'T')) >= dayStart;
        const fresh = items.filter(isNew);
        const older = items.filter(n => !isNew(n));

        const section = (label, arr) => arr.length ? `
            <div class="notif-section-label">${label}</div>
            ${arr.map(n => `
                <a class="notif-page-item ${n.is_read ? '' : 'unread'}" href="${escapeHTML(n.link || '#')}" data-id="${n.id}">
                    <img class="notif-page-avatar" src="${mediaUrl(n.actor_avatar)}" alt="${escapeHTML(n.actor_name || '')}">
                    <div class="notif-page-body">
                        <div class="notif-page-top">
                            <strong>${escapeHTML(n.title || '')}</strong>
                            <i class="${escapeHTML(n.icon || 'fa-solid fa-bell')}" style="color:${escapeHTML(n.color || 'var(--primary-color)')}"></i>
                        </div>
                        <span>${escapeHTML(n.body || '')}</span>
                        <em>${escapeHTML(n.time || '')}</em>
                    </div>
                    <button type="button" class="notif-page-delete" data-id="${n.id}" title="Delete"><i class="fa-solid fa-xmark"></i></button>
                </a>`).join('')}` : '';

        list.innerHTML = section('New', fresh) + section('Earlier', older);

        list.querySelectorAll('.notif-page-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.notif-page-delete')) return;
                if (!item.classList.contains('unread')) return;
                item.classList.remove('unread');
                api('api/notifications/index.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: Number(item.dataset.id) })
                }).catch(() => {});
                if (typeof refreshNotificationBadge === 'function') refreshNotificationBadge();
                const countEl = document.getElementById('notif-unread-count');
                const badge = document.querySelector('.notification-badge');
                const remaining = document.querySelectorAll('.notif-page-item.unread').length;
                if (countEl) countEl.textContent = remaining ? `${remaining} unread` : 'All caught up';
                if (badge) {
                    badge.textContent = remaining > 9 ? '9+' : (remaining ? String(remaining) : '');
                    badge.style.display = remaining ? 'flex' : 'none';
                }
            });
        });

        list.querySelectorAll('.notif-page-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                    await api('api/notifications/delete.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: Number(btn.dataset.id) })
                    });
                    btn.closest('.notif-page-item')?.remove();
                    if (typeof refreshNotificationBadge === 'function') refreshNotificationBadge();
                } catch (err) { alert(err.message); }
            });
        });
    } catch (e) {
        list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><h4>Could not load notifications</h4></div>';
        console.error(e);
    }
}
