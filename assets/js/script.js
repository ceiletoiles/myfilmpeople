// TMDb API Configuration with CORS proxy support
const TMDB_CONFIG = {
  API_KEY: CONFIG?.TMDB?.API_KEY || null, // No hardcoded fallback
  BASE_URL: 'https://api.themoviedb.org/3',
  IMAGE_BASE_URL: 'https://image.tmdb.org/t/p/w185',
  
  // CORS proxy options (for regions where TMDb is blocked)
  CORS_PROXIES: [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://cors-anywhere.herokuapp.com/'
  ],
  
  // Helper to get person search URL with optional proxy
  getPersonSearchUrl: (query, useProxy = false, proxyIndex = 0) => {
    const url = `${TMDB_CONFIG.BASE_URL}/search/person?api_key=${TMDB_CONFIG.API_KEY}&query=${encodeURIComponent(query)}`;
    if (!useProxy) return url;
    
    // Handle different proxy formats
    const proxy = TMDB_CONFIG.CORS_PROXIES[proxyIndex];
    if (proxy.includes('allorigins.win')) {
      return `${proxy}${encodeURIComponent(url)}`;
    } else {
      // For corsproxy.io and cors-anywhere, don't double-encode
      return `${proxy}${url}`;
    }
  },
  
  // Helper to get person details URL with optional proxy
  getPersonDetailsUrl: (personId, useProxy = false, proxyIndex = 0) => {
    const url = `${TMDB_CONFIG.BASE_URL}/person/${personId}?api_key=${TMDB_CONFIG.API_KEY}`;
    if (!useProxy) return url;
    
    // Handle different proxy formats
    const proxy = TMDB_CONFIG.CORS_PROXIES[proxyIndex];
    if (proxy.includes('allorigins.win')) {
      return `${proxy}${encodeURIComponent(url)}`;
    } else {
      // For corsproxy.io and cors-anywhere, don't double-encode
      return `${proxy}${url}`;
    }
  },
  
  // Helper to get combined credits URL for a person
  getPersonCombinedCreditsUrl: (personId, useProxy = false, proxyIndex = 0) => {
    const url = `${TMDB_CONFIG.BASE_URL}/person/${personId}/combined_credits?api_key=${TMDB_CONFIG.API_KEY}`;
    if (!useProxy) return url;
    
    // Handle different proxy formats
    const proxy = TMDB_CONFIG.CORS_PROXIES[proxyIndex];
    if (proxy.includes('allorigins.win')) {
      return `${proxy}${encodeURIComponent(url)}`;
    } else {
      // For corsproxy.io and cors-anywhere, don't double-encode
      return `${proxy}${url}`;
    }
  },
  
  // Helper to get company details URL with optional proxy
  getCompanyDetailsUrl: (companyId, useProxy = false, proxyIndex = 0) => {
    const url = `${TMDB_CONFIG.BASE_URL}/company/${companyId}?api_key=${TMDB_CONFIG.API_KEY}`;
    if (!useProxy) return url;
    
    // Handle different proxy formats
    const proxy = TMDB_CONFIG.CORS_PROXIES[proxyIndex];
    if (proxy.includes('allorigins.win')) {
      return `${proxy}${encodeURIComponent(url)}`;
    } else {
      // For corsproxy.io and cors-anywhere, don't double-encode
      return `${proxy}${url}`;
    }
  },
  
  // Helper to get movies by company URL with optional proxy
  getMoviesByCompanyUrl: (companyId, useProxy = false, proxyIndex = 0) => {
    const url = `${TMDB_CONFIG.BASE_URL}/company/${companyId}/movies?api_key=${TMDB_CONFIG.API_KEY}`;
    if (!useProxy) return url;
    
    // Handle different proxy formats
    const proxy = TMDB_CONFIG.CORS_PROXIES[proxyIndex];
    if (proxy.includes('allorigins.win')) {
      return `${proxy}${encodeURIComponent(url)}`;
    } else {
      // For corsproxy.io and cors-anywhere, don't double-encode
      return `${proxy}${url}`;
    }
  },

  // Helper to get movie search URL with optional proxy
  getMovieSearchUrl: (query, useProxy = false, proxyIndex = 0) => {
    const url = `${TMDB_CONFIG.BASE_URL}/search/movie?api_key=${TMDB_CONFIG.API_KEY}&query=${encodeURIComponent(query)}&include_adult=false`;
    if (!useProxy) return url;
    
    // Handle different proxy formats
    const proxy = TMDB_CONFIG.CORS_PROXIES[proxyIndex];
    if (proxy.includes('allorigins.win')) {
      return `${proxy}${encodeURIComponent(url)}`;
    } else {
      // For corsproxy.io and cors-anywhere, don't double-encode
      return `${proxy}${url}`;
    }
  },

  // Helper to get movie details URL with optional proxy
  getMovieDetailsUrl: (movieId, useProxy = false, proxyIndex = 0) => {
    const url = `${TMDB_CONFIG.BASE_URL}/movie/${movieId}?api_key=${TMDB_CONFIG.API_KEY}&append_to_response=credits`;
    if (!useProxy) return url;
    
    // Handle different proxy formats
    const proxy = TMDB_CONFIG.CORS_PROXIES[proxyIndex];
    if (proxy.includes('allorigins.win')) {
      return `${proxy}${encodeURIComponent(url)}`;
    } else {
      // For corsproxy.io and cors-anywhere, don't double-encode
      return `${proxy}${url}`;
    }
  },
    
  // Helper to generate Letterboxd URL
  generateLetterboxdUrl: (name, knownForDepartment) => {
    const slug = name.normalize('NFD')
      .replace(/\p{Diacritic}/gu, '') // Remove diacritics
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    // Map departments to correct Letterboxd URL paths
    const departmentMap = {
      'Directing': 'director',
      'Acting': 'actor', 
      'Writing': 'writer',
      'Camera': 'cinematography',
      'Sound': 'composer',
      'Production': 'producer',
      'Editing': 'editor',
      'Studio': 'studio' // Added mapping for Studio
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
  
  createNameSlug(name) {
    return name
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '') // Remove diacritics
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')         // Replace spaces with hyphens
      .replace(/-+/g, '-')          // Replace multiple hyphens with single
      .replace(/^-|-$/g, '');       // Remove leading/trailing hyphens
  }
  
  addPerson(personData) {
    // Check for duplicates
    const existingPerson = this.people.find(p => 
      p.name.toLowerCase() === personData.name.toLowerCase() && 
      p.role === personData.role
    );

    if (existingPerson) {
      throw new Error(`${personData.name} already exists as a ${personData.role}.`); // Throw error for duplicate entries
    }

    const person = {
      id: this.nextId++,
      name: personData.name,
      role: personData.role,
      letterboxdUrl: personData.letterboxdUrl || '',
      profilePicture: personData.profilePicture || '',
      notes: personData.notes || '',
      tmdbId: personData.tmdbId || null,
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

  getDefaultPeople() {
    // Return an empty array to remove default data
    return [];
  }
}

// Initialize database
const db = new PeopleDatabase();

// UI Management
class UIManager {
  constructor(peopleDatabase) {
    this.people = peopleDatabase.people; // Assign people data from PeopleDatabase
    this.activeTab = 'directors';
    this.currentSort = { directors: 'alphabetical', actors: 'alphabetical', others: 'alphabetical', companies: 'alphabetical' };
    this.init();
  }
  
  // Fisher-Yates shuffle algorithm for random sorting
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  
  createNameSlug(name) {
    return name
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '') // Remove diacritics
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')         // Replace spaces with hyphens
      .replace(/-+/g, '-')          // Replace multiple hyphens with single
      .replace(/^-|-$/g, '');       // Remove leading/trailing hyphens
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
        // Remove active class from all tabs
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

        // Add active class to the clicked tab
        button.classList.add('active');
        const tabId = button.dataset.tab;
        document.getElementById(`${tabId}-tab`).classList.add('active');

        // Update activeTab and render people
        this.activeTab = tabId;
        this.renderPeople();
      });
    });
    
    // Modal event listeners
    const addBtn = document.getElementById('addPersonBtn');
    const modal = document.getElementById('addPersonModal');
    const closeBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const form = document.getElementById('addPersonForm');
    
    addBtn?.addEventListener('click', () => this.openModal());
    closeBtn?.addEventListener('click', () => this.closeModal());
    cancelBtn?.addEventListener('click', () => this.closeModal());
    form?.addEventListener('submit', (e) => this.handleFormSubmit(e));
    
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
        searchTimeout = setTimeout(() => this.searchTMDbPeople(query), 300);
      });
    }
    
    // TMDb ID and Type Selector Integration
    const manualTmdbIdInput = document.getElementById('manualTmdbId');
    const tmdbTypeSelector = document.getElementById('tmdbTypeSelector');

    if (manualTmdbIdInput && tmdbTypeSelector) {
        manualTmdbIdInput.addEventListener('change', async (e) => {
            const tmdbId = e.target.value.trim();
            const selectedType = tmdbTypeSelector.querySelector('.custom-dropdown-trigger span').textContent.toLowerCase();

            if (tmdbId && !isNaN(tmdbId) && parseInt(tmdbId) > 0) {
                if (selectedType === 'person') {
                    await this.fetchAndFillPersonData(tmdbId);
                } else if (selectedType === 'company') {
                    await this.fetchAndFillCompanyData(tmdbId);
                }
            }
        });

        tmdbTypeSelector.addEventListener('click', (e) => {
            if (e.target.classList.contains('custom-option')) {
                const selectedValue = e.target.getAttribute('data-value');
                tmdbTypeSelector.querySelector('.custom-dropdown-trigger span').textContent = selectedValue.charAt(0).toUpperCase() + selectedValue.slice(1);
            }
        });
    }
    
    // Hide search results when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        searchResults.style.display = 'none';
      }
    });
    
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
          // Map form roles to TMDb department names
          const departmentMap = {
            'director': 'Directing',
            'actor': 'Acting',
            'writer': 'Writing',
            'cinematographer': 'Camera',
            'composer': 'Sound',
            'producer': 'Production',
            'editor': 'Editing',
            'studio': 'Studio',
            'other': 'Acting' // Default to actor for other roles
          };
          const department = departmentMap[role] || 'Acting';
          const url = TMDB_CONFIG.generateLetterboxdUrl(name, department);
          urlInput.value = url;
        }
      };
      
      roleSelect.addEventListener('change', updateLetterboxdUrl);
      nameInput.addEventListener('input', updateLetterboxdUrl);
      roleSelect.addEventListener('input', updateLetterboxdUrl); // Ensure URL updates on manual role change
      roleSelect.addEventListener('blur', updateLetterboxdUrl); // Ensure URL updates on blur
    }
    
    // Image search button functionality  
    const searchImageBtn = document.getElementById('searchImageBtn');
    if (searchImageBtn) {
      searchImageBtn.addEventListener('click', () => {
        const name = document.getElementById('personName').value.trim();
        if (name) {
          const searchQueries = [
            `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(name + ' actor director')}`,
            `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(name)}`,
            `https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(name)}&title=Special:MediaSearch&go=Go&type=image`
          ];
          window.open(searchQueries[0], '_blank');
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
    ['directors', 'actors', 'others', 'companies'].forEach(role => {
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
    ['directors', 'actors', 'others', 'companies'].forEach(role => {
      const sortBtnId = `${role}SortButton`;
      const dropdownId = `${role}SortDropdown`;
      const sortBtn = document.getElementById(sortBtnId);
      const dropdown = document.getElementById(dropdownId);
      
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
    
    // Add event listener to remove active class when clicking outside
    const sortButtons = document.querySelectorAll('.control-button');
    document.addEventListener('click', (e) => {
      sortButtons.forEach(button => {
        if (!button.contains(e.target)) {
          button.classList.remove('active');
        }
      });
    });
    
    // Custom dropdown functionality
    const customDropdown = document.getElementById('tmdbTypeSelector');
    const dropdownTrigger = customDropdown.querySelector('.custom-dropdown-trigger');
    const dropdownOptions = customDropdown.querySelector('.custom-dropdown-options');
    const dropdownSpan = dropdownTrigger.querySelector('span');
    
    // Toggle dropdown
    dropdownTrigger.addEventListener('click', () => {
      customDropdown.classList.toggle('open');
    });
    
    // Handle option selection
    dropdownOptions.addEventListener('click', (e) => {
      if (e.target.classList.contains('custom-option')) {
        const value = e.target.getAttribute('data-value');
        dropdownSpan.textContent = e.target.textContent;
        customDropdown.classList.remove('open');
        customDropdown.setAttribute('data-value', value);
      }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!customDropdown.contains(e.target)) {
        customDropdown.classList.remove('open');
      }
    });
  }
  
  openModal() {
    document.getElementById('addPersonModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
  }
  
  async smartSearchTMDb(query) {
    const searchTimeout = 5000; // 5 seconds timeout for search
    
    // Method 1: Try direct TMDb with timeout
    try {
      const directUrl = TMDB_CONFIG.getPersonSearchUrl(query);
      const response = await Promise.race([
        fetch(directUrl),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Direct search timeout')), searchTimeout))
      ]);
      if (response.ok) {
        return response;
      }
    } catch (error) {
      console.log('Direct TMDb search failed, trying proxies...');
    }
    
    // Method 2: Try CORS proxies with timeout
    for (let i = 0; i < TMDB_CONFIG.CORS_PROXIES.length; i++) {
      try {
        const proxyUrl = TMDB_CONFIG.getPersonSearchUrl(query, true, i);
        console.log(`Trying search proxy ${i + 1}: ${proxyUrl}`);
        
        const response = await Promise.race([
          fetch(proxyUrl),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Proxy timeout')), searchTimeout))
        ]);
        
        if (response.ok) {
          console.log(`Search success with proxy ${i + 1}`);
          return response;
        }
      } catch (error) {
        console.log(`Search proxy ${i + 1} failed:`, error.message);
        continue;
      }
    }
    
    // All attempts failed
    throw new Error('All TMDb search attempts failed');
  }

  async searchTMDbPeople(query) {
    // Check if API key is available
    if (!TMDB_CONFIG.API_KEY) {
      this.displaySearchError('API key not configured - you can still add people manually');
      return;
    }

    try {
      const personSearchUrl = TMDB_CONFIG.getPersonSearchUrl(query);
      const companySearchUrl = `${TMDB_CONFIG.BASE_URL}/search/company?api_key=${TMDB_CONFIG.API_KEY}&query=${encodeURIComponent(query)}`;

      const [personResponse, companyResponse] = await Promise.all([
        fetch(personSearchUrl),
        fetch(companySearchUrl)
      ]);

      const personData = personResponse.ok ? await personResponse.json() : { results: [] };
      const companyData = companyResponse.ok ? await companyResponse.json() : { results: [] };

      const combinedResults = [
        ...personData.results.map(result => ({ ...result, media_type: 'person' })),
        ...companyData.results.map(result => ({ ...result, media_type: 'company', known_for_department: 'Studio' }))
      ];

      if (combinedResults.length > 0) {
        this.displaySearchResults(combinedResults.slice(0, 5)); // Show top 5 results
      } else {
        this.displayNoResults();
      }
    } catch (error) {
      console.error('Network error searching TMDb:', error);
      this.displayManualAddOption(query);
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
          `<img src="https://s.ltrbxd.com/static/img/avatar220-BlsAxsT2.png" alt="${person.name}" class="search-result-avatar">`
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

  displayManualAddOption(searchQuery) {
    const searchResults = document.getElementById('searchResults');
    searchResults.innerHTML = `
      <div class="search-result-item" style="background: rgba(255, 128, 0, 0.1); border: 1px solid #ff8000; border-radius: 8px; padding: 15px; margin: 10px 0;">
        <div style="color: #ff8000; font-weight: bold; margin-bottom: 8px;">
          🎬 TMDb Connection Problem
        </div>
        <div style="color: #9ab; font-size: 0.9rem; margin-bottom: 10px;">
          TMDb doesn't load or can't find person. Add "<strong style="color: #fff;">${searchQuery}</strong>" manually:
        </div>
        <button onclick="uiManager.prefillManualAdd('${searchQuery.replace(/'/g, "\\'")}')" 
                style="background: #ff8000; color: #14181c; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; margin-bottom: 8px;">
          Add "${searchQuery}" Manually
        </button>
        <small class="form-help">
          If TMDb doesn't load or can't find person:<br>
          • Add name with correct spelling in form below<br>
          • TMDb is giving connectivity problems
        </small>
      </div>
    `;
    searchResults.style.display = 'block';
  }

  prefillManualAdd(personName) {
    // Pre-fill the form with the searched name
    document.getElementById('personName').value = personName;
    
    // Generate automatic Letterboxd URL (user can modify if needed)
    const slug = personName.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const letterboxdUrl = `https://letterboxd.com/actor/${slug}/`;
    document.getElementById('letterboxdUrl').value = letterboxdUrl;
    
    // Clear search results
    document.getElementById('searchResults').style.display = 'none';
    document.getElementById('personSearch').value = '';
    
    // Focus on role selection
    document.getElementById('personRole').focus();
    
    // Show helpful message
    this.showMessage(`Pre-filled form for "${personName}". Please select their role and adjust the Letterboxd URL if needed.`);
  }
  
  mapTMDbDepartmentToRole(department) {
    const mapping = {
      'Directing': 'Director',
      'Acting': 'Actor',
      'Writing': 'Writer',
      'Camera': 'Cinematographer',
      'Sound': 'Composer',
      'Production': 'Producer',
      'Editing': 'Editor',
      'Studio': 'Studio'
    };
    
    return mapping[department] || department;
  }

  async fetchPersonByTmdbId(tmdbId) {
    try {
      // Show loading message
      this.showMessage(`Fetching data for TMDb ID: ${tmdbId}...`);
      
      let response;
      let person;
      
      // Try direct API call first
      try {
        const directUrl = TMDB_CONFIG.getPersonDetailsUrl(tmdbId);
        response = await this.fetchWithTimeout(directUrl, 8000);
        
        if (response.ok) {
          person = await response.json();
        } else {
          throw new Error('Direct API failed');
        }
      } catch (error) {
        console.log('Direct TMDb API failed, trying with proxy...');
        
        // Try with CORS proxies
        for (let i = 0; i < TMDB_CONFIG.CORS_PROXIES.length; i++) {
          try {
            const proxyUrl = TMDB_CONFIG.getPersonDetailsUrl(tmdbId, true, i);
            response = await this.fetchWithTimeout(proxyUrl, 8000);
            
            if (response.ok) {
              person = await response.json();
              break;
            }
          } catch (proxyError) {
            console.log(`Proxy ${i} failed:`, proxyError.message);
            continue;
          }
        }
      }
      
      if (person && person.id) {
        // Map the person data to our format and auto-fill the form
        const mappedPerson = {
          id: person.id,
          name: person.name,
          profile_path: person.profile_path,
          known_for_department: person.known_for_department || 'Acting'
        };
        
        this.selectPerson(mappedPerson);
        this.showMessage(`Successfully loaded ${person.name} from TMDb ID: ${tmdbId}!`);
      } else {
        throw new Error('Person not found');
      }
      
    } catch (error) {
      console.error('Error fetching person by TMDb ID:', error);
      this.showAlert('Error', `Could not fetch person with TMDb ID: ${tmdbId}. Please check the ID or try manual entry.`);
    }
  }
  
  // Helper function to fetch TMDb data based on ID and type
  async getTmdbInfo(id, type) {
    try {
      let url;
      if (type === 'cast' || type === 'crew') {
        url = TMDB_CONFIG.getPersonDetailsUrl(id);
        const creditsUrl = TMDB_CONFIG.getPersonCombinedCreditsUrl(id);
        const [personResponse, creditsResponse] = await Promise.all([
          fetch(url),
          fetch(creditsUrl)
        ]);

        if (personResponse.ok && creditsResponse.ok) {
          const personData = await personResponse.json();
          const creditsData = await creditsResponse.json();
          return {
            name: personData.name,
            profile_path: personData.profile_path,
            filmography: creditsData.cast || []
          };
        }
      } else if (type === 'studio') {
        url = TMDB_CONFIG.getCompanyDetailsUrl(id);
        const moviesUrl = TMDB_CONFIG.getMoviesByCompanyUrl(id);
        const [companyResponse, moviesResponse] = await Promise.all([
          fetch(url),
          fetch(moviesUrl)
        ]);

        if (companyResponse.ok && moviesResponse.ok) {
          const companyData = await companyResponse.json();
          const moviesData = await moviesResponse.json();
          return {
            name: companyData.name,
            logo_path: companyData.logo_path,
            movies: moviesData.results || []
          };
        }
      }
      throw new Error('Invalid TMDb ID or type');
    } catch (error) {
      console.error('Error fetching TMDb data:', error);
      throw error;
    }
  }

  // Update the form submission logic to handle raw TMDb ID input
  async handleTmdbIdInput(tmdbId, type) {
    try {
      const data = await this.getTmdbInfo(tmdbId, type);

      if (type === 'cast' || type === 'crew') {
        document.getElementById('personName').value = data.name;
        document.getElementById('profilePictureUrl').value = `${TMDB_CONFIG.IMAGE_BASE_URL}${data.profile_path}`;
        // Populate filmography preview (if needed)
      } else if (type === 'studio') {
        document.getElementById('studioName').value = data.name;
        document.getElementById('studioLogoUrl').value = `${TMDB_CONFIG.IMAGE_BASE_URL}${data.logo_path}`;
        // Populate movies preview (if needed)
      }

      // Show success message
      this.showMessage(`Successfully fetched data for TMDb ID: ${tmdbId}`);
    } catch (error) {
      this.showAlert('Error', `Could not fetch data for TMDb ID: ${tmdbId}. Please check the ID or try manual entry.`);
    }
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
    
    // Show the TMDb ID so user can see and change it if needed
    if (person.id) {
      document.getElementById('manualTmdbId').value = person.id;
    }
    
    // Clear search field
    document.getElementById('personSearch').value = '';
    
    // Show success message
    this.showMessage(`Auto-filled data for ${person.name}! TMDb ID: ${person.id || 'Unknown'}`);
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
      notes: document.getElementById('notes').value.trim(),
      tmdbId: document.getElementById('manualTmdbId').value.trim() || null
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
    const message = document.createElement('div');
    message.textContent = text;
    message.style.cssText = `
      position: fixed; top: 20px; right: 20px; background: #ff8000; color: white;
      padding: 12px 20px; border-radius: 3px; z-index: 3000; font-family: 'Graphik', sans-serif;
      font-size: 0.875rem; animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(message);
    setTimeout(() => message.remove(), 3000);
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
        <div style="padding: 20px 24px; border-bottom: 0px solid #456;">
          <h3 style="margin: 0; color: #cdf; font-size: 1.1rem;">${title}</h3>
        </div>
        <div style="padding: 20px 24px;">
          <p style="margin: 0; color: #9ab; line-height: 1.5;">${message}</p>
        </div>
        <div style="padding: 16px 24px; border-top: 0px solid #456; text-align: right; display: flex; gap: 12px; justify-content: flex-end;">
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
    if (!this.people) {
      console.error('People data is undefined. Ensure PeopleDatabase is initialized correctly.');
      return;
    }

    const content = document.querySelector('.content');
    const welcomeMessage = document.querySelector('.welcome-message');

    const hasData = this.people.length > 0;

    if (hasData) {
      content.style.display = 'block';
      welcomeMessage.style.display = 'none';
    } else {
      content.style.display = 'none';
      welcomeMessage.style.display = 'flex'; // Ensure welcome message is visible
    }

    const directorsGrid = document.getElementById('directorsGrid');
    const actorsGrid = document.getElementById('actorsGrid');
    const othersGrid = document.getElementById('othersGrid');
    const companiesGrid = document.getElementById('companiesGrid');

    // Update renderPeople to use sorted data
    const sortedDirectors = this.getSortedPeople('director');
    const sortedActors = this.getSortedPeople('actor');
    const sortedOthers = this.getSortedPeopleOthers();
    const sortedCompanies = this.getSortedPeople('studio'); // Assuming 'studio' role for companies

    // Clear existing grids
    directorsGrid.innerHTML = '';
    actorsGrid.innerHTML = '';
    othersGrid.innerHTML = '';
    companiesGrid.innerHTML = '';

    // Populate grids with sorted data
    sortedDirectors.forEach(person => {
      directorsGrid.appendChild(this.createPersonCard(person));
    });
    sortedActors.forEach(person => {
      actorsGrid.appendChild(this.createPersonCard(person));
    });
    sortedOthers.forEach(person => {
      othersGrid.appendChild(this.createPersonCard(person));
    });
    sortedCompanies.forEach(person => {
      companiesGrid.appendChild(this.createPersonCard(person));
    });
  }  createPersonCard(person) {
    const card = document.createElement('div');
    card.className = 'director-card';
    card.setAttribute('data-name', person.name);
    card.setAttribute('data-id', person.id);
    
    // Add profile picture with fallback to default avatar
    let cardContent = '';
    if (person.profilePicture) {
      cardContent += `<img src="${person.profilePicture}" alt="${person.name}" class="person-avatar">`;
    } else {
      // Default Letterboxd avatar
      cardContent += `<img src="https://s.ltrbxd.com/static/img/avatar220-BlsAxsT2.png" alt="${person.name}" class="person-avatar">`;
    }
    
    // Create clickable profile link with basic query parameters
    const profileLink = document.createElement('a');
    const nameSlug = this.createNameSlug(person.name);
    
    // Use simple query parameter approach that works everywhere
    profileLink.href = `profile.html?name=${nameSlug}&id=${person.id}`;
    profileLink.className = 'profile-link';
    
    let linkContent = cardContent + `<span class="person-name">${person.name}</span>`;
    
    // Add role badge for non-director/actor roles
    if (person.role !== 'director' && person.role !== 'actor') {
      const roleBadge = `<span class="role-badge">${person.role}</span>`;
      linkContent += roleBadge;
    }
    
    profileLink.innerHTML = linkContent;
    card.appendChild(profileLink);
    
    // Add long-press menu for all cards (both default and user-added)
    attachLongPressMenu(card, person, this, db);
    
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
    document.getElementById('manualTmdbId').value = person.tmdbId || '';
    
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
    const sortType = role === 'studio' ? this.currentSort.companies : this.currentSort[role + 's'] || 'alphabetical';

    let sorted;
    switch(sortType) {
      case 'alphabetical':
        sorted = people.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'reverse':
        sorted = people.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'random':
        sorted = this.shuffleArray([...people]); // Create a copy before shuffling
        break;
      default:
        sorted = people;
    }

    return sorted;
  }
  
  getSortedPeopleOthers() {
    // Get all people who are not directors, actors, or studios
    let people = db.getAllPeople().filter(person => 
      person.role !== 'director' && person.role !== 'actor' && person.role !== 'studio'
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
      case 'random':
        sorted = this.shuffleArray([...people]); // Create a copy before shuffling
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
    // Fix the key assignment logic
    if (role === 'others') {
      this.currentSort.others = sortType;
    } else if (role === 'directors') {
      this.currentSort.directors = sortType;
    } else if (role === 'actors') {
      this.currentSort.actors = sortType;
    } else if (role === 'companies') {
      this.currentSort.companies = sortType;
    }
    
    // Update active state in dropdown - fix the ID construction
    const dropdownId = role + 'SortDropdown';
    const dropdown = document.getElementById(dropdownId);
    
    if (dropdown) {
      dropdown.querySelectorAll('.sort-option').forEach(opt => {
        opt.classList.toggle('active', opt.getAttribute('data-sort') === sortType);
      });
    }
    
    this.renderPeople();
    this.closeSearch(); // Reset search when sorting
  }
  
  async fetchAndFillPersonData(personId) {
    try {
        const response = await fetch(TMDB_CONFIG.getPersonDetailsUrl(personId));
        if (!response.ok) throw new Error('Failed to fetch person data');

        const personData = await response.json();
        document.getElementById('personName').value = personData.name || '';
        document.getElementById('profilePictureUrl').value = `${TMDB_CONFIG.IMAGE_BASE_URL}${personData.profile_path}` || '';
        document.getElementById('letterboxdUrl').value = TMDB_CONFIG.generateLetterboxdUrl(personData.name, 'Acting');

        // Update custom-dropdown-options dynamically
        const tmdbTypeSelector = document.getElementById('tmdbTypeSelector');
        const optionsContainer = tmdbTypeSelector.querySelector('.custom-dropdown-options');
        optionsContainer.innerHTML = `
            <div class="custom-option" data-value="person">Person</div>
            <div class="custom-option" data-value="company">Company</div>
        `;
        tmdbTypeSelector.querySelector('.custom-dropdown-trigger span').textContent = 'Person';
    } catch (error) {
        console.error('Error fetching person data:', error);
    }
}

async fetchAndFillCompanyData(companyId) {
    try {
        const response = await fetch(TMDB_CONFIG.getCompanyDetailsUrl(companyId));
        if (!response.ok) throw new Error('Failed to fetch company data');

        const companyData = await response.json();
        document.getElementById('personName').value = companyData.name || '';
        document.getElementById('profilePictureUrl').value = '';
        document.getElementById('letterboxdUrl').value = TMDB_CONFIG.generateLetterboxdUrl(companyData.name, 'Studio');

        // Update custom-dropdown-options dynamically
        const tmdbTypeSelector = document.getElementById('tmdbTypeSelector');
        const optionsContainer = tmdbTypeSelector.querySelector('.custom-dropdown-options');
        optionsContainer.innerHTML = `
            <div class="custom-option" data-value="company">Company</div>
            <div class="custom-option" data-value="person">Person</div>
        `;
        tmdbTypeSelector.querySelector('.custom-dropdown-trigger span').textContent = 'Company';
    } catch (error) {
        console.error('Error fetching company data:', error);
    }
}
}

// Debugging logs added to Delete and Edit options
function attachLongPressMenu(card, person, ui, db) {
  let pressTimer;
  const menu = document.createElement('div');
  menu.className = 'card-menu';

  // Add menu items
  const menuItems = [
    {
      text: 'Delete',
      action: async () => {
        console.log('Delete action triggered for:', person);
        if (!ui || !db) {
          console.error('UIManager or PeopleDatabase is not initialized.');
          return;
        }
        const confirmed = await ui.showConfirm('Delete Person', `Are you sure you want to delete ${person.name}?`);
        if (confirmed) {
          console.log('Delete confirmed for:', person);
          try {
            db.deletePerson(person.id);
            ui.renderPeople();
            ui.showMessage(`${person.name} deleted successfully.`);
          } catch (error) {
            console.error('Error deleting person:', error);
          }
        } else {
          console.log('Delete canceled for:', person);
        }
      },
      className: 'menu-item-delete'
    },
    {
      text: 'Edit',
      action: () => {
        console.log('Edit action triggered for:', person);
        if (!ui) {
          console.error('UIManager is not initialized.');
          return;
        }
        try {
          ui.editPerson(person);
        } catch (error) {
          console.error('Error editing person:', error);
        }
      },
      className: 'menu-item-edit'
    }
  ];

  menuItems.forEach(item => {
    const menuItem = document.createElement('div');
    menuItem.className = `card-menu-item ${item.className}`;
    menuItem.textContent = item.text;

    // Explicitly bind the action to the click event
    menuItem.addEventListener('click', async (e) => {
      e.stopPropagation();
      console.log(`Menu item clicked: ${item.text}`);
      try {
        await item.action();
      } catch (error) {
        console.error(`Error executing action for ${item.text}:`, error);
      }
      menu.classList.remove('show');
      card.classList.remove('menu-open');
    });

    menu.appendChild(menuItem);
  });

  card.appendChild(menu);

  const showMenu = (e) => {
    e.preventDefault();
    console.log('Menu triggered for:', person);
    menu.classList.add('show');
    card.classList.add('menu-open');

    // Add a one-time click listener to close the menu
    const closeMenu = (e) => {
      if (!card.contains(e.target)) {
        console.log('Closing menu for:', person);
        menu.classList.remove('show');
        card.classList.remove('menu-open');
        document.removeEventListener('click', closeMenu);
      }
    };
    document.addEventListener('click', closeMenu);
  };

  card.addEventListener('mousedown', (e) => {
    if (e.button === 0) { // Left mouse button
      pressTimer = setTimeout(() => showMenu(e), 600);
    }
  });

  card.addEventListener('touchstart', (e) => {
    pressTimer = setTimeout(() => showMenu(e), 600);
  });

  card.addEventListener('touchend', () => clearTimeout(pressTimer));
  card.addEventListener('touchmove', () => clearTimeout(pressTimer));
  card.addEventListener('mouseup', () => clearTimeout(pressTimer));
  card.addEventListener('mouseleave', () => clearTimeout(pressTimer));

  // Right-click or double-click to show menu
  card.addEventListener('contextmenu', showMenu);
  card.addEventListener('dblclick', showMenu);
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const ui = new UIManager(db); // Pass PeopleDatabase instance to UIManager
  
  // Initialize movie search functionality
  initializeMovieSearch();
});

// Movie Search Functionality for Main Page
function initializeMovieSearch() {
  const movieSearchIcon = document.getElementById('movieSearchIcon');
  const movieSearchContainer = document.getElementById('movieSearchContainer');
  const movieSearchInput = document.getElementById('movieSearchInput');
  
  if (!movieSearchIcon || !movieSearchContainer || !movieSearchInput) {
    return; // Elements not found, might be on a different page
  }
  
  // Show search container when icon is clicked
  movieSearchIcon.addEventListener('click', (e) => {
    e.stopPropagation();
    showMovieSearchContainer();
  });
  
  // Handle search input
  movieSearchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const query = e.target.value.trim();
      if (query) {
        performMovieSearch(query);
      }
    }
  });
  
  // Hide search container when clicking outside
  document.addEventListener('click', (e) => {
    if (!movieSearchContainer.contains(e.target) && !movieSearchIcon.contains(e.target)) {
      hideMovieSearchContainer();
    }
  });
  
  // Handle escape key to close search
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && movieSearchContainer.classList.contains('expanded')) {
      hideMovieSearchContainer();
    }
  });
}

function showMovieSearchContainer() {
  const movieSearchContainer = document.getElementById('movieSearchContainer');
  const movieSearchInput = document.getElementById('movieSearchInput');
  const movieSearchIcon = document.getElementById('movieSearchIcon');
  
  movieSearchContainer.classList.add('expanded');
  movieSearchIcon.style.display = 'none';
  
  // Focus the input immediately
  movieSearchInput.focus();
}

function hideMovieSearchContainer() {
  const movieSearchContainer = document.getElementById('movieSearchContainer');
  const movieSearchInput = document.getElementById('movieSearchInput');
  const movieSearchIcon = document.getElementById('movieSearchIcon');
  
  movieSearchContainer.classList.remove('expanded');
  movieSearchIcon.style.display = 'flex';
  movieSearchInput.value = '';
}

function performMovieSearch(query) {
  // Navigate to movie search page with query
  window.location.href = `movie-search.html?q=${encodeURIComponent(query)}`;
}
