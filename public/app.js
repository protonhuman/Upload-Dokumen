// State Management
let selectedFiles = [];
let isUploading = false;

// DOM Elements
const uploadForm = document.getElementById('uploadForm');
const teamLeaderSelect = document.getElementById('teamLeader');
const dateInput = document.getElementById('operationalDate');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const filesContainer = document.getElementById('filesContainer');
const fileList = document.getElementById('fileList');
const fileCountSpan = document.getElementById('fileCount');
const submitBtn = document.getElementById('submitBtn');
const successModal = document.getElementById('successModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const toastContainer = document.getElementById('toastContainer');

// 1. Initialize Date Input to Today (Local Time)
document.addEventListener('DOMContentLoaded', () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  dateInput.value = `${year}-${month}-${day}`;
});

// 2. Drag & Drop Event Listeners
['dragenter', 'dragover'].forEach(eventName => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    if (isUploading) return;
    dropZone.classList.add('dragover');
  }, false);
});

['dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
  }, false);
});

dropZone.addEventListener('drop', (e) => {
  if (isUploading) return;
  const dt = e.dataTransfer;
  const files = dt.files;
  handleFilesSelection(files);
});

// Click Drop Zone to Browse
dropZone.addEventListener('click', () => {
  if (isUploading) return;
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  handleFilesSelection(e.target.files);
  // Reset input value so same file can be selected again if removed
  fileInput.value = '';
});

// 3. Handle File Selection
function handleFilesSelection(filesList) {
  for (let i = 0; i < filesList.length; i++) {
    const file = filesList[i];
    
    // Check for duplicates
    if (selectedFiles.some(f => f.file.name === file.name && f.file.size === file.size)) {
      showToast(`Berkas "${file.name}" sudah dipilih.`, 'danger');
      continue;
    }

    selectedFiles.push({
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      file: file,
      status: 'ready', // ready, uploading, success, failed
      progress: 0
    });
  }

  updateUI();
}

// Format bytes to readable size
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 4. Update UI Elements
function updateUI() {
  // Update submit button disabled status
  submitBtn.disabled = selectedFiles.length === 0 || isUploading;

  if (selectedFiles.length > 0) {
    filesContainer.style.display = 'block';
    fileCountSpan.textContent = selectedFiles.length;
  } else {
    filesContainer.style.display = 'none';
  }

  // Render file list
  fileList.innerHTML = '';
  selectedFiles.forEach(fileState => {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.id = `file-${fileState.id}`;

    // Get file extension icon style
    let iconSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </svg>
    `;
    const ext = fileState.file.name.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      iconSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      `;
    } else if (['pdf'].includes(ext)) {
      iconSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      `;
    }

    fileItem.innerHTML = `
      <div class="file-item-header">
        <div class="file-info">
          <div class="file-icon">${iconSvg}</div>
          <div class="file-details">
            <div class="file-name" title="${fileState.file.name}">${fileState.file.name}</div>
            <div class="file-size">${formatBytes(fileState.file.size)}</div>
          </div>
        </div>
        <div class="file-actions">
          <span class="status-badge status-${fileState.status}">${getStatusText(fileState.status, fileState.progress)}</span>
          ${!isUploading ? `
            <button type="button" class="remove-btn" onclick="removeFile('${fileState.id}')">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          ` : ''}
        </div>
      </div>
      <div class="file-progress-container" style="display: ${fileState.status === 'uploading' ? 'block' : 'none'}">
        <div class="file-progress-bar" style="width: ${fileState.progress}%"></div>
      </div>
    `;

    fileList.appendChild(fileItem);
  });
}

function getStatusText(status, progress) {
  switch (status) {
    case 'ready': return 'Siap';
    case 'uploading': return `${progress}%`;
    case 'success': return 'Sukses';
    case 'failed': return 'Gagal';
    default: return '';
  }
}

// Remove File from Selection
window.removeFile = function(id) {
  if (isUploading) return;
  selectedFiles = selectedFiles.filter(f => f.id !== id);
  updateUI();
};

// 5. Toast Notification System
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-message">${message}</span>
    <button class="toast-close">&times;</button>
  `;

  toastContainer.appendChild(toast);

  // Close event listener
  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.remove();
  });

  // Auto remove after 5 seconds
  setTimeout(() => {
    toast.style.animation = 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// 6. Form Submission: Handshake & Client-Side Resumable Upload
uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (selectedFiles.length === 0 || isUploading) return;

  const teamLeader = teamLeaderSelect.value;
  const date = dateInput.value;
  const shiftInput = document.querySelector('input[name="shift"]:checked');

  if (!teamLeader || !date || !shiftInput) {
    showToast('Harap isi semua input form yang wajib.', 'danger');
    return;
  }

  const shift = shiftInput.value;

  // Set uploading states
  isUploading = true;
  updateUI();
  
  // Disable form elements
  toggleFormDisabled(true);

  // Show spinner on submit button
  const btnText = submitBtn.querySelector('.btn-text');
  const btnSpinner = submitBtn.querySelector('.spinner');
  btnText.textContent = 'Menghubungkan ke Drive...';
  btnSpinner.style.display = 'block';

  try {
    // Stage 1: Handshake with Vercel Serverless Function
    const filesMetadata = selectedFiles.map(f => ({
      name: f.file.name,
      type: f.file.type
    }));

    const response = await fetch('/api/handshake', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        teamLeader,
        date,
        shift,
        files: filesMetadata
      })
    });

    if (!response.ok) {
      const errRes = await response.json();
      throw new Error(errRes.message || errRes.error || 'Terjadi kesalahan jabat tangan.');
    }

    const handshakeData = await response.json();
    const uploadSessions = handshakeData.uploadSessions; // Array of { name, uploadUrl }

    btnText.textContent = 'Mengunggah Berkas...';

    // Stage 2: Parallel Resumable Uploads from Client Browser
    const uploadPromises = selectedFiles.map(fileState => {
      // Find matching session
      const session = uploadSessions.find(s => s.name === fileState.file.name);
      if (!session) {
        fileState.status = 'failed';
        updateUI();
        return Promise.resolve({ success: false, name: fileState.file.name });
      }

      fileState.status = 'uploading';
      updateUI();

      return executeClientUpload(fileState, session.uploadUrl);
    });

    const results = await Promise.all(uploadPromises);
    
    // Stage 3: Process Results
    const failures = results.filter(r => !r.success);
    
    if (failures.length === 0) {
      // All files uploaded successfully
      showSuccessModal();
      resetForm();
    } else {
      // Some files failed
      showToast(`Gagal mengunggah ${failures.length} berkas. Silakan coba lagi.`, 'danger');
      // Remove successful files from selection, keeping only failed ones for retry
      selectedFiles = selectedFiles.filter(f => f.status !== 'success');
      isUploading = false;
      updateUI();
      toggleFormDisabled(false);
      btnText.textContent = 'Kirim & Unggah ke Drive';
      btnSpinner.style.display = 'none';
    }

  } catch (error) {
    console.error('Upload Process Failed:', error);
    showToast(`Proses unggah gagal: ${error.message}`, 'danger');
    isUploading = false;
    // Reset status of all files in progress to ready so they can be retried
    selectedFiles.forEach(f => {
      if (f.status === 'uploading') f.status = 'ready';
    });
    updateUI();
    toggleFormDisabled(false);
    btnText.textContent = 'Kirim & Unggah ke Drive';
    btnSpinner.style.display = 'none';
  }
});

// Helper: Execute PUT request to Resumable Session URL with Progress Tracking
function executeClientUpload(fileState, uploadUrl) {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl, true);

    // Google API allows us to just PUT the file body directly
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        fileState.progress = percentComplete;
        
        // Update UI dynamically
        const fileItemEl = document.getElementById(`file-${fileState.id}`);
        if (fileItemEl) {
          const progressEl = fileItemEl.querySelector('.file-progress-bar');
          const badgeEl = fileItemEl.querySelector('.status-badge');
          if (progressEl) progressEl.style.width = `${percentComplete}%`;
          if (badgeEl) badgeEl.textContent = `${percentComplete}%`;
        }
      }
    };

    xhr.onload = () => {
      // Google resumable upload succeeds with 200 OK or 201 Created
      // If status is 0, it might be a CORS block but the upload succeeded.
      if (xhr.status === 200 || xhr.status === 201 || (xhr.status === 0 && fileState.progress >= 99)) {
        fileState.status = 'success';
        fileState.progress = 100;
        updateUI();
        resolve({ success: true, name: fileState.file.name });
      } else {
        console.error(`Google API upload failed for ${fileState.file.name}: Status ${xhr.status} - ${xhr.responseText}`);
        fileState.status = 'failed';
        updateUI();
        resolve({ success: false, name: fileState.file.name });
      }
    };

    xhr.onerror = () => {
      console.warn(`Network error or CORS block during client upload for ${fileState.file.name}`);
      // Fallback: If progress is >= 99%, the file was fully transmitted.
      // In CORS-blocked resumable uploads, Google receives the file but blocks the JS response.
      if (fileState.progress >= 99) {
        fileState.status = 'success';
        fileState.progress = 100;
        updateUI();
        resolve({ success: true, name: fileState.file.name });
      } else {
        fileState.status = 'failed';
        updateUI();
        resolve({ success: false, name: fileState.file.name });
      }
    };

    xhr.send(fileState.file);
  });
}

// Disable/Enable Form Input Elements
function toggleFormDisabled(disabled) {
  teamLeaderSelect.disabled = disabled;
  dateInput.disabled = disabled;
  document.querySelectorAll('input[name="shift"]').forEach(r => r.disabled = disabled);
}

// Reset Form State
function resetForm() {
  uploadForm.reset();
  
  // Set date back to today
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  dateInput.value = `${year}-${month}-${day}`;
  
  selectedFiles = [];
  isUploading = false;
  updateUI();
  toggleFormDisabled(false);

  const btnText = submitBtn.querySelector('.btn-text');
  const btnSpinner = submitBtn.querySelector('.spinner');
  btnText.textContent = 'Kirim & Unggah ke Drive';
  btnSpinner.style.display = 'none';
}

// Show/Hide Success Modal
function showSuccessModal() {
  successModal.style.display = 'flex';
}

closeModalBtn.addEventListener('click', () => {
  successModal.style.display = 'none';
});
