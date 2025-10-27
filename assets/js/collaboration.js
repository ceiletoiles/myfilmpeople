// Collaboration Finder JavaScript

class CollaborationFinder {
  constructor() {
    this.selectedPeople = [];
    this.searchTimeout = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupSidebar();
  }

  setupSidebar() {
    const hamburger = document.getElementById('hamburgerMenu');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const closeBtn = document.getElementById('sidebarClose');

    if (hamburger) {
      hamburger.addEventListener('click', () => {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
    }

    const closeSidebar = () => {
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    };

    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);
  }

  setupEventListeners() {
    const searchInput = document.getElementById('personSearchInput');
    const findBtn = document.getElementById('findCollaborationsBtn');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(this.searchTimeout);
        const query = e.target.value.trim();

        if (query.length < 2) {
          this.hideSearchResults();
          return;
        }

        this.searchTimeout = setTimeout(() => {
          this.searchPeople(query);
        }, 300);
      });

      // Hide results when clicking outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-wrapper')) {
          this.hideSearchResults();
        }
      });
    }

    if (findBtn) {
      findBtn.addEventListener('click', () => {
        this.findCollaborations();
      });
    }
  }

  async searchPeople(query) {
    const resultsContainer = document.getElementById('personSearchResults');
    if (!resultsContainer) return;

    try {
      const apiKey = window.CONFIG?.TMDB?.API_KEY;
      if (!apiKey) {
        throw new Error('API key not configured');
      }

      const response = await fetch(
        `https://api.themoviedb.org/3/search/person?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=en-US&page=1`
      );

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      this.displaySearchResults(data.results || []);
    } catch (error) {
      console.error('Person search error:', error);
      resultsContainer.innerHTML = '<div style="padding: 15px; color: var(--text-secondary);">Search failed. Please try again.</div>';
    }
  }

  displaySearchResults(results) {
    const resultsContainer = document.getElementById('personSearchResults');
    if (!resultsContainer) return;

    if (results.length === 0) {
      resultsContainer.innerHTML = '<div style="padding: 15px; color: var(--text-secondary);">No results found</div>';
      resultsContainer.classList.add('active');
      return;
    }

    // Filter out already selected people
    const availableResults = results.filter(
      person => !this.selectedPeople.find(p => p.id === person.id)
    );

    if (availableResults.length === 0) {
      resultsContainer.innerHTML = '<div style="padding: 15px; color: var(--text-secondary);">All results already added</div>';
      resultsContainer.classList.add('active');
      return;
    }

    resultsContainer.innerHTML = availableResults
      .slice(0, 8)
      .map(person => {
        const imageUrl = person.profile_path
          ? `https://image.tmdb.org/t/p/w185${person.profile_path}`
          : 'assets/images/no-profile.svg';

        const knownFor = person.known_for
          ?.slice(0, 2)
          .map(item => item.title || item.name)
          .join(', ') || person.known_for_department || '';

        return `
          <div class="person-result-item" data-person='${JSON.stringify(person).replace(/'/g, '&apos;')}'>
            <img src="${imageUrl}" alt="${person.name}" class="person-result-image" onerror="this.src='assets/images/no-profile.svg'" />
            <div class="person-result-info">
              <div class="person-result-name">${person.name}</div>
              <div class="person-result-known-for">${knownFor}</div>
            </div>
          </div>
        `;
      })
      .join('');

    resultsContainer.classList.add('active');

    // Add click listeners to results
    resultsContainer.querySelectorAll('.person-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const personData = JSON.parse(item.getAttribute('data-person'));
        this.addPerson(personData);
      });
    });
  }

  hideSearchResults() {
    const resultsContainer = document.getElementById('personSearchResults');
    if (resultsContainer) {
      resultsContainer.classList.remove('active');
    }
  }

  addPerson(personData) {
    // Check if already added
    if (this.selectedPeople.find(p => p.id === personData.id)) {
      return;
    }

    const person = {
      id: personData.id,
      name: personData.name,
      profilePath: personData.profile_path,
      knownForDepartment: personData.known_for_department || 'Unknown'
    };

    this.selectedPeople.push(person);
    this.updateSelectedPeopleDisplay();
    this.updateFindButton();

    // Clear search input and hide results
    const searchInput = document.getElementById('personSearchInput');
    if (searchInput) searchInput.value = '';
    this.hideSearchResults();
  }

  removePerson(personId) {
    this.selectedPeople = this.selectedPeople.filter(p => p.id !== personId);
    this.updateSelectedPeopleDisplay();
    this.updateFindButton();
    this.hideResults();
  }

  updateSelectedPeopleDisplay() {
    const container = document.getElementById('selectedPeopleList');
    const countEl = document.getElementById('selectedCount');

    if (countEl) {
      countEl.textContent = this.selectedPeople.length;
    }

    if (!container) return;

    if (this.selectedPeople.length === 0) {
      container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 20px;">No people added yet</div>';
      return;
    }

    container.innerHTML = this.selectedPeople
      .map(person => {
        const imageUrl = person.profilePath
          ? `https://image.tmdb.org/t/p/w185${person.profilePath}`
          : 'assets/images/no-profile.svg';

        return `
          <div class="selected-person-card">
            <button class="selected-person-remove" data-id="${person.id}" aria-label="Remove ${person.name}">&times;</button>
            <img src="${imageUrl}" alt="${person.name}" class="selected-person-image" onerror="this.src='assets/images/no-profile.svg'" />
            <div class="selected-person-name">${person.name}</div>
            <div class="selected-person-role">${person.knownForDepartment}</div>
          </div>
        `;
      })
      .join('');

    // Add click listeners to remove buttons
    container.querySelectorAll('.selected-person-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const personId = parseInt(btn.getAttribute('data-id'));
        this.removePerson(personId);
      });
    });
  }

  updateFindButton() {
    const findBtn = document.getElementById('findCollaborationsBtn');
    if (findBtn) {
      findBtn.disabled = this.selectedPeople.length < 2;
    }
  }

  async findCollaborations() {
    if (this.selectedPeople.length < 2) return;

    this.showLoading();
    this.hideResults();

    try {
      // Fetch credits for all selected people
      const creditsPromises = this.selectedPeople.map(person =>
        this.getPersonCredits(person.id)
      );

      const allCredits = await Promise.all(creditsPromises);

      // Find common movies
      const commonMovies = this.findCommonMovies(allCredits);

      this.displayResults(commonMovies);
    } catch (error) {
      console.error('Error finding collaborations:', error);
      this.displayError();
    } finally {
      this.hideLoading();
    }
  }

  async getPersonCredits(personId) {
    const apiKey = window.CONFIG?.TMDB?.API_KEY;
    if (!apiKey) {
      throw new Error('API key not configured');
    }

    const response = await fetch(
      `https://api.themoviedb.org/3/person/${personId}/combined_credits?api_key=${apiKey}&language=en-US`
    );

    if (!response.ok) throw new Error('Failed to fetch credits');

    const data = await response.json();
    return {
      personId,
      cast: data.cast || [],
      crew: data.crew || []
    };
  }

  findCommonMovies(allCredits) {
    if (allCredits.length < 2) return [];

    // Create a map to track which movies each person worked on and their roles
    const movieMap = new Map();

    allCredits.forEach((credits, personIndex) => {
      const person = this.selectedPeople[personIndex];
      const preferredDepartment = person.knownForDepartment;

      // Process cast credits
      credits.cast.forEach(movie => {
        if (movie.media_type === 'movie') {
          if (!movieMap.has(movie.id)) {
            movieMap.set(movie.id, {
              movie: movie,
              people: new Map()
            });
          }
          
          // Only add if person's main department matches or if not added yet
          const movieData = movieMap.get(movie.id);
          if (!movieData.people.has(person.id) && preferredDepartment === 'Acting') {
            movieData.people.set(person.id, {
              personId: person.id,
              personName: person.name,
              role: movie.character || 'Actor',
              department: 'Acting',
              isPreferredRole: true
            });
          }
        }
      });

      // Process crew credits
      credits.crew.forEach(movie => {
        if (movie.media_type === 'movie') {
          if (!movieMap.has(movie.id)) {
            movieMap.set(movie.id, {
              movie: movie,
              people: new Map()
            });
          }
          
          const movieData = movieMap.get(movie.id);
          
          // Check if this matches their preferred department
          const isPreferred = movie.department === preferredDepartment || 
                            movie.job === preferredDepartment;
          
          // If not added yet, or if this is their preferred role, use it
          if (!movieData.people.has(person.id)) {
            movieData.people.set(person.id, {
              personId: person.id,
              personName: person.name,
              role: movie.job || movie.department,
              department: movie.department,
              isPreferredRole: isPreferred
            });
          } else if (isPreferred && !movieData.people.get(person.id).isPreferredRole) {
            // Replace with preferred role if we had a non-preferred one
            movieData.people.set(person.id, {
              personId: person.id,
              personName: person.name,
              role: movie.job || movie.department,
              department: movie.department,
              isPreferredRole: true
            });
          }
        }
      });
    });

    // Filter to only movies where ALL selected people worked
    const commonMovies = Array.from(movieMap.values())
      .filter(item => {
        const uniquePeople = item.people.size;
        return uniquePeople === this.selectedPeople.length;
      })
      .filter(item => {
        // Filter out documentaries/self-referential content
        const movie = item.movie;
        const title = (movie.title || '').toLowerCase();
        const overview = (movie.overview || '').toLowerCase();
        
        // Check if any selected person's name appears in title or it's a documentary about them
        const isSelfReferential = this.selectedPeople.some(person => {
          const personName = person.name.toLowerCase();
          return title.includes(personName) || 
                 title.includes('making of') || 
                 title.includes('behind the scenes') ||
                 (overview.includes(personName) && overview.includes('documentary'));
        });
        
        return !isSelfReferential;
      })
      .map(item => ({
        ...item.movie,
        collaborators: Array.from(item.people.values())
      }))
      .sort((a, b) => {
        const dateA = a.release_date || '0';
        const dateB = b.release_date || '0';
        return dateB.localeCompare(dateA); // Most recent first
      });

    return commonMovies;
  }

  displayResults(movies) {
    const resultsSection = document.getElementById('resultsSection');
    const resultsContent = document.getElementById('resultsContent');

    if (!resultsSection || !resultsContent) return;

    if (movies.length === 0) {
      resultsContent.innerHTML = `
        <div class="no-collaborations">
          <h3>No Collaborations Found</h3>
          <p>These people haven't worked together on any movies yet.</p>
        </div>
      `;
      resultsSection.classList.add('active');
      return;
    }

    const statsHtml = `
      <div class="collaboration-stats">
        <div class="stat-item">
          <div class="stat-number">${movies.length}</div>
          <div class="stat-label">Movies Together</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${this.selectedPeople.length}</div>
          <div class="stat-label">Collaborators</div>
        </div>
      </div>
    `;

    const moviesHtml = `
      <div class="movies-grid">
        ${movies.map(movie => this.createMovieCard(movie)).join('')}
      </div>
    `;

    resultsContent.innerHTML = statsHtml + moviesHtml;
    resultsSection.classList.add('active');

    // Add click listeners to movie cards
    resultsContent.querySelectorAll('.movie-card').forEach(card => {
      card.addEventListener('click', () => {
        const movieId = card.getAttribute('data-movie-id');
        window.location.href = `movie.html?id=${movieId}`;
      });
    });
  }

  createMovieCard(movie) {
    const posterUrl = movie.poster_path
      ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`
      : 'assets/images/no-poster.svg';

    const year = movie.release_date
      ? new Date(movie.release_date).getFullYear()
      : 'N/A';

    const rolesText = movie.collaborators
      .map(collab => `${collab.personName} · ${collab.role}`)
      .join('<br>');

    return `
      <div class="movie-card" data-movie-id="${movie.id}">
        <img src="${posterUrl}" alt="${movie.title}" class="movie-poster" onerror="this.src='assets/images/no-poster.svg'" />
        <div class="movie-info">
          <div class="movie-title">${movie.title}</div>
          <div class="movie-year">${year}</div>
          <div class="movie-roles">${rolesText}</div>
        </div>
      </div>
    `;
  }

  displayError() {
    const resultsSection = document.getElementById('resultsSection');
    const resultsContent = document.getElementById('resultsContent');

    if (!resultsSection || !resultsContent) return;

    resultsContent.innerHTML = `
      <div class="no-collaborations">
        <h3>Error</h3>
        <p>Something went wrong while searching for collaborations. Please try again.</p>
      </div>
    `;
    resultsSection.classList.add('active');
  }

  showLoading() {
    const loader = document.getElementById('loadingSpinner');
    if (loader) loader.classList.add('active');
  }

  hideLoading() {
    const loader = document.getElementById('loadingSpinner');
    if (loader) loader.classList.remove('active');
  }

  hideResults() {
    const resultsSection = document.getElementById('resultsSection');
    if (resultsSection) resultsSection.classList.remove('active');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new CollaborationFinder();
  });
} else {
  new CollaborationFinder();
}
