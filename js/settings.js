document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
    if (currentUser) {
        document.getElementById('settings-name').value = currentUser.name || '';
        document.getElementById('settings-about').value = currentUser.about || '';
    }
    document.getElementById('settings-profile-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
            await api('api/users/update.php', { method: 'POST', body: fd });
            toast('Profile updated');
        } catch (err) { alert(err.message); }
    });
    document.getElementById('settings-password-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        if (data.new_password !== data.confirm_password) { alert('Passwords do not match'); return; }
        try {
            await api('api/auth/reset_password.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: 'change', new_password: data.new_password }) });
            toast('Password changed');
        } catch (err) { alert(err.message); }
    });
    document.getElementById('download-data')?.addEventListener('click', () => {
        const data = { user: currentUser, export_date: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'uiu_data.json'; a.click(); URL.revokeObjectURL(url);
        toast('Data downloaded');
    });
    document.getElementById('delete-account')?.addEventListener('click', () => {
        showModal('Delete Account?', 'This action cannot be undone. Are you sure?', async () => {
            try { await fetch('api/auth/logout.php', { method: 'POST' }); } catch (e) {}
            window.location.href = 'login.html';
        });
    });
});
