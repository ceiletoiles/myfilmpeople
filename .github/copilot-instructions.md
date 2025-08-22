# MyFilmPeople - Development Guide

## What This App Does for Users
MyFilmPeople helps **film enthusiasts follow their favorite directors, actors, and crew members** like following artists on music platforms. Users can:

- **Track people they love** - Build a personal "following" list of filmmakers
- **Jump to Letterboxd profiles** - Instantly browse anyone's filmography 
- **Remember why they matter** - Add personal notes about what makes each person special
- **Discover new work** - Easily check their followed people's latest projects
- **Works on phones** - Perfect for movie theater lobby browsing and couch discoveries

## User Experience Priorities
- **Instant loading** - No waiting, works immediately
- **Always available** - Works offline after first visit
- **Never lose data** - Your collection is always safe
- **Mobile-friendly** - Designed for phones where users actually browse films

## How Users Interact with the App

### Three Simple Categories
- **Directors Tab** - Follow visionary filmmakers whose style you recognize
- **Actors Tab** - Track performers you want to see in more films  
- **Others Tab** - Remember brilliant cinematographers, writers, composers

### Adding Someone New
1. **Search by name** - TMDb auto-complete finds them instantly
2. **Pick their role** - Choose how you know them (director/actor/other)
3. **Get their profile** - Letterboxd link and photo auto-generated
4. **Add personal notes** - Remember why you love their work

### Finding People Later
- **Real-time search** across names and notes
- **Sort options** - A-Z, Z-A, or random discovery mode
- **Quick actions** - Edit details or remove from collection

## Why This Approach Works for Users

### Speed & Reliability
- **Loads instantly** - No framework bloat, just fast vanilla JavaScript
- **Works everywhere** - Any browser, any device, no installation needed
- **Never breaks** - Simple tech stack means fewer things can go wrong

### Privacy & Control  
- **Your data stays yours** - Stored locally on your device
- **No accounts required** - Start using immediately
- **Works offline** - Browse your collection anywhere, anytime

### Seamless Integration
- **One-click to Letterboxd** - Jump directly to any person's filmography
- **Smart URL generation** - Automatically creates correct Letterboxd links
- **Rich profiles** - Photos and details from movie database

## For Developers: Technical Implementation

### Core Architecture (Keep It Simple)
- **`PeopleDatabase`** class handles all data operations and localStorage
- **`UIManager`** class manages interface state and user interactions  
- **`TMDB_CONFIG`** object handles movie database API and Letterboxd links
- **Single-file structure** - everything in `script.js`, `styles.css`, `index.html`

### Key User Data
- **Storage**: `myfilmpeople_data` in browser localStorage
- **Person Schema**: `{id, name, role, letterboxdUrl, profilePicture, notes, dateAdded}`
- **Three Categories**: Directors, Actors, Others (maps to tab system)
- **Starter Data**: Curated list of acclaimed filmmakers for new users

## Development Workflows

### Adding New Features
1. **Data layer first**: Extend `PeopleDatabase` if new data fields needed
2. **UI updates**: Modify `UIManager` methods for new interactions
3. **Modal system**: Reuse existing modal pattern for forms
4. **Tab consistency**: Ensure new features work across all three tabs

### Testing Approach
- **Manual testing**: Open `index.html` in browser (no build step)
- **Data testing**: Use browser DevTools localStorage to inspect `myfilmpeople_data`
- **Mobile testing**: Chrome DevTools device emulation (mobile-first design)

### Common Debugging
- **API issues**: Check browser Network tab for TMDb API calls
- **Data persistence**: Inspect localStorage in DevTools Application tab
- **UI state**: Log `this.activeTab` and `this.currentSort` in UIManager

## File Organization

### Core Files
- **`index.html`** - Single page with modal markup and tab structure
- **`script.js`** - All JavaScript (1200+ lines, no modules)
- **`styles.css`** - Custom CSS with PT Sans typography, Letterboxd-inspired colors
- **`docs/`** - Feature ideas and improvement roadmap (not user-facing)

### Design System
- **Colors**: Letterboxd-inspired (`#14181c` bg, `#ff8000` orange accent, `#9ab` text)
- **Typography**: PT Sans font family throughout
- **Mobile-first**: Responsive breakpoints, touch-friendly interactions
- **Component patterns**: Custom dropdowns, modals, card grids

## Future Migration Notes
- **Firebase integration planned** - prepare for Firestore data structure migration
- **Offline-first approach** - current localStorage will become offline cache
- **Authentication optional** - for sharing features only
- **Data export/import** - consider when adding new data fields

## Critical Dependencies & Constraints
- **TMDb API**: Free tier, API key in code (public repo safe) - no rate limiting concerns
- **Google Fonts**: PT Sans only - maintain typography consistency
- **Zero build tools**: Open `index.html` directly in browser for testing
- **Vanilla JavaScript**: No React/Vue/frameworks - write plain ES6+ classes and functions
- **Static hosting**: Must work on Netlify/GitHub Pages without server-side processing

## Development Constraints (DO NOT)
- ❌ Add npm dependencies or package.json
- ❌ Introduce build steps (webpack, vite, etc.)
- ❌ Use frameworks (React, Vue, Angular)
- ❌ Require Node.js or server-side code
- ❌ Break the three-tab system architecture

## Instead, Always
- ✅ Write vanilla JavaScript classes extending existing patterns
- ✅ Test by opening `index.html` in browser
- ✅ Use `PeopleDatabase` and `UIManager` class patterns
- ✅ Maintain mobile-first responsive design
- ✅ Keep external dependencies minimal

When modifying this codebase, maintain the vanilla JavaScript approach, respect the mobile-first design, and ensure all changes work across the three-tab system. The app's strength is its simplicity and direct browser compatibility.
