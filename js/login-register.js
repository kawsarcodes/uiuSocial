document.addEventListener('DOMContentLoaded', function () {
    const tabs = document.querySelectorAll('.auth-tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
        });
    });
});