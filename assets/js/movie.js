// Movie Page JavaScript
// Configuration for TMDb API
const TMDB_CONFIG = {
  API_KEY: CONFIG?.TMDB?.API_KEY || null, // No hardcoded fallback
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
    this.detailsLoaded = false;
    this.releasesLoaded = false;
    this.init();
  }

  init() {
    // Check if API key is configured
    if (!TMDB_CONFIG.API_KEY) {
      this.showApiKeyError();
      return;
    }

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
    const detailsSection = document.getElementById('detailsSection');

    if (castSection) castSection.classList.remove('hidden');
    if (crewSection) crewSection.classList.add('hidden');
    if (detailsSection) detailsSection.classList.add('hidden');
  }

  setupEventListeners() {
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
    const detailsSection = document.getElementById('detailsSection');
    const releasesSection = document.getElementById('releasesSection');

    // Hide all sections first
    castSection.classList.add('hidden');
    crewSection.classList.add('hidden');
    detailsSection.classList.add('hidden');
    releasesSection.classList.add('hidden');

    // Show selected section
    if (tabName === 'cast') {
      castSection.classList.remove('hidden');
    } else if (tabName === 'crew') {
      crewSection.classList.remove('hidden');
    } else if (tabName === 'details') {
      detailsSection.classList.remove('hidden');
      // Load details data if not already loaded
      if (!this.detailsLoaded) {
        this.loadDetailsData();
      }
    } else if (tabName === 'releases') {
      releasesSection.classList.remove('hidden');
      // Load releases data if not already loaded
      if (!this.releasesLoaded) {
        this.loadReleasesData();
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

    // Display year and runtime together
    const movieYearRuntime = document.getElementById('movieYearRuntime');
    if (movieYearRuntime) {
      let yearRuntimeText = '';
      
      // Add year
      if (movie.release_date) {
        const year = new Date(movie.release_date).getFullYear();
        yearRuntimeText = year.toString();
      }
      
      // Add runtime
      if (movie.runtime) {
        const hours = Math.floor(movie.runtime / 60);
        const minutes = movie.runtime % 60;
        let runtimeText = '';
        
        if (hours > 0) {
          runtimeText = `${hours}h ${minutes}m`;
        } else {
          runtimeText = `${minutes}m`;
        }
        
        if (yearRuntimeText) {
          yearRuntimeText += ` • ${runtimeText}`;
        } else {
          yearRuntimeText = runtimeText;
        }
      }
      
      movieYearRuntime.textContent = yearRuntimeText || 'Release info not available';
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

    // Display tagline and synopsis together
    const movieTagline = document.getElementById('movieTagline');
    const movieSynopsis = document.getElementById('movieSynopsis');
    
    if (movieTagline && movieSynopsis) {
      if (movie.tagline && movie.tagline.trim()) {
        // Create combined content with tagline and synopsis
        const taglineElement = document.createElement('p');
        taglineElement.className = 'movie-tagline';
        taglineElement.textContent = movie.tagline.toUpperCase();
        
        // Clear synopsis container and add tagline first
        movieSynopsis.innerHTML = '';
        movieSynopsis.appendChild(taglineElement);
        
        // Add synopsis content
        const synopsisText = document.createElement('p');
        synopsisText.id = 'synopsisText';
        synopsisText.textContent = movie.overview || 'No synopsis available.';
        movieSynopsis.appendChild(synopsisText);
        
        // Hide the separate tagline section
        const taglineSection = document.querySelector('.movie-tagline-section');
        if (taglineSection) {
          taglineSection.style.display = 'none';
        }
      } else {
        // No tagline, just hide the tagline section
        const taglineSection = document.querySelector('.movie-tagline-section');
        if (taglineSection) {
          taglineSection.style.display = 'none';
        }
      }
    }

    // Update ratings
    const tmdbRating = document.getElementById('tmdbRating');
    if (tmdbRating && movie.vote_average) {
      // Convert from 10-point scale to 5-point scale
      const ratingOutOfFive = (movie.vote_average / 2).toFixed(1);
      tmdbRating.textContent = `${ratingOutOfFive}/5`;
    }

    // Synopsis is now handled in the tagline section above

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
      <div class="crew-person" data-person-id="${person.id}" data-person-name="${person.name}" data-person-job="${person.job}">
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

    // Show all cast members (no limit)
    const castToShow = cast;

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
        const personJob = person.dataset.personJob;
        
        if (personId && personId !== 'null') {
          console.log(`Navigating to crew member profile: ${personName} (ID: ${personId}, Job: ${personJob})`);
          this.navigateToProfile(personId, personJob);
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
          this.navigateToProfile(personId, 'Actor'); // Cast members are actors
        } else {
          console.log(`No ID available for cast member: ${personName}`);
        }
      });
    });
  }

  navigateToProfile(personId, role = null) {
    // Navigate to profile page with TMDb ID, ensuring it's handled as TMDb data
    const currentUrl = window.location.href;
    let profileUrl = `profile.html?id=${personId}&tmdb=true&return=${encodeURIComponent(currentUrl)}`;
    
    // Add role parameter if provided
    if (role) {
      profileUrl += `&role=${encodeURIComponent(role)}`;
    }
    
    window.location.href = profileUrl;
  }

  navigateToCompany(companyId) {
    // Navigate to profile page for company with TMDb company ID
    const currentUrl = window.location.href;
    const profileUrl = `profile.html?company=${companyId}&return=${encodeURIComponent(currentUrl)}`;
    
    window.location.href = profileUrl;
  }

  async loadDetailsData() {
    if (!this.movieData) return;
    
    try {
      this.detailsLoaded = true;
      const detailsList = document.getElementById('detailsList');
      const loadingDetails = document.getElementById('loadingDetails');
      
      if (loadingDetails) {
        loadingDetails.style.display = 'none';
      }
      
      if (!detailsList) return;
      
      // Clear existing content
      detailsList.innerHTML = '';
      
      // Production Companies
      if (this.movieData.production_companies && this.movieData.production_companies.length > 0) {
        const companiesSection = document.createElement('div');
        companiesSection.className = 'detail-category';
        
        const companiesTitle = document.createElement('h4');
        companiesTitle.className = 'detail-category-title';
        companiesTitle.textContent = 'Production Companies';
        companiesSection.appendChild(companiesTitle);
        
        const companiesGrid = document.createElement('div');
        companiesGrid.className = 'detail-items';
        
        this.movieData.production_companies.forEach(company => {
          const companyElement = document.createElement('button');
          companyElement.className = 'detail-item';
          companyElement.innerHTML = `<div class="detail-name">${company.name}</div>`;
          companyElement.addEventListener('click', () => {
            this.navigateToCompany(company.id);
          });
          companiesGrid.appendChild(companyElement);
        });
        
        companiesSection.appendChild(companiesGrid);
        detailsList.appendChild(companiesSection);
      }
      
      // Genres
      if (this.movieData.genres && this.movieData.genres.length > 0) {
        const genresSection = document.createElement('div');
        genresSection.className = 'detail-category';
        
        const genresTitle = document.createElement('h4');
        genresTitle.className = 'detail-category-title';
        genresTitle.textContent = 'Genres';
        genresSection.appendChild(genresTitle);
        
        const genresGrid = document.createElement('div');
        genresGrid.className = 'detail-items';
        
        this.movieData.genres.forEach(genre => {
          const genreElement = document.createElement('div');
          genreElement.className = 'genre-item';
          genreElement.textContent = genre.name;
          genresGrid.appendChild(genreElement);
        });
        
        genresSection.appendChild(genresGrid);
        detailsList.appendChild(genresSection);
      }
      
      // Production Countries
      if (this.movieData.production_countries && this.movieData.production_countries.length > 0) {
        const countriesSection = document.createElement('div');
        countriesSection.className = 'detail-category';
        
        const countriesTitle = document.createElement('h4');
        countriesTitle.className = 'detail-category-title';
        countriesTitle.textContent = 'Production Countries';
        countriesSection.appendChild(countriesTitle);
        
        const countriesGrid = document.createElement('div');
        countriesGrid.className = 'detail-items';
        
        this.movieData.production_countries.forEach(country => {
          const countryElement = document.createElement('div');
          countryElement.className = 'country-item';
          countryElement.textContent = country.name;
          countriesGrid.appendChild(countryElement);
        });
        
        countriesSection.appendChild(countriesGrid);
        detailsList.appendChild(countriesSection);
      }
      
      // Spoken Languages
      if (this.movieData.spoken_languages && this.movieData.spoken_languages.length > 0) {
        const languagesSection = document.createElement('div');
        languagesSection.className = 'detail-category';
        
        const languagesTitle = document.createElement('h4');
        languagesTitle.className = 'detail-category-title';
        languagesTitle.textContent = 'Languages';
        languagesSection.appendChild(languagesTitle);
        
        const languagesGrid = document.createElement('div');
        languagesGrid.className = 'detail-items';
        
        this.movieData.spoken_languages.forEach(language => {
          const languageElement = document.createElement('div');
          languageElement.className = 'language-item';
          // Use English name if available, fallback to original name
          languageElement.textContent = language.english_name || language.name;
          languagesGrid.appendChild(languageElement);
        });
        
        languagesSection.appendChild(languagesGrid);
        detailsList.appendChild(languagesSection);
      }
      
      // Technical Specifications
      const techSpecs = [];
      
      // Budget (if available)
      if (this.movieData.budget && this.movieData.budget > 0) {
        techSpecs.push(`Budget: $${this.movieData.budget.toLocaleString()}`);
      }
      
      // Revenue (if available)
      if (this.movieData.revenue && this.movieData.revenue > 0) {
        techSpecs.push(`Box Office: $${this.movieData.revenue.toLocaleString()}`);
      }
      
      // Status
      if (this.movieData.status) {
        techSpecs.push(`Status: ${this.movieData.status}`);
      }
      
      if (techSpecs.length > 0) {
        const techSection = document.createElement('div');
        techSection.className = 'detail-category';
        
        const techTitle = document.createElement('h4');
        techTitle.className = 'detail-category-title';
        techTitle.textContent = 'Technical Specifications';
        techSection.appendChild(techTitle);
        
        const techGrid = document.createElement('div');
        techGrid.className = 'detail-items';
        
        techSpecs.forEach(spec => {
          const specElement = document.createElement('div');
          specElement.className = 'tech-spec-item';
          specElement.textContent = spec;
          techGrid.appendChild(specElement);
        });
        
        techSection.appendChild(techGrid);
        detailsList.appendChild(techSection);
      }
      
      // If no data available
      if (detailsList.children.length === 0) {
        detailsList.innerHTML = '<p style="color: #9ab; text-align: center; padding: 2rem;">No details available</p>';
      }
      
    } catch (error) {
      console.error('Error loading details data:', error);
      const loadingDetails = document.getElementById('loadingDetails');
      if (loadingDetails) {
        loadingDetails.textContent = 'Failed to load details';
      }
    }
  }

  async loadReleasesData() {
    if (!this.movieData) return;
    
    // Ensure we're only loading releases in the releases tab
    const releasesSection = document.getElementById('releasesSection');
    if (!releasesSection || releasesSection.classList.contains('hidden')) {
      return;
    }
    
    try {
      this.releasesLoaded = true;
      const releasesList = document.getElementById('releasesList');
      const loadingReleases = document.getElementById('loadingReleases');
      
      if (loadingReleases) {
        loadingReleases.style.display = 'none';
      }
      
      if (!releasesList) return;
      
      // Clear existing content only if we're in the releases tab
      const currentActiveTab = document.querySelector('.credits-tab.active');
      if (!currentActiveTab || currentActiveTab.dataset.tab !== 'releases') {
        return; // Don't proceed if releases tab is not active
      }
      
      releasesList.innerHTML = '';
      
      // We need to fetch release dates data
      const fetchResult = await this.fetchReleaseDatesData();
      
      if (fetchResult && fetchResult.releaseDates && fetchResult.releaseDates.results && fetchResult.releaseDates.results.length > 0) {
        // Collect all releases and sort them
        const allReleases = [];
        const { releaseDates, countryMap } = fetchResult;
        
        releaseDates.results.forEach(countryRelease => {
          if (countryRelease.release_dates) {
            countryRelease.release_dates.forEach(release => {
              // Use fetched country name if available, otherwise fall back to manual mapping
              const countryName = countryMap[countryRelease.iso_3166_1] || this.getCountryName(countryRelease.iso_3166_1);
              
              allReleases.push({
                country: countryRelease.iso_3166_1,
                countryName: countryName,
                date: release.release_date,
                type: release.type,
                typeDescription: this.getReleaseTypeDescription(release.type),
                certification: release.certification,
                note: release.note
              });
            });
          }
        });
        
        // Sort releases: Premieres first, then by date
        allReleases.sort((a, b) => {
          // Premieres (type 1) first
          if (a.type === 1 && b.type !== 1) return -1;
          if (b.type === 1 && a.type !== 1) return 1;
          
          // Then by date
          return new Date(a.date) - new Date(b.date);
        });
        
        // Group releases by type for better organization
        const releasesByType = {};
        allReleases.forEach(release => {
          if (!releasesByType[release.type]) {
            releasesByType[release.type] = [];
          }
          releasesByType[release.type].push(release);
        });
        
        // Create releases section with type separators
        let isFirst = true;
        Object.keys(releasesByType).forEach(typeKey => {
          const releases = releasesByType[typeKey];
          const typeDescription = this.getReleaseTypeDescription(parseInt(typeKey));
          
          // Add separator for each type
          const separator = document.createElement('div');
          separator.className = 'release-type-separator';
          if (isFirst) {
            separator.classList.add('first-type');
          }
          separator.textContent = typeDescription;
          releasesList.appendChild(separator);
          isFirst = false;
          
          releases.forEach(release => {
            const releaseElement = document.createElement('div');
            releaseElement.className = 'release-item';
            
            const releaseDate = new Date(release.date);
            const formattedDate = releaseDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });
            
            // Add special styling for premieres
            if (release.type === 1) {
              releaseElement.classList.add('premiere-release');
            }
            
            releaseElement.innerHTML = `
              <div class="release-content">
                <div class="release-left">
                  <div class="release-top">
                    <div class="release-date">${formattedDate}</div>
                    <div class="release-country">
                      ${release.countryName}
                      ${release.certification ? `<span class="release-certification">${release.certification}</span>` : ''}
                    </div>
                  </div>
                  ${release.note ? `<div class="release-note" title="${release.note}">${release.note}</div>` : ''}
                </div>
              </div>
            `;
            
            releasesList.appendChild(releaseElement);
          });
        });
        
      } else {
        releasesList.innerHTML = '<p style="color: #9ab; text-align: center; padding: 2rem;">No release information available</p>';
      }
      
    } catch (error) {
      console.error('Error loading releases data:', error);
      const loadingReleases = document.getElementById('loadingReleases');
      if (loadingReleases) {
        loadingReleases.textContent = 'Failed to load releases';
      }
    }
  }

  async fetchReleaseDatesData() {
    try {
      // First, try to fetch countries configuration for full country names
      let countryMap = {};
      
      if (!localStorage.getItem('tmdb_blocked')) {
        try {
          const countriesUrl = `${TMDB_CONFIG.BASE_URL}/configuration/countries?api_key=${TMDB_CONFIG.API_KEY}`;
          console.log('Fetching countries from TMDB:', countriesUrl);
          
          const countriesResponse = await this.fetchWithTimeout(countriesUrl, 8000);
          if (countriesResponse.ok) {
            const countriesData = await countriesResponse.json();
            countriesData.forEach(country => {
              countryMap[country.iso_3166_1] = country.english_name;
            });
            console.log('TMDB countries received:', Object.keys(countryMap).length, 'countries');
          }
        } catch (error) {
          console.log('Direct TMDB countries failed:', error.message);
        }
      }

      // If direct countries fetch failed, try with proxies
      if (Object.keys(countryMap).length === 0) {
        for (let i = 0; i < TMDB_CONFIG.CORS_PROXIES.length; i++) {
          try {
            const baseUrl = `${TMDB_CONFIG.BASE_URL}/configuration/countries?api_key=${TMDB_CONFIG.API_KEY}`;
            const proxy = TMDB_CONFIG.CORS_PROXIES[i];
            
            let proxyUrl;
            if (proxy.includes('allorigins.win')) {
              proxyUrl = `${proxy}${encodeURIComponent(baseUrl)}`;
            } else {
              proxyUrl = `${proxy}${baseUrl}`;
            }
            
            console.log(`Trying proxy ${i} for countries:`, proxyUrl);
            
            const response = await this.fetchWithTimeout(proxyUrl, 8000);
            if (response.ok) {
              const data = await response.json();
              data.forEach(country => {
                countryMap[country.iso_3166_1] = country.english_name;
              });
              console.log(`Proxy ${i} successful for countries`);
              break;
            }
          } catch (error) {
            console.log(`Proxy ${i} failed for countries:`, error.message);
            continue;
          }
        }
      }

      // Now fetch release dates
      // First try direct TMDB API call
      if (!localStorage.getItem('tmdb_blocked')) {
        try {
          const url = `${TMDB_CONFIG.BASE_URL}/movie/${this.movieId}/release_dates?api_key=${TMDB_CONFIG.API_KEY}`;
          console.log('Fetching release dates from TMDB:', url);
          
          const response = await this.fetchWithTimeout(url, 8000);
          if (response.ok) {
            const data = await response.json();
            console.log('TMDB release dates received:', data);
            return { releaseDates: data, countryMap };
          }
        } catch (error) {
          console.log('Direct TMDB release dates failed:', error.message);
          localStorage.setItem('tmdb_blocked', 'true');
        }
      }

      // Try with CORS proxies
      for (let i = 0; i < TMDB_CONFIG.CORS_PROXIES.length; i++) {
        try {
          const baseUrl = `${TMDB_CONFIG.BASE_URL}/movie/${this.movieId}/release_dates?api_key=${TMDB_CONFIG.API_KEY}`;
          const proxy = TMDB_CONFIG.CORS_PROXIES[i];
          
          let proxyUrl;
          if (proxy.includes('allorigins.win')) {
            proxyUrl = `${proxy}${encodeURIComponent(baseUrl)}`;
          } else {
            proxyUrl = `${proxy}${baseUrl}`;
          }
          
          console.log(`Trying proxy ${i} for release dates:`, proxyUrl);
          
          const response = await this.fetchWithTimeout(proxyUrl, 8000);
          if (response.ok) {
            const data = await response.json();
            console.log(`Proxy ${i} successful for release dates`);
            return { releaseDates: data, countryMap };
          }
        } catch (error) {
          console.log(`Proxy ${i} failed for release dates:`, error.message);
          continue;
        }
      }
      
      throw new Error('All attempts to fetch release dates failed');

    } catch (error) {
      console.error('Error fetching release dates:', error);
      return null;
    }
  }

  getReleaseTypeDescription(type) {
    const types = {
      1: 'Premiere',
      2: 'Theatrical (limited)',
      3: 'Theatrical',
      4: 'Digital',
      5: 'Physical',
      6: 'TV/Festival'
    };
    return types[type] || 'Unknown';
  }

  getCountryName(countryCode) {
    const countries = {
      'US': 'United States',
      'GB': 'United Kingdom',
      'FR': 'France',
      'DE': 'Germany',
      'IT': 'Italy',
      'ES': 'Spain',
      'JP': 'Japan',
      'KR': 'South Korea',
      'CN': 'China',
      'IN': 'India',
      'CA': 'Canada',
      'AU': 'Australia',
      'BR': 'Brazil',
      'MX': 'Mexico',
      'RU': 'Russia',
      'NL': 'Netherlands',
      'BE': 'Belgium',
      'CH': 'Switzerland',
      'AT': 'Austria',
      'SE': 'Sweden',
      'NO': 'Norway',
      'DK': 'Denmark',
      'FI': 'Finland',
      'PL': 'Poland',
      'CZ': 'Czech Republic',
      'HU': 'Hungary',
      'GR': 'Greece',
      'PT': 'Portugal',
      'IE': 'Ireland',
      'NZ': 'New Zealand',
      'ZA': 'South Africa',
      'AR': 'Argentina',
      'CL': 'Chile',
      'CO': 'Colombia',
      'PE': 'Peru',
      'VE': 'Venezuela',
      'TH': 'Thailand',
      'ID': 'Indonesia',
      'MY': 'Malaysia',
      'SG': 'Singapore',
      'PH': 'Philippines',
      'VN': 'Vietnam',
      'TW': 'Taiwan',
      'HK': 'Hong Kong',
      'TR': 'Turkey',
      'IL': 'Israel',
      'SA': 'Saudi Arabia',
      'AE': 'United Arab Emirates',
      'EG': 'Egypt',
      'NG': 'Nigeria',
      'KE': 'Kenya',
      'ET': 'Ethiopia',
      'GH': 'Ghana',
      'PR': 'Puerto Rico',
      'AM': 'Armenia',
      'HR': 'Croatia',
      'RO': 'Romania',
      'BG': 'Bulgaria',
      'RS': 'Serbia',
      'SI': 'Slovenia',
      'SK': 'Slovakia',
      'LT': 'Lithuania',
      'LV': 'Latvia',
      'EE': 'Estonia',
      'UA': 'Ukraine',
      'BY': 'Belarus',
      'MD': 'Moldova',
      'BA': 'Bosnia and Herzegovina',
      'MK': 'North Macedonia',
      'AL': 'Albania',
      'MT': 'Malta',
      'CY': 'Cyprus',
      'IS': 'Iceland',
      'LU': 'Luxembourg',
      'MC': 'Monaco',
      'AD': 'Andorra',
      'LI': 'Liechtenstein',
      'SM': 'San Marino',
      'VA': 'Vatican City',
      'GI': 'Gibraltar',
      'IM': 'Isle of Man',
      'JE': 'Jersey',
      'GG': 'Guernsey',
      'FO': 'Faroe Islands',
      'GL': 'Greenland'
    };
    return countries[countryCode] || countryCode;
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

  showApiKeyError() {
    const container = document.querySelector('.container');
    if (container) {
      container.innerHTML = `
        <div class="error-message">
          <h2>⚠️ API Configuration Required</h2>
          <p>TMDb API key is not configured. Please set up your environment:</p>
          <ul style="text-align: left; margin: 1rem 0;">
            <li><strong>Development:</strong> Create <code>assets/js/config.local.js</code> with your API key</li>
            <li><strong>Production:</strong> Set <code>TMDB_API_KEY</code> environment variable</li>
          </ul>
          <p>See <code>docs/API_SECURITY.md</code> for detailed setup instructions.</p>
          <button onclick="window.location.href='index.html'" class="btn btn-primary">
            Back to Home
          </button>
        </div>
      `;
    }
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
    const movieFullTitle = document.getElementById('movieFullTitle');
    const synopsisText = document.getElementById('synopsisText');
    
    if (movieFullTitle) movieFullTitle.textContent = 'Loading movie details...';
    if (synopsisText) synopsisText.textContent = 'Loading synopsis...';
  }
}

// Initialize the movie page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new MoviePage();
});
