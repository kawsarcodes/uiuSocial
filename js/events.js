document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
    setupEventsPage();
});

function setupEventsPage() {
    const actionButtons = document.querySelectorAll('.event-card-footer .btn, .btn-primary');

    actionButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('.event-card') || e.target.closest('.seminar-item');
            let eventName = "this event";

            if (card) {
                const titleEl = card.querySelector('.event-card-title') || card.querySelector('.seminar-title');
                if (titleEl) {
                    eventName = titleEl.textContent;
                }
            }

            // Determine action type based on current button text
            const actionText = e.target.textContent;
            let title = `Register for ${eventName}?`;
            let message = `Would you like to register for ${eventName}? We will send you updates and a reminder before it starts.`;

            if (actionText === "Remind Me") {
                title = `Set reminder for ${eventName}?`;
                message = `We will send you a notification 30 minutes before ${eventName} begins.`;
            }

            // Show global modal
            showModal(title, message, () => {
                if (actionText === "Remind Me") {
                    e.target.textContent = "Reminder Set";
                    e.target.classList.replace('btn-outline', 'btn-success');
                    e.target.style.backgroundColor = 'var(--success-color)';
                    e.target.style.color = 'white';
                    e.target.style.borderColor = 'var(--success-color)';
                } else {
                    e.target.textContent = "Registered";
                    e.target.classList.replace('btn-outline', 'btn-primary');
                    if (!e.target.classList.contains('btn-primary')) {
                        e.target.classList.add('btn-primary');
                    }
                }
                e.target.disabled = true;
            });
        });
    });
}
