function clearForm() {
    document.getElementById('profileForm').reset();
    const uploadStatus = document.getElementById('uploadStatus');
    if (uploadStatus) {
        uploadStatus.style.display = 'none';
        uploadStatus.textContent = '';
    }
    resetResultArea();
}

function resetResultArea() {
    const resultArea = document.getElementById('resultArea');
    resultArea.style.justifyContent = 'center';
    resultArea.style.alignItems = 'center';
    resultArea.innerHTML = `
        <div class="empty-state">
            <div class="target-icon float-animation">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M22 12h-4"></path>
                    <path d="M6 12H2"></path>
                    <path d="M12 2v4"></path>
                    <path d="M12 22v-4"></path>
                </svg>
            </div>
            <h2>Awaiting Analysis</h2>
            <p>Upload a resume or fill in your details to discover your personalized skills gap roadmap against industry demand.</p>
        </div>
    `;
}

function showTab(tab) {
    const analysisBtn = document.getElementById('tabAnalysis');
    const historyBtn = document.getElementById('tabHistory');
    const analysisPanel = document.getElementById('analysisTab');
    const historyPanel = document.getElementById('historyTab');

    // If history is locked (e.g., while generating analysis), prevent switching.
    if (tab === 'history' && historyBtn && historyBtn.disabled) {
        return;
    }

    if (tab === 'history') {
        analysisBtn.classList.remove('tab-active');
        historyBtn.classList.add('tab-active');
        analysisPanel.classList.remove('tab-panel-active');
        historyPanel.classList.add('tab-panel-active');
        loadHistory();
        return;
    }

    historyBtn.classList.remove('tab-active');
    analysisBtn.classList.add('tab-active');
    historyPanel.classList.remove('tab-panel-active');
    analysisPanel.classList.add('tab-panel-active');
}

function setHistoryLocked(locked) {
    const historyBtn = document.getElementById('tabHistory');
    if (!historyBtn) return;
    historyBtn.disabled = locked;
    if (locked) {
        historyBtn.title = 'Cannot view history while generating analysis.';
    } else {
        historyBtn.title = '';
    }
}

async function logout() {
    try { await fetch('/auth/logout', { method: 'POST' }); } catch (e) { }
    window.location.href = '/sign-in';
}

async function loadMe() {
    try {
        const res = await fetch('/auth/me');
        const data = await res.json();
        const badge = document.getElementById('userBadge');
        const logoutBtn = document.getElementById('logoutBtn');
        if (data && data.loggedIn) {
            badge.style.display = 'inline-flex';
            badge.textContent = data.guest ? 'Guest Mode' : `User: ${data.username}`;
            logoutBtn.style.display = 'inline-flex';
            if (data.guest) {
                const historyBtn = document.getElementById('tabHistory');
                if (historyBtn) {
                    historyBtn.disabled = true;
                    historyBtn.title = 'Sign in to save and view history';
                }
            }
        } else {
            window.location.href = '/sign-in';
        }
    } catch (e) {
        window.location.href = '/sign-in';
    }
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function loadHistory() {
    const list = document.getElementById('historyList');
    if (!list) return;
    list.innerHTML = '<div class="result-content" style="background:transparent; padding:18px;">Loading...</div>';

    try {
        const res = await fetch('/api/history?limit=30');
        if (!res.ok) {
            if (res.status === 401) {
                list.innerHTML = '<div class="result-content" style="background:transparent; padding:18px;">History is available after you login with an account.</div>';
                return;
            }
            const err = await res.json().catch(() => ({}));
            list.innerHTML = `<div class="result-content" style="color:#f87171; background:rgba(239, 68, 68, 0.1);">Error: ${escapeHtml(err.error || 'Failed to load history.')}</div>`;
            return;
        }
        const data = await res.json();
        const history = (data && data.history) ? data.history : [];
        if (history.length === 0) {
            list.innerHTML = '<div class="result-content" style="background:transparent; padding:18px;">No history yet. Generate a roadmap to create one.</div>';
            return;
        }

        list.innerHTML = history.map((h) => {
            const goal = h.goal && h.goal !== 'Not Specified' ? h.goal : 'Untitled';
            const created = h.created_at || '';
            const fav = Number(h.is_favorite) === 1;
            return `
                <div class="history-item">
                    <div class="history-meta">
                        <div class="history-goal">${escapeHtml(goal)}</div>
                        <div class="history-time">${escapeHtml(created)}</div>
                    </div>
                    <div class="history-actions">
                        <button class="mini-btn" onclick="viewHistory(${h.id})">View</button>
                        <button class="mini-btn" onclick="toggleFavorite(${h.id}, ${fav ? 'false' : 'true'})">${fav ? 'Unfav' : 'Fav'}</button>
                        <button class="mini-btn mini-btn-danger" onclick="deleteHistory(${h.id})">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        list.innerHTML = '<div class="result-content" style="color:#f87171; background:rgba(239, 68, 68, 0.1);">Failed to load history.</div>';
    }
}

async function viewHistory(id) {
    try {
        const res = await fetch('/api/history?limit=50');
        if (!res.ok) return;
        const data = await res.json();
        const history = (data && data.history) ? data.history : [];
        const item = history.find((h) => Number(h.id) === Number(id));
        if (!item) return;

        showTab('analysis');
        const resultArea = document.getElementById('resultArea');
        resultArea.style.justifyContent = 'flex-start';
        resultArea.style.alignItems = 'flex-start';
        resultArea.innerHTML = `<div class="result-content" style="background:transparent;">${item.result_html || ''}</div>`;
    } catch (e) { }
}

async function toggleFavorite(id, isFavorite) {
    try {
        await fetch(`/api/history/${id}/favorite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isFavorite })
        });
        loadHistory();
    } catch (e) { }
}

async function deleteHistory(id) {
    const ok = confirm('Delete this history item?');
    if (!ok) return;
    try {
        await fetch(`/api/history/${id}`, { method: 'DELETE' });
        loadHistory();
    } catch (e) { }
}

async function generateAnalysis() {
    const goal = document.getElementById('goal').value;
    const skills = document.getElementById('skills').value;
    const scores = document.getElementById('scores').value;
    const experience = document.getElementById('experience').value;

    const resultArea = document.getElementById('resultArea');

    const safeGoal = goal && goal.trim() !== '' ? goal.trim() : '';
    const safeSkills = skills && skills.trim() !== '' ? skills.trim() : '';
    if (!safeGoal || !safeSkills) {
        resultArea.style.justifyContent = 'center';
        resultArea.style.alignItems = 'center';
        resultArea.innerHTML = '<div class="result-content" style="color:#f87171; background:rgba(239, 68, 68, 0.1);">Target Role and Current Skills are required.</div>';
        return;
    }

    // Force the UI onto Analysis tab and lock History while work is in progress.
    showTab('analysis');
    setHistoryLocked(true);

    // Show Loading state
    resultArea.style.justifyContent = 'center';
    resultArea.style.alignItems = 'center';
    resultArea.innerHTML = `
        <div style="text-align:center; animation: fadeIn 0.4s;">
            <div class="loading"></div>
            <p style="margin-top:20px; color:#a78bfa; font-weight:500; letter-spacing: 0.5px;">Generating your roadmap...</p>
        </div>
    `;

    try {
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goal, skills, scores, experience })
        });

        const data = await response.json();

        resultArea.style.justifyContent = 'flex-start';
        resultArea.style.alignItems = 'flex-start';

        if (response.ok) {
            resultArea.innerHTML = `<div class="result-content" style="background:transparent;">${data.result}</div>`;
            // refresh history in background if tab exists
            if (document.getElementById('historyList')) loadHistory();
        } else {
            resultArea.innerHTML = `<div class="result-content" style="color:#f87171; background:rgba(239, 68, 68, 0.1);">Error: ${data.error}</div>`;
        }
    } catch (error) {
        resultArea.style.justifyContent = 'flex-start';
        resultArea.style.alignItems = 'flex-start';
        resultArea.innerHTML = '<div class="result-content" style="color:#f87171; background:rgba(239, 68, 68, 0.1);">Failed to connect to the backend server. Ensure it is running.</div>';
    } finally {
        // Unlock history no matter success/failure.
        setHistoryLocked(false);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    loadMe();
});

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const limitInMB = 5;
    if (file.size > limitInMB * 1024 * 1024) {
        alert('File size exceeds 5MB');
        event.target.value = '';
        return;
    }

    const uploadStatus = document.getElementById('uploadStatus');
    uploadStatus.style.display = 'block';
    uploadStatus.textContent = 'Parsing resume...';
    uploadStatus.style.color = '#a78bfa';

    const formData = new FormData();
    formData.append('resume', file);

    try {
        const response = await fetch('/parse-resume', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            // Auto-fill form
            document.getElementById('skills').value = data.parsed.skills || '';
            document.getElementById('scores').value = data.parsed.scores || '';
            document.getElementById('experience').value = data.parsed.experience || '';

            uploadStatus.textContent = 'Resume Parsed & Populated!';
            uploadStatus.style.color = '#34d399'; // Emerald green
        } else {
            uploadStatus.textContent = `Error: ${data.error}`;
            uploadStatus.style.color = '#f87171';
        }
    } catch (error) {
        uploadStatus.textContent = 'Failed to connect to parsing backend.';
        uploadStatus.style.color = '#f87171';
    }
}
