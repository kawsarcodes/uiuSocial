document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
    setupAdminPage();
});

function setupAdminPage() {
    const verificationIcons = document.querySelectorAll('.action-icons .icon-btn');
    verificationIcons.forEach(icon => {
        icon.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            const userName = row.querySelector('.user-name').textContent;

            const isAccept = e.target.classList.contains('accept');
            const actionText = isAccept ? 'Accept' : 'Reject';
            const actionTitle = isAccept ? `Approve Verification` : `Reject Verification`;

            showModal(
                actionTitle,
                `Are you sure you want to ${actionText.toLowerCase()} the verification request for ${userName}?`,
                () => {
                    row.style.transition = "opacity 0.3s ease";
                    row.style.opacity = "0";
                    setTimeout(() => row.remove(), 300);
                }
            );
        });
    });

    // Handle Content Moderation Actions (Dismiss / Delete / Restrict)
    const modButtons = document.querySelectorAll('.mod-btn');
    modButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('.mod-card');
            const modType = card.querySelector('.mod-card-header div').textContent.trim();
            const actionText = e.target.textContent;

            showModal(
                `Confirm ${actionText}`,
                `You are about to perform "${actionText}" on this reported content (${modType}). Proceed?`,
                () => {
                    card.style.transition = "opacity 0.3s ease, transform 0.3s ease";
                    card.style.opacity = "0";
                    card.style.transform = "scale(0.95)";
                    setTimeout(() => card.remove(), 300);
                }
            );
        });
    });

    // Handle Top Action Buttons (Filters, Export Logs)
    const headerButtons = document.querySelectorAll('.page-content > .d-flex .btn');
    headerButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.target.textContent.trim();
            showModal(
                action,
                `${action} functionality will be available in the backend integration phase.`,
                null
            );
        });
    });
}
