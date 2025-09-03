// TMDb API Configuration with CORS proxy support
const TMDB_CONFIG = {
  API_KEY: CONFIG?.TMDB?.API_KEY || null, // No hardcoded fallback
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
      return `${proxy}${url}`;
    }
  },
  
  // Helper to get company movies URL with optional proxy (alternative approach)
  getCompanyMoviesDiscoverUrl: (companyId, useProxy = false, proxyIndex = 0, page = 1) => {
    // Use discover endpoint as alternative since company movies endpoint has pagination bugs
    const url = `${TMDB_CONFIG.BASE_URL}/discover/movie?api_key=${TMDB_CONFIG.API_KEY}&with_companies=${companyId}&page=${page}&sort_by=release_date.desc`;
    if (!useProxy) return url;
    
    // Handle different proxy formats
    const proxy = TMDB_CONFIG.CORS_PROXIES[proxyIndex];
    if (proxy.includes('allorigins.win')) {
      return `${proxy}${encodeURIComponent(url)}`;
    } else {
      return `${proxy}${url}`;
    }
  },

  // Helper to get company movies URL with optional proxy
  getCompanyMoviesUrl: (companyId, useProxy = false, proxyIndex = 0, page = 1) => {
    // Note: TMDb API doesn't support per_page parameter for company movies endpoint
    // It's fixed at 20 results per page
    // WARNING: This endpoint has pagination bugs - returns same results on all pages
    const url = `${TMDB_CONFIG.BASE_URL}/company/${companyId}/movies?api_key=${TMDB_CONFIG.API_KEY}&page=${page}`;
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

  // Helper to generate Letterboxd person search URLs
  generateLetterboxdPersonUrl(personName, role = 'actor') {
    console.log(`🎭 generateLetterboxdPersonUrl called with: name="${personName}", role="${role}"`);
    
    if (!personName || personName === 'Unknown Person') {
      return 'https://letterboxd.com/';
    }
    
    // Handle production companies differently
    if (role && role.toLowerCase().includes('production company')) {
      // For production companies, use studio format or search
      const slug = this.createLetterboxdSlug(personName);
      return `https://letterboxd.com/studio/${slug}/`;
    }
    
    // Create a slug from the person's name
    const slug = this.createLetterboxdSlug(personName);
    
    // Determine the role path for Letterboxd
    let rolePath = 'actor'; // default
    if (role && typeof role === 'string') {
      const lowerRole = role.toLowerCase();
      
      // Check for cinematography roles FIRST (before director check)
      // since "Director of Photography" contains "director"
      if (lowerRole.includes('director of photography') || lowerRole.includes('cinematographer')) {
        rolePath = 'cinematography';
      }
      else if (lowerRole.includes('camera operator')) {
        rolePath = 'camera-operator';
      }
      else if (lowerRole.includes('steadicam')) {
        rolePath = 'steadicam-operator';
      }
      else if (lowerRole.includes('focus puller') || lowerRole.includes('first assistant camera')) {
        rolePath = 'focus-puller';
      }
      else if (lowerRole.includes('second assistant camera') || lowerRole.includes('clapper loader')) {
        rolePath = 'second-assistant-camera';
      }
      else if (lowerRole.includes('cinematography') || lowerRole.includes('camera technician') || lowerRole.includes('camera')) {
        rolePath = 'cinematography';
      }
      // Director roles (but not Director of Photography)
      else if (lowerRole.includes('director') && !lowerRole.includes('photography') && !lowerRole.includes('assistant')) {
        rolePath = 'director';
      }
      // Writer roles
      else if (lowerRole.includes('writer') || lowerRole.includes('screenplay') || 
               lowerRole.includes('story') || lowerRole.includes('novel') || 
               lowerRole.includes('book') || lowerRole.includes('characters')) {
        rolePath = 'writer';
      }
      // Producer roles (detailed breakdown)
      else if (lowerRole.includes('executive producer')) {
        rolePath = 'executive-producer';
      }
      else if (lowerRole.includes('co-producer')) {
        rolePath = 'co-producer';
      }
      else if (lowerRole.includes('associate producer')) {
        rolePath = 'associate-producer';
      }
      else if (lowerRole.includes('line producer')) {
        rolePath = 'line-producer';
      }
      else if (lowerRole.includes('producer')) {
        rolePath = 'producer';
      }
      // Music and composer roles
      else if (lowerRole.includes('composer') || lowerRole.includes('music') || 
               lowerRole.includes('original music') || lowerRole.includes('score') ||
               lowerRole.includes('music producer')) {
        rolePath = 'composer';
      }
      // Editor roles (detailed breakdown)
      else if (lowerRole.includes('film editor') || lowerRole.includes('picture editor')) {
        rolePath = 'editor';
      }
      else if (lowerRole.includes('assistant editor')) {
        rolePath = 'assistant-editor';
      }
      else if (lowerRole.includes('colorist') || lowerRole.includes('color correction')) {
        rolePath = 'colorist';
      }
      else if (lowerRole.includes('editor')) {
        rolePath = 'editor';
      }
      // Casting roles
      else if (lowerRole.includes('casting')) {
        rolePath = 'casting';
      }
      // Visual Effects and Special Effects
      else if (lowerRole.includes('visual effects') || lowerRole.includes('special effects') ||
               lowerRole.includes('vfx') || lowerRole.includes('cgi')) {
        rolePath = 'visual-effects';
      }
      // Sound roles (detailed breakdown)
      else if (lowerRole.includes('sound designer')) {
        rolePath = 'sound-designer';
      }
      else if (lowerRole.includes('sound mixer') || lowerRole.includes('production sound')) {
        rolePath = 'sound';
      }
      else if (lowerRole.includes('boom operator')) {
        rolePath = 'boom-operator';
      }
      else if (lowerRole.includes('foley')) {
        rolePath = 'foley';
      }
      else if (lowerRole.includes('sound editor')) {
        rolePath = 'sound-editor';
      }
      else if (lowerRole.includes('re-recording mixer')) {
        rolePath = 're-recording-mixer';
      }
      // General sound roles
      else if (lowerRole.includes('sound') || lowerRole.includes('audio')) {
        rolePath = 'sound';
      }
      // Art/Production Design roles
      else if (lowerRole.includes('production design')) {
        rolePath = 'production-design';
      }
      else if (lowerRole.includes('art director')) {
        rolePath = 'art';
      }
      else if (lowerRole.includes('set decoration')) {
        rolePath = 'set-decoration';
      }
      else if (lowerRole.includes('costume')) {
        rolePath = 'costume-design';
      }
      else if (lowerRole.includes('makeup')) {
        rolePath = 'makeup';
      }
      else if (lowerRole.includes('hair')) {
        rolePath = 'hairstyling';
      }
      // Lighting and Grip roles
      else if (lowerRole.includes('gaffer') || lowerRole.includes('chief lighting technician')) {
        rolePath = 'lighting';
      }
      else if (lowerRole.includes('key grip')) {
        rolePath = 'key-grip';
      }
      else if (lowerRole.includes('best boy electric')) {
        rolePath = 'best-boy-electric';
      }
      else if (lowerRole.includes('best boy grip')) {
        rolePath = 'best-boy-grip';
      }
      else if (lowerRole.includes('lighting') || lowerRole.includes('electrician')) {
        rolePath = 'lighting';
      }
      else if (lowerRole.includes('grip') || lowerRole.includes('dolly grip')) {
        rolePath = 'grip';
      }
      // Assistant Director roles
      else if (lowerRole.includes('assistant director')) {
        rolePath = 'assistant-director';
      }
      // Stunt roles
      else if (lowerRole.includes('stunt')) {
        rolePath = 'stunts';
      }
      // Animation roles
      else if (lowerRole.includes('animation') || lowerRole.includes('animator')) {
        rolePath = 'animation';
      }
      // Location roles
      else if (lowerRole.includes('location')) {
        rolePath = 'locations';
      }
      // Script/Continuity roles
      else if (lowerRole.includes('script supervisor') || lowerRole.includes('continuity')) {
        rolePath = 'script-supervisor';
      }
      // Transportation roles
      else if (lowerRole.includes('transportation') || lowerRole.includes('driver')) {
        rolePath = 'transportation';
      }
      // Catering/Craft Services
      else if (lowerRole.includes('catering') || lowerRole.includes('craft service')) {
        rolePath = 'catering';
      }
      // Security roles
      else if (lowerRole.includes('security')) {
        rolePath = 'security';
      }
      // Medical roles
      else if (lowerRole.includes('medic') || lowerRole.includes('nurse')) {
        rolePath = 'medical';
      }
      // Publicist/Marketing roles
      else if (lowerRole.includes('publicist') || lowerRole.includes('marketing') || lowerRole.includes('unit publicist')) {
        rolePath = 'publicity';
      }
      // Still Photography
      else if (lowerRole.includes('still photographer') || lowerRole.includes('photography') && !lowerRole.includes('director of photography')) {
        rolePath = 'still-photographer';
      }
      // Acting roles
      else if (lowerRole.includes('actor') || lowerRole.includes('acting') || 
               lowerRole.includes('actress')) {
        rolePath = 'actor';
      }
      // For any other crew roles not specifically handled
      else {
        // If it's clearly not an acting role, use the role name as-is (slugified)
        const actingKeywords = ['actor', 'actress', 'acting', 'cast', 'character'];
        const isActingRole = actingKeywords.some(keyword => lowerRole.includes(keyword));
        if (!isActingRole) {
          // Create a slug from the role name itself
          rolePath = this.createLetterboxdSlug(role);
        }
      }
    }
    
    // Generate Letterboxd URL in format: letterboxd.com/role/slug-name/
    return `https://letterboxd.com/${rolePath}/${slug}/`;
  }

  // Helper to create Letterboxd-style slugs from names
  createLetterboxdSlug(name) {
    return name
      .toLowerCase()
      // Remove diacritics/accents by normalizing and removing combining characters
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Handle specific character replacements for common cases
      .replace(/ñ/g, 'n')
      .replace(/ç/g, 'c')
      .replace(/ß/g, 'ss')
      .replace(/æ/g, 'ae')
      .replace(/œ/g, 'oe')
      .replace(/ø/g, 'o')
      .replace(/å/g, 'a')
      // Remove any remaining special characters except spaces and hyphens
      .replace(/[^a-z0-9\s-]/g, '')
      // Replace multiple spaces with single space
      .replace(/\s+/g, ' ')
      // Trim spaces
      .trim()
      // Replace spaces with hyphens
      .replace(/\s/g, '-')
      // Replace multiple hyphens with single hyphen
      .replace(/-+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-|-$/g, '');
  }
  
  init() {
    // Check if API key is configured
    if (!TMDB_CONFIG.API_KEY) {
      this.showApiKeyError();
      return;
    }

    this.setupEventListeners();
    // Test TMDb connectivity on startup
    this.testTMDbConnectivity();
    this.loadPersonFromURL();
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
        window.location.href = this.returnUrl || 'index.html';
      });
    }
    
    // Letterboxd button
    const letterboxdButton = document.getElementById('openLetterboxd');
    if (letterboxdButton) {
      letterboxdButton.addEventListener('click', () => {
        if (this.currentPerson) {
          let letterboxdUrl;
          
          // Use existing letterboxdUrl if available (from local database)
          if (this.currentPerson.letterboxdUrl) {
            letterboxdUrl = this.currentPerson.letterboxdUrl;
          } else {
            // Generate Letterboxd URL for TMDb-loaded profiles
            letterboxdUrl = this.generateLetterboxdPersonUrl(
              this.currentPerson.name || 'Unknown Person',
              this.currentPerson.role || 'actor'
            );
            console.log(`🔗 Generated Letterboxd URL: ${letterboxdUrl} (role: ${this.currentPerson.role})`);
          }
          
          window.open(letterboxdUrl, '_blank');
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
    
    // Filter buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-btn')) {
        this.handleFilterClick(e.target);
      }
    });
  }
  
  loadPersonFromURL() {
    // Get the clean URL path (e.g., "/akira-kurosawa/")
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
    const companyId = urlParams.get('company');
    const isTmdb = urlParams.get('tmdb') === 'true';
    const passedRole = urlParams.get('role'); // Get role from URL parameter
    this.returnUrl = urlParams.get('return') || 'index.html'; // Store return URL
    
    if (companyId) {
      // Load company profile
      this.loadCompanyProfile(companyId);
    } else if (personName) {
      const person = this.findPersonByNameSlug(personName);
      if (person) {
        // Load the person profile directly
        this.loadPersonProfile(person.id, passedRole);
      } else if (personId) {
        this.loadPersonProfile(personId, passedRole);
      } else {
        this.showError('Person not found');
      }
    } else if (personId) {
      if (isTmdb) {
        // Force load from TMDb even if not in local database
        this.loadTMDbPersonProfile(personId, passedRole);
      } else {
        this.loadPersonProfile(personId, passedRole);
      }
    } else {
      this.showError('No person specified');
    }
  }
  
  async loadPersonProfile(personId, passedRole = null) {
    try {
      // Get person from localStorage
      const person = this.getPersonFromStorage(personId);
      if (!person) {
        this.showError('Person not found');
        return;
      }

      this.currentPerson = person;
      
      // Check if this is actually a company/studio based on role
      const isCompany = person.role && (
        person.role.toLowerCase().includes('production') || 
        person.role.toLowerCase().includes('company') ||
        person.role.toLowerCase().includes('studio') ||
        person.role === 'Production Company' ||
        person.role === 'Studio'
      );
      
      if (isCompany && person.tmdbId) {
        // Route to company profile instead
        console.log(`Detected company role: ${person.role}, routing to company profile`);
        await this.loadCompanyProfile(person.tmdbId);
        return;
      }
      
      // Set up profile layout for person
      this.setupPersonProfileLayout();
      
      // Show initial loading state
      this.showLoadingState();
      
      // Update basic info immediately with skeleton state
      this.updateBasicInfo(person);
      
      // Show filmography loading
      this.showFilmographyLoading();
      
      // If we have TMDb ID, fetch detailed info
      if (person.tmdbId) {
        try {
          await this.loadTMDbDetails(person.tmdbId, passedRole);
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
            await this.loadTMDbDetails(tmdbId, passedRole);
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
      // Use delay for profile loading failures too
      this.showLetterboxdFirst('Profile loading error - using Letterboxd mode');
    }
  }

  async loadTMDbPersonProfile(personId, passedRole = null) {
    try {
      console.log(`Loading TMDb person profile for ID: ${personId}`);
      
      // Set up profile layout for person
      this.setupPersonProfileLayout();
      
      // Show loading state
      this.showLoadingState();
      
      // Create a temporary person object for display
      const tempPerson = {
        id: personId,
        name: 'Loading...',
        role: 'Loading...'
      };
      this.currentPerson = tempPerson;
      
      // Update basic info with loading state
      this.updateBasicInfo(tempPerson);
      
      // Show filmography loading
      this.showFilmographyLoading();
      
      // Load from TMDb directly
      await this.loadTMDbDetails(personId, passedRole);
      await this.loadFilmography(personId);
      
    } catch (error) {
      console.error('Error loading TMDb profile:', error);
      this.hideLoadingState();
      this.showLetterboxdFirst('Failed to load profile from TMDb');
    }
  }

  async loadCompanyProfile(companyId) {
    try {
      console.log(`Loading company profile for ID: ${companyId}`);
      
      // Set up profile layout for company
      this.setupCompanyProfileLayout();
      
      // Show loading state
      this.showLoadingState();
      
      // Load company details from TMDb
      await this.loadCompanyDetails(companyId);
      await this.loadCompanyFilmography(companyId);
      
    } catch (error) {
      console.error('Error loading company profile:', error);
      this.hideLoadingState();
      this.showError('Failed to load company profile');
    }
  }

  setupPersonProfileLayout() {
    // Show elements relevant to people
    const profileBirth = document.getElementById('profileBirth');
    const profileBio = document.getElementById('profileBio');
    const editButton = document.getElementById('editPerson');
    
    if (profileBirth) profileBirth.style.display = 'block';
    if (profileBio) profileBio.style.display = 'block';
    if (editButton) editButton.style.display = 'inline-block';
    
    // Update page title
    document.title = 'Profile - MyFilmPeople';
    
    // Remove company-logo class from profile image if present
    const profileImage = document.getElementById('profileImage');
    if (profileImage) {
      profileImage.classList.remove('company-logo');
    }
    
    // Remove studio-layout class from profile info if present
    const profileInfo = document.querySelector('.profile-info');
    if (profileInfo) {
      profileInfo.classList.remove('studio-layout');
    }
  }

  setupCompanyProfileLayout() {
    // Hide elements not relevant to companies
    const profileBirth = document.getElementById('profileBirth');
    const profileBio = document.getElementById('profileBio');
    const editButton = document.getElementById('editPerson');
    
    if (profileBirth) profileBirth.style.display = 'none';
    if (profileBio) profileBio.style.display = 'none';
    if (editButton) editButton.style.display = 'none';
    
    // Update page title
    document.title = 'Studio Profile - MyFilmPeople';
    
    // Update section header
    const filmographyHeader = document.querySelector('.filmography-header h2');
    if (filmographyHeader) {
      filmographyHeader.textContent = 'Productions';
    }
    
    // Add company-logo class to profile image for proper aspect ratio
    const profileImage = document.getElementById('profileImage');
    if (profileImage) {
      profileImage.classList.add('company-logo');
    }
    
    // Add studio-layout class to profile info for responsive layout
    const profileInfo = document.querySelector('.profile-info');
    if (profileInfo) {
      profileInfo.classList.add('studio-layout');
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

    // Set profile image for studios
    if (person.role === 'studio') {
        this.setupStudioProfileImage(person);

        // Remove bio, birthdate, read more/less, and filters for studios
        const bioElement = document.getElementById('bioText');
        const birthElement = document.getElementById('profileBirth');
        const bioToggleBtn = document.getElementById('bioToggleBtn');
        const filmographyFilters = document.getElementById('filmographyFilters');
        if (bioElement) bioElement.style.display = 'none';
        if (birthElement) birthElement.style.display = 'none';
        if (bioToggleBtn) bioToggleBtn.style.display = 'none';
        if (filmographyFilters) filmographyFilters.style.display = 'none';
    } else {
        this.setupProfileImage(person);
    }

    // Update notes display
    this.updateNotesDisplay();

    // Update page title
    document.title = `${person.name} - MyFilmPeople`;
}

setupStudioProfileImage(person) {
    const profileImg = document.getElementById('profileImage');
    const profileContainer = document.querySelector('.profile-image-container');

    if (person.logoPath) {
        profileImg.src = `${TMDB_CONFIG.IMAGE_BASE_URL}${person.logoPath}`;
        profileImg.alt = `${person.name} Logo`;
        profileImg.style.display = 'block';
    } else {
        profileContainer.style.display = 'none'; // Hide the container if no logo
    }
}

  setupProfileImage(person) {
    const profileImg = document.getElementById('profileImage');
    
    if (person.profilePicture) {
      profileImg.src = person.profilePicture;
      profileImg.alt = person.name;
    } else {
      profileImg.src = `https://letterboxd.com/static/img/avatar500.png`;
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
  
  mapDisplayRoleToMainAppRole(displayRole) {
    // Convert display role back to main app format for filtering
    const mapping = {
      'Director': 'director',
      'Actor': 'actor',
      'Writer': 'writer',
      'Producer': 'producer',
      'Cinematographer': 'cinematographer',
      'Composer': 'composer',
      'Editor': 'editor',
      'Studio': 'studio'
      // Note: 'Production Company' is kept as-is for Letterboxd URL generation
    };
    
    return mapping[displayRole] || displayRole.toLowerCase();
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
  
  async loadTMDbDetails(tmdbId, passedRole = null) {
    try {
      // Check if this is a studio/company
      const isStudio = this.currentPerson && this.currentPerson.role === 'studio';
      
      const response = await this.smartFetch({
        requestType: 'details',
        personId: tmdbId,
        isCompany: isStudio
      });
      const data = await response.json();
      
      if (isStudio) {
        // Handle company details
        // Update basic company info
        document.getElementById('profileName').textContent = data.name || 'Unknown Company';
        document.getElementById('profileFullName').textContent = data.name || 'Unknown Company';
        document.getElementById('profileRole').textContent = 'Production Company';
        
        // Update currentPerson object for Letterboxd button
        if (this.currentPerson) {
          this.currentPerson.name = data.name || 'Unknown Company';
          this.currentPerson.role = this.mapDisplayRoleToMainAppRole('Production Company');
        }
        
        if (data.description) {
          this.setupBio(data.description);
        } else {
          this.showLetterboxdFirst('No description available from TMDb');
        }
        
        // For studios, hide birth info since it's not applicable
        const birthElement = document.getElementById('profileBirth');
        if (birthElement) {
          birthElement.style.display = 'none';
        }
        
        // Update company logo if available
        if (data.logo_path) {
          const profileImg = document.getElementById('profileImage');
          profileImg.src = `${TMDB_CONFIG.IMAGE_BASE_URL_LARGE}${data.logo_path}`;
        }
      } else {
        // Handle person details
        // Update basic person info
        document.getElementById('profileName').textContent = data.name || 'Unknown Person';
        document.getElementById('profileFullName').textContent = data.name || 'Unknown Person';
        
        // Set role based on passed parameter or known_for_department or default
        let role = 'Filmmaker';
        if (passedRole) {
          // Use the role passed from movie credits
          role = passedRole;
          console.log(`🎬 Using passed role: ${passedRole}`);
        } else if (data.known_for_department) {
          if (data.known_for_department === 'Acting') {
            role = 'Actor';
          } else if (data.known_for_department === 'Directing') {
            role = 'Director';
          } else {
            role = data.known_for_department;
          }
          console.log(`📽️ Using TMDb known_for_department: ${data.known_for_department} -> ${role}`);
        }
        document.getElementById('profileRole').textContent = role;
        
        console.log(`🔗 Final role for Letterboxd: ${role}`);
        
        // Update currentPerson object for Letterboxd button
        if (this.currentPerson) {
          this.currentPerson.name = data.name || 'Unknown Person';
          this.currentPerson.role = this.mapDisplayRoleToMainAppRole(role);
        }
        
        if (data.biography) {
          this.setupBio(data.biography);
        } else {
          this.showLetterboxdFirst('No biography available from TMDb');
        }
        
        // Update birth info
        if (data.birthday || data.place_of_birth) {
          let birthInfo = '';
          if (data.birthday) {
            const birthDate = new Date(data.birthday);
            birthInfo += `Born: ${birthDate.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}`;
          }
          if (data.place_of_birth) {
            birthInfo += birthInfo ? ` in ${data.place_of_birth}` : `Born in ${data.place_of_birth}`;
          }
          document.getElementById('profileBirth').textContent = birthInfo;
        } else {
          document.getElementById('profileBirth').style.display = 'none';
        }
        
        // Update profile image with higher quality
        if (data.profile_path) {
          const profileImg = document.getElementById('profileImage');
          profileImg.src = `${TMDB_CONFIG.IMAGE_BASE_URL_LARGE}${data.profile_path}`;
        }
      }
      
      // Hide loading state for profile details
      this.hideLoadingState();
      
    } catch (error) {
      console.error('Error loading TMDb details:', error);
      this.hideLoadingState();
      this.showLetterboxdFirst('Unable to load profile data from TMDb');
    }
  }

  async loadCompanyDetails(companyId) {
    try {
      console.log(`Loading company details for ID: ${companyId}`);
      
      // Use smart fetch to get company data
      const response = await this.smartFetch({
        requestType: 'details',
        personId: companyId,
        isCompany: true
      });
      const companyData = await response.json();
      
      if (companyData && companyData.name) {
        // Update profile info for company
        document.getElementById('profileName').textContent = companyData.name;
        document.getElementById('profileFullName').textContent = companyData.name;
        document.getElementById('profileRole').textContent = 'Production Company';
        
        // Update currentPerson object for Letterboxd button
        if (!this.currentPerson) {
          this.currentPerson = {};
        }
        this.currentPerson.name = companyData.name;
        this.currentPerson.role = this.mapDisplayRoleToMainAppRole('Production Company');
        
        // Update description if available
        if (companyData.description) {
          document.getElementById('bioText').textContent = companyData.description;
        } else {
          document.getElementById('bioText').textContent = 'No description available.';
        }
        
        // Update location info
        let locationInfo = [];
        if (companyData.headquarters) {
          locationInfo.push(`Headquarters: ${companyData.headquarters}`);
        }
        if (companyData.origin_country) {
          locationInfo.push(`Country: ${companyData.origin_country}`);
        }
        
        if (locationInfo.length > 0) {
          document.getElementById('profileBirth').textContent = locationInfo.join(' • ');
        } else {
          document.getElementById('profileBirth').style.display = 'none';
        }
        
        // Update company logo if available
        if (companyData.logo_path) {
          const profileImg = document.getElementById('profileImage');
          profileImg.src = `${TMDB_CONFIG.IMAGE_BASE_URL}${companyData.logo_path}`;
          profileImg.style.backgroundColor = 'white';
          profileImg.style.padding = '1rem';
        }
      } else {
        throw new Error('No company data received');
      }
      
    } catch (error) {
      console.error('Error loading company details:', error);
      this.showError('Unable to load company data from TMDb');
    }
  }

  async loadCompanyFilmography(companyId) {
    try {
      console.log(`Loading filmography for company ID: ${companyId}`);
      
      // Show filmography loading
      this.showFilmographyLoading();
      
      // Use the existing company movies fetching logic
      const movies = await this.fetchAllCompanyMovies(companyId);
      
      if (movies && movies.length > 0) {
        console.log(`Loaded ${movies.length} movies for company`);
        // Store movies and render them
        this.allMovies = movies;
        this.renderFilmography(this.filterMovies(movies));
      } else {
        console.log('No movies found for company');
        this.showError('No movies found for this company');
      }
      
    } catch (error) {
      console.error('Error loading company filmography:', error);
      this.showError('Failed to load company filmography');
    }
  }
  
  async fetchAllCompanyMovies(tmdbId) {
    console.log(`Starting company movies fetch for company ${tmdbId}`);
    
    // Update loading with initial progress
    const loadingElement = document.getElementById('loadingFilmography');
    if (loadingElement) {
      loadingElement.textContent = 'Connecting to studio database...';
    }
    
    // First, try the standard company movies endpoint (even though it's buggy)
    let standardResults = await this.tryStandardCompanyMovies(tmdbId);
    
    // If we got very few results (indicating API bug), try the discover endpoint
    if (standardResults.length <= 20) {
      console.log(`Standard endpoint returned only ${standardResults.length} movies, trying discover endpoint for complete filmography`);
      if (loadingElement) {
        loadingElement.textContent = `Found ${standardResults.length} movies via standard search, searching for complete filmography...`;
      }
      let discoverResults = await this.tryDiscoverCompanyMovies(tmdbId);
      
      // Use whichever gave us more results
      if (discoverResults.length > standardResults.length) {
        console.log(`Discover endpoint found ${discoverResults.length} movies vs ${standardResults.length} from standard endpoint - using discover results`);
        if (loadingElement) {
          loadingElement.textContent = `Complete search found ${discoverResults.length} movies! Finalizing...`;
        }
        return discoverResults;
      }
    }
    
    if (loadingElement) {
      loadingElement.textContent = `Found ${standardResults.length} movies via standard search. Finalizing...`;
    }
    return standardResults;
  }

  async tryStandardCompanyMovies(tmdbId) {
    const allMovies = [];
    const seenMovieIds = new Set();
    let currentPage = 1;
    let consecutiveEmptyPages = 0;
    // Remove page limit - let it fetch all pages for complete studio filmography
    
    try {
      while (consecutiveEmptyPages < 3) {
        console.log(`Trying standard endpoint page ${currentPage} for company ${tmdbId}`);
        
        const response = await this.smartFetch({
          requestType: 'credits',
          personId: tmdbId,
          isCompany: true,
          page: currentPage,
          useDiscoverFallback: false
        });
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          const newMovies = data.results.filter(movie => {
            if (seenMovieIds.has(movie.id)) {
              return false;
            }
            seenMovieIds.add(movie.id);
            return true;
          });
          
          allMovies.push(...newMovies);
          
          if (newMovies.length === 0) {
            consecutiveEmptyPages++;
            console.log(`Page ${currentPage} had no new movies (duplicates)`);
          } else {
            consecutiveEmptyPages = 0;
            console.log(`Found ${newMovies.length} new movies on page ${currentPage}`);
          }
        }
        
        currentPage++;
      }
      
      console.log(`Standard endpoint result: ${allMovies.length} unique movies`);
      return allMovies;
      
    } catch (error) {
      console.error('Error with standard company movies endpoint:', error);
      return allMovies;
    }
  }

  async tryDiscoverCompanyMovies(tmdbId) {
    const allMovies = [];
    const seenMovieIds = new Set();
    let currentPage = 1;
    let totalPages = 1;
    let consecutiveErrors = 0;
    
    try {
      do {
        console.log(`Trying discover endpoint page ${currentPage} for company ${tmdbId}`);
        
        const response = await this.smartFetch({
          requestType: 'credits',
          personId: tmdbId,
          isCompany: true,
          page: currentPage,
          useDiscoverFallback: true
        });
        const data = await response.json();
        
        console.log(`Discover page ${currentPage} response:`, {
          results: data.results?.length || 0,
          total_pages: data.total_pages,
          total_results: data.total_results
        });
        
        if (data.results && data.results.length > 0) {
          const newMovies = data.results.filter(movie => {
            if (seenMovieIds.has(movie.id)) {
              return false;
            }
            seenMovieIds.add(movie.id);
            return true;
          });
          
          allMovies.push(...newMovies);
          totalPages = data.total_pages || 1;
          consecutiveErrors = 0;
          
          console.log(`Discover page ${currentPage}: ${newMovies.length} new movies (${allMovies.length} total)`);
        } else {
          console.log(`No results on discover page ${currentPage}`);
          break;
        }
        
        // Update loading message
        const loadingElement = document.getElementById('loadingFilmography');
        if (loadingElement) {
          loadingElement.textContent = `Loading complete filmography... (${allMovies.length} movies found so far, page ${currentPage} of ${totalPages})`;
        }
        
        currentPage++;
        
        // Continue until we get all pages - no artificial limits for studios
        
      } while (currentPage <= totalPages && consecutiveErrors < 3);
      
      console.log(`Discover endpoint result: ${allMovies.length} unique movies`);
      return allMovies;
      
    } catch (error) {
      console.error('Error with discover company movies endpoint:', error);
      return allMovies;
    }
  }

  async fetchAllCompanyMovies_OLD(tmdbId) {
    const allMovies = [];
    const seenMovieIds = new Set(); // Track unique movie IDs to prevent duplicates
    let currentPage = 1;
    let totalPages = 1;
    let consecutiveErrors = 0;
    let consecutiveEmptyPages = 0; // Track consecutive pages with no new movies
    const maxConsecutiveErrors = 3;
    
    try {
      do {
        try {
          console.log(`Fetching company movies page ${currentPage} for company ${tmdbId}`);
          
          const response = await this.smartFetch({
            requestType: 'credits',
            personId: tmdbId,
            isCompany: true,
            page: currentPage
          });
          const data = await response.json();
          
          console.log(`Page ${currentPage} response:`, {
            results: data.results?.length || 0,
            total_pages: data.total_pages,
            total_results: data.total_results
          });
          
          // Reset error counter on successful request
          consecutiveErrors = 0;
          
          if (data.results && data.results.length > 0) {
            // Filter out duplicates using movie ID
            const newMovies = data.results.filter(movie => {
              if (seenMovieIds.has(movie.id)) {
                return false; // Skip duplicate
              }
              seenMovieIds.add(movie.id);
              return true;
            });
            
            console.log(`Found ${newMovies.length} new movies on page ${currentPage} (${data.results.length} total on page)`);
            
            // Log some movie IDs for debugging
            if (data.results.length > 0) {
              const movieIds = data.results.slice(0, 5).map(m => m.id);
              console.log(`First 5 movie IDs on page ${currentPage}:`, movieIds);
            }
            
            allMovies.push(...newMovies);
            
            // Be more lenient about duplicates - only stop if we get many consecutive pages with no new movies
            if (newMovies.length === 0) {
              consecutiveEmptyPages++;
              console.log(`Page ${currentPage} had no new movies (consecutive empty pages: ${consecutiveEmptyPages})`);
              
              // Only stop if we get 3 consecutive pages with no new movies
              if (consecutiveEmptyPages >= 3 && currentPage > 3) {
                console.log('Too many consecutive pages with no new movies, stopping pagination');
                break;
              }
            } else {
              // Reset counter if we found new movies
              consecutiveEmptyPages = 0;
            }
            
            // Update total pages, but don't trust it completely
            totalPages = Math.max(totalPages, data.total_pages || 1);
            
          } else {
            console.log(`No results on page ${currentPage}`);
            // If we get no results, try a few more pages in case of API inconsistency
            if (currentPage === 1) {
              break; // No movies at all on first page
            } else if (currentPage > totalPages + 2) {
              // If we're well beyond reported total pages and no results, stop
              console.log('No results beyond reported total pages, stopping');
              break;
            }
          }
          
          console.log(`Total pages reported: ${totalPages}`);
          
          // Update loading message to show progress
          const loadingElement = document.getElementById('loadingFilmography');
          if (loadingElement) {
            if (totalPages > 1) {
              loadingElement.textContent = `Loading filmography from TMDb... (${allMovies.length} movies found, page ${currentPage} of ${totalPages})`;
            } else {
              loadingElement.textContent = `Loading filmography from TMDb... (${allMovies.length} movies found)`;
            }
          }
          
          currentPage++;
          
          // Safety limits - be more aggressive about fetching since we know there are more movies
          if (currentPage > 100) {
            console.warn('Reached safety limit of 100 pages for company movies');
            break;
          }
          
          // If we haven't found any new movies for several pages but the API says there are more, 
          // try skipping ahead to see if it's just a pagination issue
          if (consecutiveEmptyPages >= 5 && currentPage < totalPages / 2) {
            console.log(`Skipping ahead due to repeated duplicates. Jumping to page ${currentPage + 10}`);
            currentPage += 10;
            consecutiveEmptyPages = 0;
            continue;
          }
          
        } catch (pageError) {
          consecutiveErrors++;
          console.warn(`Error fetching page ${currentPage}:`, pageError);
          
          // If we get too many consecutive errors, stop trying
          if (consecutiveErrors >= maxConsecutiveErrors) {
            console.warn(`Too many consecutive errors (${consecutiveErrors}), stopping pagination`);
            break;
          }
          
          // Still increment page to try next one
          currentPage++;
        }
        
        // Continue until we've tried a reasonable number of pages
        // Don't rely too heavily on total_pages since the API might have pagination bugs
      } while (consecutiveErrors < maxConsecutiveErrors && 
               currentPage <= 100 && 
               (consecutiveEmptyPages < 10 || currentPage <= 20)); // Try at least 20 pages even with duplicates
      
      console.log(`Final result: Fetched ${allMovies.length} unique movies for company ${tmdbId} across ${currentPage - 1} pages`);
      return allMovies;
      
    } catch (error) {
      console.error('Error in fetchAllCompanyMovies:', error);
      // If we have some movies already, return them instead of failing completely
      if (allMovies.length > 0) {
        console.log(`Returning ${allMovies.length} movies despite error`);
        return allMovies;
      }
      throw error;
    }
  }

  async loadFilmography(tmdbId) {
    try {
      // Check if this is a studio/company
      const isStudio = this.currentPerson && this.currentPerson.role === 'studio';
      
      const loadingElement = document.getElementById('loadingFilmography');
      const gridElement = document.getElementById('filmographyGrid');
      
      if (isStudio) {
        // Handle company/studio filmography - fetch all pages
        try {
          // Show initial progress
          loadingElement.textContent = 'Starting studio filmography search...';
          
          const allMovies = await this.fetchAllCompanyMovies(tmdbId);
          
          if (allMovies && allMovies.length > 0) {
            // Show processing progress
            loadingElement.textContent = `Processing ${allMovies.length} movies from studio...`;
            
            // For studios, we get a simple array of movies - no role assignment needed
            const movies = allMovies.map(movie => ({
              ...movie,
              roles: [] // Empty roles array - studios don't need role badges
            }));
            
            // Sort by release date
            movies.sort((a, b) => {
              const dateA = new Date(a.release_date || '1900-01-01');
              const dateB = new Date(b.release_date || '1900-01-01');
              return dateB - dateA; // Most recent first
            });
            
            // Show final organization progress
            loadingElement.textContent = `Organizing ${movies.length} movies...`;
            
            this.allMovies = movies;
            this.createDynamicFilters(movies);
            this.setDefaultFilter();
            this.renderFilmography(this.filterMovies(movies));
            loadingElement.style.display = 'none';
            
            console.log(`Successfully loaded ${movies.length} movies for studio`);
          } else {
            // Show progress-style message for empty results
            loadingElement.textContent = 'No filmography found for this studio. This may be due to API limitations.';
            setTimeout(() => {
              this.showLetterboxdFirst('Studio filmography unavailable - data may be incomplete in TMDb', true);
            }, 5000);
          }
        } catch (studioError) {
          console.error('Studio filmography error:', studioError);
          // Show loading failure message with progress style
          loadingElement.textContent = 'Studio filmography loading failed. Retrying or try refreshing...';
          setTimeout(() => {
            this.showLetterboxdFirst('Studio filmography loading failed - large studios may timeout', true);
          }, 8000);
        }
        return; // Exit early for studios to avoid the general catch block
      } else {
        // Handle person filmography (existing logic)
        try {
          // Update loading message to show progress
          loadingElement.textContent = 'Connecting to TMDb for filmography...';
          
          const response = await this.smartFetch({
            requestType: 'credits',
            personId: tmdbId,
            isCompany: false
          });
          
          loadingElement.textContent = 'Successfully connected! Downloading complete filmography...';
          const data = await response.json();
          
          if (data.cast || data.crew) {
            // Update loading message to show processing
            const totalCredits = (data.cast?.length || 0) + (data.crew?.length || 0);
            loadingElement.textContent = `Processing ${totalCredits} credits from TMDb...`;
            
            // Group movies by ID and combine roles
            const movieMap = new Map();
            let processedCredits = 0;
            
            // Process cast credits
            if (data.cast) {
              const castCount = data.cast.length;
              loadingElement.textContent = `Processing ${castCount} acting credits...`;
              
              data.cast.forEach((movie, index) => {
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
                processedCredits++;
                
                // Update progress every 10 items for large filmographies
                if (index % 10 === 0 && castCount > 20) {
                  const progress = Math.round(((index + 1) / castCount) * 100);
                  loadingElement.textContent = `Processing acting credits... ${progress}% (${index + 1}/${castCount})`;
                }
              });
            }
            
            // Process crew credits
            if (data.crew) {
              const crewCount = data.crew.length;
              loadingElement.textContent = `Processing ${crewCount} crew credits...`;
              
              data.crew.forEach((movie, index) => {
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
                processedCredits++;
                
                // Update progress every 10 items for large filmographies
                if (index % 10 === 0 && crewCount > 20) {
                  const progress = Math.round(((index + 1) / crewCount) * 100);
                  loadingElement.textContent = `Processing crew credits... ${progress}% (${index + 1}/${crewCount})`;
                }
              });
            }
            
            // Convert to array and sort by release date
            const uniqueMovies = Array.from(movieMap.values());
            
            // Update loading message with movie count and filtering info
            loadingElement.textContent = `Found ${uniqueMovies.length} unique movies! Organizing by release date...`;
            
            uniqueMovies.sort((a, b) => {
              const dateA = new Date(a.release_date || '1900-01-01');
              const dateB = new Date(b.release_date || '1900-01-01');
              return dateB - dateA; // Most recent first
            });
            
            // Show final step
            loadingElement.textContent = `Loading ${uniqueMovies.length} movies...`;
            
            // Add a small delay for large filmographies to show final progress
            if (uniqueMovies.length > 50) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            this.allMovies = uniqueMovies;
            this.createDynamicFilters(uniqueMovies);
            this.setDefaultFilter(); // Set default filter based on person's role
            
            // Final loading message
            loadingElement.textContent = `Ready! Displaying ${uniqueMovies.length} movies...`;
            
            this.renderFilmography(this.filterMovies(uniqueMovies));
            loadingElement.style.display = 'none';
          } else {
            loadingElement.textContent = 'No filmography data found. Checking alternatives...';
            setTimeout(() => {
              this.showLetterboxdFirst('No filmography found in TMDb database', true);
            }, 3000);
          }
        } catch (personError) {
          console.error('Person filmography error:', personError);
          // Show progressive loading failure message
          loadingElement.textContent = 'Filmography loading encountered issues. Please wait...';
          setTimeout(() => {
            this.showLetterboxdFirst('Filmography loading failed - connection or API issues', true);
          }, 8000);
        }
        return; // Exit early for persons to avoid the general catch block
      }
      
    } catch (error) {
      console.error('Critical error loading filmography:', error);
      // Only show Letterboxd fallback for critical errors that couldn't be handled above
      const loadingElement = document.getElementById('loadingFilmography');
      loadingElement.textContent = 'Critical loading error occurred. Preparing alternative...';
      setTimeout(() => {
        if (error.message && error.message.includes('not found')) {
          this.showLetterboxdFirst('Person not found in TMDb database', true);
        } else {
          this.showLetterboxdFirst('Critical loading error - please try refreshing or use Letterboxd', true);
        }
      }, 5000);
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
    // Collect all unique departments/roles that the person actually has
    const departmentCounts = new Map();
    departmentCounts.set('all', movies.length);
    
    // Count movies in each department
    movies.forEach(movie => {
      const uniqueDepartments = new Set();
      movie.roles.forEach(role => {
        uniqueDepartments.add(role.department);
      });
      
      // Count each department only once per movie
      uniqueDepartments.forEach(dept => {
        departmentCounts.set(dept, (departmentCounts.get(dept) || 0) + 1);
      });
    });
    
    // Create filter buttons only for roles this person actually has
    const filtersContainer = document.getElementById('filmographyFilters');
    filtersContainer.innerHTML = '';
    
    // Always add "All" filter first
    const allBtn = document.createElement('button');
    allBtn.className = 'filter-btn';
    allBtn.dataset.filter = 'all';
    allBtn.textContent = `All (${departmentCounts.get('all')})`;
    filtersContainer.appendChild(allBtn);
    
    // Define priority order for common departments
    const priorityOrder = ['Acting', 'Directing', 'Writing', 'Production', 'Camera', 'Sound', 'Editing'];
    const addedDepartments = new Set(['all']);
    
    // Add priority departments first if they exist
    priorityOrder.forEach(dept => {
      if (departmentCounts.has(dept) && departmentCounts.get(dept) > 0) {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.dataset.filter = dept;
        // Use special display logic for filter buttons
        const filterDisplayName = dept === 'Acting' ? 'Actor' : this.formatDepartmentDisplay(dept, []);
        btn.textContent = `${filterDisplayName} (${departmentCounts.get(dept)})`;
        filtersContainer.appendChild(btn);
        addedDepartments.add(dept);
      }
    });
    
    // Add any remaining departments that weren't in the priority list
    departmentCounts.forEach((count, dept) => {
      if (!addedDepartments.has(dept) && count > 0) {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.dataset.filter = dept;
        // Use special display logic for filter buttons
        const filterDisplayName = dept === 'Acting' ? 'Actor' : this.formatDepartmentDisplay(dept, []);
        btn.textContent = `${filterDisplayName} (${count})`;
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
    
    // Separate acting roles from crew roles
    const actingRoles = rolesByDept.filter(dept => dept.department === 'Acting');
    const crewRoles = rolesByDept.filter(dept => dept.department !== 'Acting');
    
    // Create role display with acting first, then crew roles
    let roleDisplay = '';
    
    // Add acting roles first (prioritized and on their own line)
    if (actingRoles.length > 0) {
      const actingDisplay = actingRoles.map(dept => 
        `<span class="role-badge ${dept.className}">${dept.display}</span>`
      ).join('');
      roleDisplay += `<div class="acting-roles">${actingDisplay}</div>`;
    }
    
    // Add crew roles (2 per line, with special handling for odd numbers)
    if (crewRoles.length > 0) {
      let crewDisplay = '<div class="crew-roles">';
      
      for (let i = 0; i < crewRoles.length; i += 2) {
        // Check if this is the last line and has only one item (odd total count)
        const isLastSingleItem = (i + 1 === crewRoles.length);
        const lineClass = isLastSingleItem ? 'crew-line crew-line-single' : 'crew-line';
        
        crewDisplay += `<div class="${lineClass}">`;
        
        // Add first role of the pair
        const role1 = crewRoles[i];
        crewDisplay += `<span class="role-badge ${role1.className}">${role1.display}</span>`;
        
        // Add second role of the pair if it exists
        if (i + 1 < crewRoles.length) {
          const role2 = crewRoles[i + 1];
          crewDisplay += `<span class="role-badge ${role2.className}">${role2.display}</span>`;
        }
        
        crewDisplay += '</div>';
      }
      
      crewDisplay += '</div>';
      roleDisplay += crewDisplay;
    }
    
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
    
    // Make card clickable to open movie page
    card.addEventListener('click', () => {
      // Navigate to movie page with movie ID and return URL
      const currentUrl = window.location.href;
      const moviePageUrl = `movie.html?id=${movie.id}&return=${encodeURIComponent(currentUrl)}`;
      
      // Navigate to movie page
      window.location.href = moviePageUrl;
      
      // Log the navigation for debugging
      console.log(`Navigating to movie page for: ${movie.title} (${year}) -> ${moviePageUrl}`);
    });
    
    return card;
  }
  
  groupRolesByDepartment(roles) {
    // Handle empty roles array (for studios/companies)
    if (!roles || roles.length === 0) {
      return [];
    }
    
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
      'Acting': roles.length > 1 ? 'Actor' : roles[0], // Show character name for single role, "Actor" for multiple
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
        case 'writer':
          defaultFilter = 'Writing';
          break;
        case 'producer':
          defaultFilter = 'Production';
          break;
        case 'cinematographer':
          defaultFilter = 'Camera';
          break;
        case 'composer':
          defaultFilter = 'Sound';
          break;
        case 'editor':
          defaultFilter = 'Editing';
          break;
        case 'studio':
        case 'Production Company':
          defaultFilter = 'all'; // Studios don't have specific department filters
          break;
        default:
          // For other roles, try to find the most common department in their filmography
          if (this.allMovies && this.allMovies.length > 0) {
            const departmentCounts = new Map();
            this.allMovies.forEach(movie => {
              const uniqueDepartments = new Set();
              movie.roles.forEach(role => {
                uniqueDepartments.add(role.department);
              });
              uniqueDepartments.forEach(dept => {
                departmentCounts.set(dept, (departmentCounts.get(dept) || 0) + 1);
              });
            });
            
            // Find the department with the most movies
            let maxCount = 0;
            departmentCounts.forEach((count, dept) => {
              if (count > maxCount) {
                maxCount = count;
                defaultFilter = dept;
              }
            });
          }
          break;
      }
    }
    
    // Verify that the default filter actually exists as a button
    const filterButton = document.querySelector(`.filter-btn[data-filter="${defaultFilter}"]`);
    if (!filterButton) {
      defaultFilter = 'all'; // fallback to 'all' if the specific filter doesn't exist
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
      // Show movies where person has the specific department/role
      return movie.roles.some(role => role.department === this.activeFilter);
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
    const { personId, requestType = 'details', query, isCompany = false, page = 1, useDiscoverFallback = false } = options;
    
    // Build the direct TMDb URL based on request type and whether it's a company
    let directUrl;
    if (requestType === 'search') {
      directUrl = TMDB_CONFIG.getSearchUrl(query);
    } else if (requestType === 'credits') {
      if (isCompany) {
        if (useDiscoverFallback) {
          directUrl = TMDB_CONFIG.getCompanyMoviesDiscoverUrl(personId, false, 0, page);
        } else {
          directUrl = TMDB_CONFIG.getCompanyMoviesUrl(personId, false, 0, page);
        }
      } else {
        directUrl = TMDB_CONFIG.getPersonCreditsUrl(personId);
      }
    } else {
      if (isCompany) {
        directUrl = TMDB_CONFIG.getCompanyDetailsUrl(personId);
      } else {
        directUrl = TMDB_CONFIG.getPersonDetailsUrl(personId);
      }
    }

    // Check if we're likely in a region where TMDb is blocked
    // Skip direct attempt if we've had recent failures
    const shouldSkipDirect = localStorage.getItem('tmdb_blocked') === 'true';
    
    // Method 1: Try direct TMDb (fastest when it works) - unless we know it's blocked
    if (!shouldSkipDirect) {
      try {
        // Use longer timeout for company requests since they might involve multiple API calls
        const timeout = isCompany ? 8000 : 3000;
        const response = await this.fetchWithTimeout(directUrl, timeout);
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
          if (isCompany) {
            if (useDiscoverFallback) {
              proxyUrl = TMDB_CONFIG.getCompanyMoviesDiscoverUrl(personId, true, i, page);
            } else {
              proxyUrl = TMDB_CONFIG.getCompanyMoviesUrl(personId, true, i, page);
            }
          } else {
            proxyUrl = TMDB_CONFIG.getPersonCreditsUrl(personId, true, i);
          }
        } else {
          if (isCompany) {
            proxyUrl = TMDB_CONFIG.getCompanyDetailsUrl(personId, true, i);
          } else {
            proxyUrl = TMDB_CONFIG.getPersonDetailsUrl(personId, true, i);
          }
        }
        
        const response = await this.fetchWithTimeout(proxyUrl, isCompany ? 10000 : 6000); // Longer timeout for companies
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
  
  showLetterboxdFirst(message = 'TMDb data unavailable', showImmediately = false) {
    // If not showing immediately, add a delay to give loading time
    if (!showImmediately) {
      // Wait 15 seconds before showing fallback to give loading time
      setTimeout(() => {
        // Check if loading is still happening
        const loadingElement = document.getElementById('loadingFilmography');
        if (loadingElement && loadingElement.style.display !== 'none' && 
            loadingElement.textContent.includes('Loading')) {
          this.showLetterboxdFirstImmediate(message);
        }
      }, 15000);
      return;
    }
    
    this.showLetterboxdFirstImmediate(message);
  }
  
  showLetterboxdFirstImmediate(message = 'TMDb data unavailable') {
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
  
  showApiKeyError() {
    document.getElementById('profileName').textContent = '⚠️ Configuration Required';
    document.getElementById('profileFullName').textContent = 'TMDb API key not configured';
    document.getElementById('profileRole').textContent = 'Setup Required';
    
    // Hide profile image
    const profileContainer = document.querySelector('.profile-image-container');
    if (profileContainer) profileContainer.style.display = 'none';
    
    // Show setup instructions in bio area
    const bioText = document.getElementById('bioText');
    if (bioText) {
      bioText.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
          <h3>🔧 API Configuration Required</h3>
          <p>TMDb API key is not configured. Please set up your environment:</p>
          <div style="text-align: left; background: #1a1a1a; padding: 1rem; border-radius: 8px; margin: 1rem 0;">
            <p><strong>For Development:</strong></p>
            <p>Create <code>assets/js/config.local.js</code> with:</p>
            <pre style="background: #000; padding: 0.5rem; border-radius: 4px; font-size: 0.9em;">window.LOCAL_CONFIG = {
  TMDB_API_KEY: 'your_api_key_here'
};</pre>
            
            <p style="margin-top: 1rem;"><strong>For Production:</strong></p>
            <p>Set <code>TMDB_API_KEY</code> environment variable</p>
          </div>
          <p>See <code>docs/API_SECURITY.md</code> for detailed setup instructions.</p>
          <button onclick="window.location.href='index.html'" style="background: #ff8000; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">
            Back to Home
          </button>
        </div>
      `;
    }
    
    // Hide filmography section
    const filmographySection = document.querySelector('.filmography-section');
    if (filmographySection) filmographySection.style.display = 'none';
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
