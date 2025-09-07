// Movie Search JavaScript

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

// TMDb API Configuration with CORS proxy support
const TMDB_CONFIG = {
  get API_KEY() {
    return getApiKey();
  },
  BASE_URL: 'https://api.themoviedb.org/3',
  IMAGE_BASE_URL: 'https://image.tmdb.org/t/p/w300',
  
  // CORS proxy options (for regions where TMDb is blocked)
  CORS_PROXIES: [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://cors-anywhere.herokuapp.com/'
  ]
};

class MovieSearch {
  constructor() {
    this.currentQuery = '';
    this.searchTimeout = null;
    this.activeTab = 'movies';
    this.lastResults = {
      movies: [],
      people: [],
      companies: []
    };
    this.init();
  }

  init() {
    this.bindEvents();
    this.bindTabEvents();
    this.loadQueryFromURL();
  }

  bindTabEvents() {
    const tabButtons = document.querySelectorAll('.search-tab');
    tabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const tab = e.currentTarget.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });
  }

  switchTab(tab) {
    if (this.activeTab === tab) return;
    
    this.activeTab = tab;
    
    // Update tab buttons
    const tabButtons = document.querySelectorAll('.search-tab');
    tabButtons.forEach(button => {
      if (button.getAttribute('data-tab') === tab) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
    
    // Update tab content
    this.updateTabContent();
  }

  updateTabContent() {
    const moviesResults = document.getElementById('moviesResults');
    const filmmakersResults = document.getElementById('filmmakersResults');
    
    if (this.activeTab === 'movies') {
      moviesResults?.classList.add('active');
      moviesResults?.classList.remove('hidden');
      filmmakersResults?.classList.add('hidden');
      filmmakersResults?.classList.remove('active');
    } else {
      filmmakersResults?.classList.add('active');
      filmmakersResults?.classList.remove('hidden');
      moviesResults?.classList.add('hidden');
      moviesResults?.classList.remove('active');
    }
  }

  bindEvents() {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');

    if (searchInput) {
      console.log('Search input found, binding events');
      
      // Handle real-time search as user types
      searchInput.addEventListener('input', (e) => {
        console.log('Search input changed:', e.target.value);
        this.handleSearchInput(e);
      });
      
      // Handle Enter key press
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          console.log('Enter pressed, searching for:', e.target.value.trim());
          this.performSearch(e.target.value.trim());
        }
      });
      
      // Handle search button click
      if (searchButton) {
        searchButton.addEventListener('click', () => {
          const query = searchInput.value.trim();
          console.log('Search button clicked, searching for:', query);
          this.performSearch(query);
        });
      }
    } else {
      console.error('Search input not found!');
    }
  }

  loadQueryFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    if (query) {
      const searchInput = document.getElementById('searchInput');
      if (searchInput) {
        searchInput.value = query;
      }
      this.performSearch(query);
    }
  }

  handleSearchInput(e) {
    const query = e.target.value.trim();
    console.log('Search input handler called with query:', query);
    
    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // If query is empty, clear results immediately
    if (!query) {
      console.log('Empty query, clearing results');
      this.clearResults();
      this.updateURL('');
      this.updateSearchInfo('', 0);
      return;
    }

    // Show loading state immediately for better UX
    if (query.length >= 2) {
      this.showLoading();
      this.updateSearchInfo(query, 0, true); // true = searching
    }

    // Debounced search - wait for user to stop typing
    this.searchTimeout = setTimeout(() => {
      console.log('Debounced search triggered for:', query);
      this.performSearch(query);
    }, 300); // Reduced from 500ms for faster response
  }

  async performSearch(query) {
    if (!query) {
      this.clearResults();
      return;
    }

    console.log('Starting search for:', query);
    console.log('TMDB_CONFIG:', TMDB_CONFIG);
    console.log('API_KEY available:', !!TMDB_CONFIG.API_KEY);

    this.currentQuery = query;
    this.updateURL(query);
    this.showLoading();
    this.updateSearchInfo(query);

    try {
      const searchResults = await this.searchAll(query);
      console.log('Search results:', searchResults);
      this.displayAllResults(searchResults, query);
    } catch (error) {
      console.error('Search error:', error);
      this.showError('Failed to search. Please try again.');
    }
  }

  async searchMovies(query) {
    // Check if API key is available
    if (!TMDB_CONFIG?.API_KEY) {
      console.error('No API key found in TMDB_CONFIG');
      throw new Error('TMDb API key not configured');
    }

    // Clean and validate query
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) {
      console.warn('Query too short:', cleanQuery);
      return [];
    }

    console.log('Using API key:', TMDB_CONFIG.API_KEY.substring(0, 8) + '...');
    console.log('Searching for:', cleanQuery);

    // Try multiple search strategies
    const searchStrategies = [
      cleanQuery, // Original query
      cleanQuery.replace(/[^\w\s]/g, ''), // Remove special characters
      cleanQuery.split(' ')[0] // Just first word
    ];

    let allResults = [];

    for (const searchTerm of searchStrategies) {
      if (!searchTerm.trim()) continue;
      
      try {
        console.log('Trying search term:', searchTerm);
        
        // First try direct API call
        try {
          console.log('Trying direct API call...');
          const response = await this.fetchMovies(searchTerm);
          if (response.results && response.results.length > 0) {
            console.log('Direct API call succeeded with', response.results.length, 'results');
            allResults = allResults.concat(response.results);
            break; // Stop after first successful strategy
          }
        } catch (error) {
          console.warn('Direct API call failed:', error.message);
          
          // Try with CORS proxy
          console.log('Trying CORS proxies...');
          for (let i = 0; i < TMDB_CONFIG.CORS_PROXIES.length; i++) {
            try {
              console.log(`Trying proxy ${i}:`, TMDB_CONFIG.CORS_PROXIES[i]);
              const response = await this.fetchMovies(searchTerm, true, i);
              if (response.results && response.results.length > 0) {
                console.log(`Proxy ${i} succeeded with`, response.results.length, 'results!');
                allResults = allResults.concat(response.results);
                break;
              }
            } catch (proxyError) {
              console.warn(`CORS proxy ${i} failed:`, proxyError.message);
              continue;
            }
          }
          if (allResults.length > 0) break;
        }
        
        console.log('No results found for search term:', searchTerm);
      } catch (error) {
        console.error('Search strategy failed for term:', searchTerm, error);
        continue;
      }
    }
    
    if (allResults.length === 0) {
      console.log('All search strategies exhausted, returning empty results');
      return [];
    }

    // Remove duplicates based on movie ID
    const uniqueResults = allResults.filter((movie, index, self) => 
      index === self.findIndex(m => m.id === movie.id)
    );

    // Rank and sort results based on query match
    const rankedResults = this.rankSearchResults(uniqueResults, cleanQuery);
    
    console.log('Returning', rankedResults.length, 'ranked results');
    return rankedResults;
  }

  rankSearchResults(movies, originalQuery) {
    console.log('Ranking', movies.length, 'movies for query:', originalQuery);
    
    const query = originalQuery.toLowerCase();
    const yearMatch = query.match(/\b(19|20)\d{2}\b/); // Extract year from query
    const queryYear = yearMatch ? parseInt(yearMatch[0]) : null;
    const queryWords = query.replace(/\b(19|20)\d{2}\b/g, '').trim().split(/\s+/).filter(w => w.length > 0);
    
    console.log('Query analysis:', { queryYear, queryWords });

    const rankedMovies = movies.map(movie => {
      const title = movie.title.toLowerCase();
      const releaseYear = movie.release_date ? parseInt(movie.release_date.substring(0, 4)) : null;
      
      let score = 0;
      
      // 1. Exact title match (highest priority) - 1000 points
      if (title === query.replace(/\b(19|20)\d{2}\b/g, '').trim()) {
        score += 1000;
        console.log(`Exact match for "${movie.title}": +1000`);
      }
      
      // 2. Title starts with query - 500 points
      else if (title.startsWith(queryWords.join(' '))) {
        score += 500;
        console.log(`Starts with match for "${movie.title}": +500`);
      }
      
      // 3. All query words found in title - 300 points
      else if (queryWords.every(word => title.includes(word))) {
        score += 300;
        console.log(`All words match for "${movie.title}": +300`);
      }
      
      // 4. Some query words found - 100 points per word
      else {
        const matchingWords = queryWords.filter(word => title.includes(word));
        score += matchingWords.length * 100;
        if (matchingWords.length > 0) {
          console.log(`Partial match for "${movie.title}": +${matchingWords.length * 100} (${matchingWords.length} words)`);
        }
      }
      
      // 5. Year matching bonus - 200 points for exact year, -50 for each year difference
      if (queryYear && releaseYear) {
        if (queryYear === releaseYear) {
          score += 200;
          console.log(`Exact year match for "${movie.title}" (${releaseYear}): +200`);
        } else {
          const yearDifference = Math.abs(queryYear - releaseYear);
          const yearPenalty = Math.min(yearDifference * 50, 200); // Cap penalty at 200
          score -= yearPenalty;
          console.log(`Year difference for "${movie.title}" (${releaseYear}): -${yearPenalty}`);
        }
      }
      
      // 6. Popularity bonus (TMDb popularity score) - up to 50 points
      if (movie.popularity) {
        const popularityBonus = Math.min(movie.popularity / 10, 50);
        score += popularityBonus;
      }
      
      // 7. Vote average bonus - up to 30 points
      if (movie.vote_average && movie.vote_count > 10) { // Only if enough votes
        const ratingBonus = movie.vote_average * 3;
        score += ratingBonus;
      }
      
      console.log(`Final score for "${movie.title}" (${releaseYear}): ${score.toFixed(1)}`);
      
      return { ...movie, searchScore: score };
    });

    // Sort by score (highest first), then by popularity as tiebreaker
    const sortedMovies = rankedMovies.sort((a, b) => {
      if (b.searchScore !== a.searchScore) {
        return b.searchScore - a.searchScore;
      }
      return (b.popularity || 0) - (a.popularity || 0);
    });

    console.log('Top 5 ranked results:');
    sortedMovies.slice(0, 5).forEach((movie, index) => {
      console.log(`${index + 1}. "${movie.title}" (${movie.release_date?.substring(0, 4) || 'N/A'}) - Score: ${movie.searchScore.toFixed(1)}`);
    });

    return sortedMovies;
  }

  async searchAll(query) {
    const results = {
      movies: [],
      people: [],
      companies: []
    };

    try {
      // Search movies (keep existing functionality)
      results.movies = await this.searchMovies(query);
      
      // Search people (cast and crew)
      results.people = await this.searchPeople(query);
      
      // Search companies
      results.companies = await this.searchCompanies(query);
      
      // Store results for tab switching
      this.lastResults = results;
      
      return results;
    } catch (error) {
      console.error('Error in searchAll:', error);
      throw error;
    }
  }

  async searchPeople(query) {
    if (!TMDB_CONFIG?.API_KEY) {
      throw new Error('TMDb API key not configured');
    }

    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) {
      return [];
    }

    try {
      const response = await this.fetchPeople(cleanQuery);
      if (response.results && response.results.length > 0) {
        return this.rankPeopleResults(response.results, cleanQuery);
      }
      return [];
    } catch (error) {
      console.error('Search people error:', error);
      return [];
    }
  }

  async searchCompanies(query) {
    if (!TMDB_CONFIG?.API_KEY) {
      throw new Error('TMDb API key not configured');
    }

    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) {
      return [];
    }

    try {
      const response = await this.fetchCompanies(cleanQuery);
      if (response.results && response.results.length > 0) {
        return this.rankCompanyResults(response.results, cleanQuery);
      }
      return [];
    } catch (error) {
      console.error('Search companies error:', error);
      return [];
    }
  }

  async fetchPeople(query, useProxy = false, proxyIndex = 0) {
    const url = this.getPeopleSearchUrl(query, useProxy, proxyIndex);
    return this.makeApiRequest(url, useProxy, proxyIndex);
  }

  async fetchCompanies(query, useProxy = false, proxyIndex = 0) {
    const url = this.getCompanySearchUrl(query, useProxy, proxyIndex);
    return this.makeApiRequest(url, useProxy, proxyIndex);
  }

  getPeopleSearchUrl(query, useProxy = false, proxyIndex = 0) {
    const params = new URLSearchParams({
      api_key: TMDB_CONFIG.API_KEY,
      query: query,
      include_adult: 'false',
      language: 'en-US',
      page: '1'
    });
    
    const url = `${TMDB_CONFIG.BASE_URL}/search/person?${params.toString()}`;
    
    if (!useProxy) return url;
    
    const proxy = TMDB_CONFIG.CORS_PROXIES[proxyIndex];
    if (proxy.includes('allorigins.win')) {
      return `${proxy}${encodeURIComponent(url)}`;
    } else {
      return `${proxy}${url}`;
    }
  }

  getCompanySearchUrl(query, useProxy = false, proxyIndex = 0) {
    const params = new URLSearchParams({
      api_key: TMDB_CONFIG.API_KEY,
      query: query,
      page: '1'
    });
    
    const url = `${TMDB_CONFIG.BASE_URL}/search/company?${params.toString()}`;
    
    if (!useProxy) return url;
    
    const proxy = TMDB_CONFIG.CORS_PROXIES[proxyIndex];
    if (proxy.includes('allorigins.win')) {
      return `${proxy}${encodeURIComponent(url)}`;
    } else {
      return `${proxy}${url}`;
    }
  }

  async makeApiRequest(url, useProxy = false, proxyIndex = 0) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - API took too long to respond');
      }
      throw error;
    }
  }

  rankPeopleResults(people, originalQuery) {
    const query = originalQuery.toLowerCase();
    const queryWords = query.split(/\s+/).filter(w => w.length > 0);
    
    const rankedPeople = people.map(person => {
      const name = person.name.toLowerCase();
      let score = 0;
      
      // Exact name match
      if (name === query) {
        score += 1000;
      }
      // Name starts with query
      else if (name.startsWith(query)) {
        score += 500;
      }
      // All query words in name
      else if (queryWords.every(word => name.includes(word))) {
        score += 300;
      }
      // Some query words in name
      else {
        const matchingWords = queryWords.filter(word => name.includes(word));
        score += matchingWords.length * 100;
      }
      
      // Popularity bonus
      if (person.popularity) {
        score += Math.min(person.popularity / 10, 50);
      }
      
      return { ...person, searchScore: score };
    });

    return rankedPeople.sort((a, b) => {
      if (b.searchScore !== a.searchScore) {
        return b.searchScore - a.searchScore;
      }
      return (b.popularity || 0) - (a.popularity || 0);
    });
  }

  rankCompanyResults(companies, originalQuery) {
    const query = originalQuery.toLowerCase();
    const queryWords = query.split(/\s+/).filter(w => w.length > 0);
    
    const rankedCompanies = companies.map(company => {
      const name = company.name.toLowerCase();
      let score = 0;
      
      // Exact name match
      if (name === query) {
        score += 1000;
      }
      // Name starts with query
      else if (name.startsWith(query)) {
        score += 500;
      }
      // All query words in name
      else if (queryWords.every(word => name.includes(word))) {
        score += 300;
      }
      // Some query words in name
      else {
        const matchingWords = queryWords.filter(word => name.includes(word));
        score += matchingWords.length * 100;
      }
      
      return { ...company, searchScore: score };
    });

    return rankedCompanies.sort((a, b) => b.searchScore - a.searchScore);
  }

  displayAllResults(searchResults, query) {
    this.hideLoading();
    
    const { movies, people, companies } = searchResults;
    
    // Update tab counts
    this.updateTabCounts(movies.length, people.length + companies.length);
    
    // Display results in respective containers
    this.displayMoviesTab(movies);
    this.displayFilmmakersTab(people, companies);
    
    // Show no results if everything is empty
    const totalResults = movies.length + people.length + companies.length;
    if (totalResults === 0) {
      this.showNoResults();
    } else {
      this.hideNoResults();
    }
    
    // Update search info
    this.updateSearchInfo(query, totalResults);
  }

  updateTabCounts(moviesCount, filmmakersCount) {
    const moviesCountEl = document.getElementById('moviesCount');
    const filmmakersCountEl = document.getElementById('filmmakersCount');
    
    if (moviesCountEl) moviesCountEl.textContent = moviesCount;
    if (filmmakersCountEl) filmmakersCountEl.textContent = filmmakersCount;
  }

  displayMoviesTab(movies) {
    const moviesContainer = document.getElementById('moviesResults');
    if (!moviesContainer) return;
    
    moviesContainer.innerHTML = '';
    
    movies.forEach(movie => {
      const movieItem = this.createMovieListItem(movie);
      moviesContainer.appendChild(movieItem);
    });
  }

  displayFilmmakersTab(people, companies) {
    const filmmakersContainer = document.getElementById('filmmakersResults');
    if (!filmmakersContainer) return;
    
    filmmakersContainer.innerHTML = '';
    
    // Add people results
    people.forEach(person => {
      const personItem = this.createPersonListItem(person);
      filmmakersContainer.appendChild(personItem);
    });
    
    // Add company results
    companies.forEach(company => {
      const companyItem = this.createCompanyListItem(company);
      filmmakersContainer.appendChild(companyItem);
    });
  }

  createPersonListItem(person) {
    const item = document.createElement('div');
    item.className = 'person-result-item';
    item.addEventListener('click', () => this.openPersonProfile(person.id));

    const profileUrl = person.profile_path 
      ? `${TMDB_CONFIG.IMAGE_BASE_URL}${person.profile_path}`
      : null;

    const knownFor = person.known_for 
      ? person.known_for.slice(0, 3).map(item => item.title || item.name).join(', ')
      : 'No known works';

    const department = person.known_for_department || 'Acting';

    item.innerHTML = `
      ${profileUrl 
        ? `<img class="person-profile-small" src="${profileUrl}" alt="${person.name} Profile" loading="lazy">`
        : `<div class="person-profile-small">👤</div>`
      }
      <div class="person-details">
        <h3 class="person-name">${this.escapeHtml(person.name)}</h3>
        <p class="person-known-for">Known for: ${this.escapeHtml(knownFor)}</p>
        <div class="person-info-row">
          <span class="person-department">${this.escapeHtml(department)}</span>
        </div>
      </div>
    `;

    return item;
  }

  createCompanyListItem(company) {
    const item = document.createElement('div');
    item.className = 'company-result-item';
    item.addEventListener('click', () => this.openCompanyProfile(company.id));

    const logoUrl = company.logo_path 
      ? `${TMDB_CONFIG.IMAGE_BASE_URL}${company.logo_path}`
      : null;

    const originCountry = company.origin_country || 'Unknown';

    item.innerHTML = `
      ${logoUrl 
        ? `<img class="company-logo-small" src="${logoUrl}" alt="${company.name} Logo" loading="lazy">`
        : `<div class="company-logo-small">🏢</div>`
      }
      <div class="company-details">
        <h3 class="company-name">${this.escapeHtml(company.name)}</h3>
        <p class="company-description">Production Company</p>
        <div class="company-info-row">
          <span class="company-type">${this.escapeHtml(originCountry)}</span>
        </div>
      </div>
    `;

    return item;
  }

  openPersonProfile(personId) {
    // Navigate to profile page with person ID
    window.location.href = `profile.html?type=person&id=${personId}`;
  }

  openCompanyProfile(companyId) {
    // Navigate to profile page with company ID
    window.location.href = `profile.html?type=company&id=${companyId}`;
  }

  async fetchMovies(query, useProxy = false, proxyIndex = 0) {
    const url = this.getMovieSearchUrl(query, useProxy, proxyIndex);
    
    console.log(`Searching movies with${useProxy ? ` proxy ${proxyIndex}` : 'out proxy'}:`, query);
    console.log('Request URL:', url);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response body:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - API took too long to respond');
      }
      throw error;
    }
  }

  getMovieSearchUrl(query, useProxy = false, proxyIndex = 0) {
    // Better URL encoding and additional parameters for better results
    const params = new URLSearchParams({
      api_key: TMDB_CONFIG.API_KEY,
      query: query,
      include_adult: 'false',
      language: 'en-US',
      page: '1'
    });
    
    const url = `${TMDB_CONFIG.BASE_URL}/search/movie?${params.toString()}`;
    
    if (!useProxy) return url;
    
    // Handle different proxy formats
    const proxy = TMDB_CONFIG.CORS_PROXIES[proxyIndex];
    if (proxy.includes('allorigins.win')) {
      return `${proxy}${encodeURIComponent(url)}`;
    } else {
      // For corsproxy.io and cors-anywhere, don't double-encode
      return `${proxy}${url}`;
    }
  }

  displayResults(movies, query) {
    this.hideLoading();
    
    const moviesContainer = document.getElementById('moviesResults');
    const noResultsContainer = document.getElementById('noResults');
    
    if (!moviesContainer) {
      console.error('moviesResults container not found!');
      return;
    }

    if (!movies || movies.length === 0) {
      this.showNoResults();
      return;
    }

    // Hide no results container
    if (noResultsContainer) {
      noResultsContainer.classList.add('hidden');
    }

    // Clear previous results
    moviesContainer.innerHTML = '';

    // Create movie list items
    movies.forEach(movie => {
      const movieItem = this.createMovieListItem(movie);
      moviesContainer.appendChild(movieItem);
    });

    // Update search info
    this.updateSearchInfo(query, movies.length);
    
    console.log('Results displayed:', movies.length, 'movies in list');
  }

  createMovieListItem(movie) {
    const item = document.createElement('div');
    item.className = 'movie-result-item';
    item.addEventListener('click', () => this.openMovieDetail(movie.id));

    const posterUrl = movie.poster_path 
      ? `${TMDB_CONFIG.IMAGE_BASE_URL}${movie.poster_path}`
      : 'assets/images/no-poster.svg';

    const releaseYear = movie.release_date 
      ? new Date(movie.release_date).getFullYear()
      : 'Unknown';

    item.innerHTML = `
      <img class="movie-poster-small" src="${posterUrl}" alt="${movie.title} Poster" loading="lazy">
      <div class="movie-details">
        <div class="movie-title-line">
          <span class="movie-title">${this.escapeHtml(movie.title)}</span>
          <span class="movie-year">(${releaseYear})</span>
        </div>
        <p class="movie-director">Directed by: </p>
      </div>
    `;

    // Fetch director info asynchronously
    this.fetchDirectorInfo(movie.id, item);

    return item;
  }

  async fetchDirectorInfo(movieId, itemElement) {
    try {
      const apiKey = TMDB_CONFIG.API_KEY;
      console.log('Fetching director for movie:', movieId, 'API key available:', !!apiKey);
      
      if (!apiKey) {
        console.error('TMDB API key not available');
        const directorElement = itemElement.querySelector('.movie-director');
        if (directorElement) {
          directorElement.textContent = 'Directed by: API key missing';
        }
        return;
      }

      const url = `${TMDB_CONFIG.BASE_URL}/movie/${movieId}/credits?api_key=${apiKey}`;
      console.log('Fetching from URL:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Credits data for movie', movieId, ':', data);
      
      const director = data.crew?.find(person => person.job === 'Director');
      const directorElement = itemElement.querySelector('.movie-director');
      
      if (director && directorElement) {
        directorElement.textContent = `Directed by: ${director.name}`;
        console.log('Director found for movie', movieId, ':', director.name);
      } else if (directorElement) {
        directorElement.textContent = 'Directed by: Unknown';
        console.log('No director found for movie:', movieId);
      }
    } catch (error) {
      console.error('Error fetching director info for movie', movieId, ':', error);
      const directorElement = itemElement.querySelector('.movie-director');
      if (directorElement) {
        directorElement.textContent = 'Directed by: ';
      }
    }
  }

  openMovieDetail(movieId) {
    // Navigate to movie detail page with movie ID
    window.location.href = `movie.html?id=${movieId}`;
  }

  showLoading() {
    const loadingContainer = document.getElementById('loadingContainer');
    const loadingText = document.getElementById('loadingText');
    const moviesContainer = document.getElementById('moviesResults');
    const filmmakersContainer = document.getElementById('filmmakersResults');
    const noResultsContainer = document.getElementById('noResults');

    if (loadingContainer) {
      loadingContainer.classList.remove('hidden');
    }
    
    if (loadingText) {
      loadingText.textContent = 'Searching movies, people, and companies...';
    }
    
    if (moviesContainer) {
      moviesContainer.innerHTML = '';
    }
    
    if (filmmakersContainer) {
      filmmakersContainer.innerHTML = '';
    }
    
    if (noResultsContainer) {
      noResultsContainer.classList.add('hidden');
    }
  }

  hideLoading() {
    const loadingContainer = document.getElementById('loadingContainer');
    if (loadingContainer) {
      loadingContainer.classList.add('hidden');
    }
  }

  showNoResults() {
    const noResultsContainer = document.getElementById('noResults');
    const moviesContainer = document.getElementById('moviesResults');
    const filmmakersContainer = document.getElementById('filmmakersResults');

    if (moviesContainer) {
      moviesContainer.innerHTML = '';
    }
    
    if (filmmakersContainer) {
      filmmakersContainer.innerHTML = '';
    }

    if (noResultsContainer) {
      const titleEl = document.getElementById('noResultsTitle');
      const textEl = document.getElementById('noResultsText');
      
      if (titleEl) titleEl.textContent = 'No results found';
      if (textEl) textEl.textContent = 'Try searching with different keywords or check your spelling.';
      
      noResultsContainer.classList.remove('hidden');
    }
  }

  hideNoResults() {
    const noResultsContainer = document.getElementById('noResults');
    if (noResultsContainer) {
      noResultsContainer.classList.add('hidden');
    }
  }

  showError(message) {
    this.hideLoading();
    
    const activeContainer = this.activeTab === 'movies' 
      ? document.getElementById('moviesResults')
      : document.getElementById('filmmakersResults');
      
    if (activeContainer) {
      activeContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-primary);">
          <h3 style="color: #ff6b6b; margin-bottom: 10px;">Search Error</h3>
          <p>${this.escapeHtml(message)}</p>
        </div>
      `;
    }
  }

  clearResults() {
    const moviesContainer = document.getElementById('moviesResults');
    const filmmakersContainer = document.getElementById('filmmakersResults');
    const noResultsContainer = document.getElementById('noResults');
    
    if (moviesContainer) {
      moviesContainer.innerHTML = '';
    }
    
    if (filmmakersContainer) {
      filmmakersContainer.innerHTML = '';
    }
    
    if (noResultsContainer) {
      noResultsContainer.classList.add('hidden');
    }
    
    // Reset tab counts
    this.updateTabCounts(0, 0);
    
    this.updateSearchInfo('');
  }

  updateSearchInfo(query, resultCount = null, isSearching = false) {
    const titleElement = document.getElementById('searchTitle');
    const subtitleElement = document.getElementById('searchSubtitle');

    if (!titleElement || !subtitleElement) return;

    if (!query) {
      titleElement.textContent = 'Search Results';
      subtitleElement.textContent = 'Enter a movie title, person name, or company to search';
    } else if (isSearching) {
      titleElement.textContent = `Searching for "${query}"`;
      subtitleElement.textContent = 'Please wait...';
    } else if (resultCount !== null) {
      titleElement.textContent = `Search Results for "${query}"`;
      const resultText = resultCount === 1 ? 'result' : 'results';
      subtitleElement.textContent = `Found ${resultCount} ${resultText}`;
    } else {
      titleElement.textContent = `Searching for "${query}"`;
      subtitleElement.textContent = 'Please wait...';
    }
  }

  updateURL(query) {
    const url = new URL(window.location);
    if (query) {
      url.searchParams.set('q', query);
    } else {
      url.searchParams.delete('q');
    }
    window.history.replaceState({}, '', url);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new MovieSearch();
});
