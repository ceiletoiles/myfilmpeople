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
    this.renderUpcomingMovies();
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
      
      const moviePromises = this.people.map(person => this.getPersonUpcomingMovies(person));
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

      console.log(`Found ${this.upcomingMovies.length} upcoming movies`);

      loadingContainer?.classList.add('hidden');

      if (this.upcomingMovies.length === 0) {
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
        // For "Others" - show all crew credits (but not acting)
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
    if (this.currentFilter === 'all') {
      return this.upcomingMovies;
    }
    
    const filtered = this.upcomingMovies.filter(movie => {
      return movie.associatedPeople.some(person => {
        console.log(`Checking ${person.name} with role: "${person.role}" against filter: "${this.currentFilter}"`);
        
        // Try exact match and also singular/plural variations
        if (this.currentFilter === 'directors') {
          return person.role === 'directors' || person.role === 'director';
        }
        if (this.currentFilter === 'actors') {
          return person.role === 'actors' || person.role === 'actor';
        }
        if (this.currentFilter === 'others') {
          return person.role === 'others' || person.role === 'other';
        }
        return true;
      });
    });
    
    console.log(`Filter "${this.currentFilter}" returned ${filtered.length} movies`);
    return filtered;
  }

  renderUpcomingMovies() {
    const upcomingContent = document.getElementById('upcomingContent');
    const upcomingList = document.getElementById('upcomingList');
    const emptyState = document.getElementById('emptyState');

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

    // Show all people from your collection for this movie (no limit)
    const peopleTags = movie.associatedPeople
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
