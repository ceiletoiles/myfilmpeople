// TMDb API Configuration
const TMDB_CONFIG = {
  API_KEY: '5f1ead96e48e2379102c77c2546331a4',
  BASE_URL: 'https://api.themoviedb.org/3',
  IMAGE_BASE_URL: 'https://image.tmdb.org/t/p/w185',
  
  // Helper to get person search URL
  getPersonSearchUrl: (query) => 
    `${TMDB_CONFIG.BASE_URL}/search/person?api_key=${TMDB_CONFIG.API_KEY}&query=${encodeURIComponent(query)}`,
  
  // Helper to get person details URL
  getPersonDetailsUrl: (personId) =>
    `${TMDB_CONFIG.BASE_URL}/person/${personId}?api_key=${TMDB_CONFIG.API_KEY}`,
    
  // Helper to generate Letterboxd URL
  generateLetterboxdUrl: (name, knownForDepartment) => {
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    
    // Map departments to correct Letterboxd URL paths
    const departmentMap = {
      'Directing': 'director',
      'Acting': 'actor', 
      'Writing': 'writer',
      'Camera': 'cinematographer',
      'Sound': 'composer',
      'Production': 'producer',
      'Editing': 'editor'
    };
    
    const department = departmentMap[knownForDepartment] || 'actor';
    return `https://letterboxd.com/${department}/${slug}/`;
  }
};

// Data Storage and Management
class PeopleDatabase {
  constructor() {
    this.people = this.loadFromStorage();
    this.nextId = this.getNextId();
  }
  
  loadFromStorage() {
    try {
      const data = localStorage.getItem('myfilmpeople_data');
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading from storage:', error);
    }
    
    // Return default data if nothing in storage
    return this.getDefaultPeople();
  }
  
  saveToStorage() {
    try {
      localStorage.setItem('myfilmpeople_data', JSON.stringify(this.people));
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  }
  
  getNextId() {
    if (this.people.length === 0) return 1;
    return Math.max(...this.people.map(p => p.id || 0)) + 1;
  }
  
  addPerson(personData) {
    // Check for duplicates
    const existingPerson = this.people.find(p => 
      p.name.toLowerCase() === personData.name.toLowerCase() && 
      p.role === personData.role
    );
    
    if (existingPerson) {
      throw new Error(`${personData.name} (${personData.role}) already exists in your collection!`);
    }
    
    const person = {
      id: this.nextId++,
      name: personData.name,
      role: personData.role,
      letterboxdUrl: personData.letterboxdUrl || '',
      profilePicture: personData.profilePicture || '',
      notes: personData.notes || '',
      dateAdded: new Date().toISOString()
    };
    
    this.people.push(person);
    this.saveToStorage();
    return person;
  }
  
  deletePerson(id) {
    this.people = this.people.filter(p => p.id !== id);
    this.saveToStorage();
  }
  
  updatePerson(id, updates) {
    const index = this.people.findIndex(p => p.id === id);
    if (index !== -1) {
      this.people[index] = { ...this.people[index], ...updates };
      this.saveToStorage();
      return this.people[index];
    }
    return null;
  }
  
  getPeopleByRole(role) {
    return this.people.filter(p => p.role === role);
  }
  
  getAllPeople() {
    return this.people;
  }
  
  searchPeople(query) {
    const searchTerm = query.toLowerCase();
    return this.people.filter(p => 
      p.name.toLowerCase().includes(searchTerm) ||
      p.role.toLowerCase().includes(searchTerm) ||
      (p.notes && p.notes.toLowerCase().includes(searchTerm))
    );
  }

  getDefaultPeople() {
    // Convert existing hardcoded data to new format
    const defaultDirectors = [
      { name: "Alfred Hitchcock" },
      { name: "Martin Scorsese" },
      { name: "Steven Spielberg" },
      { name: "Akira Kurosawa" },
      { name: "Satyajit Ray" },
      { name: "Andrei Tarkovsky" },
      { name: "Christopher Nolan" },
      { name: "Quentin Tarantino" },
      { name: "Hayao Miyazaki" },
      { name: "David Fincher" },
      { name: "Paul Thomas Anderson" },
      { name: "Denis Villeneuve" },
      { name: "Wes Anderson" },
      { name: "Guillermo del Toro" },
      { name: "Bong Joon Ho" },
      { name: "Wong Kar Wai" },
      { name: "Park Chan Wook" },
      { name: "Terrence Malick" },
      { name: "David Lynch" },
      { name: "Yorgos Lanthimos" },
      { name: "Ridley Scott" },
      { name: "Lars von Trier" },
      { name: "Darren Aronofsky" },
      { name: "Michael Haneke" },
      { name: "Luca Guadagnino" },
      { name: "Damien Chazelle" },
      { name: "Greta Gerwig" },
      { name: "Sofia Coppola" },
      { name: "Gaspar Noé" },
      { name: "Ari Aster" },
      { name: "Robert Eggers" },
      { name: "Jordan Peele" },
      { name: "Alex Garland" },
      { name: "Sean Baker" },
      { name: "Celine Song" },
      { name: "Ryan Coogler" },
      { name: "Joachim Trier" },
      { name: "Danny Boyle" },
      { name: "Woody Allen" }
    ];

    const defaultActors = [
      { name: "Leonardo DiCaprio" },
      { name: "Robert De Niro" },
      { name: "Al Pacino" },
      { name: "Meryl Streep" },
      { name: "Joaquin Phoenix" },
      { name: "Daniel Day-Lewis" },
      { name: "Frances McDormand" },
      { name: "Oscar Isaac" },
      { name: "Tilda Swinton" },
      { name: "Adam Driver" },
      { name: "Saoirse Ronan" },
      { name: "Timothée Chalamet" },
      { name: "Margot Robbie" },
      { name: "Ryan Gosling" },
      { name: "Jake Gyllenhaal" },
      { name: "Amy Adams" },
      { name: "Michael Shannon" },
      { name: "Isabelle Huppert" },
      { name: "Song Kang-ho" },
      { name: "Choi Min-sik" },
      { name: "Toshiro Mifune" },
      { name: "Charlotte Gainsbourg" },
      { name: "Mads Mikkelsen" },
      { name: "Cate Blanchett" },
      { name: "Christian Bale" },
      { name: "Lupita Nyong'o" },
      { name: "John Turturro" },
      { name: "Thomasin McKenzie" },
      { name: "Anya Taylor-Joy" },
      { name: "Robert Pattinson" },
      { name: "Emma Stone" },
      { name: "LaKeith Stanfield" }
    ];

    let id = 1;
    const people = [];
    const baseDate = new Date('2025-01-01');
    
    // Add directors with different dates
    defaultDirectors.forEach((director, index) => {
      people.push({
        id: id++,
        name: director.name,
        role: 'director',
        letterboxdUrl: `https://letterboxd.com/director/${director.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}/`,
        notes: '',
        dateAdded: new Date(baseDate.getTime() + (index * 24 * 60 * 60 * 1000)).toISOString() // Different days
      });
    });
    
    // Add actors with different dates
    defaultActors.forEach((actor, index) => {
      people.push({
        id: id++,
        name: actor.name,
        role: 'actor',
        letterboxdUrl: `https://letterboxd.com/actor/${actor.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}/`,
        notes: '',
        dateAdded: new Date(baseDate.getTime() + ((defaultDirectors.length + index) * 24 * 60 * 60 * 1000)).toISOString() // Different days
      });
    });
    
    return people;
  }
}

// Initialize database
const db = new PeopleDatabase();

// UI Management
class UIManager {
  constructor() {
    this.activeTab = 'directors';
    this.currentSort = { directors: 'alphabetical', actors: 'alphabetical', others: 'alphabetical' };
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.renderPeople();
    this.updateTabButtons();
  }
  
  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', () => {
        this.activeTab = button.getAttribute('data-tab');
        this.updateTabButtons();
        this.renderPeople();
      });
    });
    
    // Add person modal
    const addBtn = document.getElementById('addPersonBtn');
    const modal = document.getElementById('addPersonModal');
    const closeBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const form = document.getElementById('addPersonForm');
    
    addBtn.addEventListener('click', () => this.openModal());
    closeBtn.addEventListener('click', () => this.closeModal());
    cancelBtn.addEventListener('click', () => this.closeModal());
    form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    
    // TMDb search functionality
    const searchInput = document.getElementById('personSearch');
    const searchResults = document.getElementById('searchResults');
    let searchTimeout;
    
    if (searchInput && searchResults) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length < 2) {
          searchResults.style.display = 'none';
          return;
        }
        
        searchTimeout = setTimeout(() => {
          this.searchTMDbPeople(query);
        }, 300);
      });
    } else {
      console.error('TMDb search elements not found:', { searchInput, searchResults });
    }
    
    // Hide search results when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        searchResults.style.display = 'none';
      }
    });
    
    // Initialize custom select
    this.initializeCustomSelect();
    
    // Update Letterboxd URL when role changes
    const roleSelect = document.getElementById('personRole');
    const nameInput = document.getElementById('personName');
    const urlInput = document.getElementById('letterboxdUrl');
    
    if (roleSelect && nameInput && urlInput) {
      const updateLetterboxdUrl = () => {
        const name = nameInput.value.trim();
        const role = roleSelect.value;
        if (name && role) {
          // Map form roles to TMDb department names for URL generation
          const departmentMap = {
            'director': 'Directing',
            'actor': 'Acting',
            'writer': 'Writing',      
            'cinematographer': 'Camera', 
            'composer': 'Sound',    
            'producer': 'Production',    
            'editor': 'Editing',      
            'other': 'Acting'        // Default to actor for other roles
          };
          const department = departmentMap[role] || 'Acting';
          const url = TMDB_CONFIG.generateLetterboxdUrl(name, department);
          urlInput.value = url;
        }
      };
      
      roleSelect.addEventListener('change', updateLetterboxdUrl);
      nameInput.addEventListener('input', updateLetterboxdUrl);
    } else {
      console.error('Form elements not found:', { roleSelect, nameInput, urlInput });
    }
    
    // Image search button functionality  
    const searchImageBtn = document.getElementById('searchImageBtn');
    if (searchImageBtn) {
      searchImageBtn.addEventListener('click', () => {
        const name = document.getElementById('personName').value.trim();
        if (name) {
          // Open multiple useful image sources in new tabs
          const searchQueries = [
            `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(name + ' actor director')}`,
            `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(name)}`,
            `https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(name)}&title=Special:MediaSearch&go=Go&type=image`
          ];
          
          // Open the first search (Google Images)
          window.open(searchQueries[0], '_blank');
          
          // Show user instructions
          this.showAlert('Image Search Opened', `Opening image search for "${name}"\n\nTo get image URL:\n1. Right-click on any image\n2. Select "Copy image address" or "Copy image URL"\n3. Paste it in the Profile Picture URL field`);
        } else {
          this.showAlert('Name Required', 'Please enter a person\'s name first');
        }
      });
    }
    
    // Close modal on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeModal();
    });
    
    // Search functionality
    ['directors', 'actors', 'others'].forEach(role => {
      const searchBtn = document.getElementById(`${role}SearchButton`);
      const searchInput = document.getElementById(`${role}Search`);
      
      if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleSearch(searchInput, searchBtn);
        });
      }
      
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.handleSearch(e.target.value, role);
        });
      }
    });
    
    // Sort functionality
    ['directors', 'actors', 'others'].forEach(role => {
      const sortBtn = document.getElementById(`${role}SortButton`);
      const dropdown = document.getElementById(`${role}SortDropdown`);
      
      if (sortBtn) {
        sortBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleDropdown(dropdown, sortBtn);
        });
      }
      
      if (dropdown) {
        dropdown.addEventListener('click', (e) => {
          if (e.target.classList.contains('sort-option')) {
            const sortType = e.target.getAttribute('data-sort');
            this.handleSort(sortType, role);
            this.closeDropdowns();
          }
        });
      }
    });
    
    // Close dropdowns/search on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.control-group') && !e.target.closest('.control-button')) {
        this.closeDropdowns();
        this.closeSearch();
      }
      
      // Close card menus when clicking outside
      if (!e.target.closest('.card-menu-btn') && !e.target.closest('.card-menu')) {
        document.querySelectorAll('.card-menu').forEach(menu => {
          menu.classList.remove('show');
          menu.closest('.director-card').classList.remove('menu-open');
        });
      }
    });
  }
  
  openModal() {
    document.getElementById('addPersonModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
  }
  
  async searchTMDbPeople(query) {
    // Check if API key is available
    if (!TMDB_CONFIG.API_KEY) {
      this.displaySearchError('API key not configured - you can still add people manually');
      return;
    }
    
    try {
      const url = TMDB_CONFIG.getPersonSearchUrl(query);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('TMDb API Error:', response.status, response.statusText);
        if (response.status === 401) {
          this.displaySearchError('Invalid API key');
          return;
        } else if (response.status === 404) {
          this.displaySearchError('API endpoint not found');
          return;
        } else {
          this.displaySearchError(`API Error: ${response.status}`);
          return;
        }
      }
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        this.displaySearchResults(data.results.slice(0, 5)); // Show top 5 results
      } else {
        this.displayNoResults();
      }
    } catch (error) {
      console.error('Network error searching TMDb:', error);
      this.displaySearchError('Network error - check connection');
    }
  }
  
  displaySearchResults(results) {
    const searchResults = document.getElementById('searchResults');
    searchResults.innerHTML = '';
    
    results.forEach(person => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      
      const avatarUrl = person.profile_path 
        ? `${TMDB_CONFIG.IMAGE_BASE_URL}${person.profile_path}`
        : null;
      
      const knownFor = person.known_for_department || 'Unknown';
      const roleDisplay = this.mapTMDbDepartmentToRole(knownFor);
      
      item.innerHTML = `
        ${avatarUrl ? 
          `<img src="${avatarUrl}" alt="${person.name}" class="search-result-avatar">` :
          `<div class="search-result-avatar"></div>`
        }
        <div class="search-result-info">
          <div class="search-result-name">${person.name}</div>
          <div class="search-result-role">${roleDisplay}</div>
        </div>
      `;
      
      item.addEventListener('click', () => {
        this.selectPerson(person);
        searchResults.style.display = 'none';
      });
      
      searchResults.appendChild(item);
    });
    
    searchResults.style.display = 'block';
  }
  
  displayNoResults() {
    const searchResults = document.getElementById('searchResults');
    searchResults.innerHTML = '<div class="search-result-item" style="color: #678;">No results found</div>';
    searchResults.style.display = 'block';
  }
  
  displaySearchError(message = 'Search error - check API key') {
    const searchResults = document.getElementById('searchResults');
    searchResults.innerHTML = `
      <div class="search-result-item" style="color: #ff8000;">${message}</div>
      <div class="search-result-item" style="color: #9ab; font-size: 0.8rem; font-style: italic;">
        You can still add people manually by typing their name and selecting a role.
      </div>
    `;
    searchResults.style.display = 'block';
  }
  
  mapTMDbDepartmentToRole(department) {
    const mapping = {
      'Directing': 'Director',
      'Acting': 'Actor',
      'Writing': 'Writer',
      'Camera': 'Cinematographer',
      'Sound': 'Composer',
      'Production': 'Producer',
      'Editing': 'Editor'
    };
    
    return mapping[department] || department;
  }
  
  selectPerson(person) {
    const knownFor = person.known_for_department || 'Acting';
    const role = this.mapTMDbDepartmentToRole(knownFor).toLowerCase();
    const letterboxdUrl = TMDB_CONFIG.generateLetterboxdUrl(person.name, knownFor);
    const profilePicUrl = person.profile_path 
      ? `${TMDB_CONFIG.IMAGE_BASE_URL}${person.profile_path}`
      : '';
    
    // Auto-fill form fields
    document.getElementById('personName').value = person.name;
    this.setCustomSelectValue(role); // Use custom select method
    document.getElementById('letterboxdUrl').value = letterboxdUrl;
    document.getElementById('profilePictureUrl').value = profilePicUrl;
    
    // Clear search
    document.getElementById('personSearch').value = '';
    
    // Show success message
    this.showMessage(`Auto-filled data for ${person.name}!`);
  }
  
  closeModal() {
    document.getElementById('addPersonModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    document.getElementById('addPersonForm').reset();
    document.getElementById('searchResults').style.display = 'none';
    
    // Reset custom select
    this.resetCustomSelect();
    
    // Reset form to add mode
    const form = document.getElementById('addPersonForm');
    const submitBtn = document.getElementById('submitBtn');
    
    form.removeAttribute('data-editing-id');
    submitBtn.textContent = 'Add Person';
    document.querySelector('.modal-header h2').textContent = 'Add New Person';
  }
  
  handleFormSubmit(e) {
    e.preventDefault();
    
    const personData = {
      name: document.getElementById('personName').value.trim(),
      role: document.getElementById('personRole').value,
      letterboxdUrl: document.getElementById('letterboxdUrl').value.trim(),
      profilePicture: document.getElementById('profilePictureUrl').value.trim(),
      notes: document.getElementById('notes').value.trim()
    };
    
    if (!personData.name || !personData.role) {
      this.showAlert('Required Fields Missing', 'Please fill in required fields (Name and Role)');
      return;
    }
    
    const form = document.getElementById('addPersonForm');
    const editingId = form.getAttribute('data-editing-id');
    
    try {
      if (editingId) {
        // Update existing person
        db.updatePerson(parseInt(editingId), personData);
        this.showMessage(`${personData.name} updated successfully!`);
      } else {
        // Add new person
        db.addPerson(personData);
        this.showMessage(`${personData.name} added successfully!`);
      }
      
      this.renderPeople();
      this.closeModal();
    } catch (error) {
      // Show error message for duplicates
      this.showAlert('Error', error.message);
    }
  }
  
  showMessage(text) {
    // Simple success message
    const message = document.createElement('div');
    message.textContent = text;
    message.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff8000;
      color: white;
      padding: 12px 20px;
      border-radius: 3px;
      z-index: 3000;
      font-family: 'Graphik', sans-serif;
      font-size: 0.875rem;
      animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(message);
    
    setTimeout(() => {
      message.remove();
    }, 3000);
  }

  // Custom alert modal
  showAlert(title, message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 2500;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      
      const modal = document.createElement('div');
      modal.style.cssText = `
        background: #2c3440;
        border: 1px solid #456;
        border-radius: 6px;
        max-width: 400px;
        width: 90%;
        padding: 0;
        animation: modalSlideIn 0.3s ease;
      `;
      
      modal.innerHTML = `
        <div style="padding: 20px 24px; border-bottom: 1px solid #456;">
          <h3 style="margin: 0; color: #cdf; font-size: 1.1rem;">${title}</h3>
        </div>
        <div style="padding: 20px 24px;">
          <p style="margin: 0; color: #9ab; line-height: 1.5; white-space: pre-line;">${message}</p>
        </div>
        <div style="padding: 16px 24px; border-top: 1px solid #456; text-align: right;">
          <button id="alertOkBtn" style="background: #ff8000; color: white; border: none; padding: 8px 16px; border-radius: 3px; cursor: pointer; font-family: 'Graphik', sans-serif;">OK</button>
        </div>
      `;
      
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      
      const closeModal = () => {
        document.body.removeChild(overlay);
        document.body.style.overflow = '';
        resolve();
      };
      
      modal.querySelector('#alertOkBtn').addEventListener('click', closeModal);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
      });
      
      document.body.style.overflow = 'hidden';
    });
  }

  // Custom confirm modal
  showConfirm(title, message) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 2500;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      
      const modal = document.createElement('div');
      modal.style.cssText = `
        background: #2c3440;
        border: 1px solid #456;
        border-radius: 6px;
        max-width: 400px;
        width: 90%;
        padding: 0;
        animation: modalSlideIn 0.3s ease;
      `;
      
      modal.innerHTML = `
        <div style="padding: 20px 24px; border-bottom: 1px solid #456;">
          <h3 style="margin: 0; color: #cdf; font-size: 1.1rem;">${title}</h3>
        </div>
        <div style="padding: 20px 24px;">
          <p style="margin: 0; color: #9ab; line-height: 1.5;">${message}</p>
        </div>
        <div style="padding: 16px 24px; border-top: 1px solid #456; text-align: right; display: flex; gap: 12px; justify-content: flex-end;">
          <button id="confirmCancelBtn" style="background: transparent; color: #9ab; border: 1px solid #456; padding: 8px 16px; border-radius: 3px; cursor: pointer; font-family: 'Graphik', sans-serif;">Cancel</button>
          <button id="confirmOkBtn" style="background: #ff4444; color: white; border: none; padding: 8px 16px; border-radius: 3px; cursor: pointer; font-family: 'Graphik', sans-serif;">Confirm</button>
        </div>
      `;
      
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      
      const closeModal = (result) => {
        document.body.removeChild(overlay);
        document.body.style.overflow = '';
        resolve(result);
      };
      
      modal.querySelector('#confirmOkBtn').addEventListener('click', () => closeModal(true));
      modal.querySelector('#confirmCancelBtn').addEventListener('click', () => closeModal(false));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal(false);
      });
      
      document.body.style.overflow = 'hidden';
    });
  }

  initializeCustomSelect() {
    const customSelect = document.getElementById('personRoleSelect');
    const hiddenInput = document.getElementById('personRole');
    const trigger = customSelect.querySelector('.custom-select-trigger');
    const options = customSelect.querySelectorAll('.custom-option');
    const textElement = customSelect.querySelector('.custom-select-text');
    
    // Toggle dropdown
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      customSelect.classList.toggle('open');
    });
    
    // Handle option selection
    options.forEach(option => {
      option.addEventListener('click', () => {
        const value = option.getAttribute('data-value');
        const text = option.textContent;
        
        // Update hidden input
        hiddenInput.value = value;
        
        // Update display text
        textElement.textContent = text;
        textElement.classList.toggle('placeholder', value === '');
        
        // Update selected state
        options.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        
        // Close dropdown
        customSelect.classList.remove('open');
        
        // Trigger change event for existing logic
        hiddenInput.dispatchEvent(new Event('change'));
      });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.custom-select')) {
        customSelect.classList.remove('open');
      }
    });
    
    // Set initial placeholder state
    textElement.classList.add('placeholder');
  }

  resetCustomSelect() {
    const customSelect = document.getElementById('personRoleSelect');
    const hiddenInput = document.getElementById('personRole');
    const textElement = customSelect.querySelector('.custom-select-text');
    const options = customSelect.querySelectorAll('.custom-option');
    
    // Reset to default state
    hiddenInput.value = '';
    textElement.textContent = 'Select role...';
    textElement.classList.add('placeholder');
    
    // Remove selected state from all options
    options.forEach(opt => opt.classList.remove('selected'));
    
    // Close dropdown
    customSelect.classList.remove('open');
  }

  setCustomSelectValue(value) {
    const customSelect = document.getElementById('personRoleSelect');
    const hiddenInput = document.getElementById('personRole');
    const textElement = customSelect.querySelector('.custom-select-text');
    const options = customSelect.querySelectorAll('.custom-option');
    
    // Find the option with the matching value
    const targetOption = customSelect.querySelector(`[data-value="${value}"]`);
    
    if (targetOption) {
      // Update hidden input
      hiddenInput.value = value;
      
      // Update display text
      textElement.textContent = targetOption.textContent;
      textElement.classList.toggle('placeholder', value === '');
      
      // Update selected state
      options.forEach(opt => opt.classList.remove('selected'));
      targetOption.classList.add('selected');
    }
  }
  
  showNotesModal(person) {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    // Create modal content
    const modal = document.createElement('div');
    modal.className = 'notes-modal';
    modal.style.cssText = `
      background: #2c3440;
      border: 1px solid #456;
      border-radius: 6px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      padding: 0;
    `;
    
    modal.innerHTML = `
      <div style="padding: 8px 15px; position: relative;">
        <button id="closeNotesModal" style="background: none; border: none; color: #9ab; font-size: 1.5rem; cursor: pointer; padding: 0; position: absolute; top: 8px; right: 15px;">&times;</button>
      </div>
      <div style="padding: 20px;">
        <div style="color: #9ab; line-height: 1.6; white-space: pre-wrap;">${person.notes}</div>
      </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Close modal handlers
    const closeModal = () => {
      document.body.removeChild(overlay);
      document.body.style.overflow = '';
    };
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    
    modal.querySelector('#closeNotesModal').addEventListener('click', closeModal);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }
  
  renderPeople() {
    const directorsGrid = document.getElementById('directorsGrid');
    const actorsGrid = document.getElementById('actorsGrid');
    const othersGrid = document.getElementById('othersGrid');
    
    if (directorsGrid) {
      directorsGrid.innerHTML = '';
      const directors = this.getSortedPeople('director');
      directors.forEach(person => {
        directorsGrid.appendChild(this.createPersonCard(person));
      });
    }
    
    if (actorsGrid) {
      actorsGrid.innerHTML = '';
      const actors = this.getSortedPeople('actor');
      actors.forEach(person => {
        actorsGrid.appendChild(this.createPersonCard(person));
      });
    }
    
    if (othersGrid) {
      othersGrid.innerHTML = '';
      const others = this.getSortedPeopleOthers(); // Get all non-director/actor roles
      others.forEach(person => {
        othersGrid.appendChild(this.createPersonCard(person));
      });
    }
  }
  
  createPersonCard(person) {
    const card = document.createElement('div');
    card.className = 'director-card';
    card.setAttribute('data-name', person.name);
    card.setAttribute('data-id', person.id);
    
    // Add profile picture if available
    let cardContent = '';
    if (person.profilePicture) {
      cardContent += `<img src="${person.profilePicture}" alt="${person.name}" class="person-avatar">`;
    }
    
    const link = document.createElement('a');
    link.href = person.letterboxdUrl || '#';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    
    let linkContent = cardContent + `<span class="person-name">${person.name}</span>`;
    
    // Add role badge for non-director/actor roles
    if (person.role !== 'director' && person.role !== 'actor') {
      const roleBadge = `<span class="role-badge">${person.role}</span>`;
      linkContent += roleBadge;
    }
    
    // Add notes indicator if person has notes
    if (person.notes && person.notes.trim()) {
      linkContent += '<span class="notes-indicator" title="Has personal notes">📝</span>';
    }
    
    link.innerHTML = linkContent;
    
    if (!person.letterboxdUrl) {
      link.style.color = '#678';
      link.style.cursor = 'default';
      link.onclick = (e) => e.preventDefault();
    }
    
    card.appendChild(link);
    
    // Add 3-dots menu for all cards (both default and user-added)
    const menuButton = document.createElement('button');
    menuButton.className = 'card-menu-btn';
    menuButton.innerHTML = '⋯';
    menuButton.title = 'Options';
    
    const menu = document.createElement('div');
    menu.className = 'card-menu';
    
    // Add menu items
    const menuItems = [];
    
    // Delete option for user-added people
    if (person.id > 1000 || person.dateAdded > new Date('2025-01-01').toISOString()) {
      menuItems.push({
        text: 'Delete',
        action: async () => {
          const confirmed = await this.showConfirm('Delete Person', `Are you sure you want to delete ${person.name}?`);
          if (confirmed) {
            db.deletePerson(person.id);
            this.renderPeople();
            this.showMessage(`${person.name} deleted`);
          }
        },
        className: 'menu-item-delete'
      });
    }
    
    // Edit option for user-added people
    if (person.id > 1000 || person.dateAdded > new Date('2025-01-01').toISOString()) {
      menuItems.push({
        text: 'Edit',
        action: () => {
          this.editPerson(person);
        },
        className: 'menu-item-edit'
      });
    }
    
    // View Notes option if notes exist
    if (person.notes && person.notes.trim()) {
      menuItems.push({
        text: 'View Notes',
        action: () => {
          this.showNotesModal(person);
        },
        className: 'menu-item-notes'
      });
    }
    
    // Copy Letterboxd URL option
    if (person.letterboxdUrl) {
      menuItems.push({
        text: 'Copy URL',
        action: () => {
          navigator.clipboard.writeText(person.letterboxdUrl).then(() => {
            this.showMessage('Letterboxd URL copied!');
          });
        },
        className: 'menu-item-copy'
      });
    }
    
    // Create menu items
    menuItems.forEach(item => {
      const menuItem = document.createElement('div');
      menuItem.className = `card-menu-item ${item.className}`;
      menuItem.textContent = item.text;
      menuItem.onclick = (e) => {
        e.stopPropagation();
        item.action();
        menu.classList.remove('show');
        card.classList.remove('menu-open');
      };
      menu.appendChild(menuItem);
    });
    
    // Only add menu if there are items
    if (menuItems.length > 0) {
      menuButton.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Close all other menus and remove menu-open class
        document.querySelectorAll('.card-menu').forEach(m => {
          m.classList.remove('show');
          m.closest('.director-card').classList.remove('menu-open');
        });
        
        // Toggle this menu
        const isShowing = menu.classList.toggle('show');
        
        // Add/remove menu-open class to card for z-index control
        if (isShowing) {
          card.classList.add('menu-open');
        } else {
          card.classList.remove('menu-open');
        }
      };
      
      card.appendChild(menuButton);
      card.appendChild(menu);
    }
    
    return card;
  }
  
  editPerson(person) {
    // Open modal with existing data
    this.openModal();
    
    // Fill form with existing data
    document.getElementById('personName').value = person.name;
    this.setCustomSelectValue(person.role); // Use custom select method
    document.getElementById('letterboxdUrl').value = person.letterboxdUrl || '';
    document.getElementById('profilePictureUrl').value = person.profilePicture || '';
    document.getElementById('notes').value = person.notes || '';
    
    // Change form to edit mode
    const form = document.getElementById('addPersonForm');
    const submitBtn = document.getElementById('submitBtn');
    
    // Store the person ID for editing
    form.setAttribute('data-editing-id', person.id);
    submitBtn.textContent = 'Update Person';
    
    // Change modal title
    document.querySelector('.modal-header h2').textContent = 'Edit Person';
  }
  
  getSortedPeople(role) {
    let people = db.getPeopleByRole(role);
    const sortType = this.currentSort[role + 's'] || 'alphabetical';
    
    let sorted;
    switch(sortType) {
      case 'alphabetical':
        sorted = people.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'reverse':
        sorted = people.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'date-added':
        sorted = people.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
        break;
      default:
        sorted = people;
    }
    
    return sorted;
  }
  
  getSortedPeopleOthers() {
    // Get all people who are not directors or actors
    let people = db.getAllPeople().filter(person => 
      person.role !== 'director' && person.role !== 'actor'
    );
    const sortType = this.currentSort.others || 'alphabetical';
    
    let sorted;
    switch(sortType) {
      case 'alphabetical':
        sorted = people.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'reverse':
        sorted = people.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'date-added':
        sorted = people.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
        break;
      default:
        sorted = people;
    }
    
    return sorted;
  }
  
  updateTabButtons() {
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === this.activeTab);
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === this.activeTab + '-tab');
    });
  }
  
  toggleSearch(searchInput, searchButton) {
    const isExpanded = searchInput.classList.contains('expanded');
    const tabContent = searchButton.closest('.tab-content');
    
    // Close all search inputs first
    this.closeSearch();
    
    if (!isExpanded) {
      searchInput.classList.add('expanded');
      searchButton.classList.add('active');
      tabContent.classList.add('has-search-active');
      setTimeout(() => searchInput.focus(), 300);
    }
  }
  
  closeSearch() {
    document.querySelectorAll('.search-input').forEach(input => {
      input.classList.remove('expanded');
      input.value = '';
    });
    document.querySelectorAll('.control-button').forEach(b => {
      if (b.textContent === '⌕') b.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(tc => {
      tc.classList.remove('has-search-active');
    });
    this.renderPeople(); // Reset to show all
  }
  
  handleSearch(query, role) {
    const grid = document.getElementById(role + 'Grid');
    const cards = grid.querySelectorAll('.director-card');
    
    cards.forEach(card => {
      const name = card.getAttribute('data-name').toLowerCase();
      const isVisible = name.includes(query.toLowerCase());
      card.style.display = isVisible ? 'block' : 'none';
    });
  }
  
  toggleDropdown(dropdown, button) {
    const isOpen = dropdown.classList.contains('show');
    
    this.closeDropdowns();
    
    if (!isOpen) {
      dropdown.classList.add('show');
      button.classList.add('active');
    }
  }
  
  closeDropdowns() {
    document.querySelectorAll('.sort-dropdown').forEach(d => {
      d.classList.remove('show');
    });
    document.querySelectorAll('.control-button').forEach(b => {
      if (b.textContent === '↕') b.classList.remove('active');
    });
  }
  
  handleSort(sortType, role) {
    if (role === 'others') {
      this.currentSort.others = sortType;
    } else {
      this.currentSort[role + 's'] = sortType;
    }
    
    // Update active state in dropdown
    const dropdown = document.getElementById(role + 'sSortDropdown');
    if (dropdown) {
      dropdown.querySelectorAll('.sort-option').forEach(opt => {
        opt.classList.toggle('active', opt.getAttribute('data-sort') === sortType);
      });
    }
    
    this.renderPeople();
    this.closeSearch(); // Reset search when sorting
  }
}

// Initialize the app
const ui = new UIManager();
