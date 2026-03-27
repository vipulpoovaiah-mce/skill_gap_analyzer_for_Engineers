function setMsg(text, type) {
    const el = document.getElementById('msg');
    if (!el) return;
    el.style.display = 'block';
    el.textContent = text;
    el.classList.remove('msg-error', 'msg-ok');
    if (type === 'error') el.classList.add('msg-error');
    if (type === 'ok') el.classList.add('msg-ok');
}

function showAuthTab(tab) {
    const loginTab = document.getElementById('tabLogin');
    const regTab = document.getElementById('tabRegister');
    const loginPanel = document.getElementById('loginPanel');
    const regPanel = document.getElementById('registerPanel');
    const msg = document.getElementById('msg');
    if (msg) msg.style.display = 'none';

    if (tab === 'register') {
        loginTab.classList.remove('tab-active');
        regTab.classList.add('tab-active');
        loginPanel.classList.remove('panel-active');
        regPanel.classList.add('panel-active');
        return;
    }

    regTab.classList.remove('tab-active');
    loginTab.classList.add('tab-active');
    regPanel.classList.remove('panel-active');
    loginPanel.classList.add('panel-active');
}

async function login() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!username || !password) {
        setMsg('Username and password are required.', 'error');
        return;
    }

    try {
        const res = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setMsg(data.error || 'Login failed.', 'error');
            return;
        }
        setMsg('Logged in. Redirecting...', 'ok');
        window.location.href = '/app';
    } catch (e) {
        setMsg('Failed to connect to server.', 'error');
    }
}

async function register() {
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    if (!username || !password) {
        setMsg('Username and password are required.', 'error');
        return;
    }

    try {
        const res = await fetch('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            setMsg(data.error || 'Registration failed.', 'error');
            return;
        }
        setMsg('Account created. Redirecting...', 'ok');
        window.location.href = '/app';
    } catch (e) {
        setMsg('Failed to connect to server.', 'error');
    }
}

async function continueAsGuest() {
    try {
        const res = await fetch('/auth/guest', { method: 'POST' });
        if (!res.ok) {
            setMsg('Unable to continue as guest.', 'error');
            return;
        }
        window.location.href = '/app';
    } catch (e) {
        setMsg('Failed to connect to server.', 'error');
    }
}

window.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const loginPanel = document.getElementById('loginPanel');
    const isLogin = loginPanel && loginPanel.classList.contains('panel-active');
    if (isLogin) login();
    else register();
});

