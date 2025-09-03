// Integration Script for Improved MyFilmPeople Database System
// This script integrates the enhanced database, Firebase auth, and recovery systems

// Enhanced initialization function
async function initializeImprovedMyFilmPeople() {
  console.log('🚀 Initializing improved MyFilmPeople system...');
  
  try {
    // Initialize enhanced database
    console.log('📊 Setting up enhanced database...');
    window.enhancedDb = new EnhancedPeopleDatabase();
    
    // Initialize data recovery system
    console.log('🛡️ Setting up data recovery system...');
    window.recoveryManager = new DataRecoveryManager(window.enhancedDb);
    
    // Initialize improved Firebase auth
    console.log('🔐 Setting up improved Firebase authentication...');
    window.improvedFirebaseAuth = new ImprovedFirebaseAuthManager();
    
    // Set up the enhanced UI manager
    console.log('🎨 Setting up enhanced UI manager...');
    window.enhancedUIManager = new EnhancedUIManager(window.enhancedDb);
    
    // Connect Firebase auth to UI
    window.improvedFirebaseAuth.connectAuthUI();
    
    // Initialize the UI with current data
    window.enhancedUIManager.initializeUI();
    
    // Set up error handling and monitoring
    setupErrorHandling();
    
    // Set up performance monitoring
    setupPerformanceMonitoring();
    
    console.log('✅ Improved MyFilmPeople system initialized successfully!');
    
    // Show system status
    displaySystemStatus();
    
  } catch (error) {
    console.error('❌ Failed to initialize improved system:', error);
    
    // Fallback to basic system
    console.log('🔄 Falling back to basic system...');
    initializeBasicSystem();
  }
}

// Enhanced UI Manager that works with the new database
class EnhancedUIManager {
  constructor(database) {
    this.database = database;
    this.people = [];
    this.activeTab = 'directors';
    this.currentSort = { 
      directors: 'alphabetical', 
      actors: 'alphabetical', 
      others: 'alphabetical' 
    };
    this.isLoading = false;
    this.searchTerm = '';
    
    // Set up event listeners
    this.setupEventListeners();
  }
  
  initializeUI() {
    console.log('🎨 Initializing enhanced UI...');
    
    try {
      // Load data from database
      this.people = this.database.getAllPeople();
      
      // Render the UI
      this.renderPeople();
      this.updateTabButtons();
      this.updateStats();
      
      // Set up search functionality
      this.setupSearch();
      
      // Set up periodic UI updates
      this.setupPeriodicUpdates();
      
      console.log('✅ Enhanced UI initialized with', this.people.length, 'people');
      
    } catch (error) {
      console.error('❌ UI initialization failed:', error);
      this.showErrorMessage('Failed to load data. Please refresh the page.');
    }
  }
  
  async addPerson(personData) {
    try {
      this.setLoading(true);
      
      // Add through database (handles validation and sync)
      const newPerson = await this.database.addPerson(personData);
      
      // Update UI data
      this.people = this.database.getAllPeople();
      
      // Refresh UI
      this.renderPeople();
      this.updateStats();
      
      this.showSuccessMessage(`Added ${newPerson.name}!`);
      this.closeModal();
      
      return newPerson;
      
    } catch (error) {
      console.error('❌ Failed to add person:', error);
      this.showErrorMessage(error.message);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }
  
  async updatePerson(id, updates) {
    try {
      this.setLoading(true);
      
      // Update through database
      const updatedPerson = await this.database.updatePerson(id, updates);
      
      if (updatedPerson) {
        // Update UI data
        this.people = this.database.getAllPeople();
        
        // Refresh UI
        this.renderPeople();
        this.updateStats();
        
        this.showSuccessMessage(`Updated ${updatedPerson.name}!`);
        this.closeModal();
        
        return updatedPerson;
      } else {
        throw new Error('Person not found');
      }
      
    } catch (error) {
      console.error('❌ Failed to update person:', error);
      this.showErrorMessage(error.message);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }
  
  async deletePerson(id) {
    try {
      this.setLoading(true);
      
      // Delete through database
      const deletedPerson = await this.database.deletePerson(id);
      
      // Update UI data
      this.people = this.database.getAllPeople();
      
      // Refresh UI
      this.renderPeople();
      this.updateStats();
      
      this.showSuccessMessage(`Deleted ${deletedPerson.name}!`);
      
      return deletedPerson;
      
    } catch (error) {
      console.error('❌ Failed to delete person:', error);
      this.showErrorMessage(error.message);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }
  
  renderPeople() {
    try {
      const filteredPeople = this.getFilteredPeople();
      const sortedPeople = this.getSortedPeople(filteredPeople);
      
      // Render each tab
      this.renderTab('directors', sortedPeople.filter(p => p.role === 'director'));
      this.renderTab('actors', sortedPeople.filter(p => p.role === 'actor'));
      this.renderTab('others', sortedPeople.filter(p => !['director', 'actor'].includes(p.role)));
      
      // Update tab counts
      this.updateTabCounts();
      
    } catch (error) {
      console.error('❌ Render failed:', error);
      this.showErrorMessage('Failed to display people. Please refresh the page.');
    }
  }
  
  renderTab(tabName, people) {
    const container = document.getElementById(`${tabName}-list`);
    if (!container) return;
    
    if (people.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No ${tabName} found</p>
          <button onclick="window.enhancedUIManager.openModal()" class="add-person-btn">
            Add ${tabName.slice(0, -1)}
          </button>
        </div>
      `;
      return;
    }
    
    const html = people.map(person => this.createPersonCard(person)).join('');
    container.innerHTML = html;
  }
  
  createPersonCard(person) {
    const profilePicture = person.profilePicture || 'assets/images/default-avatar.png';
    const letterboxdUrl = person.letterboxdUrl || '#';
    const notes = person.notes ? `<p class="notes">${this.escapeHtml(person.notes)}</p>` : '';
    
    return `
      <div class="person-card" data-id="${person.id}">
        <img src="${profilePicture}" alt="${this.escapeHtml(person.name)}" class="profile-picture" 
             onerror="this.src='assets/images/default-avatar.png'">
        <div class="person-info">
          <h3>${this.escapeHtml(person.name)}</h3>
          <p class="role">${this.escapeHtml(person.role)}</p>
          ${notes}
          <div class="person-actions">
            <a href="${letterboxdUrl}" target="_blank" class="letterboxd-link" title="View on Letterboxd">
              📽️ Letterboxd
            </a>
            <button onclick="window.enhancedUIManager.editPerson(${person.id})" class="edit-btn" title="Edit">
              ✏️
            </button>
            <button onclick="window.enhancedUIManager.confirmDelete(${person.id})" class="delete-btn" title="Delete">
              🗑️
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  // === SEARCH AND FILTERING ===
  
  setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value.toLowerCase();
        this.renderPeople();
      });
    }
  }
  
  getFilteredPeople() {
    if (!this.searchTerm) return this.people;
    
    return this.people.filter(person => 
      person.name.toLowerCase().includes(this.searchTerm) ||
      person.role.toLowerCase().includes(this.searchTerm) ||
      (person.notes && person.notes.toLowerCase().includes(this.searchTerm))
    );
  }
  
  getSortedPeople(people) {
    const sortType = this.currentSort[this.activeTab] || 'alphabetical';
    
    switch (sortType) {
      case 'alphabetical':
        return [...people].sort((a, b) => a.name.localeCompare(b.name));
      case 'reverse':
        return [...people].sort((a, b) => b.name.localeCompare(a.name));
      case 'recent':
        return [...people].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
      case 'random':
        return this.shuffleArray([...people]);
      default:
        return people;
    }
  }
  
  // === UI UTILITIES ===
  
  setLoading(isLoading) {
    this.isLoading = isLoading;
    
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = isLoading ? 'block' : 'none';
    }
    
    // Disable buttons during loading
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
      btn.disabled = isLoading;
    });
  }
  
  updateTabCounts() {
    const counts = {
      directors: this.people.filter(p => p.role === 'director').length,
      actors: this.people.filter(p => p.role === 'actor').length,
      others: this.people.filter(p => !['director', 'actor'].includes(p.role)).length
    };
    
    Object.entries(counts).forEach(([tab, count]) => {
      const button = document.querySelector(`[data-tab="${tab}"]`);
      if (button) {
        const existingCount = button.querySelector('.count');
        if (existingCount) {
          existingCount.textContent = count;
        } else {
          button.innerHTML += ` <span class="count">${count}</span>`;
        }
      }
    });
  }
  
  updateStats() {
    const stats = this.database.getStats();
    const statsElement = document.getElementById('stats');
    
    if (statsElement) {
      statsElement.innerHTML = `
        <div class="stats-item">
          <span class="stats-label">Total People:</span>
          <span class="stats-value">${stats.total}</span>
        </div>
        <div class="stats-item">
          <span class="stats-label">Cloud Sync:</span>
          <span class="stats-value">${stats.cloudSyncEnabled ? '✅' : '❌'}</span>
        </div>
        ${stats.queuedOperations > 0 ? `
        <div class="stats-item">
          <span class="stats-label">Syncing:</span>
          <span class="stats-value">${stats.queuedOperations} pending</span>
        </div>
        ` : ''}
      `;
    }
  }
  
  setupPeriodicUpdates() {
    // Update stats every 30 seconds
    setInterval(() => {
      if (!this.isLoading) {
        this.updateStats();
      }
    }, 30000);
  }
  
  // === EVENT HANDLERS ===
  
  setupEventListeners() {
    document.addEventListener('DOMContentLoaded', () => {
      // Tab switching
      document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
          this.switchTab(button.dataset.tab);
        });
      });
      
      // Sort options
      document.querySelectorAll('.sort-option').forEach(option => {
        option.addEventListener('click', () => {
          this.changeSort(option.dataset.sort);
        });
      });
      
      // Modal controls
      const addBtn = document.getElementById('addPersonBtn');
      if (addBtn) {
        addBtn.addEventListener('click', () => this.openModal());
      }
      
      const closeModal = document.getElementById('closeModal');
      if (closeModal) {
        closeModal.addEventListener('click', () => this.closeModal());
      }
    });
  }
  
  switchTab(tabName) {
    this.activeTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(tab => {
      tab.classList.toggle('active', tab.id === `${tabName}-tab`);
    });
    
    this.renderPeople();
  }
  
  changeSort(sortType) {
    this.currentSort[this.activeTab] = sortType;
    this.renderPeople();
  }
  
  // === MODAL MANAGEMENT ===
  
  openModal(editingId = null) {
    const modal = document.getElementById('addPersonModal');
    const form = document.getElementById('addPersonForm');
    
    if (modal && form) {
      if (editingId) {
        this.populateEditForm(editingId);
      } else {
        form.reset();
      }
      
      modal.style.display = 'block';
    }
  }
  
  closeModal() {
    const modal = document.getElementById('addPersonModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }
  
  populateEditForm(id) {
    const person = this.people.find(p => p.id === id);
    if (person) {
      document.getElementById('personName').value = person.name;
      document.getElementById('personRole').value = person.role;
      document.getElementById('personNotes').value = person.notes || '';
      document.getElementById('editingId').value = id;
    }
  }
  
  async editPerson(id) {
    this.openModal(id);
  }
  
  async confirmDelete(id) {
    const person = this.people.find(p => p.id === id);
    if (person && confirm(`Are you sure you want to delete ${person.name}?`)) {
      await this.deletePerson(id);
    }
  }
  
  // === MESSAGE SYSTEM ===
  
  showSuccessMessage(message) {
    this.showMessage(message, 'success');
  }
  
  showErrorMessage(message) {
    this.showMessage(message, 'error');
  }
  
  showMessage(message, type = 'info') {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    // Create message element if it doesn't exist
    let messageEl = document.getElementById('message');
    if (!messageEl) {
      messageEl = document.createElement('div');
      messageEl.id = 'message';
      document.body.appendChild(messageEl);
    }
    
    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      messageEl.style.display = 'none';
    }, 5000);
  }
  
  // === UTILITIES ===
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

// Error handling and monitoring
function setupErrorHandling() {
  window.addEventListener('error', (event) => {
    console.error('❌ Global error:', event.error);
    
    // Try to recover from database errors
    if (event.error && event.error.message.includes('database')) {
      console.log('🔄 Attempting database recovery...');
      if (window.recoveryManager) {
        window.recoveryManager.emergencyRecovery();
      }
    }
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled promise rejection:', event.reason);
  });
}

function setupPerformanceMonitoring() {
  // Monitor performance and log slow operations
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.duration > 1000) { // Log operations taking more than 1 second
        console.warn('⚠️ Slow operation detected:', entry.name, entry.duration + 'ms');
      }
    });
  });
  
  observer.observe({ entryTypes: ['measure'] });
}

function displaySystemStatus() {
  const status = {
    database: !!window.enhancedDb,
    recovery: !!window.recoveryManager,
    firebase: !!window.improvedFirebaseAuth,
    ui: !!window.enhancedUIManager,
    peopleCount: window.enhancedDb ? window.enhancedDb.getAllPeople().length : 0
  };
  
  console.log('📊 System Status:', status);
  
  // Display status in UI if element exists
  const statusElement = document.getElementById('systemStatus');
  if (statusElement) {
    statusElement.innerHTML = `
      <div class="system-status">
        <h4>System Status</h4>
        <ul>
          <li>Database: ${status.database ? '✅' : '❌'}</li>
          <li>Recovery: ${status.recovery ? '✅' : '❌'}</li>
          <li>Firebase: ${status.firebase ? '✅' : '❌'}</li>
          <li>UI: ${status.ui ? '✅' : '❌'}</li>
          <li>People: ${status.peopleCount}</li>
        </ul>
      </div>
    `;
  }
}

function initializeBasicSystem() {
  console.log('🔄 Initializing basic fallback system...');
  
  // Initialize the original system as fallback
  if (typeof PeopleDatabase !== 'undefined') {
    window.db = new PeopleDatabase();
    window.uiManager = new UIManager(window.db);
    window.uiManager.initializeData();
    console.log('✅ Basic system initialized');
  } else {
    console.error('❌ No fallback system available');
  }
}

// Export the initialization function
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    initializeImprovedMyFilmPeople, 
    EnhancedUIManager 
  };
} else {
  window.initializeImprovedMyFilmPeople = initializeImprovedMyFilmPeople;
  window.EnhancedUIManager = EnhancedUIManager;
}
