const accountsKey = "solace-accounts";
const authenticatedKey = "solace-authenticated";

function getAccounts() {
    return JSON.parse(localStorage.getItem(accountsKey)) || [];
}

function saveAccounts(accounts) {
    localStorage.setItem(accountsKey, JSON.stringify(accounts));
}

function showError(element, message) {
    element.textContent = message;
    element.classList.add("active");
}

function clearError(element) {
    element.textContent = "";
    element.classList.remove("active");
}

function loginAccount(account) {
    localStorage.setItem(authenticatedKey, "true");
    localStorage.setItem("solace-username", account.username);
    localStorage.setItem("solace-user-email", account.email);
    window.location.href = "index.html";
}

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

if (loginForm) {
    const loginError = document.getElementById("login-error");

    loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        clearError(loginError);

        if (!loginForm.checkValidity()) {
            loginForm.reportValidity();
            return;
        }

        const email = document.getElementById("login-email").value.trim().toLowerCase();
        const password = document.getElementById("login-password").value;
        const account = getAccounts().find((item) => item.email === email && item.password === password);

        if (!account) {
            showError(loginError, "Email atau password tidak sesuai dengan data register.");
            return;
        }

        loginAccount(account);
    });
}

if (registerForm) {
    const registerError = document.getElementById("register-error");

    registerForm.addEventListener("submit", (event) => {
        event.preventDefault();
        clearError(registerError);

        if (!registerForm.checkValidity()) {
            registerForm.reportValidity();
            return;
        }

        const username = document.getElementById("register-username").value.trim();
        const email = document.getElementById("register-email").value.trim().toLowerCase();
        const password = document.getElementById("register-password").value;
        const confirmPassword = document.getElementById("register-confirm-password").value;

        if (password !== confirmPassword) {
            showError(registerError, "Konfirmasi password harus sama dengan password.");
            return;
        }

        const accounts = getAccounts();
        if (accounts.some((item) => item.email === email)) {
            showError(registerError, "Email ini sudah terdaftar. Silakan masuk lewat halaman login.");
            return;
        }

        const newAccount = {
            username,
            email,
            password,
            createdAt: new Date().toISOString()
        };

        accounts.push(newAccount);
        saveAccounts(accounts);
        loginAccount(newAccount);
    });
}
