// Simple PeopleDatabase class for profile page
class PeopleDatabase {
  constructor() {
    this.storageKey = 'myfilmpeople_data';
  }
  
  getAllPeople() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading people data:', error);
      return [];
    }
  }
  
  deletePerson(personId) {
    try {
      const people = this.getAllPeople();
      const filteredPeople = people.filter(person => person.id !== personId);
      localStorage.setItem(this.storageKey, JSON.stringify(filteredPeople));
      return true;
    } catch (error) {
      console.error('Error deleting person:', error);
      return false;
    }
  }
}

// TMDb API Configuration with CORS proxy support
const TMDB_CONFIG = {
  API_KEY: '5f1ead96e48e2379102c77c2546331a4',
  BASE_URL: 'https://api.themoviedb.org/3',
  IMAGE_BASE_URL: 'https://image.tmdb.org/t/p/w185',
  IMAGE_BASE_URL_LARGE: 'https://image.tmdb.org/t/p/w500',
  
  // CORS proxy options (for regions where TMDb is blocked)
  CORS_PROXIES: [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://cors-anywhere.herokuapp.com/',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://yacdn.org/proxy/'
  ],
  
  // Helper to get person details URL with optional proxy
  getPersonDetailsUrl: (personId, useProxy = false, proxyIndex = 0) => {
    const url = `${TMDB_CONFIG.BASE_URL}/person/${personId}?api_key=${TMDB_CONFIG.API_KEY}`;
    if (!useProxy) return url;
    
    // Handle different proxy formats
    const proxy = TMDB_CONFIG.CORS_PROXIES[proxyIndex];
    if (proxy.includes('allorigins.win')) {
      return `${proxy}${encodeURIComponent(url)}`;
    } else {
      return `${proxy}${url}`;
    }
  },
    
  // Helper to get person credits (filmography) with optional proxy
  getPersonCreditsUrl: (personId, useProxy = false, proxyIndex = 0) => {
    const url = `${TMDB_CONFIG.BASE_URL}/person/${personId}/movie_credits?api_key=${TMDB_CONFIG.API_KEY}`;
    if (!useProxy) return url;
    
    // Handle different proxy formats
    const proxy = TMDB_CONFIG.CORS_PROXIES[proxyIndex];
    if (proxy.includes('allorigins.win')) {
      return `${proxy}${encodeURIComponent(url)}`;
    } else {
      return `${proxy}${url}`;
    }
  },
  
  // Helper to get search URL with optional proxy
  getSearchUrl: (query, useProxy = false, proxyIndex = 0) => {
    const url = `${TMDB_CONFIG.BASE_URL}/search/person?api_key=${TMDB_CONFIG.API_KEY}&query=${encodeURIComponent(query)}`;
    if (!useProxy) return url;
    
    // Handle different proxy formats
    const proxy = TMDB_CONFIG.CORS_PROXIES[proxyIndex];
    if (proxy.includes('allorigins.win')) {
      return `${proxy}${encodeURIComponent(url)}`;
    } else {
      return `${proxy}${url}`;
    }
  }
};

// Profile Page Manager
class ProfilePageManager {
  constructor() {
    this.currentPerson = null;
    this.allMovies = [];
    this.activeFilter = 'all';
    this.bioExpanded = false;
    this.fullBioText = '';
    this.tmdbTimeout = 8000; // 8 seconds timeout
    this.tmdbErrorShown = false; // Track if error already shown
    this.init();
  }
  
  // Helper to generate Letterboxd search URLs (more reliable than guessing exact URLs)
  generateLetterboxdFilmUrl(title, releaseDate) {
    // Extract year from release date
    const year = releaseDate ? new Date(releaseDate).getFullYear() : null;
    
    // Instead of guessing the exact film URL, open a search
    // This is more reliable since Letterboxd's URL patterns are inconsistent
    const searchQuery = year ? `${title} ${year}` : title;
    const encodedQuery = encodeURIComponent(searchQuery);
    
    // Use Letterboxd's search URL - this will show results and let user pick the right film
    return `https://letterboxd.com/search/films/${encodedQuery}/`;
  }
  
  init() {
    this.setupEventListeners();
    // Test TMDb connectivity on startup
    this.testTMDbConnectivity();
    this.loadPersonFromURL();
  this.setupAddPersonModal();
  }
  setupAddPersonModal() {
    // Modal elements
    const modal = document.getElementById('addPersonModal');
    const closeBtn = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const form = document.getElementById('addPersonForm');
    const personSearch = document.getElementById('personSearch');
    const searchResults = document.getElementById('searchResults');
    const manualTmdbId = document.getElementById('manualTmdbId');
    const nameInput = document.getElementById('personName');
    const lbUrlInput = document.getElementById('letterboxdUrl');
    const profilePicInput = document.getElementById('profilePictureUrl');
    const searchImageBtn = document.getElementById('searchImageBtn');
    const roleSelect = document.getElementById('personRoleSelect');
    const roleHidden = document.getElementById('personRole');
    const tmdbIdDisplay = document.getElementById('tmdbIdDisplay');

    // Modal close logic
    if (closeBtn) closeBtn.onclick = () => { modal.style.display = 'none'; document.body.style.overflow = 'auto'; };
    if (cancelBtn) cancelBtn.onclick = () => { modal.style.display = 'none'; document.body.style.overflow = 'auto'; };
    modal.onclick = (e) => { if (e.target === modal) { modal.style.display = 'none'; document.body.style.overflow = 'auto'; } };

    // Role selector logic
    if (roleSelect) {
      roleSelect.onclick = (e) => {
        roleSelect.classList.toggle('open');
      };
      const options = roleSelect.querySelectorAll('.custom-option');
      options.forEach(opt => {
        opt.onclick = (e) => {
          e.stopPropagation();
          options.forEach(o => o.classList.remove('selected'));
          opt.classList.add('selected');
          const trigger = roleSelect.querySelector('.custom-select-text');
          if (trigger) trigger.textContent = opt.textContent;
          roleHidden.value = opt.dataset.value;
          roleSelect.classList.remove('open');
        };
      });
      document.addEventListener('click', (e) => {
        if (!roleSelect.contains(e.target)) roleSelect.classList.remove('open');
      });
    }

    // Letterboxd URL auto-fill from name
    if (nameInput && lbUrlInput) {
      nameInput.addEventListener('input', () => {
        const slug = this.createNameSlug(nameInput.value);
        const role = roleHidden.value || 'person';
        lbUrlInput.value = slug ? `https://letterboxd.com/${role}/${slug}/` : '';
      });
    }

    // TMDb search logic
    if (personSearch && searchResults) {
      let searchTimeout;
      personSearch.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        const query = personSearch.value.trim();
        if (!query) { searchResults.innerHTML = ''; return; }
        searchTimeout = setTimeout(async () => {
          searchResults.innerHTML = '<div class="search-loading">Searching...</div>';
          try {
            const resp = await this.smartFetch({ requestType: 'search', query });
            const data = await resp.json();
            if (data.results && data.results.length > 0) {
              searchResults.innerHTML = data.results.slice(0, 6).map(person => `
                <div class="search-result-item" data-id="${person.id}" data-name="${person.name}" data-img="${person.profile_path ? TMDB_CONFIG.IMAGE_BASE_URL + person.profile_path : ''}">
                  <img src="${person.profile_path ? TMDB_CONFIG.IMAGE_BASE_URL + person.profile_path : 'https://letterboxd.com/static/img/avatar500.png'}" class="search-result-img" />
                  <span>${person.name}</span>
                </div>
              `).join('');
              // Click to select
              Array.from(searchResults.children).forEach(item => {
                item.onclick = () => {
                  nameInput.value = item.dataset.name;
                  profilePicInput.value = item.dataset.img;
                  manualTmdbId.value = item.dataset.id;
                  if (tmdbIdDisplay) tmdbIdDisplay.textContent = item.dataset.id;
                  // Auto-fill Letterboxd URL
                  const slug = this.createNameSlug(item.dataset.name);
                  const role = roleHidden.value || 'person';
                  lbUrlInput.value = slug ? `https://letterboxd.com/${role}/${slug}/` : '';
                  searchResults.innerHTML = '';
                };
              });
            } else {
              searchResults.innerHTML = '<div class="search-no-results">No results found</div>';
            }
          } catch (e) {
            searchResults.innerHTML = '<div class="search-error">Error searching TMDb</div>';
          }
        }, 400);
      });
    }

    // Custom image URL support: always use whatever is in the field
    if (profilePicInput) {
      profilePicInput.addEventListener('input', () => {
        // No validation, just allow any URL
      });
    }

    // Show TMDb ID if present
    if (manualTmdbId && tmdbIdDisplay) {
      manualTmdbId.addEventListener('input', () => {
        tmdbIdDisplay.textContent = manualTmdbId.value;
      });
    }
  }
  
  // Test TMDb connectivity on startup to set blocking flag early
  async testTMDbConnectivity() {
    try {
      // Quick test with a simple API call
      const testUrl = `${TMDB_CONFIG.BASE_URL}/configuration?api_key=${TMDB_CONFIG.API_KEY}`;
      const response = await this.fetchWithTimeout(testUrl, 2000); // Very short timeout
      if (response.ok) {
        console.log('✅ TMDb connectivity test passed');
        localStorage.removeItem('tmdb_blocked');
      } else {
        console.log('⚠️ TMDb connectivity test failed - will use proxies');
        localStorage.setItem('tmdb_blocked', 'true');
      }
    } catch (error) {
      console.log('🚫 TMDb appears to be blocked - will use proxies only');
      localStorage.setItem('tmdb_blocked', 'true');
    }
  }
  
  setupEventListeners() {
    // Back button
    const backButton = document.getElementById('backToMain');
    if (backButton) {
      backButton.addEventListener('click', () => {
        window.location.href = 'index.html';
      });
    }
    
    // Letterboxd button
    const letterboxdButton = document.getElementById('openLetterboxd');
    if (letterboxdButton) {
      letterboxdButton.addEventListener('click', () => {
        if (this.currentPerson && this.currentPerson.letterboxdUrl) {
          window.open(this.currentPerson.letterboxdUrl, '_blank');
        }
      });
    }
    
    // Edit notes button (main button that handles add/show)
    const editButton = document.getElementById('editPerson');
    if (editButton) {
      editButton.addEventListener('click', () => {
        this.handleNotesButtonClick();
      });
    }
    
    // Bio toggle button
    const bioToggleBtn = document.getElementById('bioToggleBtn');
    if (bioToggleBtn) {
      bioToggleBtn.addEventListener('click', () => {
        this.toggleBio();
      });
    }
    
    // Edit modal event listeners
    this.setupEditModalListeners();
    
    // Profile menu setup
    this.setupProfileMenu();
    
    // Filter buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-btn')) {
        this.handleFilterClick(e.target);
      }
    });
  }
  
  setupProfileMenu() {
    const menuBtn = document.getElementById('profileMenuBtn');
    const menu = document.getElementById('profileMenu');
    
    if (menuBtn && menu) {
      // Toggle menu on button click
      menuBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        menu.classList.toggle('show');
      });
      
      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!menuBtn.contains(e.target) && !menu.contains(e.target)) {
          menu.classList.remove('show');
        }
      });
      
      // Handle menu item clicks
      menu.addEventListener('click', (e) => {
        const menuItem = e.target.closest('.profile-menu-item');
        if (menuItem) {
          const action = menuItem.dataset.action;
          this.handleMenuAction(action);
          menu.classList.remove('show');
        }
      });
    }
  }
  
  handleMenuAction(action) {
    switch (action) {
      case 'edit':
        this.openEditPersonModal();
        break;
      case 'delete':
        this.deletePersonFromCollection();
        break;
    }
  }

  openEditPersonModal() {
    const modal = document.getElementById('addPersonModal');
    if (!modal) return;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Pre-fill fields
    document.getElementById('personName').value = this.currentPerson.name || '';
    document.getElementById('profilePictureUrl').value = this.currentPerson.profilePicture || '';
    document.getElementById('letterboxdUrl').value = this.currentPerson.letterboxdUrl || '';
    document.getElementById('notes').value = this.currentPerson.notes || '';
    document.getElementById('manualTmdbId').value = this.currentPerson.tmdbId || '';
    const tmdbIdDisplay = document.getElementById('tmdbIdDisplay');
    if (tmdbIdDisplay) tmdbIdDisplay.textContent = this.currentPerson.tmdbId || '';

    // Set role in custom select
    const roleValue = this.currentPerson.role || '';
    document.getElementById('personRole').value = roleValue;
    const select = document.getElementById('personRoleSelect');
    if (select) {
      const trigger = select.querySelector('.custom-select-text');
      const options = select.querySelectorAll('.custom-option');
      options.forEach(opt => {
        if (opt.dataset.value === roleValue) {
          opt.classList.add('selected');
          if (trigger) trigger.textContent = opt.textContent;
        } else {
          opt.classList.remove('selected');
        }
      });
    }

    // Change modal title and button
    const modalTitle = modal.querySelector('.modal-header h2');
    if (modalTitle) modalTitle.textContent = 'Edit Person';
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) submitBtn.textContent = 'Save Changes';

    // Remove previous submit listeners by cloning the form
    const form = document.getElementById('addPersonForm');
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    // Cancel button closes modal
    newForm.querySelector('#cancelBtn').onclick = () => {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    };
    // (x) close button
    const closeBtn = document.getElementById('closeModal');
    if (closeBtn) closeBtn.onclick = () => { modal.style.display = 'none'; document.body.style.overflow = 'auto'; };

    // Save changes on submit
    newForm.onsubmit = (e) => {
      e.preventDefault();
      this.saveEditPerson();
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    };
  }

  saveEditPerson() {
    // Get updated values
    const name = document.getElementById('personName').value.trim();
    const role = document.getElementById('personRole').value;
    const profilePicture = document.getElementById('profilePictureUrl').value.trim();
    const letterboxdUrl = document.getElementById('letterboxdUrl').value.trim();
    const notes = document.getElementById('notes').value.trim();
    const tmdbId = document.getElementById('manualTmdbId').value.trim();

    // Update current person object
    this.currentPerson.name = name;
    this.currentPerson.role = role;
    this.currentPerson.profilePicture = profilePicture;
    this.currentPerson.letterboxdUrl = letterboxdUrl;
    this.currentPerson.notes = notes;
    this.currentPerson.tmdbId = tmdbId || undefined;

    // Save to localStorage
    const db = new PeopleDatabase();
    const people = db.getAllPeople();
    const idx = people.findIndex(p => p.id === this.currentPerson.id);
    if (idx !== -1) {
      people[idx] = this.currentPerson;
      localStorage.setItem(db.storageKey, JSON.stringify(people));
    }
    // Update the UI
    this.updateBasicInfo(this.currentPerson);
  }
  
  deletePersonFromCollection() {
    if (!this.currentPerson) return;
    
    // Show modern delete confirmation modal
    this.showDeleteModal();
  }
  
  showDeleteModal() {
    const modal = document.getElementById('deleteModal');
    const modalText = document.getElementById('deleteModalText');
    const closeBtn = document.getElementById('closeDeleteModal');
    const cancelBtn = document.getElementById('cancelDeleteBtn');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    // Set the person's name in the modal text
    modalText.textContent = `Are you sure you want to delete ${this.currentPerson.name} from your collection?`;
    
    // Show the modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    
    // Close modal handlers
    const closeModal = () => {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    };
    
    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;
    
    // Click outside to close
    modal.onclick = (e) => {
      if (e.target === modal) {
        closeModal();
      }
    };
    
    // Confirm delete handler
    confirmBtn.onclick = () => {
      this.performDelete();
      closeModal();
    };
  }
  
  performDelete() {
    const database = new PeopleDatabase();
    const success = database.deletePerson(this.currentPerson.id);
    
    if (success) {
      // Redirect back to main page
      window.location.href = 'index.html';
    } else {
      alert('Error deleting person. Please try again.');
    }
  }
  
  loadPersonFromURL() {
    // Get the clean URL path (e.g., "/alex-garland/")
    const path = window.location.pathname;
    const nameSlug = path.replace(/^\/+|\/+$/g, ''); // Remove leading/trailing slashes
    
    if (nameSlug && nameSlug !== 'index.html' && nameSlug !== 'profile.html') {
      // Try to find person by name slug
      const person = this.findPersonByNameSlug(nameSlug);
      if (person) {
        this.loadPersonProfile(person.id);
        return;
      }
    }
    
    // Fallback to old query parameter method for backward compatibility
    const urlParams = new URLSearchParams(window.location.search);
    const personName = urlParams.get('name');
    const personId = urlParams.get('id');
    
    if (personName) {
      const person = this.findPersonByNameSlug(personName);
      if (person) {
        // Load the person profile directly
        this.loadPersonProfile(person.id);
      } else if (personId) {
        this.loadPersonProfile(personId);
      } else {
        this.showError('Person not found');
      }
    } else if (personId) {
      this.loadPersonProfile(personId);
    } else {
      this.showError('No person specified');
    }
  }
  
  async loadPersonProfile(personId) {
    try {
      // Get person from localStorage
      const person = this.getPersonFromStorage(personId);
      if (!person) {
        this.showError('Person not found');
        return;
      }

      this.currentPerson = person;
      
      // Show initial loading state
      this.showLoadingState();
      
      // Update basic info immediately with skeleton state
      this.updateBasicInfo(person);
      
      // Show filmography loading
      this.showFilmographyLoading();
      
      // If we have TMDb ID, fetch detailed info
      if (person.tmdbId) {
        try {
          await this.loadTMDbDetails(person.tmdbId);
          await this.loadFilmography(person.tmdbId);
        } catch (error) {
          console.log('❌ TMDb requests failed - showing Letterboxd-only mode');
          this.hideLoadingState();
          this.showLetterboxdFirst('TMDb is currently unavailable. Showing Letterboxd-only mode.');
        }
      } else {
        // Try to find TMDb ID by searching
        try {
          const tmdbId = await this.findTMDbId(person.name);
          if (tmdbId) {
            console.log('✅ Found TMDb ID:', tmdbId);
            await this.loadTMDbDetails(tmdbId);
            await this.loadFilmography(tmdbId);
          } else {
            console.log('❌ Person not found in TMDb');
            this.hideLoadingState();
            this.showLetterboxdFirst('Person not found in TMDb database');
          }
        } catch (error) {
          console.log('❌ TMDb search failed - showing Letterboxd-only mode');
          this.hideLoadingState();
          this.showLetterboxdFirst('Unable to access TMDb. Showing Letterboxd-only mode.');
        }
      }
      
    } catch (error) {
      console.error('Error loading profile:', error);
      this.hideLoadingState();
      this.showLetterboxdFirst('Profile loading error - using Letterboxd mode');
    }
  }  getPersonFromStorage(personId) {
    try {
      const data = localStorage.getItem('myfilmpeople_data');
      if (data) {
        const people = JSON.parse(data);
        return people.find(p => p.id === parseInt(personId));
      }
    } catch (error) {
      console.error('Error loading from storage:', error);
    }
    return null;
  }
  
  findPersonByNameSlug(nameSlug) {
    try {
      const data = localStorage.getItem('myfilmpeople_data');
      if (data) {
        const people = JSON.parse(data);
        return people.find(p => this.createNameSlug(p.name) === nameSlug);
      }
    } catch (error) {
      console.error('Error loading from storage:', error);
    }
    return null;
  }
  
  createNameSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')         // Replace spaces with hyphens
      .replace(/-+/g, '-')          // Replace multiple hyphens with single
      .replace(/^-|-$/g, '');       // Remove leading/trailing hyphens
  }
  
  updateBasicInfo(person) {
    document.getElementById('profileName').textContent = person.name;
    document.getElementById('profileFullName').textContent = person.name;
    
    // Format role display nicely
    const formattedRole = this.formatRoleDisplay(person.role);
    document.getElementById('profileRole').textContent = formattedRole;
    
    // Set profile image
    this.setupProfileImage(person);
    
    // Update notes display
    this.updateNotesDisplay();
    
    // Update page title
    document.title = `${person.name} - MyFilmPeople`;
  }

  setupProfileImage(person) {
    const profileImg = document.getElementById('profileImage');
    
    if (person.profilePicture) {
      profileImg.src = person.profilePicture;
      profileImg.alt = person.name;
    } else {
      profileImg.src = "https://letterboxd.com/static/img/avatar500.png";
      profileImg.alt = person.name;
    }
  }

  showLoadingState() {
    // Add loading class to profile content
    const profileContent = document.querySelector('.profile-content');
    profileContent.classList.add('profile-loading');
    
    // Set loading text for bio
    document.getElementById('bioText').textContent = 'Loading biography from TMDb...';
    document.getElementById('profileBirth').textContent = 'Loading birth information...';
  }

  hideLoadingState() {
    // Remove loading class
    const profileContent = document.querySelector('.profile-content');
    profileContent.classList.remove('profile-loading');
  }

  showFilmographyLoading() {
    const loadingElement = document.getElementById('loadingFilmography');
    const grid = document.getElementById('filmographyGrid');
    
    loadingElement.textContent = 'Loading filmography from TMDb...';
    loadingElement.style.display = 'block';
    
    // Show skeleton filmography cards
    this.showFilmographySkeleton();
  }

  showFilmographySkeleton() {
    const grid = document.getElementById('filmographyGrid');
    grid.innerHTML = '';
    
    // Create 8 skeleton cards
    for (let i = 0; i < 8; i++) {
      const skeletonCard = document.createElement('div');
      skeletonCard.className = 'film-card-skeleton';
      skeletonCard.innerHTML = `
        <div class="film-poster-skeleton loading-skeleton"></div>
        <div class="film-info-skeleton">
          <div class="skeleton-line title loading-skeleton"></div>
          <div class="skeleton-line year loading-skeleton"></div>
          <div class="skeleton-line roles loading-skeleton"></div>
        </div>
      `;
      grid.appendChild(skeletonCard);
    }
  }
  
  formatRoleDisplay(role) {
    // Convert the role from main app format to display format
    switch(role) {
      case 'director':
        return 'Director';
      case 'actor':
        return 'Actor';
      default:
        // For other roles, capitalize first letter
        return role.charAt(0).toUpperCase() + role.slice(1);
    }
  }
  
  async findTMDbId(personName) {
    try {
      const response = await this.smartFetch({
        requestType: 'search',
        query: personName
      });
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        return data.results[0].id;
      }
      return null;
    } catch (error) {
      console.error('Error searching TMDb:', error);
      return null;
    }
  }
  
  async loadTMDbDetails(tmdbId) {
    try {
      const response = await this.smartFetch({
        requestType: 'details',
        personId: tmdbId
      });
      const person = await response.json();
      
      if (person.biography) {
        this.setupBio(person.biography);
      } else {
        this.showLetterboxdFirst('No biography available from TMDb');
      }
      
      // Update birth info
      if (person.birthday || person.place_of_birth) {
        let birthInfo = '';
        if (person.birthday) {
          const birthDate = new Date(person.birthday);
          birthInfo += `Born: ${birthDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}`;
        }
        if (person.place_of_birth) {
          birthInfo += birthInfo ? ` in ${person.place_of_birth}` : `Born in ${person.place_of_birth}`;
        }
        document.getElementById('profileBirth').textContent = birthInfo;
      } else {
        document.getElementById('profileBirth').style.display = 'none';
      }
      
      // Update profile image with higher quality
      if (person.profile_path) {
        const profileImg = document.getElementById('profileImage');
        profileImg.src = `${TMDB_CONFIG.IMAGE_BASE_URL_LARGE}${person.profile_path}`;
      }
      
      // Hide loading state for profile details
      this.hideLoadingState();
      
    } catch (error) {
      console.error('Error loading TMDb details:', error);
      this.hideLoadingState();
      this.showLetterboxdFirst('Unable to load profile data from TMDb');
    }
  }
  
  async loadFilmography(tmdbId) {
    try {
      const response = await this.smartFetch({
        requestType: 'credits',
        personId: tmdbId
      });
      const credits = await response.json();
      
      const loadingElement = document.getElementById('loadingFilmography');
      const gridElement = document.getElementById('filmographyGrid');
      
      if (credits.cast || credits.crew) {
        // Group movies by ID and combine roles
        const movieMap = new Map();
        
        // Process cast credits
        if (credits.cast) {
          credits.cast.forEach(movie => {
            // Filter out documentaries and self appearances
            if (this.shouldIncludeMovie(movie)) {
              const key = movie.id;
              if (movieMap.has(key)) {
                const existing = movieMap.get(key);
                existing.roles.push({
                  role: movie.character || 'Actor',
                  department: 'Acting'
                });
              } else {
                movieMap.set(key, {
                  ...movie,
                  roles: [{
                    role: movie.character || 'Actor',
                    department: 'Acting'
                  }]
                });
              }
            }
          });
        }
        
        // Process crew credits
        if (credits.crew) {
          credits.crew.forEach(movie => {
            // Filter out documentaries and include only major crew roles
            if (this.shouldIncludeMovie(movie) && this.shouldIncludeCrewRole(movie.job, movie.department)) {
              const key = movie.id;
              if (movieMap.has(key)) {
                const existing = movieMap.get(key);
                existing.roles.push({
                  role: movie.job,
                  department: movie.department
                });
              } else {
                movieMap.set(key, {
                  ...movie,
                  roles: [{
                    role: movie.job,
                    department: movie.department
                  }]
                });
              }
            }
          });
        }
        
        // Convert to array and sort by release date
        const uniqueMovies = Array.from(movieMap.values());
        uniqueMovies.sort((a, b) => {
          const dateA = new Date(a.release_date || '1900-01-01');
          const dateB = new Date(b.release_date || '1900-01-01');
          return dateB - dateA; // Most recent first
        });
        
        this.allMovies = uniqueMovies;
        this.createDynamicFilters(uniqueMovies);
        this.setDefaultFilter(); // Set default filter based on person's role
        this.renderFilmography(this.filterMovies(uniqueMovies));
        loadingElement.style.display = 'none';
      } else {
        loadingElement.textContent = 'No filmography found';
      }
      
    } catch (error) {
      console.error('Error loading filmography:', error);
      this.showLetterboxdFirst('Unable to load filmography from TMDb');
    }
  }
  
  renderFilmography(movies) {
    const grid = document.getElementById('filmographyGrid');
    const loadingElement = document.getElementById('loadingFilmography');
    
    // Hide loading and clear skeleton
    loadingElement.style.display = 'none';
    grid.innerHTML = '';
    
    movies.forEach(movie => { // Show all movies
      const movieCard = this.createMovieCard(movie);
      grid.appendChild(movieCard);
    });
  }

  createDynamicFilters(movies) {
    const counts = {
      all: movies.length,
      Acting: 0,
      Directing: 0,
      Writing: 0,
      other: 0
    };
    
    // Count movies in each category
    movies.forEach(movie => {
      movie.roles.forEach(role => {
        if (role.department === 'Acting') counts.Acting++;
        else if (role.department === 'Directing') counts.Directing++;
        else if (role.department === 'Writing') counts.Writing++;
        else counts.other++;
      });
    });
    
    // Create filter buttons only for categories with content
    const filtersContainer = document.getElementById('filmographyFilters');
    filtersContainer.innerHTML = '';
    
    // Always add "All" filter first
    const allBtn = document.createElement('button');
    allBtn.className = 'filter-btn active';
    allBtn.dataset.filter = 'all';
    allBtn.textContent = `All (${counts.all})`;
    filtersContainer.appendChild(allBtn);
    
    // Add other filters only if they have content
    const filterOrder = [
      { key: 'Acting', label: 'Acting' },
      { key: 'Directing', label: 'Directing' },
      { key: 'Writing', label: 'Writing' },
      { key: 'other', label: 'Other' }
    ];
    
    filterOrder.forEach(filter => {
      if (counts[filter.key] > 0) {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.dataset.filter = filter.key;
        btn.textContent = `${filter.label} (${counts[filter.key]})`;
        filtersContainer.appendChild(btn);
      }
    });
  }
  
  createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'film-card';
    
    const posterUrl = movie.poster_path 
      ? `${TMDB_CONFIG.IMAGE_BASE_URL}${movie.poster_path}`
      : null;
    
    const year = movie.release_date ? new Date(movie.release_date).getFullYear() : 'TBA';
    
    // Group and format roles
    const rolesByDept = this.groupRolesByDepartment(movie.roles);
    const roleDisplay = rolesByDept.map(dept => 
      `<span class="role-badge ${dept.className}">${dept.display}</span>`
    ).join('');
    
    const posterHtml = posterUrl 
      ? `<img src="${posterUrl}" alt="${movie.title}" class="film-poster" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
      : '';
    
    // Enhanced fallback with different styles based on release status
    const currentYear = new Date().getFullYear();
    const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
    
    let fallbackContent, fallbackStyle;
    
    if (!releaseYear || year === 'TBA') {
      // Unknown release date
      fallbackContent = `
        <div style="font-size: 1.5rem; margin-bottom: 4px;">📅</div>
        <div style="font-size: 0.7rem; text-align: center; line-height: 1.2;">TBA</div>
      `;
      fallbackStyle = 'background: linear-gradient(135deg, #2c3440, #1a1f24);';
    } else if (releaseYear > currentYear) {
      // Future release
      fallbackContent = `
        <div style="font-size: 1.5rem; margin-bottom: 4px;">🎬</div>
        <div style="font-size: 0.7rem; text-align: center; line-height: 1.2;">Coming<br>${releaseYear}</div>
      `;
      fallbackStyle = 'background: linear-gradient(135deg, #3d4f1f, #2c3940);';
    } else {
      // Released but no poster
      fallbackContent = `
        <div style="font-size: 1.5rem; margin-bottom: 4px;">🎭</div>
        <div style="font-size: 0.7rem; text-align: center; line-height: 1.2;">No<br>Poster</div>
      `;
      fallbackStyle = 'background: linear-gradient(135deg, #2c3440, #34404a);';
    }
    
    const fallbackPoster = `
      <div class="film-poster-fallback" style="display: ${posterUrl ? 'none' : 'flex'}; ${fallbackStyle} border-radius: 8px; align-items: center; justify-content: center; color: #9ab; flex-direction: column; border: 1px solid rgba(255, 255, 255, 0.1);">
        ${fallbackContent}
      </div>
    `;
    
    card.innerHTML = `
      ${posterHtml}
      ${fallbackPoster}
      <div class="film-info">
        <div class="film-title">${movie.title}</div>
        <div class="film-year">${year}</div>
        <div class="film-roles">${roleDisplay}</div>
      </div>
    `;
    
    // Make card clickable to open Letterboxd
    card.addEventListener('click', () => {
      // Use the search-based URL generation (more reliable)
      const letterboxdUrl = this.generateLetterboxdFilmUrl(movie.title, movie.release_date);
      
      // Open in new tab
      window.open(letterboxdUrl, '_blank');
      
      // Log the attempt for debugging
      console.log(`Searching Letterboxd for: ${movie.title} (${year}) -> ${letterboxdUrl}`);
    });
    
    return card;
  }
  
  groupRolesByDepartment(roles) {
    const deptMap = new Map();
    
    roles.forEach(roleObj => {
      const dept = roleObj.department;
      if (!deptMap.has(dept)) {
        deptMap.set(dept, []);
      }
      deptMap.get(dept).push(roleObj.role);
    });
    
    const result = [];
    
    // Prioritize order: Acting, Directing, Writing, then others
    const priorityOrder = ['Acting', 'Directing', 'Writing', 'Production', 'Camera', 'Sound', 'Editing'];
    
    priorityOrder.forEach(dept => {
      if (deptMap.has(dept)) {
        const roles = deptMap.get(dept);
        result.push({
          department: dept,
          roles: roles,
          display: this.formatDepartmentDisplay(dept, roles),
          className: this.getDepartmentClass(dept)
        });
        deptMap.delete(dept);
      }
    });
    
    // Add remaining departments
    deptMap.forEach((roles, dept) => {
      result.push({
        department: dept,
        roles: roles,
        display: this.formatDepartmentDisplay(dept, roles),
        className: this.getDepartmentClass(dept)
      });
    });
    
    return result;
  }
  
  formatDepartmentDisplay(department, roles) {
    // Simplify department names and show specific roles if needed
    const simplifiedDept = {
      'Acting': roles.length > 1 ? 'Actor' : roles[0],
      'Directing': 'Director',
      'Writing': roles.some(r => r.includes('Screenplay')) ? 'Writer' : 'Writer',
      'Production': 'Producer',
      'Camera': 'Cinematography',
      'Sound': roles.some(r => r.includes('Music')) ? 'Composer' : 'Sound',
      'Editing': 'Editor'
    };
    
    return simplifiedDept[department] || department;
  }
  
  getDepartmentClass(department) {
    const classMap = {
      'Acting': 'role-acting',
      'Directing': 'role-directing', 
      'Writing': 'role-writing',
      'Production': 'role-production',
      'Camera': 'role-camera',
      'Sound': 'role-sound',
      'Editing': 'role-editing'
    };
    
    return classMap[department] || 'role-other';
  }
  
  setDefaultFilter() {
    // Set default filter based on person's role from main app
    let defaultFilter = 'all'; // fallback
    
    if (this.currentPerson) {
      switch(this.currentPerson.role) {
        case 'director':
          defaultFilter = 'Directing';
          break;
        case 'actor':
          defaultFilter = 'Acting';
          break;
        default:
          // For other roles, check if we have any movies in "other" category
          const hasOtherRoles = this.allMovies.some(movie => 
            movie.roles.some(role => 
              !['Acting', 'Directing', 'Writing'].includes(role.department)
            )
          );
          defaultFilter = hasOtherRoles ? 'other' : 'all';
          break;
      }
    }
    
    // Update the active filter
    this.activeFilter = defaultFilter;
    
    // Update UI to show the correct active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.filter === defaultFilter) {
        btn.classList.add('active');
      }
    });
  }

  handleFilterClick(button) {
    // Update active filter
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    this.activeFilter = button.dataset.filter;
    this.renderFilmography(this.filterMovies(this.allMovies));
  }
  
  filterMovies(movies) {
    if (this.activeFilter === 'all') {
      return movies;
    }
    
    return movies.filter(movie => {
      if (this.activeFilter === 'other') {
        // Show movies where person has roles outside of Acting, Directing, Writing
        return movie.roles.some(role => 
          !['Acting', 'Directing', 'Writing'].includes(role.department)
        );
      } else {
        // Show movies where person has the specific role
        return movie.roles.some(role => role.department === this.activeFilter);
      }
    });
  }
  
  setupBio(biography) {
    // Clean and format the biography text
    this.fullBioText = biography.trim();
    const bioTextElement = document.getElementById('bioText');
    const bioToggleBtn = document.getElementById('bioToggleBtn');
    
    // If bio is short (less than 300 characters), show it all
    if (this.fullBioText.length <= 300) {
      bioTextElement.textContent = this.fullBioText;
      bioToggleBtn.classList.add('hidden');
      return;
    }
    
    // Show truncated version initially
    this.bioExpanded = false;
    this.updateBioDisplay();
    bioToggleBtn.classList.remove('hidden');
  }
  
  updateBioDisplay() {
    const bioTextElement = document.getElementById('bioText');
    const bioToggleBtn = document.getElementById('bioToggleBtn');
    
    if (this.bioExpanded) {
      bioTextElement.textContent = this.fullBioText;
      bioTextElement.classList.remove('bio-collapsed');
      bioTextElement.classList.add('bio-expanded');
      bioToggleBtn.textContent = 'Read less';
    } else {
      // Find a good break point around 250 characters
      let truncateAt = 250;
      if (this.fullBioText.length > truncateAt) {
        // Try to break at a sentence or at least a word boundary
        const lastPeriod = this.fullBioText.lastIndexOf('.', truncateAt);
        const lastSpace = this.fullBioText.lastIndexOf(' ', truncateAt);
        
        if (lastPeriod > 200) {
          truncateAt = lastPeriod + 1;
        } else if (lastSpace > 200) {
          truncateAt = lastSpace;
        }
      }
      
      const truncatedText = this.fullBioText.substring(0, truncateAt).trim() + '...';
      bioTextElement.textContent = truncatedText;
      bioTextElement.classList.remove('bio-expanded');
      bioTextElement.classList.add('bio-collapsed');
      bioToggleBtn.textContent = 'Read more';
    }
  }
  
  toggleBio() {
    this.bioExpanded = !this.bioExpanded;
    this.updateBioDisplay();
  }
  
  handleNotesButtonClick() {
    const hasNotes = this.currentPerson.notes && this.currentPerson.notes.trim();
    
    if (hasNotes) {
      // If notes exist, show them in view mode
      this.openViewModal();
    } else {
      // If no notes exist, open modal to add new notes
      this.openEditModal();
    }
  }
  
  openViewModal() {
    const modal = document.getElementById('editNotesModal');
    const modalTitle = document.getElementById('notesModalTitle');
    const viewMode = document.getElementById('viewNotesMode');
    const editMode = document.getElementById('editNotesMode');
    const notesDisplay = document.getElementById('notesDisplay');
    
    // Set up view mode
    modalTitle.textContent = 'Your Notes';
    notesDisplay.textContent = this.currentPerson.notes;
    
    // Show view mode, hide edit mode
    viewMode.classList.remove('hidden');
    editMode.classList.add('hidden');
    
    modal.style.display = 'block';
  }
  
  openEditModal() {
    const modal = document.getElementById('editNotesModal');
    const modalTitle = document.getElementById('notesModalTitle');
    const viewMode = document.getElementById('viewNotesMode');
    const editMode = document.getElementById('editNotesMode');
    const notesTextarea = document.getElementById('editNotes');
    
    // Set up edit mode
    const hasNotes = this.currentPerson.notes && this.currentPerson.notes.trim();
    modalTitle.textContent = hasNotes ? 'Edit Your Notes' : 'Add Your Notes';
    notesTextarea.value = this.currentPerson.notes || '';
    
    // Show edit mode, hide view mode
    editMode.classList.remove('hidden');
    viewMode.classList.add('hidden');
    
    modal.style.display = 'block';
    notesTextarea.focus();
  }
  
  switchToEditMode() {
    this.openEditModal();
  }
  
  setupEditModalListeners() {
    const modal = document.getElementById('editNotesModal');
    const closeBtn = document.getElementById('closeEditModal');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const cancelViewBtn = document.getElementById('cancelViewBtn');
    const editNotesFromView = document.getElementById('editNotesFromView');
    const form = document.getElementById('editNotesForm');
    
    // Close modal events
    closeBtn?.addEventListener('click', () => this.closeEditModal());
    cancelEditBtn?.addEventListener('click', () => this.closeEditModal());
    cancelViewBtn?.addEventListener('click', () => this.closeEditModal());
    
    // Switch from view to edit mode
    editNotesFromView?.addEventListener('click', () => this.switchToEditMode());
    
    // Close on outside click
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) this.closeEditModal();
    });
    
    // Form submission
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveNotes();
    });
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.style.display === 'block') {
        this.closeEditModal();
      }
    });
  }
  
  closeEditModal() {
    document.getElementById('editNotesModal').style.display = 'none';
  }
  
  saveNotes() {
    const newNotes = document.getElementById('editNotes').value.trim();
    
    // Update the person in localStorage
    this.currentPerson.notes = newNotes;
    this.updatePersonInStorage(this.currentPerson);
    
    // Update the button display
    this.updateNotesDisplay();
    
    // Close modal
    this.closeEditModal();
  }
  
  updatePersonInStorage(person) {
    // Get current data from localStorage
    const data = JSON.parse(localStorage.getItem('myfilmpeople_data') || '[]');
    
    // Find and update the person
    const index = data.findIndex(p => p.id === person.id);
    if (index !== -1) {
      data[index] = person;
      localStorage.setItem('myfilmpeople_data', JSON.stringify(data));
    }
  }
  
  updateNotesDisplay() {
    const editButton = document.getElementById('editPerson');
    const hasNotes = this.currentPerson.notes && this.currentPerson.notes.trim();
    
    if (hasNotes) {
      // Update button text to "Show Notes"
      editButton.innerHTML = 'Show Notes';
    } else {
      // Update button text to "Add Notes"
      editButton.innerHTML = 'Add Notes';
    }
  }
  
  shouldIncludeMovie(movie) {
    // Filter out documentaries based on genre_ids or title keywords
    const title = (movie.title || '').toLowerCase();
    const originalTitle = (movie.original_title || '').toLowerCase();
    
    // More specific documentary indicators (avoid false positives)
    const documentaryKeywords = [
      'behind the scenes', 'making of', 'the making of',
      'featurette', 'deleted scenes', 'gag reel', 'bloopers', 
      'commentary', 'special features', 'outtakes'
    ];
    
    // Self appearance indicators (be more specific)
    const character = (movie.character || '').toLowerCase();
    const selfKeywords = [
      'themselves', 'himself', 'herself', 'self', 'archive footage'
    ];
    
    // Check for documentary keywords in title (more restrictive)
    const hasDocumentaryKeyword = documentaryKeywords.some(keyword => 
      title.includes(keyword) || originalTitle.includes(keyword)
    );
    
    // Check character name for obvious self appearances only
    const hasSelfKeyword = selfKeywords.some(keyword => 
      character.includes(keyword)
    );
    
    // Exclude if it matches obvious documentary or self criteria
    return !hasDocumentaryKeyword && !hasSelfKeyword;
  }
  
  shouldIncludeCrewRole(job, department) {
    // Include most creative roles, be less restrictive
    const majorRoles = [
      // Directing
      'Director', 'Co-Director', 'Assistant Director',
      // Writing
      'Writer', 'Screenplay', 'Story', 'Author', 'Novel', 'Characters', 'Script',
      // Producing
      'Producer', 'Executive Producer', 'Co-Producer', 'Associate Producer',
      // Cinematography
      'Director of Photography', 'Cinematography', 'Cinematographer',
      // Music
      'Original Music Composer', 'Music', 'Composer', 'Music Supervisor',
      // Editing
      'Editor', 'Film Editor', 'Editorial',
      // Art & Design
      'Production Designer', 'Art Director', 'Set Decorator', 'Costume Designer',
      // Other key roles
      'Casting Director', 'Supervising Producer'
    ];
    
    const majorDepartments = [
      'Directing', 'Writing', 'Production', 'Camera', 'Sound', 'Editing', 
      'Art', 'Costume & Make-Up', 'Visual Effects'
    ];
    
    // Check if it's a recognized role or department
    return majorRoles.includes(job) || majorDepartments.includes(department);
  }
  
  async smartFetch(options = {}) {
    const { personId, requestType = 'details', query } = options;
    
    // Build the direct TMDb URL based on request type
    let directUrl;
    if (requestType === 'search') {
      directUrl = TMDB_CONFIG.getSearchUrl(query);
    } else if (requestType === 'credits') {
      directUrl = TMDB_CONFIG.getPersonCreditsUrl(personId);
    } else {
      directUrl = TMDB_CONFIG.getPersonDetailsUrl(personId);
    }

    // Check if we're likely in a region where TMDb is blocked
    // Skip direct attempt if we've had recent failures
    const shouldSkipDirect = localStorage.getItem('tmdb_blocked') === 'true';
    
    // Method 1: Try direct TMDb (fastest when it works) - unless we know it's blocked
    if (!shouldSkipDirect) {
      try {
        const response = await this.fetchWithTimeout(directUrl, 3000); // Shorter timeout for direct
        if (response.ok) {
          // Clear any previous block flag
          localStorage.removeItem('tmdb_blocked');
          return response;
        }
      } catch (error) {
        // Mark as potentially blocked for future requests
        localStorage.setItem('tmdb_blocked', 'true');
      }
    }

    // Method 2: Try CORS proxies one by one with better error handling
    for (let i = 0; i < TMDB_CONFIG.CORS_PROXIES.length; i++) {
      try {
        let proxyUrl;
        if (requestType === 'search') {
          proxyUrl = TMDB_CONFIG.getSearchUrl(query, true, i);
        } else if (requestType === 'credits') {
          proxyUrl = TMDB_CONFIG.getPersonCreditsUrl(personId, true, i);
        } else {
          proxyUrl = TMDB_CONFIG.getPersonDetailsUrl(personId, true, i);
        }
        
        const response = await this.fetchWithTimeout(proxyUrl, 6000); // Shorter timeout for proxies
        if (response.ok) {
          return response;
        }
      } catch (error) {
        continue;
      }
    }
    
    // Method 3: All TMDb attempts failed - throw error to trigger Letterboxd-first mode
    throw new Error('All TMDb and proxy attempts failed');
  }

  async fetchWithTimeout(url, timeoutMs = null) {
    const timeout = timeoutMs || this.tmdbTimeout;
    return new Promise(async (resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        reject(new Error(`TMDb request timeout (${timeout}ms)`));
      }, timeout);
      
      try {
        const response = await fetch(url);
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        resolve(response);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }
  
  showLetterboxdFirst(message = 'TMDb data unavailable') {
    // Hide loading states
    this.hideLoadingState();
    
    // Hide bio toggle button and show Letterboxd-focused message
    document.getElementById('bioToggleBtn').classList.add('hidden');
    
    const letterboxdMessage = `
      <div style="text-align: center; color: #ff8000; margin: 20px 0; padding: 20px; border: 1px solid #ff8000; border-radius: 8px; background: rgba(255, 128, 0, 0.1);">
        <strong>🎬 Letterboxd-First Mode</strong><br>
        <span style="color: #9ab; font-size: 0.9rem; margin-top: 8px; display: block;">
          ${message}<br>
          Click the <strong>Letterboxd</strong> button above for complete profile and filmography.<br>
          <em>This is where film enthusiasts get the best data anyway!</em>
        </span>
      </div>
    `;
    
    // Show message in bio section
    document.getElementById('bioText').innerHTML = letterboxdMessage;
    
    // Hide filmography loading and clear grid
    const loadingElement = document.getElementById('loadingFilmography');
    const grid = document.getElementById('filmographyGrid');
    const filtersContainer = document.getElementById('filmographyFilters');
    loadingElement.style.display = 'none';
    grid.innerHTML = '';
    filtersContainer.innerHTML = '';
    
    // Show enhanced Letterboxd message in filmography
    grid.innerHTML = `
      <div style="text-align: center; margin: 20px 0; padding: 20px; background: rgba(255, 128, 0, 0.05); border-radius: 8px; grid-column: 1 / -1;">
        <div style="color: #ff8000; font-weight: bold; margin-bottom: 10px;">
          📽️ Filmography Available on Letterboxd
        </div>
        <div style="color: #9ab; font-size: 0.9rem; line-height: 1.4;">
          Letterboxd has the most comprehensive and curated filmography data.<br>
          Use the <strong>Letterboxd</strong> button above to explore this person's complete works,<br>
          including user ratings, reviews, and detailed film information.
        </div>
      </div>
    `;
  }

  showTMDbError() {
    // Hide loading states
    this.hideLoadingState();
    
    // Always hide the bio toggle button when showing error
    document.getElementById('bioToggleBtn').classList.add('hidden');
    
    // Only show error once to avoid duplication
    if (this.tmdbErrorShown) return;
    this.tmdbErrorShown = true;
    
    const errorMessage = `
      <div style="text-align: center; color: #ff8000; margin: 20px 0; padding: 20px; border: 1px solid #ff8000; border-radius: 8px; background: rgba(255, 128, 0, 0.1);">
        <strong>TMDb Connection Issue</strong><br>
        <span style="color: #9ab; font-size: 0.9rem; margin-top: 8px; display: block;">
          Unable to connect to TMDb (timeout or blocked).<br>
          Please use the Letterboxd button above for complete profile and filmography.
        </span>
      </div>
    `;
    
    // Show error in bio section
    document.getElementById('bioText').innerHTML = errorMessage;
    
    // Hide filmography loading and clear grid
    const loadingElement = document.getElementById('loadingFilmography');
    const grid = document.getElementById('filmographyGrid');
    const filtersContainer = document.getElementById('filmographyFilters');
    loadingElement.style.display = 'none';
    grid.innerHTML = '';
    filtersContainer.innerHTML = '';
    
    // Clear filmography section instead of showing duplicate error
    grid.innerHTML = `
      <div style="text-align: center; color: #9ab; margin: 20px 0; font-style: italic; grid-column: 1 / -1;">
        Filmography unavailable - see error message above
      </div>
    `;
  }
  
  showError(message) {
    document.getElementById('profileName').textContent = 'Error';
    document.getElementById('profileFullName').textContent = message;
    this.showTMDbError();
  }
}

// Initialize the profile page when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ProfilePageManager();
});
