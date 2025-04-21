document.addEventListener('DOMContentLoaded', () => {
  // --- Configuration ---
  const apiKey = 'eacc73ab9261fcee9b1146019d49d625'; // <-- PASTE YOUR V3 API KEY HERE!
  const baseUrl = 'https://api.themoviedb.org/3';
  const baseImageUrl = 'https://image.tmdb.org/t/p/w500';
  const profileImageUrl = 'https://image.tmdb.org/t/p/w185'; // For cast images

  // --- State ---
  // (currentPage, currentFilters, totalPages, genresMap remain the same)
  let currentPage = 1;
  let currentFilters = {
      genre: '',
      minRating: 0,
      year: '',
      sortBy: 'popularity.desc',
  };
  let totalPages = 1;
  let genresMap = {};

  // --- DOM Elements ---
  // (Existing elements remain)
  const genreFilterEl = document.getElementById('genreFilter');
  const ratingFilterEl = document.getElementById('ratingFilter');
  const yearFilterEl = document.getElementById('yearFilter');
  const sortCriteriaEl = document.getElementById('sortCriteria');
  const movieGridEl = document.getElementById('movieGrid');
  const loadingIndicatorEl = document.getElementById('loadingIndicator');
  const errorMessageEl = document.getElementById('errorMessage');
  const paginationControlsEl = document.getElementById('paginationControls');
  const prevPageBtn = document.getElementById('prevPage');
  const nextPageBtn = document.getElementById('nextPage');
  const currentPageSpan = document.getElementById('currentPage');
  const resetFiltersBtn = document.getElementById('resetFilters');
  const currentYearSpan = document.getElementById('currentYear');
  // Modal Elements
  const modalEl = document.getElementById('movieDetailModal');
  const modalBodyEl = document.getElementById('modalBody');
  const modalCloseBtn = modalEl.querySelector('.modal-close-btn');
  const modalOverlay = modalEl.querySelector('.modal-overlay');


  // --- API Functions ---
  async function fetchFromTMDB(endpoint, params = {}, includeApiKey = true) {
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

      // Centralized Fetch Logic (keep existing try/catch/finally)
      try {
          // Note: Loading indicator handled specifically for grid vs modal
          errorMessageEl.style.display = 'none';
          const response = await fetch(url);
          if (!response.ok) {
              const errorData = await response.json().catch(() => ({})); // Try to get error details
              throw new Error(`HTTP error! status: ${response.status} ${response.statusText} - ${errorData.status_message || 'Unknown API error'}`);
          }
          return await response.json();
      } catch (error) {
          console.error(`Error fetching ${endpoint}:`, error);
          // Error display handled by calling function (grid or modal)
          throw error; // Re-throw for calling function to handle UI
      }
  }

  async function fetchGenres() {
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
           // Handle genre fetch error if needed (e.g., show message)
           console.error("Failed to fetch genres.");
      }
  }

  async function fetchMovies() {
      showLoading(true); // Show main grid loading
      movieGridEl.innerHTML = ''; // Clear grid before fetch
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
              renderMovies(data.results);
              totalPages = data.total_pages > 500 ? 500 : data.total_pages;
              updatePagination();
               if (data.results.length === 0) {
                  showError("No movies found matching your criteria.");
                  updatePagination(true); // Disable pagination
              }
          }
      } catch (error) {
          showError(`Failed to load movies: ${error.message}`);
          updatePagination(true);
      } finally {
          showLoading(false); // Hide main grid loading
      }
  }

  // NEW: Fetch detailed movie info including credits
  async function fetchMovieDetails(movieId) {
      showModalLoading(true);
      try {
          // Append credits directly to the movie details request
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
      // (Keep existing implementation)
      genreFilterEl.innerHTML = '<option value="">All Genres</option>';
      genres.forEach(genre => {
          const option = document.createElement('option');
          option.value = genre.id;
          option.textContent = genre.name;
          genreFilterEl.appendChild(option);
      });
  }

  function renderMovies(movies) {
      // Clear only if needed (already cleared in fetchMovies)
      // movieGridEl.innerHTML = '';
      if (!movies) return; // Should be handled by caller, but safe check

      movies.forEach(movie => {
          const card = document.createElement('div');
          card.className = 'movie-card';
          card.dataset.movieId = movie.id; // <<< ADD MOVIE ID HERE

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

  // NEW: Render Modal Content
  function renderModal(movie) {
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

      // Render Cast (limit to ~10-12 for brevity)
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
       modalBodyEl.innerHTML = `<div class="modal-loading error-message">${message}</div>`;
  }


  function updatePagination(disable = false) {
       // (Keep existing implementation)
       if (disable || totalPages <= 1) {
           paginationControlsEl.style.display = 'none';
           return;
       }
      paginationControlsEl.style.display = 'flex';
      currentPageSpan.textContent = `Page ${currentPage} of ${totalPages}`;
      prevPageBtn.disabled = currentPage <= 1;
      nextPageBtn.disabled = currentPage >= totalPages;
  }

  function showLoading(isLoading) {
      // (Keep existing implementation for main grid loading)
      loadingIndicatorEl.style.display = isLoading ? 'block' : 'none';
      if (isLoading) {
          movieGridEl.innerHTML = ''; // Clear grid when loading starts
          errorMessageEl.style.display = 'none';
      }
  }

  // NEW: Show loading state specifically for the modal
  function showModalLoading(isLoading) {
      if (isLoading) {
          modalBodyEl.innerHTML = `<div class="modal-loading">Loading details...</div>`;
      }
      // No need to hide it explicitly, as renderModal/renderModalError replaces the content
  }

   function showError(message) {
      // (Keep existing implementation for main grid errors)
      movieGridEl.innerHTML = ''; // Clear grid on error
      errorMessageEl.textContent = message;
      errorMessageEl.style.display = 'block';
  }

  // --- Modal Control Functions ---
  function openModal() {
      modalEl.classList.add('active');
      document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }

  function closeModal() {
      modalEl.classList.remove('active');
      document.body.style.overflow = ''; // Restore background scrolling
      modalBodyEl.innerHTML = ''; // Clear content when closing
  }


  // --- Event Handlers ---
  function handleFilterChange() {
      // (Keep existing implementation)
      currentFilters.genre = genreFilterEl.value;
      currentFilters.minRating = parseFloat(ratingFilterEl.value);
      currentFilters.year = yearFilterEl.value.trim();
      currentPage = 1;
      fetchMovies();
  }

  function handleSortChange() {
      // (Keep existing implementation)
      currentFilters.sortBy = sortCriteriaEl.value;
      currentPage = 1;
      fetchMovies();
  }

  function handleResetFilters() {
      // (Keep existing implementation)
      genreFilterEl.value = "";
      ratingFilterEl.value = "0";
      yearFilterEl.value = "";
      sortCriteriaEl.value = "popularity.desc";

      currentFilters.genre = '';
      currentFilters.minRating = 0;
      currentFilters.year = '';
      currentFilters.sortBy = 'popularity.desc';
      currentPage = 1;
      fetchMovies();
  }

  function goToPrevPage() {
      // (Keep existing implementation)
      if (currentPage > 1) {
          currentPage--;
          fetchMovies();
          window.scrollTo(0, 0);
      }
  }

  function goToNextPage() {
      // (Keep existing implementation)
      if (currentPage < totalPages) {
          currentPage++;
          fetchMovies();
          window.scrollTo(0, 0);
      }
  }

  // NEW: Handle clicks on movie cards using Event Delegation
  function handleMovieCardClick(event) {
      const card = event.target.closest('.movie-card'); // Find the nearest movie card ancestor
      if (card && card.dataset.movieId) {
          const movieId = card.dataset.movieId;
          openModal();
          fetchMovieDetails(movieId);
      }
  }


  // --- Initialization ---
  function init() {
      if (!apiKey || apiKey === 'YOUR_TMDB_API_KEY') {
           showError("API Key Missing! Please add your TMDb API key to script.js.");
           showLoading(false);
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

      // Modal Listeners
      modalCloseBtn.addEventListener('click', closeModal);
      modalOverlay.addEventListener('click', closeModal);

      // Movie Grid Click Listener (Event Delegation)
      movieGridEl.addEventListener('click', handleMovieCardClick);


      // Fetch initial data
      fetchGenres().then(() => {
          fetchMovies(); // Fetch movies only after genres might be loaded
      });
  }

  // --- Run Initialization ---
  init();

});