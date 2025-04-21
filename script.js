document.addEventListener('DOMContentLoaded', () => {
  // --- Configuration & State (remain the same) ---
  const apiKey = 'eacc73ab9261fcee9b1146019d49d625'; 
  const baseUrl = 'https://api.themoviedb.org/3';
  const baseImageUrl = 'https://image.tmdb.org/t/p/w500';
  const profileImageUrl = 'https://image.tmdb.org/t/p/w185';
  const moviesPerPage = 20; // TMDb default and matches request

  let currentPage = 1;
  let currentFilters = {
      genre: '',
      minRating: 0,
      year: '',
      sortBy: 'popularity.desc',
  };
  let totalPages = 1;
  let genresMap = {};

  // --- DOM Elements (Add Back to Top Button) ---
  // (Existing elements remain)
  const genreFilterEl = document.getElementById('genreFilter');
  const ratingFilterEl = document.getElementById('ratingFilter');
  const yearFilterEl = document.getElementById('yearFilter');
  const sortCriteriaEl = document.getElementById('sortCriteria');
  const movieGridEl = document.getElementById('movieGrid');
  const loadingIndicatorEl = document.getElementById('loadingIndicator'); // Keep for initial load/errors
  const errorMessageEl = document.getElementById('errorMessage');
  const paginationControlsEl = document.getElementById('paginationControls');
  const prevPageBtn = document.getElementById('prevPage');
  const nextPageBtn = document.getElementById('nextPage');
  const currentPageSpan = document.getElementById('currentPage');
  const resetFiltersBtn = document.getElementById('resetFilters');
  const currentYearSpan = document.getElementById('currentYear');
  const modalEl = document.getElementById('movieDetailModal');
  const modalBodyEl = document.getElementById('modalBody');
  const modalCloseBtn = modalEl.querySelector('.modal-close-btn');
  const modalOverlay = modalEl.querySelector('.modal-overlay');
  const backToTopBtn = document.getElementById('backToTopBtn'); // New element

  // --- API Functions (remain the same) ---
  async function fetchFromTMDB(endpoint, params = {}, includeApiKey = true) {
      // ... (keep existing implementation) ...
      const url = new URL(`${baseUrl}/${endpoint}`);
      if (includeApiKey) {
          url.searchParams.append('api_key', apiKey);
      }
      url.searchParams.append('language', 'en-US');

      for (const key in params) {
          if (params[key]) {
               url.searchParams.append(key, params[key]);
          }
      }

      try {
          errorMessageEl.style.display = 'none';
          const response = await fetch(url);
          if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(`HTTP error! status: ${response.status} ${response.statusText} - ${errorData.status_message || 'Unknown API error'}`);
          }
          return await response.json();
      } catch (error) {
          console.error(`Error fetching ${endpoint}:`, error);
          throw error;
      }
  }

  async function fetchGenres() {
      // ... (keep existing implementation) ...
       try {
          const data = await fetchFromTMDB('genre/movie/list');
          if (data && data.genres) {
              genresMap = data.genres.reduce((map, genre) => {
                  map[genre.id] = genre.name;
                  return map;
              }, {});
              populateGenreFilter(data.genres);
          }
      } catch (error) {
           console.error("Failed to fetch genres.");
      }
  }

  async function fetchMovies() {
      showLoading(true); // Use skeleton loader now
      errorMessageEl.style.display = 'none';

      const params = {
          page: currentPage,
          sort_by: currentFilters.sortBy,
          'vote_average.gte': currentFilters.minRating > 0 ? currentFilters.minRating : null,
          with_genres: currentFilters.genre || null,
          primary_release_year: currentFilters.year || null,
          'vote_count.gte': 100,
          include_adult: false,
      };

      try {
          const data = await fetchFromTMDB('discover/movie', params);
          if (data) {
              renderMovies(data.results); // Render actual movies
              totalPages = data.total_pages > 500 ? 500 : data.total_pages;
              updatePagination();
               if (data.results.length === 0) {
                  showError("No movies found matching your criteria.");
                  updatePagination(true);
              }
          }
      } catch (error) {
          showError(`Failed to load movies: ${error.message}`);
          updatePagination(true);
      } finally {
          showLoading(false); // Hide skeleton loader
      }
  }

  async function fetchMovieDetails(movieId) {
      // ... (keep existing implementation) ...
      showModalLoading(true);
      try {
          const data = await fetchFromTMDB(`movie/${movieId}`, { append_to_response: 'credits' });
          renderModal(data);
      } catch (error) {
          renderModalError(`Failed to load details: ${error.message}`);
      } finally {
          showModalLoading(false);
      }
  }

  // --- Rendering Functions ---
  function populateGenreFilter(genres) {
      // ... (keep existing implementation) ...
      genreFilterEl.innerHTML = '<option value="">All Genres</option>';
      genres.forEach(genre => {
          const option = document.createElement('option');
          option.value = genre.id;
          option.textContent = genre.name;
          genreFilterEl.appendChild(option);
      });
  }

  function renderMovies(movies) {
      // No need to clear here, skeleton loader handles the placeholder state
      if (!movies) return;

      movies.forEach(movie => {
          // ... (keep existing card creation logic) ...
           const card = document.createElement('div');
          card.className = 'movie-card';
          card.dataset.movieId = movie.id;

          const imageUrl = movie.poster_path
              ? `${baseImageUrl}${movie.poster_path}`
              : 'https://via.placeholder.com/500x750/cccccc/808080?text=No+Poster';

          card.innerHTML = `
              <img src="${imageUrl}" alt="${movie.title} Poster" loading="lazy">
              <div class="movie-card-content">
                  <h3>${movie.title}</h3>
                  <p class="year">${movie.release_date ? movie.release_date.substring(0, 4) : 'N/A'}</p>
                  ${movie.vote_average > 0 ? `<div class="rating">${movie.vote_average.toFixed(1)}</div>` : ''}
              </div>
          `;
          movieGridEl.appendChild(card);
      });
  }

  function renderModal(movie) {
      // ... (keep existing implementation) ...
      if (!movie) {
          renderModalError("Movie data not found.");
          return;
      }

      const posterUrl = movie.poster_path
          ? `${baseImageUrl}${movie.poster_path}`
          : 'https://via.placeholder.com/500x750/cccccc/808080?text=No+Poster';

      const genresHtml = movie.genres?.map(g => `<span class="genre-tag">${g.name}</span>`).join(' ') || 'N/A';
      const releaseYear = movie.release_date ? movie.release_date.substring(0, 4) : 'N/A';
      const rating = movie.vote_average > 0 ? movie.vote_average.toFixed(1) : 'N/A';
      const runtime = movie.runtime ? `${movie.runtime} min` : 'N/A';

      const cast = movie.credits?.cast || [];
      const castHtml = cast.slice(0, 12).map(actor => `
          <div class="cast-member">
              <img src="${actor.profile_path ? profileImageUrl + actor.profile_path : 'https://via.placeholder.com/185x185/cccccc/808080?text=No+Image'}" alt="${actor.name}" loading="lazy">
              <p class="actor-name">${actor.name}</p>
              <p class="character-name">${actor.character}</p>
          </div>
      `).join('');

      modalBodyEl.innerHTML = `
          <div class="modal-body-grid">
              <div class="modal-poster">
                  <img src="${posterUrl}" alt="${movie.title} Poster">
              </div>
              <div class="modal-details">
                  <h2>${movie.title}</h2>
                  <div class="modal-meta">
                      <span class="year">📅 ${releaseYear}</span>
                      <span class="rating">${rating !== 'N/A' ? `⭐ ${rating}` : 'No Rating'}</span>
                      <span class="runtime">⏱️ ${runtime}</span>
                  </div>
                  <div class="modal-genres">
                      ${genresHtml}
                  </div>
                  <div class="modal-overview">
                      <h3>Overview</h3>
                      <p>${movie.overview || 'No overview available.'}</p>
                  </div>
              </div>
          </div>
           ${cast.length > 0 ? `
              <div class="modal-cast">
                  <h3>Top Cast</h3>
                  <div class="modal-cast-list">
                      ${castHtml}
                  </div>
              </div>` : ''}
      `;
  }

  function renderModalError(message) {
       // ... (keep existing implementation) ...
       modalBodyEl.innerHTML = `<div class="modal-loading error-message">${message}</div>`;
  }

  function updatePagination(disable = false) {
       // ... (keep existing implementation) ...
       if (disable || totalPages <= 1) {
           paginationControlsEl.style.display = 'none';
           return;
       }
      paginationControlsEl.style.display = 'flex';
      currentPageSpan.textContent = `Page ${currentPage} of ${totalPages}`;
      prevPageBtn.disabled = currentPage <= 1;
      nextPageBtn.disabled = currentPage >= totalPages;
  }

  // UPDATED: Show Skeleton Loaders
  function showLoading(isLoading) {
      loadingIndicatorEl.style.display = 'none'; // Hide old text indicator
      errorMessageEl.style.display = 'none'; // Hide errors when loading starts

      if (isLoading) {
          movieGridEl.innerHTML = ''; // Clear previous results
          renderSkeletonLoaders(moviesPerPage); // Show placeholders
      } else {
          clearSkeletonLoaders(); // Remove placeholders after loading
      }
  }

  // NEW: Render Skeleton Loaders
  function renderSkeletonLoaders(count) {
      for (let i = 0; i < count; i++) {
          const skeletonCard = document.createElement('div');
          skeletonCard.className = 'skeleton-card';
          skeletonCard.innerHTML = `
              <div class="skeleton-img"></div>
              <div class="skeleton-content">
                  <div class="skeleton-text"></div>
                  <div class="skeleton-text short"></div>
              </div>
          `;
          movieGridEl.appendChild(skeletonCard);
      }
  }

  // NEW: Clear Skeleton Loaders
  function clearSkeletonLoaders() {
      const skeletons = movieGridEl.querySelectorAll('.skeleton-card');
      skeletons.forEach(skeleton => skeleton.remove());
  }


  function showModalLoading(isLoading) {
      // ... (keep existing implementation) ...
      if (isLoading) {
          modalBodyEl.innerHTML = `<div class="modal-loading">Loading details...</div>`;
      }
  }

   function showError(message) {
      clearSkeletonLoaders(); // Clear skeletons if error occurs
      movieGridEl.innerHTML = ''; // Ensure grid is empty
      errorMessageEl.textContent = message;
      errorMessageEl.style.display = 'block';
  }

  // --- Modal Control Functions (remain the same) ---
  function openModal() {
      // ... (keep existing implementation) ...
      modalEl.classList.add('active');
      document.body.style.overflow = 'hidden';
  }

  function closeModal() {
      // ... (keep existing implementation) ...
      modalEl.classList.remove('active');
      document.body.style.overflow = '';
      modalBodyEl.innerHTML = '';
  }

  // --- Event Handlers (remain the same, add Back to Top) ---
  function handleFilterChange() { /* ... */ }
  function handleSortChange() { /* ... */ }
  function handleResetFilters() { /* ... */ }
  function goToPrevPage() { /* ... */ }
  function goToNextPage() { /* ... */ }
  function handleMovieCardClick(event) { /* ... */ }

  // NEW: Scroll Event Listener for Back to Top Button
  function handleScroll() {
      if (window.scrollY > 300) { // Show button after scrolling down 300px
          backToTopBtn.classList.add('visible');
      } else {
          backToTopBtn.classList.remove('visible');
      }
  }

  // NEW: Click Handler for Back to Top Button
  function scrollToTop() {
      window.scrollTo({
          top: 0,
          behavior: 'smooth' // Smooth scrolling animation
      });
  }

  // --- Initialization ---
  function init() {
      if (!apiKey || apiKey === 'YOUR_TMDB_API_KEY') {
           showError("API Key Missing! Please add your TMDb API key to script.js.");
           showLoading(false); // Ensure skeleton loaders are cleared if API key missing
           updatePagination(true);
           return;
      }

      currentYearSpan.textContent = new Date().getFullYear();

      // Add event listeners
      genreFilterEl.addEventListener('change', handleFilterChange);
      ratingFilterEl.addEventListener('change', handleFilterChange);
      yearFilterEl.addEventListener('input', handleFilterChange);
      sortCriteriaEl.addEventListener('change', handleSortChange);
      resetFiltersBtn.addEventListener('click', handleResetFilters);
      prevPageBtn.addEventListener('click', goToPrevPage);
      nextPageBtn.addEventListener('click', goToNextPage);
      modalCloseBtn.addEventListener('click', closeModal);
      modalOverlay.addEventListener('click', closeModal);
      movieGridEl.addEventListener('click', handleMovieCardClick);
      backToTopBtn.addEventListener('click', scrollToTop); // Add listener for back to top
      window.addEventListener('scroll', handleScroll); // Add scroll listener

      // Fetch initial data
      fetchGenres().then(() => {
          fetchMovies();
      });
  }

  // --- Run Initialization ---
  init();

});