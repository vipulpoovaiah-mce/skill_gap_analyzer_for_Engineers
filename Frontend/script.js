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

async function generateAnalysis() {
    const goal = document.getElementById('goal').value;
    const skills = document.getElementById('skills').value;
    const scores = document.getElementById('scores').value;
    const experience = document.getElementById('experience').value;

    const resultArea = document.getElementById('resultArea');
    
    // Show Loading state
    resultArea.style.justifyContent = 'center';
    resultArea.style.alignItems = 'center';
    resultArea.innerHTML = `
        <div style="text-align:center; animation: fadeIn 0.4s;">
            <div class="loading"></div>
            <p style="margin-top:20px; color:#a78bfa; font-weight:500; letter-spacing: 0.5px;">Synthesizing AI Analysis with Job Market Data...</p>
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
        } else {
            resultArea.innerHTML = `<div class="result-content" style="color:#f87171; background:rgba(239, 68, 68, 0.1);">Error: ${data.error}</div>`;
        }
    } catch (error) {
        resultArea.style.justifyContent = 'flex-start';
        resultArea.style.alignItems = 'flex-start';
        resultArea.innerHTML = '<div class="result-content" style="color:#f87171; background:rgba(239, 68, 68, 0.1);">Failed to connect to the Python backend server. Ensure it is running on port 5000.</div>';
    }
}

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
    uploadStatus.textContent = 'Parsing with AI...';
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
            document.getElementById('goal').value = data.parsed.goal || '';
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
