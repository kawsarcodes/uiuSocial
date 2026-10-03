document.addEventListener('DOMContentLoaded', function () {

    function updateStudentIdVisibility(role) {
        const studentIdInput = document.getElementById('reg-student-id');
        if (!studentIdInput) return;
        const studentIdCol = document.getElementById('reg-student-id-col');
        if (role === 'faculty') {
            if (studentIdCol) studentIdCol.style.setProperty('display', 'none', 'important');
            studentIdInput.required = false;
        } else {
            if (studentIdCol) studentIdCol.style.setProperty('display', '', 'important');
            studentIdInput.required = true;
        }
    }

    const tabs = document.querySelectorAll('.auth-tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            const role = this.textContent.trim().toLowerCase();

            // Hide credentials for guest
            const loginEmailEl = document.getElementById('login-email');
            const loginPassEl = document.getElementById('login-password');
            const emailGroup = loginEmailEl ? loginEmailEl.closest('.form-group') : null;
            const passGroup = loginPassEl ? loginPassEl.closest('.form-group') : null;
            const forgot = document.querySelector('#login-form .d-flex.justify-content-between');

            if (role === 'guest') {
                if (emailGroup) emailGroup.style.display = 'none';
                if (passGroup) passGroup.style.display = 'none';
                if (forgot) forgot.style.display = 'none';
                if (loginEmailEl) loginEmailEl.required = false;
                if (loginPassEl) loginPassEl.required = false;
            } else {
                if (emailGroup) emailGroup.style.display = 'block';
                if (passGroup) passGroup.style.display = 'block';
                if (forgot) forgot.style.display = 'flex';
                if (loginEmailEl) loginEmailEl.required = true;
                if (loginPassEl) loginPassEl.required = true;
            }

            updateStudentIdVisibility(role);
        });
    });

    // Set initial student ID visibility based on active tab
    const initialTab = document.querySelector('.auth-tab.active');
    if (initialTab) {
        updateStudentIdVisibility(initialTab.textContent.trim().toLowerCase());
    }

    // Login Form Handler
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const errorDiv = document.getElementById('login-error');
            const btn = document.getElementById('login-btn');

            // Get selected role from active tab
            const activeTab = document.querySelector('.auth-tab.active');
            const role = activeTab ? activeTab.textContent.trim().toLowerCase() : 'student';

            try {
                btn.disabled = true;
                btn.textContent = 'Signing In...';
                errorDiv.style.display = 'none';

                const response = await fetch('api/auth/login.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password, role })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    window.location.href = 'index.html';
                } else {
                    errorDiv.textContent = data.error || 'Login failed';
                    errorDiv.style.display = 'block';
                }
            } catch (error) {
                errorDiv.textContent = 'An error occurred. Please try again later.';
                errorDiv.style.display = 'block';
                console.error('Login error:', error);
            } finally {
                btn.disabled = false;
                btn.textContent = 'Sign In';
            }
        });
    }

    // Register Form Handler
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const studentId = document.getElementById('reg-student-id').value;
            const department = document.getElementById('reg-department').value;
            const password = document.getElementById('reg-password').value;
            const confirmPassword = document.getElementById('reg-confirm-password').value;

            const errorDiv = document.getElementById('register-error');
            const btn = document.getElementById('reg-btn');

            // Get selected role from active tab
            const activeTab = document.querySelector('.auth-tab.active');
            const role = activeTab ? activeTab.textContent.trim().toLowerCase() : 'student';

            if (password !== confirmPassword) {
                errorDiv.textContent = 'Passwords do not match!';
                errorDiv.style.display = 'block';
                return;
            }

            try {
                btn.disabled = true;
                btn.innerHTML = 'Creating Account...';
                errorDiv.style.display = 'none';

                const formData = new FormData();
                formData.append('name', name);
                formData.append('email', email);
                formData.append('student_id', studentId);
                formData.append('department', department);
                formData.append('password', password);
                formData.append('role', role);

                const avatarUrl = document.getElementById('reg-avatar-url').value;
                const avatarFile = document.getElementById('reg-avatar-file').files[0];

                if (avatarUrl) {
                    formData.append('avatar_url', avatarUrl);
                }
                if (avatarFile) {
                    formData.append('avatar_file', avatarFile);
                }

                const response = await fetch('api/auth/register.php', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    window.location.href = 'index.html';
                } else {
                    errorDiv.textContent = data.error || 'Registration failed';
                    errorDiv.style.display = 'block';
                }
            } catch (error) {
                errorDiv.textContent = 'An error occurred. Please try again later.';
                errorDiv.style.display = 'block';
                console.error('Register error:', error);
            } finally {
                btn.disabled = false;
                btn.innerHTML = 'Create Account <i class="fa-solid fa-arrow-right" style="margin-left: 8px;"></i>';
            }
        });
    }
});