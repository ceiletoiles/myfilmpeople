// Movie Page JavaScript
// Configuration for TMDb API
const TMDB_CONFIG = {
  API_KEY: '5f1ead96e48e2379102c77c2546331a4',
  BASE_URL: 'https://api.themoviedb.org/3',
  IMAGE_BASE_URL: 'https://image.tmdb.org/t/p/w500',
  POSTER_BASE_URL: 'https://image.tmdb.org/t/p/w300',

  // TMDb API rate limiting and proxy handling
  RATE_LIMIT_DELAY: 50, // 50ms between requests
  MAX_RETRIES: 3,
  
  // CORS proxy servers (same as profile.js)
  CORS_PROXIES: [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://cors-anywhere.herokuapp.com/',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://yacdn.org/proxy/'
  ],

  // Helper to get movie details with optional proxy
  getMovieDetailsUrl: (movieId, useProxy = false, proxyIndex = 0) => {
    const url = `${TMDB_CONFIG.BASE_URL}/movie/${movieId}?api_key=${TMDB_CONFIG.API_KEY}&append_to_response=credits`;
    
    if (!useProxy) return url;
    
    // Handle different proxy formats (same as profile.js)
    const proxy = TMDB_CONFIG.CORS_PROXIES[proxyIndex];
    if (proxy.includes('allorigins.win')) {
      return `${proxy}${encodeURIComponent(url)}`;
    } else {
      return `${proxy}${url}`;
    }
  }
};

class MoviePage {
  constructor() {
    this.movieId = null;
    this.movieData = null;
    this.returnUrl = null;
    this.studiosLoaded = false;
    this.init();
  }

  init() {
    // Get movie ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    this.movieId = urlParams.get('id');
    this.returnUrl = urlParams.get('return') || 'index.html';
    
    if (!this.movieId) {
      console.error('No movie ID provided');
      this.showError('No movie specified');
      return;
    }

    this.initializeTabs();
    this.setupEventListeners();
    this.loadMovieData();
  }

  initializeTabs() {
    // Ensure only cast tab is visible initially
    const castSection = document.getElementById('castSection');
    const crewSection = document.getElementById('crewSection');
    const studiosSection = document.getElementById('studiosSection');

    if (castSection) castSection.classList.remove('hidden');
    if (crewSection) crewSection.classList.add('hidden');
    if (studiosSection) studiosSection.classList.add('hidden');
  }

  setupEventListeners() {
    // Back button
    const backButton = document.getElementById('backToProfile');
    if (backButton) {
      backButton.addEventListener('click', () => {
        window.location.href = this.returnUrl;
      });
    }

    // Credits tabs
    const creditsTabs = document.querySelectorAll('.credits-tab');
    creditsTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchCreditsTab(tab.dataset.tab);
      });
    });
  }

  switchCreditsTab(tabName) {
    // Update tab buttons
    const tabs = document.querySelectorAll('.credits-tab');
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab content
    const castSection = document.getElementById('castSection');
    const crewSection = document.getElementById('crewSection');
    const studiosSection = document.getElementById('studiosSection');

    // Hide all sections first
    castSection.classList.add('hidden');
    crewSection.classList.add('hidden');
    studiosSection.classList.add('hidden');

    // Show selected section
    if (tabName === 'cast') {
      castSection.classList.remove('hidden');
    } else if (tabName === 'crew') {
      crewSection.classList.remove('hidden');
    } else if (tabName === 'studios') {
      studiosSection.classList.remove('hidden');
      // Load studios data if not already loaded
      if (!this.studiosLoaded) {
        this.loadStudiosData();
      }
    }
  }

  async loadMovieData() {
    try {
      console.log(`Loading movie data for ID: ${this.movieId}`);
      
      // Show loading state
      this.showLoadingState();
      
      // Use smart fetch approach
      const movieData = await this.fetchMovieData();
      
      if (movieData) {
        console.log('Movie data received:', movieData);
        this.movieData = movieData;
        this.renderMovieData();
        this.setupLetterboxdButton();
      } else {
        throw new Error('Failed to load movie data from all sources');
      }

    } catch (error) {
      console.error('Error loading movie data:', error);
      this.showError('Failed to load movie information: ' + error.message);
    }
  }

  async fetchMovieData(useProxy = false, proxyIndex = 0) {
    try {
      console.log('Fetching movie data for ID:', this.movieId);
      
      // Use smart fetch approach similar to profile.js
      const response = await this.smartFetch();
      
      if (response.ok) {
        const data = await response.json();
        
        console.log('Raw movie data received:', data);
        
        if (data.success === false) {
          throw new Error(data.status_message || 'API request failed');
        }
        
        console.log('Movie data validation passed, returning data');
        return data;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
    } catch (error) {
      console.error('Fetch error details:', error);
      return null;
    }
  }

  async smartFetch() {
    // Build the direct TMDb URL for movie details
    const directUrl = TMDB_CONFIG.getMovieDetailsUrl(this.movieId, false, 0);
    
    // Check if we're likely in a region where TMDb is blocked
    const shouldSkipDirect = localStorage.getItem('tmdb_blocked') === 'true';
    
    // Method 1: Try direct TMDb (fastest when it works) - unless we know it's blocked
    if (!shouldSkipDirect) {
      try {
        console.log('Trying direct TMDb API:', directUrl);
        const response = await this.fetchWithTimeout(directUrl, 5000);
        if (response.ok) {
          // Clear any previous block flag
          localStorage.removeItem('tmdb_blocked');
          console.log('Direct TMDb API successful');
          return response;
        }
      } catch (error) {
        console.log('Direct TMDb failed:', error.message);
        // Mark as potentially blocked for future requests
        localStorage.setItem('tmdb_blocked', 'true');
      }
    }

    // Method 2: Try CORS proxies one by one
    for (let i = 0; i < TMDB_CONFIG.CORS_PROXIES.length; i++) {
      try {
        const proxyUrl = TMDB_CONFIG.getMovieDetailsUrl(this.movieId, true, i);
        console.log(`Trying proxy ${i}:`, proxyUrl);
        
        const response = await this.fetchWithTimeout(proxyUrl, 8000);
        if (response.ok) {
          console.log(`Proxy ${i} successful`);
          return response;
        }
      } catch (error) {
        console.log(`Proxy ${i} failed:`, error.message);
        continue;
      }
    }
    
    // Method 3: All attempts failed
    throw new Error('All TMDb and proxy attempts failed');
  }

  async fetchWithTimeout(url, timeoutMs = 5000) {
    return new Promise(async (resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        reject(new Error(`Request timeout (${timeoutMs}ms)`));
      }, timeoutMs);
      
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

  renderMovieData() {
    console.log('renderMovieData called');
    if (!this.movieData) {
      console.log('No movie data available for rendering');
      return;
    }

    const movie = this.movieData;
    console.log('Rendering movie data for:', movie.title);

    // Set page title
    document.title = `${movie.title} - MyFilmPeople`;

    // Update header
    const movieTitle = document.getElementById('movieTitle');
    if (movieTitle) {
      movieTitle.textContent = movie.title;
    }

    // Update movie poster
    const moviePoster = document.getElementById('moviePoster');
    if (moviePoster && movie.poster_path) {
      moviePoster.src = TMDB_CONFIG.POSTER_BASE_URL + movie.poster_path;
      moviePoster.alt = `${movie.title} poster`;
    } else if (moviePoster) {
      moviePoster.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDIwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjMzk0MjQ5Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTUwIiBmaWxsPSIjNjc4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiPk5vIFBvc3RlcjwvdGV4dD4KPC9zdmc+';
      moviePoster.alt = 'No poster available';
    }

    // Update movie details
    const movieFullTitle = document.getElementById('movieFullTitle');
    if (movieFullTitle) {
      movieFullTitle.textContent = movie.title;
    }

    const movieYear = document.getElementById('movieYear');
    if (movieYear && movie.release_date) {
      const year = new Date(movie.release_date).getFullYear();
      movieYear.textContent = year;
    }

    // Find and display director
    const movieDirector = document.getElementById('movieDirector');
    if (movieDirector && movie.credits && movie.credits.crew) {
      const directors = movie.credits.crew.filter(person => person.job === 'Director');
      if (directors.length > 0) {
        const directorNames = directors.map(d => d.name).join(', ');
        movieDirector.textContent = directorNames;
      } else {
        movieDirector.textContent = 'Director information not available';
      }
    }

    // Update ratings
    const tmdbRating = document.getElementById('tmdbRating');
    if (tmdbRating && movie.vote_average) {
      tmdbRating.textContent = `${movie.vote_average.toFixed(1)}/10`;
    }

    // Update synopsis
    this.renderSynopsis(movie.overview);

    // Render cast and crew
    this.renderCredits(movie.credits);
  }

  renderSynopsis(overview) {
    const synopsisText = document.getElementById('synopsisText');
    
    if (!synopsisText) return;

    if (overview && overview.trim()) {
      synopsisText.textContent = overview;
      // Always show full synopsis - no truncation
      synopsisText.classList.remove('synopsis-text-truncated');
    } else {
      synopsisText.textContent = 'Synopsis not available.';
      synopsisText.style.fontStyle = 'italic';
      synopsisText.style.color = '#678';
    }
  }

  renderCredits(credits) {
    if (!credits) {
      this.showCreditsError();
      return;
    }

    this.renderCrew(credits.crew);
    this.renderCast(credits.cast);
  }

  renderCrew(crew) {
    const crewList = document.getElementById('crewList');
    const loadingCrew = document.getElementById('loadingCrew');
    
    if (!crewList) return;

    if (loadingCrew) {
      loadingCrew.style.display = 'none';
    }

    if (!crew || crew.length === 0) {
      crewList.innerHTML = '<p class="no-data">Crew information not available</p>';
      return;
    }

    // Organize crew by job categories similar to the image
    const crewByJob = {};
    
    // Key job categories in order of importance
    const jobCategories = {
      'DIRECTOR': ['Director'],
      'PRODUCERS': ['Producer', 'Executive Producer', 'Co-Producer', 'Associate Producer'],
      'WRITER': ['Writer', 'Screenplay', 'Story', 'Original Story'],
      'ORIGINAL WRITER': ['Original Writer', 'Characters', 'Novel', 'Book'],
      'CASTING': ['Casting', 'Casting Director'],
      'EDITOR': ['Editor', 'Film Editor'],
      'CINEMATOGRAPHY': ['Director of Photography', 'Cinematography'],
      'ADDITIONAL DIRECTING': ['Assistant Director', 'First Assistant Director', 'Second Assistant Director'],
      'EXECUTIVE PRODUCERS': ['Executive Producer'],
      'LIGHTING': ['Gaffer', 'Key Grip', 'Best Boy Electric', 'Lighting Technician'],
      'CAMERA OPERATORS': ['Camera Operator', 'Steadicam Operator', 'Camera Technician']
    };

    // Group crew members by job categories
    crew.forEach(person => {
      for (const [category, jobs] of Object.entries(jobCategories)) {
        if (jobs.includes(person.job)) {
          if (!crewByJob[category]) crewByJob[category] = [];
          crewByJob[category].push(person);
          return;
        }
      }
      
      // If job doesn't fit in predefined categories, group by exact job title
      if (!crewByJob[person.job]) crewByJob[person.job] = [];
      crewByJob[person.job].push(person);
    });

    // Render crew by categories
    let crewHTML = '';
    
    // First render key categories in order
    Object.keys(jobCategories).forEach(category => {
      if (crewByJob[category] && crewByJob[category].length > 0) {
        crewHTML += `
          <div class="crew-category">
            <h4 class="crew-category-title">${category}</h4>
            <div class="crew-members">
              ${crewByJob[category].map(person => this.createCrewPersonHTML(person)).join('')}
            </div>
          </div>
        `;
        delete crewByJob[category]; // Remove so we don't show it again
      }
    });

    // Then render remaining job categories
    Object.entries(crewByJob).forEach(([jobTitle, people]) => {
      if (people.length > 0) {
        crewHTML += `
          <div class="crew-category">
            <h4 class="crew-category-title">${jobTitle.toUpperCase()}</h4>
            <div class="crew-members">
              ${people.map(person => this.createCrewPersonHTML(person)).join('')}
            </div>
          </div>
        `;
      }
    });

    crewList.innerHTML = crewHTML;
    
    // Add click handlers for crew members
    this.addCrewClickHandlers();
  }

  createCrewPersonHTML(person) {
    return `
      <div class="crew-person" data-person-id="${person.id}" data-person-name="${person.name}">
        <span class="crew-name">${person.name}</span>
      </div>
    `;
  }

  renderCast(cast) {
    const castList = document.getElementById('castList');
    const loadingCast = document.getElementById('loadingCast');
    
    if (!castList) return;

    if (loadingCast) {
      loadingCast.style.display = 'none';
    }

    if (!cast || cast.length === 0) {
      castList.innerHTML = '<p class="no-data">Cast information not available</p>';
      return;
    }

    // Show top 30 cast members in a grid similar to the image
    const castToShow = cast.slice(0, 30);

    castList.innerHTML = castToShow.map(person => `
      <div class="cast-person" data-person-id="${person.id}" data-person-name="${person.name}">
        <div class="cast-name">${person.name}</div>
        <div class="cast-character">${person.character || 'Character not specified'}</div>
      </div>
    `).join('');
    
    // Add click handlers for cast members
    this.addCastClickHandlers();
  }

  addCrewClickHandlers() {
    const crewPersons = document.querySelectorAll('.crew-person');
    crewPersons.forEach(person => {
      person.addEventListener('click', () => {
        const personId = person.dataset.personId;
        const personName = person.dataset.personName;
        
        if (personId && personId !== 'null') {
          console.log(`Navigating to crew member profile: ${personName} (ID: ${personId})`);
          this.navigateToProfile(personId);
        } else {
          console.log(`No ID available for crew member: ${personName}`);
        }
      });
    });
  }

  addCastClickHandlers() {
    const castPersons = document.querySelectorAll('.cast-person');
    castPersons.forEach(person => {
      person.addEventListener('click', () => {
        const personId = person.dataset.personId;
        const personName = person.dataset.personName;
        
        if (personId && personId !== 'null') {
          console.log(`Navigating to cast member profile: ${personName} (ID: ${personId})`);
          this.navigateToProfile(personId);
        } else {
          console.log(`No ID available for cast member: ${personName}`);
        }
      });
    });
  }

  navigateToProfile(personId) {
    // Navigate to profile page with TMDb ID, ensuring it's handled as TMDb data
    const currentUrl = window.location.href;
    const profileUrl = `profile.html?id=${personId}&tmdb=true&return=${encodeURIComponent(currentUrl)}`;
    
    window.location.href = profileUrl;
  }

  navigateToCompany(companyId) {
    // Navigate to profile page for company with TMDb company ID
    const currentUrl = window.location.href;
    const profileUrl = `profile.html?company=${companyId}&return=${encodeURIComponent(currentUrl)}`;
    
    window.location.href = profileUrl;
  }

  async loadStudiosData() {
    if (!this.movieData) return;
    
    try {
      this.studiosLoaded = true;
      const studiosList = document.getElementById('studiosList');
      const loadingStudios = document.getElementById('loadingStudios');
      
      if (loadingStudios) {
        loadingStudios.style.display = 'none';
      }
      
      if (!studiosList) return;
      
      // Clear existing content
      studiosList.innerHTML = '';
      
      // Production Companies
      if (this.movieData.production_companies && this.movieData.production_companies.length > 0) {
        const companiesSection = document.createElement('div');
        companiesSection.className = 'studio-category';
        
        const companiesTitle = document.createElement('h4');
        companiesTitle.className = 'studio-category-title';
        companiesTitle.textContent = 'Production Companies';
        companiesSection.appendChild(companiesTitle);
        
        const companiesGrid = document.createElement('div');
        companiesGrid.className = 'studio-items';
        
        this.movieData.production_companies.forEach(company => {
          const companyElement = document.createElement('button');
          companyElement.className = 'studio-item';
          companyElement.innerHTML = `<div class="studio-name">${company.name}</div>`;
          companyElement.addEventListener('click', () => {
            this.navigateToCompany(company.id);
          });
          companiesGrid.appendChild(companyElement);
        });
        
        companiesSection.appendChild(companiesGrid);
        studiosList.appendChild(companiesSection);
      }
      
      // Production Countries
      if (this.movieData.production_countries && this.movieData.production_countries.length > 0) {
        const countriesSection = document.createElement('div');
        countriesSection.className = 'studio-category';
        
        const countriesTitle = document.createElement('h4');
        countriesTitle.className = 'studio-category-title';
        countriesTitle.textContent = 'Production Countries';
        countriesSection.appendChild(countriesTitle);
        
        const countriesGrid = document.createElement('div');
        countriesGrid.className = 'studio-items';
        
        this.movieData.production_countries.forEach(country => {
          const countryElement = document.createElement('div');
          countryElement.className = 'country-item';
          countryElement.textContent = country.name;
          countriesGrid.appendChild(countryElement);
        });
        
        countriesSection.appendChild(countriesGrid);
        studiosList.appendChild(countriesSection);
      }
      
      // Spoken Languages
      if (this.movieData.spoken_languages && this.movieData.spoken_languages.length > 0) {
        const languagesSection = document.createElement('div');
        languagesSection.className = 'studio-category';
        
        const languagesTitle = document.createElement('h4');
        languagesTitle.className = 'studio-category-title';
        languagesTitle.textContent = 'Languages';
        languagesSection.appendChild(languagesTitle);
        
        const languagesGrid = document.createElement('div');
        languagesGrid.className = 'studio-items';
        
        this.movieData.spoken_languages.forEach(language => {
          const languageElement = document.createElement('div');
          languageElement.className = 'language-item';
          languageElement.textContent = language.name;
          languagesGrid.appendChild(languageElement);
        });
        
        languagesSection.appendChild(languagesGrid);
        studiosList.appendChild(languagesSection);
      }
      
      // If no data available
      if (studiosList.children.length === 0) {
        studiosList.innerHTML = '<p style="color: #9ab; text-align: center; padding: 2rem;">No studio information available</p>';
      }
      
    } catch (error) {
      console.error('Error loading studios data:', error);
      const loadingStudios = document.getElementById('loadingStudios');
      if (loadingStudios) {
        loadingStudios.textContent = 'Failed to load studio information';
      }
    }
  }

  showCreditsError() {
    const loadingCrew = document.getElementById('loadingCrew');
    const loadingCast = document.getElementById('loadingCast');
    
    if (loadingCrew) {
      loadingCrew.textContent = 'Failed to load crew information';
    }
    
    if (loadingCast) {
      loadingCast.textContent = 'Failed to load cast information';
    }
  }

  setupLetterboxdButton() {
    const letterboxdButton = document.getElementById('openLetterboxd');
    if (letterboxdButton && this.movieData) {
      letterboxdButton.addEventListener('click', () => {
        const letterboxdUrl = this.generateLetterboxdFilmUrl(this.movieData.title, this.movieData.release_date);
        window.open(letterboxdUrl, '_blank');
        console.log(`Opening Letterboxd search for: ${this.movieData.title} -> ${letterboxdUrl}`);
      });
    }
  }

  // Helper to generate Letterboxd search URLs (same as profile page)
  generateLetterboxdFilmUrl(title, releaseDate) {
    if (!title) return 'https://letterboxd.com/';
    
    // Create search query with title and year
    const year = releaseDate ? new Date(releaseDate).getFullYear() : '';
    const searchQuery = year ? `${title} ${year}` : title;
    const encodedQuery = encodeURIComponent(searchQuery);
    
    // Use Letterboxd's search URL - this will show results and let user pick the right film
    return `https://letterboxd.com/search/films/${encodedQuery}/`;
  }

  showError(message) {
    const container = document.querySelector('.container');
    if (container) {
      container.innerHTML = `
        <div class="error-message">
          <h2>Error</h2>
          <p>${message}</p>
          <button onclick="window.location.href='${this.returnUrl}'" class="btn btn-primary">
            Go Back
          </button>
        </div>
      `;
    }
  }

  showLoadingState() {
    const movieTitle = document.getElementById('movieTitle');
    const movieFullTitle = document.getElementById('movieFullTitle');
    const synopsisText = document.getElementById('synopsisText');
    
    if (movieTitle) movieTitle.textContent = 'Loading...';
    if (movieFullTitle) movieFullTitle.textContent = 'Loading movie details...';
    if (synopsisText) synopsisText.textContent = 'Loading synopsis...';
  }
}

// Initialize the movie page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new MoviePage();
});
