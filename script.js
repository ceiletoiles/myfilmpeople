// Tab switching functionality
document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', function() {
    const tabId = this.getAttribute('data-tab');
    
    // Remove active class from all tabs and buttons
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Add active class to clicked button and corresponding tab
    this.classList.add('active');
    document.getElementById(tabId + '-tab').classList.add('active');
  });
});

// Global variables
const directorsGrid = document.getElementById('directorsGrid');
const actorsGrid = document.getElementById('actorsGrid');
let allDirectors = Array.from(document.querySelectorAll('#directorsGrid .director-card'));
let allActors = Array.from(document.querySelectorAll('#actorsGrid .director-card'));
let currentDirectorsSort = 'alphabetical';
let currentActorsSort = 'alphabetical';

// Directors controls
const directorsSortButton = document.getElementById('directorsSortButton');
const directorsSortDropdown = document.getElementById('directorsSortDropdown');
const directorsSearchButton = document.getElementById('directorsSearchButton');
const directorsSearch = document.getElementById('directorsSearch');

// Actors controls
const actorsSortButton = document.getElementById('actorsSortButton');
const actorsSortDropdown = document.getElementById('actorsSortDropdown');
const actorsSearchButton = document.getElementById('actorsSearchButton');
const actorsSearch = document.getElementById('actorsSearch');

// Sort functionality
function sortItems(items, grid, sortType) {
  let sortedItems = [...items];
  
  switch(sortType) {
    case 'alphabetical':
      sortedItems.sort((a, b) => a.dataset.name.localeCompare(b.dataset.name));
      break;
    case 'reverse':
      sortedItems.sort((a, b) => b.dataset.name.localeCompare(a.dataset.name));
      break;
    case 'popular-shuffle':
      sortedItems.sort((a, b) => {
        const popularityCompare = parseInt(b.dataset.popularity) - parseInt(a.dataset.popularity);
        return popularityCompare !== 0 ? popularityCompare : Math.random() - 0.5;
      });
      break;
  }
  
  grid.innerHTML = '';
  sortedItems.forEach(item => grid.appendChild(item));
}

// Filter functionality
function filterItems(items, searchTerm) {
  items.forEach(item => {
    const name = item.dataset.name.toLowerCase();
    const isVisible = name.includes(searchTerm.toLowerCase());
    item.style.display = isVisible ? 'block' : 'none';
  });
}

// Toggle dropdown functionality
function toggleDropdown(dropdown, button) {
  const isOpen = dropdown.classList.contains('show');
  
  // Close all dropdowns first
  document.querySelectorAll('.sort-dropdown').forEach(d => {
    d.classList.remove('show');
  });
  document.querySelectorAll('.control-button').forEach(b => {
    b.classList.remove('active');
  });
  
  if (!isOpen) {
    dropdown.classList.add('show');
    button.classList.add('active');
  }
}

// Toggle search functionality
function toggleSearch(searchInput, searchButton) {
  const isExpanded = searchInput.classList.contains('expanded');
  const tabContent = searchButton.closest('.tab-content');
  
  // Close all search inputs first
  document.querySelectorAll('.search-input').forEach(input => {
    input.classList.remove('expanded');
  });
  document.querySelectorAll('.control-button').forEach(b => {
    if (b.textContent === '⌕') b.classList.remove('active');
  });
  document.querySelectorAll('.tab-content').forEach(tc => {
    tc.classList.remove('has-search-active');
  });
  
  if (!isExpanded) {
    searchInput.classList.add('expanded');
    searchButton.classList.add('active');
    tabContent.classList.add('has-search-active');
    setTimeout(() => searchInput.focus(), 300);
  } else {
    searchInput.value = '';
    // Trigger search to show all items
    const items = searchInput.id === 'directorsSearch' ? allDirectors : allActors;
    filterItems(items, '');
  }
}

// Directors sort dropdown
directorsSortButton.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleDropdown(directorsSortDropdown, directorsSortButton);
});

directorsSortDropdown.addEventListener('click', (e) => {
  if (e.target.classList.contains('sort-option')) {
    const sortType = e.target.getAttribute('data-sort');
    currentDirectorsSort = sortType;
    
    // Update active state
    directorsSortDropdown.querySelectorAll('.sort-option').forEach(opt => {
      opt.classList.remove('active');
    });
    e.target.classList.add('active');
    
    // Sort and close dropdown
    sortItems(allDirectors, directorsGrid, sortType);
    directorsSortDropdown.classList.remove('show');
    directorsSortButton.classList.remove('active');
    
    // Reset search
    directorsSearch.value = '';
    directorsSearch.classList.remove('expanded');
    directorsSearchButton.classList.remove('active');
    document.getElementById('directors-tab').classList.remove('has-search-active');
    filterItems(allDirectors, '');
  }
});

// Directors search
directorsSearchButton.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleSearch(directorsSearch, directorsSearchButton);
});

directorsSearch.addEventListener('input', (e) => {
  filterItems(allDirectors, e.target.value);
});

// Actors sort dropdown
actorsSortButton.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleDropdown(actorsSortDropdown, actorsSortButton);
});

actorsSortDropdown.addEventListener('click', (e) => {
  if (e.target.classList.contains('sort-option')) {
    const sortType = e.target.getAttribute('data-sort');
    currentActorsSort = sortType;
    
    // Update active state
    actorsSortDropdown.querySelectorAll('.sort-option').forEach(opt => {
      opt.classList.remove('active');
    });
    e.target.classList.add('active');
    
    // Sort and close dropdown
    sortItems(allActors, actorsGrid, sortType);
    actorsSortDropdown.classList.remove('show');
    actorsSortButton.classList.remove('active');
    
    // Reset search
    actorsSearch.value = '';
    actorsSearch.classList.remove('expanded');
    actorsSearchButton.classList.remove('active');
    document.getElementById('actors-tab').classList.remove('has-search-active');
    filterItems(allActors, '');
  }
});

// Actors search
actorsSearchButton.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleSearch(actorsSearch, actorsSearchButton);
});

actorsSearch.addEventListener('input', (e) => {
  filterItems(allActors, e.target.value);
});

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
  // Check if click is outside any control element
  if (!e.target.closest('.control-group') && !e.target.closest('.control-button')) {
    // Close all dropdowns
    document.querySelectorAll('.sort-dropdown').forEach(dropdown => {
      dropdown.classList.remove('show');
    });
    
    // Close all search inputs
    document.querySelectorAll('.search-input').forEach(input => {
      input.classList.remove('expanded');
      if (input.value === '') {
        // Clear search if it was empty when collapsed
        const items = input.id === 'directorsSearch' ? allDirectors : allActors;
        filterItems(items, '');
      }
    });
    
    // Remove active states from all buttons
    document.querySelectorAll('.control-button').forEach(button => {
      button.classList.remove('active');
    });

    // Remove spacing class from all tab contents
    document.querySelectorAll('.tab-content').forEach(tc => {
      tc.classList.remove('has-search-active');
    });
  }
});

// Initialize with alphabetical sort and set active states
sortItems(allDirectors, directorsGrid, 'alphabetical');
sortItems(allActors, actorsGrid, 'alphabetical');

// Set initial active states
directorsSortDropdown.querySelector('[data-sort="alphabetical"]').classList.add('active');
actorsSortDropdown.querySelector('[data-sort="alphabetical"]').classList.add('active');
