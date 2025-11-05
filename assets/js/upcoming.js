// Upcoming Films JavaScript

// Function to get API key with fallbacks
function getApiKey() {
  if (CONFIG?.TMDB?.API_KEY) {
    return CONFIG.TMDB.API_KEY;
  }
  if (window.LOCAL_CONFIG?.TMDB_API_KEY) {
    return window.LOCAL_CONFIG.TMDB_API_KEY;
  }
  console.error('No API key found!');
  return null;
}

// TMDb API Configuration
const TMDB_CONFIG = {
  get API_KEY() {
    return getApiKey();
  },
  BASE_URL: 'https://api.themoviedb.org/3',
  IMAGE_BASE_URL: 'https://image.tmdb.org/t/p/w500'
};

class UpcomingFilms {
  constructor() {
    this.people = [];
    this.upcomingMovies = [];
    this.studioMovies = {}; // Store movies grouped by studio
    this.currentFilter = 'all';
    this.init();
  }

  init() {
    this.loadPeople();
    this.bindEvents();
    this.initSidebar();
  }

  initSidebar() {
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const sidebar = document.getElementById('sidebar');
    const sidebarClose = document.getElementById('sidebarClose');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (hamburgerMenu) {
      hamburgerMenu.addEventListener('click', () => {
        sidebar?.classList.add('active');
        sidebarOverlay?.classList.add('active');
      });
    }

    if (sidebarClose) {
      sidebarClose.addEventListener('click', () => {
        sidebar?.classList.remove('active');
        sidebarOverlay?.classList.remove('active');
      });
    }

    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', () => {
        sidebar?.classList.remove('active');
        sidebarOverlay?.classList.remove('active');
      });
    }
  }

  bindEvents() {
    // Filter tabs
    const filterTabs = document.querySelectorAll('.filter-tab');
    filterTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const filter = e.target.getAttribute('data-filter');
        this.setFilter(filter);
      });
    });

    // Movie search icon
    const movieSearchIcon = document.getElementById('movieSearchIcon');
    if (movieSearchIcon) {
      movieSearchIcon.addEventListener('click', () => {
        window.location.href = 'movie-search.html';
      });
    }
  }

  setFilter(filter) {
    this.currentFilter = filter;
    
    // Update active tab
    const filterTabs = document.querySelectorAll('.filter-tab');
    filterTabs.forEach(tab => {
      if (tab.getAttribute('data-filter') === filter) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Render filtered results
    if (filter === 'studios') {
      this.renderStudios();
    } else {
      this.renderUpcomingMovies();
    }
  }

  loadPeople() {
    const stored = localStorage.getItem('myfilmpeople_data');
    console.log('Checking localStorage for myfilmpeople_data...');
    
    if (stored) {
      try {
        const data = JSON.parse(stored);
        console.log('Raw data from localStorage:', data);
        
        // The data is stored as a flat array, not separated by role
        if (Array.isArray(data)) {
          this.people = data;
        } else {
          // Fallback: try to merge if it's an object with role keys
          this.people = [
            ...(data.directors || []),
            ...(data.actors || []),
            ...(data.others || [])
          ];
        }
        
        console.log(`✅ Loaded ${this.people.length} people from collection:`, this.people.map(p => p.name));
        
        if (this.people.length === 0) {
          console.warn('No people found in collection');
          this.showEmptyState();
        } else {
          this.fetchUpcomingMovies();
        }
      } catch (error) {
        console.error('❌ Error loading people:', error);
        this.showEmptyState();
      }
    } else {
      console.warn('❌ No data found in localStorage');
      this.showEmptyState();
    }
  }

  async fetchUpcomingMovies() {
    if (this.people.length === 0) {
      this.showEmptyState();
      return;
    }

    const loadingContainer = document.getElementById('loadingContainer');
    loadingContainer?.classList.remove('hidden');

    try {
      console.log(`Fetching upcoming movies for ${this.people.length} people...`);
      
      // Separate studios from other people
      const studios = this.people.filter(p => {
        const role = (p.role || '').toLowerCase();
        return role === 'studio' || role === 'studios';
      });
      
      const nonStudios = this.people.filter(p => {
        const role = (p.role || '').toLowerCase();
        return role !== 'studio' && role !== 'studios';
      });
      
      // Fetch movies for non-studio people
      const moviePromises = nonStudios.map(person => this.getPersonUpcomingMovies(person));
      const results = await Promise.all(moviePromises);
      
      // Flatten and deduplicate movies
      const allMovies = results.flat();
      console.log(`Total movies before deduplication: ${allMovies.length}`);
      
      this.upcomingMovies = this.deduplicateMovies(allMovies);
      console.log(`Total movies after deduplication: ${this.upcomingMovies.length}`);

      // Sort by release date (soonest first)
      this.upcomingMovies.sort((a, b) => {
        return new Date(a.release_date) - new Date(b.release_date);
      });

      // Fetch studio movies separately
      if (studios.length > 0) {
        await this.fetchStudioMovies(studios);
      }

      console.log(`Found ${this.upcomingMovies.length} upcoming movies`);

      loadingContainer?.classList.add('hidden');

      if (this.upcomingMovies.length === 0 && studios.length === 0) {
        this.showEmptyState();
      } else {
        this.renderUpcomingMovies();
      }
    } catch (error) {
      console.error('Error fetching upcoming movies:', error);
      loadingContainer?.classList.add('hidden');
      this.showEmptyState();
    }
  }

  async fetchStudioMovies(studios) {
    try {
      console.log(`📽️ Fetching movies for ${studios.length} studios...`);
      
      for (const studio of studios) {
        const studioId = studio.tmdbId || studio.id;
        if (!studioId) {
          console.warn(`⚠️ No TMDb ID found for studio ${studio.name}`);
          continue;
        }

        console.log(`🎬 Fetching movies for studio: ${studio.name} (TMDb ID: ${studioId})`);
        
        // Get today's date and 3 years from now for the date range
        const today = new Date();
        const threeYearsFromNow = new Date();
        threeYearsFromNow.setFullYear(today.getFullYear() + 3);
        
        const todayStr = today.toISOString().split('T')[0];
        const futureStr = threeYearsFromNow.toISOString().split('T')[0];
        
        // Use discover endpoint to find movies by production company with date range
        const url = `${TMDB_CONFIG.BASE_URL}/discover/movie?api_key=${TMDB_CONFIG.API_KEY}&with_companies=${studioId}&primary_release_date.gte=${todayStr}&primary_release_date.lte=${futureStr}&sort_by=primary_release_date.asc`;
        console.log(`📡 API URL: ${url.replace(TMDB_CONFIG.API_KEY, 'API_KEY_HIDDEN')}`);
        console.log(`📅 Date range: ${todayStr} to ${futureStr}`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Failed to fetch movies for studio ${studio.name}:`, response.status, errorText);
          continue;
        }
        
        const data = await response.json();
        console.log(`📊 Raw API response for ${studio.name}:`, data);
        
        const movies = data.results || [];
        console.log(`🎞️ Total movies from API: ${movies.length}`);
        
        // Filter for movies with release dates and log them
        const upcomingMovies = movies.filter(movie => {
          if (!movie.release_date) {
            console.log(`⏭️ Skipping movie without release date:`, movie.title);
            return false;
          }
          console.log(`📅 ${movie.title}: ${movie.release_date}`);
          return true; // API already filtered by date
        });
        
        // Sort by release date
        upcomingMovies.sort((a, b) => {
          return new Date(a.release_date) - new Date(b.release_date);
        });
        
        this.studioMovies[studio.name] = {
          studio: studio,
          movies: upcomingMovies
        };
        
        console.log(`✅ ${studio.name}: Found ${upcomingMovies.length} upcoming movies out of ${movies.length} total`);
        if (upcomingMovies.length > 0) {
          console.log(`🎯 First 3 upcoming:`, upcomingMovies.slice(0, 3).map(m => `${m.title} (${m.release_date})`));
        }
      }
      
      console.log(`✅ All studios processed. Studio data:`, Object.keys(this.studioMovies));
    } catch (error) {
      console.error('❌ Error fetching studio movies:', error);
    }
  }

  async getPersonUpcomingMovies(person) {
    try {
      // Use tmdbId instead of id
      const personId = person.tmdbId || person.id;
      
      if (!personId) {
        console.warn(`⚠️ No TMDb ID found for ${person.name}`);
        return [];
      }
      
      console.log(`Fetching credits for ${person.name} (Role: ${person.role}, TMDb ID: ${personId})...`);
      
      const response = await fetch(
        `${TMDB_CONFIG.BASE_URL}/person/${personId}/movie_credits?api_key=${TMDB_CONFIG.API_KEY}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch person credits');
      
      const data = await response.json();
      
      // Filter credits based on the role they were followed for
      let relevantCredits = [];
      
      // Normalize role to lowercase for comparison
      const normalizedRole = (person.role || '').toLowerCase();
      
      console.log(`🔍 ${person.name} - Stored role: "${person.role}" (normalized: "${normalizedRole}")`);
      
      if (normalizedRole === 'director' || normalizedRole === 'directors') {
        // Only show directing credits
        const allCrew = data.crew || [];
        console.log(`📋 ${person.name} - Total crew entries: ${allCrew.length}`);
        console.log(`📋 ${person.name} - All crew jobs:`, allCrew.map(m => m.job).join(', '));
        
        relevantCredits = allCrew.filter(movie => 
          movie.job && movie.job.toLowerCase() === 'director'
        );
        console.log(`✅ ${person.name} (Director): Found ${relevantCredits.length} directing credits`);
      } else if (normalizedRole === 'actor' || normalizedRole === 'actors') {
        // Only show acting credits
        relevantCredits = data.cast || [];
        console.log(`✅ ${person.name} (Actor): Found ${relevantCredits.length} acting credits`);
      } else {
        // For "Others" (writer, cinematographer, composer, producer, editor, studio, other, etc.)
        // Show all crew credits (but not acting)
        relevantCredits = data.crew || [];
        console.log(`✅ ${person.name} (${person.role}): Found ${relevantCredits.length} crew credits`);
      }
      
      // Filter only movies with release dates and future releases
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const upcomingCredits = relevantCredits.filter(movie => {
        if (!movie.release_date) return false;
        const releaseDate = new Date(movie.release_date);
        releaseDate.setHours(0, 0, 0, 0);
        return releaseDate >= today;
      });
      
      console.log(`${person.name}: ${upcomingCredits.length} upcoming (role-filtered) from ${relevantCredits.length} total ${person.role} credits`);
      
      // Add person info to each movie
      return upcomingCredits.map(movie => ({
        ...movie,
        associatedPeople: [{
          id: person.tmdbId || person.id,
          name: person.name,
          role: person.role,
          job: movie.job || (movie.character ? 'Actor' : 'Unknown'),
          character: movie.character || null
        }]
      }));
    } catch (error) {
      console.error(`Error fetching credits for ${person.name}:`, error);
      return [];
    }
  }

  deduplicateMovies(movies) {
    const movieMap = new Map();
    
    movies.forEach(movie => {
      if (movieMap.has(movie.id)) {
        // Merge associated people
        const existing = movieMap.get(movie.id);
        existing.associatedPeople.push(...movie.associatedPeople);
      } else {
        movieMap.set(movie.id, movie);
      }
    });
    
    return Array.from(movieMap.values());
  }

  getFilteredMovies() {
    const normalizedFilter = this.currentFilter.toLowerCase();
    
    if (normalizedFilter === 'all') {
      // "All" tab: ONLY show directors and actors (exclude "others" and studios)
      return this.upcomingMovies.filter(movie => {
        return movie.associatedPeople.some(person => {
          const normalizedPersonRole = (person.role || '').toLowerCase();
          return normalizedPersonRole === 'director' || 
                 normalizedPersonRole === 'directors' || 
                 normalizedPersonRole === 'actor' || 
                 normalizedPersonRole === 'actors';
        });
      });
    }
    
    const filtered = this.upcomingMovies.filter(movie => {
      return movie.associatedPeople.some(person => {
        console.log(`Checking ${person.name} with role: "${person.role}" against filter: "${this.currentFilter}"`);
        
        // Normalize both the person's role and the filter to lowercase for comparison
        const normalizedPersonRole = (person.role || '').toLowerCase();
        
        // Match singular to plural: director/directors, actor/actors
        if (normalizedFilter === 'directors') {
          return normalizedPersonRole === 'director' || normalizedPersonRole === 'directors';
        }
        if (normalizedFilter === 'actors') {
          return normalizedPersonRole === 'actor' || normalizedPersonRole === 'actors';
        }
        if (normalizedFilter === 'others') {
          // "Others" includes all roles EXCEPT director, actor, and studio
          // This includes: writer, cinematographer, composer, producer, editor, other, etc.
          return normalizedPersonRole !== 'director' && 
                 normalizedPersonRole !== 'directors' && 
                 normalizedPersonRole !== 'actor' && 
                 normalizedPersonRole !== 'actors' &&
                 normalizedPersonRole !== 'studio' &&
                 normalizedPersonRole !== 'studios';
        }
        return false;
      });
    });
    
    console.log(`Filter "${this.currentFilter}" returned ${filtered.length} movies`);
    return filtered;
  }

  renderUpcomingMovies() {
    const upcomingContent = document.getElementById('upcomingContent');
    const studiosContent = document.getElementById('studiosContent');
    const upcomingList = document.getElementById('upcomingList');
    const emptyState = document.getElementById('emptyState');

    // Hide studios content
    studiosContent?.classList.add('hidden');

    const filteredMovies = this.getFilteredMovies();

    if (filteredMovies.length === 0) {
      upcomingContent?.classList.add('hidden');
      emptyState?.classList.remove('hidden');
      return;
    }

    upcomingContent?.classList.remove('hidden');
    emptyState?.classList.add('hidden');

    // Render stats
    this.renderStats(filteredMovies);

    // Render movie list
    upcomingList.innerHTML = filteredMovies.map(movie => this.createMovieCard(movie)).join('');

    // Add click events
    document.querySelectorAll('.upcoming-item').forEach((item, index) => {
      item.addEventListener('click', () => {
        const movieId = filteredMovies[index].id;
        window.location.href = `movie.html?id=${movieId}`;
      });
    });
  }

  renderStudios() {
    const upcomingContent = document.getElementById('upcomingContent');
    const studiosContent = document.getElementById('studiosContent');
    const studiosStats = document.getElementById('studiosStats');
    const studiosGrid = document.getElementById('studiosGrid');
    const emptyState = document.getElementById('emptyState');

    // Hide upcoming content
    upcomingContent?.classList.add('hidden');

    const studioNames = Object.keys(this.studioMovies);
    
    console.log('🎬 Rendering studios view');
    console.log('📦 Studios data:', this.studioMovies);
    console.log('🏢 Studio names:', studioNames);

    if (studioNames.length === 0) {
      console.warn('⚠️ No studios to display');
      studiosContent?.classList.add('hidden');
      emptyState?.classList.remove('hidden');
      return;
    }

    studiosContent?.classList.remove('hidden');
    emptyState?.classList.add('hidden');

    // Calculate total movies across all studios
    const totalMovies = studioNames.reduce((sum, name) => {
      return sum + this.studioMovies[name].movies.length;
    }, 0);

    // Render stats
    studiosStats.innerHTML = `
      <div class="stat-item">
        <span class="stat-label">Studios Followed</span>
        <span class="stat-value">${studioNames.length}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Total Upcoming Films</span>
        <span class="stat-value">${totalMovies}</span>
      </div>
    `;

    // Render studio cards
    studiosGrid.innerHTML = studioNames.map(studioName => {
      const studioData = this.studioMovies[studioName];
      const movieCount = studioData.movies.length;
      const tmdbId = studioData.studio.tmdbId || studioData.studio.id;
      
      console.log(`🏢 Rendering card for ${studioName}: ${movieCount} movies (TMDb ID: ${tmdbId})`);
      
      return `
        <div class="studio-card" data-studio="${this.escapeHtml(studioName)}">
          <div class="studio-logo">
            ${studioData.studio.profilePicture 
              ? `<img src="${studioData.studio.profilePicture}" alt="${this.escapeHtml(studioName)}" />`
              : `<div class="studio-logo-placeholder">
                  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100" height="100" fill="#2c3440"/>
                    <rect x="20" y="30" width="60" height="40" rx="4" fill="#445566"/>
                    <circle cx="50" cy="50" r="12" fill="#556677"/>
                    <polygon points="45,45 45,55 55,50" fill="#9ab"/>
                    <rect x="15" y="25" width="70" height="3" fill="#9ab"/>
                    <rect x="15" y="72" width="70" height="3" fill="#9ab"/>
                  </svg>
                </div>`
            }
          </div>
          <div class="studio-info">
            <div class="studio-name">${this.escapeHtml(studioName)}</div>
            <div class="studio-count">${movieCount} upcoming ${movieCount === 1 ? 'film' : 'films'}</div>
          </div>
        </div>
      `;
    }).join('');

    // Add click events to studio cards
    document.querySelectorAll('.studio-card').forEach(card => {
      card.addEventListener('click', () => {
        const studioName = card.getAttribute('data-studio');
        this.showStudioModal(studioName);
      });
    });
  }

  showStudioModal(studioName) {
    console.log(`🎭 Opening modal for studio: ${studioName}`);
    console.log(`📦 Available studios:`, Object.keys(this.studioMovies));
    
    const modal = document.getElementById('studioModal');
    const modalTitle = document.getElementById('studioModalTitle');
    const modalStats = document.getElementById('studioModalStats');
    const modalFilms = document.getElementById('studioModalFilms');
    
    const studioData = this.studioMovies[studioName];
    if (!studioData) {
      console.error(`❌ No data found for studio: ${studioName}`);
      return;
    }
    
    console.log(`✅ Studio data found:`, studioData);
    console.log(`🎬 Number of movies: ${studioData.movies.length}`);

    // Set modal title
    modalTitle.textContent = studioName;

    // Calculate stats
    const movies = studioData.movies;
    const today = new Date();
    const thisMonth = movies.filter(m => {
      const releaseDate = new Date(m.release_date);
      return releaseDate.getMonth() === today.getMonth() && 
             releaseDate.getFullYear() === today.getFullYear();
    }).length;

    const thisYear = movies.filter(m => {
      const releaseDate = new Date(m.release_date);
      return releaseDate.getFullYear() === today.getFullYear();
    }).length;

    // Render stats
    modalStats.innerHTML = `
      <div class="stat-item">
        <span class="stat-label">Total Upcoming</span>
        <span class="stat-value">${movies.length}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">This Month</span>
        <span class="stat-value">${thisMonth}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">This Year</span>
        <span class="stat-value">${thisYear}</span>
      </div>
    `;

    // Render films
    if (movies.length === 0) {
      modalFilms.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">🎬</div>
          <p style="font-size: 1.2rem; margin-bottom: 0.5rem; color: var(--text-primary);">No upcoming films found</p>
          <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1.5rem;">
            This studio currently has no upcoming releases scheduled in our database.
          </p>
          <button onclick="location.reload()" style="background: var(--letterboxd-orange); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem;">
            Refresh Data
          </button>
        </div>
      `;
    } else {
      modalFilms.innerHTML = movies.map(movie => this.createStudioMovieCard(movie)).join('');

      // Add click events to movie cards
      modalFilms.querySelectorAll('.studio-movie-card').forEach((card, index) => {
        card.addEventListener('click', () => {
          const movieId = movies[index].id;
          window.location.href = `movie.html?id=${movieId}`;
        });
      });
    }

    // Show modal
    modal.classList.remove('hidden');
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    
    console.log(`✅ Modal displayed successfully`);

    // Setup close handlers
    const closeModal = () => {
      modal.classList.add('hidden');
      // Restore body scroll when modal is closed
      document.body.style.overflow = '';
    };

    document.getElementById('studioModalClose').onclick = closeModal;
    document.getElementById('studioModalOverlay').onclick = closeModal;
    
    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  createStudioMovieCard(movie) {
    const posterUrl = movie.poster_path 
      ? `${TMDB_CONFIG.IMAGE_BASE_URL}${movie.poster_path}`
      : null;

    const releaseDate = new Date(movie.release_date);
    const formattedDate = releaseDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const countdown = this.getCountdown(releaseDate);
    const countdownClass = countdown.includes('day') && parseInt(countdown) <= 30 ? 'soon' : '';

    return `
      <div class="studio-movie-card">
        ${posterUrl 
          ? `<img class="studio-movie-poster" src="${posterUrl}" alt="${this.escapeHtml(movie.title)} Poster" loading="lazy">`
          : `<div class="studio-movie-poster-placeholder">
              <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
                <rect width="200" height="300" fill="#2c3440"/>
                <rect x="40" y="80" width="120" height="90" rx="8" fill="#445566"/>
                <circle cx="100" cy="125" r="25" fill="#556677"/>
                <polygon points="85,115 85,135 105,125" fill="#2c3440"/>
                <text x="100" y="210" font-family="PT Sans, sans-serif" font-size="14" fill="#9ab" text-anchor="middle">No Poster</text>
              </svg>
            </div>`
        }
        <div class="studio-movie-info">
          <div class="info-line studio-movie-title">${this.escapeHtml(movie.title)}</div>
          <div class="info-line studio-movie-date">${formattedDate}</div>
          <div class="info-line studio-movie-countdown ${countdownClass}">${countdown}</div>
        </div>
      </div>
    `;
  }

  renderStats(movies) {
    const upcomingStats = document.getElementById('upcomingStats');
    
    const today = new Date();
    const thisMonth = movies.filter(m => {
      const releaseDate = new Date(m.release_date);
      return releaseDate.getMonth() === today.getMonth() && 
             releaseDate.getFullYear() === today.getFullYear();
    }).length;

    const thisYear = movies.filter(m => {
      const releaseDate = new Date(m.release_date);
      return releaseDate.getFullYear() === today.getFullYear();
    }).length;

    upcomingStats.innerHTML = `
      <div class="stat-item">
        <span class="stat-label">Total Upcoming</span>
        <span class="stat-value">${movies.length}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">This Month</span>
        <span class="stat-value">${thisMonth}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">This Year</span>
        <span class="stat-value">${thisYear}</span>
      </div>
    `;
  }

  createMovieCard(movie) {
    const posterUrl = movie.poster_path 
      ? `${TMDB_CONFIG.IMAGE_BASE_URL}${movie.poster_path}`
      : null;

    const releaseDate = new Date(movie.release_date);
    const formattedDate = releaseDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    const countdown = this.getCountdown(releaseDate);
    const countdownClass = countdown.includes('day') && parseInt(countdown) <= 30 ? 'soon' : '';

    // Filter people based on current tab
    const filteredPeople = movie.associatedPeople.filter(person => {
      const normalizedPersonRole = (person.role || '').toLowerCase();
      const normalizedFilter = this.currentFilter.toLowerCase();
      
      if (normalizedFilter === 'all') {
        // "All" tab: only show directors and actors
        return normalizedPersonRole === 'director' || 
               normalizedPersonRole === 'directors' || 
               normalizedPersonRole === 'actor' || 
               normalizedPersonRole === 'actors';
      } else if (normalizedFilter === 'directors') {
        // "Directors" tab: only show directors
        return normalizedPersonRole === 'director' || normalizedPersonRole === 'directors';
      } else if (normalizedFilter === 'actors') {
        // "Actors" tab: only show actors
        return normalizedPersonRole === 'actor' || normalizedPersonRole === 'actors';
      } else if (normalizedFilter === 'others') {
        // "Others" tab: only show non-director/non-actor roles
        return normalizedPersonRole !== 'director' && 
               normalizedPersonRole !== 'directors' && 
               normalizedPersonRole !== 'actor' && 
               normalizedPersonRole !== 'actors';
      }
      return true;
    });

    // Show filtered people from your collection for this movie
    const peopleTags = filteredPeople
      .map(person => {
        const jobLabel = person.character 
          ? `${this.escapeHtml(person.character)}`
          : person.job && person.job !== 'Unknown' 
          ? `${this.escapeHtml(person.job)}`
          : this.getRoleLabel(person.role);
        
        return `
          <div class="person-tag">
            <span class="person-role">${jobLabel}</span>
            <span>${this.escapeHtml(person.name)}</span>
          </div>
        `;
      }).join('');

    const overview = movie.overview 
      ? this.escapeHtml(movie.overview)
      : 'No overview available.';

    return `
      <div class="upcoming-item">
        ${posterUrl 
          ? `<img class="movie-poster" src="${posterUrl}" alt="${this.escapeHtml(movie.title)} Poster" loading="lazy">`
          : `<div class="movie-poster-placeholder">
              <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
                <rect width="200" height="300" fill="#2c3440"/>
                <rect x="40" y="80" width="120" height="90" rx="8" fill="#445566"/>
                <circle cx="100" cy="125" r="25" fill="#556677"/>
                <polygon points="85,115 85,135 105,125" fill="#2c3440"/>
                <text x="100" y="210" font-family="PT Sans, sans-serif" font-size="14" fill="#9ab" text-anchor="middle">No Poster</text>
              </svg>
            </div>`
        }
        <div class="movie-info">
          <div class="info-line movie-title">${this.escapeHtml(movie.title)}</div>
          <div class="info-line release-date">${formattedDate}</div>
          <div class="info-line release-countdown ${countdownClass}">${countdown}</div>
          <div class="info-line movie-people">${peopleTags}</div>
        </div>
      </div>
    `;
  }

  getCountdown(releaseDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const release = new Date(releaseDate);
    release.setHours(0, 0, 0, 0);
    
    const diffTime = release - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Released';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day';
    if (diffDays <= 30) return `${diffDays} days`;
    
    // Calculate years, months, and remaining days
    let years = 0;
    let months = 0;
    let days = diffDays;
    
    // Calculate years
    years = Math.floor(days / 365);
    days = days % 365;
    
    // Calculate months (approximate as 30 days)
    months = Math.floor(days / 30);
    days = days % 30;
    
    // Build the countdown string
    const parts = [];
    if (years > 0) parts.push(`${years} year${years > 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`);
    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    
    return parts.length > 0 ? parts.join(', ') : 'Soon';
  }

  getRoleLabel(role) {
    if (role === 'directors' || role === 'director') return 'Director';
    if (role === 'actors' || role === 'actor') return 'Actor';
    if (role === 'others' || role === 'other') return 'Crew';
    return 'Unknown Role';
  }

  showEmptyState() {
    const loadingContainer = document.getElementById('loadingContainer');
    const upcomingContent = document.getElementById('upcomingContent');
    const emptyState = document.getElementById('emptyState');

    loadingContainer?.classList.add('hidden');
    upcomingContent?.classList.add('hidden');
    emptyState?.classList.remove('hidden');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new UpcomingFilms();
});
