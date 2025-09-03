// Authentication UI Components
// Handles login/register forms and user authentication flow

let authManager = null;

// Try to import Firebase auth manager with error handling
try {
  const { authManager: firebaseAuthManager } = await import('./firebase-config.js');
  authManager = firebaseAuthManager;
  console.log('✅ Firebase AuthManager loaded');
} catch (error) {
  console.log('📱 Firebase AuthManager not available:', error.message);
}

class AuthUI {
  constructor() {
    // Only initialize if Firebase is available
    if (authManager) {
      this.setupEventListeners();
      this.setupMigrationListeners();
    } else {
      console.log('📱 Auth UI disabled - Firebase not available');
    }
  }

  setupEventListeners() {
    // Check if user has local data and show sync prompt
    this.checkAndShowSyncPrompt();
    
    // Handle login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Handle register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }

    // Handle Google sign-in
    const googleSignInBtn = document.getElementById('googleSignInBtn');
    const googleSignInRegisterBtn = document.getElementById('googleSignInRegisterBtn');
    const showRegisterFromPrompt = document.getElementById('showRegisterFromPrompt');
    
    if (googleSignInBtn) {
      googleSignInBtn.addEventListener('click', () => this.handleGoogleSignIn());
    }
    
    if (googleSignInRegisterBtn) {
      googleSignInRegisterBtn.addEventListener('click', () => this.handleGoogleSignIn());
    }
    
    if (showRegisterFromPrompt) {
      showRegisterFromPrompt.addEventListener('click', () => this.showAuthModal('register'));
    }

    // Handle logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    // Handle auth modal toggles
    const showLoginBtn = document.getElementById('showLoginBtn');
    const showRegisterBtn = document.getElementById('showRegisterBtn');
    const authModalClose = document.getElementById('authModalClose');
    
    if (showLoginBtn) {
      showLoginBtn.addEventListener('click', () => this.showAuthModal('login'));
    }
    
    if (showRegisterBtn) {
      showRegisterBtn.addEventListener('click', () => this.showAuthModal('register'));
    }
    
    if (authModalClose) {
      authModalClose.addEventListener('click', () => this.hideAuthModal());
    }

    // Switch between login and register
    const switchToRegister = document.getElementById('switchToRegister');
    const switchToLogin = document.getElementById('switchToLogin');
    
    if (switchToRegister) {
      switchToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchAuthMode('register');
      });
    }
    
    if (switchToLogin) {
      switchToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchAuthMode('login');
      });
    }
  }

  setupMigrationListeners() {
    // Listen for migration events
    window.addEventListener('migrationProgress', (e) => {
      this.showMigrationProgress(e.detail.current, e.detail.total, e.detail.percentage);
    });

    window.addEventListener('migrationComplete', () => {
      this.showMigrationSuccess();
    });

    window.addEventListener('migrationError', (e) => {
      this.showMigrationError(e.detail);
    });
  }

  async handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const loginBtn = document.getElementById('loginSubmitBtn');
    
    if (!email || !password) {
      this.showAuthError('Please fill in all fields');
      return;
    }

    // Show loading state
    this.setButtonLoading(loginBtn, true);
    
    try {
      const result = await authManager.signInWithEmail(email, password);
      
      if (result.success) {
        this.hideAuthModal();
        this.showAuthSuccess('Welcome back!');
      } else {
        this.showAuthError(result.error);
      }
    } catch (error) {
      this.showAuthError('Login failed. Please try again.');
    } finally {
      this.setButtonLoading(loginBtn, false);
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const displayName = document.getElementById('registerDisplayName').value.trim();
    const registerBtn = document.getElementById('registerSubmitBtn');
    
    if (!email || !password || !confirmPassword) {
      this.showAuthError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      this.showAuthError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      this.showAuthError('Password must be at least 6 characters');
      return;
    }

    // Show loading state
    this.setButtonLoading(registerBtn, true);
    
    try {
      const result = await authManager.signUpWithEmail(email, password, displayName);
      
      if (result.success) {
        this.hideAuthModal();
        this.showAuthSuccess('Account created successfully! Your data is being synced...');
      } else {
        this.showAuthError(result.error);
      }
    } catch (error) {
      this.showAuthError('Registration failed. Please try again.');
    } finally {
      this.setButtonLoading(registerBtn, false);
    }
  }

  async handleGoogleSignIn() {
    const googleBtn = document.getElementById('googleSignInBtn');
    this.setButtonLoading(googleBtn, true);
    
    try {
      const result = await authManager.signInWithGoogle();
      
      if (result.success) {
        this.hideAuthModal();
        this.showAuthSuccess('Welcome! Your data is being synced...');
      } else {
        this.showAuthError(result.error);
      }
    } catch (error) {
      this.showAuthError('Google sign-in failed. Please try again.');
    } finally {
      this.setButtonLoading(googleBtn, false);
    }
  }

  async handleLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    this.setButtonLoading(logoutBtn, true);
    
    try {
      const result = await authManager.signOut();
      
      if (result.success) {
        this.showAuthSuccess('Signed out successfully. Your data is still saved locally!');
      } else {
        this.showAuthError('Logout failed. Please try again.');
      }
    } catch (error) {
      this.showAuthError('Logout failed. Please try again.');
    } finally {
      this.setButtonLoading(logoutBtn, false);
    }
  }

  showAuthModal(mode = 'login') {
    const modal = document.getElementById('authModal');
    if (!modal) return;

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    this.switchAuthMode(mode);
  }

  hideAuthModal() {
    const modal = document.getElementById('authModal');
    if (!modal) return;

    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Clear forms
    this.clearAuthForms();
    this.clearAuthMessages();
  }

  switchAuthMode(mode) {
    const loginForm = document.getElementById('loginFormContainer');
    const registerForm = document.getElementById('registerFormContainer');
    const modalTitle = document.getElementById('authModalTitle');
    
    if (mode === 'login') {
      if (loginForm) loginForm.style.display = 'block';
      if (registerForm) registerForm.style.display = 'none';
      if (modalTitle) modalTitle.textContent = 'Sign In to MyFilmPeople';
    } else {
      if (loginForm) loginForm.style.display = 'none';
      if (registerForm) registerForm.style.display = 'block';
      if (modalTitle) modalTitle.textContent = 'Create Your Account';
    }
    
    this.clearAuthMessages();
  }

  clearAuthForms() {
    const forms = ['loginForm', 'registerForm'];
    forms.forEach(formId => {
      const form = document.getElementById(formId);
      if (form) form.reset();
    });
  }

  clearAuthMessages() {
    const errorDiv = document.getElementById('authError');
    if (errorDiv) {
      errorDiv.style.display = 'none';
      errorDiv.textContent = '';
    }
  }

  showAuthError(message) {
    const errorDiv = document.getElementById('authError');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
      errorDiv.className = 'auth-message error';
    }
  }

  showAuthSuccess(message) {
    // Use the existing UI message system
    if (window.uiManager && window.uiManager.showMessage) {
      window.uiManager.showMessage(message);
    } else {
      console.log('✅', message);
    }
  }

  setButtonLoading(button, isLoading) {
    if (!button) return;
    
    if (isLoading) {
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.textContent = 'Loading...';
      button.classList.add('loading');
    } else {
      button.disabled = false;
      button.textContent = button.dataset.originalText || button.textContent;
      button.classList.remove('loading');
    }
  }

  // Migration progress UI
  showMigrationProgress(current, total, percentage) {
    let progressModal = document.getElementById('migrationProgressModal');
    
    if (!progressModal) {
      progressModal = this.createMigrationProgressModal();
    }
    
    const progressBar = progressModal.querySelector('.migration-progress-bar');
    const progressText = progressModal.querySelector('.migration-progress-text');
    
    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
    }
    
    if (progressText) {
      progressText.textContent = `Syncing your data... ${current}/${total} items (${percentage}%)`;
    }
    
    progressModal.style.display = 'block';
  }

  showMigrationSuccess() {
    const progressModal = document.getElementById('migrationProgressModal');
    if (progressModal) {
      progressModal.style.display = 'none';
    }
    
    this.showAuthSuccess('🎉 Your data has been successfully synced to the cloud!');
  }

  showMigrationError(error) {
    const progressModal = document.getElementById('migrationProgressModal');
    if (progressModal) {
      progressModal.style.display = 'none';
    }
    
    console.error('Migration error:', error);
    this.showAuthError('Failed to sync data. Your data is still saved locally.');
  }

  createMigrationProgressModal() {
    const modal = document.createElement('div');
    modal.id = 'migrationProgressModal';
    modal.className = 'migration-modal';
    modal.innerHTML = `
      <div class="migration-modal-content">
        <h3>Syncing Your Data</h3>
        <div class="migration-progress-container">
          <div class="migration-progress-bar"></div>
        </div>
        <p class="migration-progress-text">Preparing to sync...</p>
        <small>Please don't close this window while syncing.</small>
      </div>
    `;
    
    document.body.appendChild(modal);
    return modal;
  }

  // Check if user has local data and show sync prompt
  showSyncPrompt() {
    const hasLocalData = localStorage.getItem('myfilmpeople_data');
    if (!hasLocalData) return;

    const data = JSON.parse(hasLocalData);
    if (data.length === 0) return;

    // Show a non-intrusive prompt to encourage sign-up
    const syncPrompt = document.getElementById('syncPrompt');
    if (syncPrompt) {
      syncPrompt.style.display = 'block';
      syncPrompt.querySelector('.sync-count').textContent = data.length;
    }
  }

  // Check if user has local data and show sync prompt
  checkAndShowSyncPrompt() {
    // Only show if user is not signed in
    if (window.authManager && window.authManager.isSignedIn()) {
      return;
    }

    const hasLocalData = localStorage.getItem('myfilmpeople_data');
    if (!hasLocalData) return;

    try {
      const data = JSON.parse(hasLocalData);
      if (!Array.isArray(data) || data.length === 0) return;

      // Show sync prompt
      const syncPrompt = document.getElementById('syncPrompt');
      const syncCount = document.querySelector('.sync-count');
      
      if (syncPrompt && syncCount) {
        syncCount.textContent = data.length;
        syncPrompt.classList.remove('hidden');
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
          if (syncPrompt && !window.authManager?.isSignedIn()) {
            syncPrompt.classList.add('hidden');
          }
        }, 10000);
      }
    } catch (error) {
      console.error('Error checking local data:', error);
    }
  }

  hideSyncPrompt() {
    const syncPrompt = document.getElementById('syncPrompt');
    if (syncPrompt) {
      syncPrompt.classList.add('hidden');
    }
  }
}

// Initialize auth UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.authUI = new AuthUI();
});

export { AuthUI };
