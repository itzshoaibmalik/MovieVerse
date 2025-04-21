document.addEventListener('DOMContentLoaded', () => {
  // --- Configuration ---
  const apiKey = 'YOUR_TMDB_API_KEY'; // <-- PASTE YOUR V3 API KEY HERE!
  const baseUrl = 'https://api.themoviedb.org/3';
  const baseImageUrl = 'https://image.tmdb.org/t/p/w500'; // Image quality/size

  // --- State ---
  let currentPage = 1;
  let currentFilters = {
      genre: '',
      minRating: 0,
      year: '',
      sortBy: 'popularity.desc', // Default sort
  };
  let totalPages = 1;
  let genresMap = {}; // To store genre ID -> Name mapping

  // --- DOM Elements ---
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

  // --- API Functions ---
  async function fetchFromTMDB(endpoint, params = {}) {
      const url = new URL(`${baseUrl}/${endpoint}`);
      url.searchParams.append('api_key', apiKey);
      // Append default language, can be customized
      url.searchParams.append('language', 'en-US');

      // Add additional params
      for (const key in params) {
          if (params[key]) { // Only add if value is not empty/null/0
               url.searchParams.append(key, params[key]);
          }
      }

      try {
          showLoading(true);
          errorMessageEl.style.display = 'none'; // Hide previous errors
          const response = await fetch(url);
          if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
          }
          const data = await response.json();
          return data;
      } catch (error) {
          console.error("Error fetching from TMDb:", error);
          showError(`Failed to load data: ${error.message}. Please check your API key and network connection.`);
          return null; // Indicate failure
      } finally {
          showLoading(false);
      }
  }

  async function fetchGenres() {
      const data = await fetchFromTMDB('genre/movie/list');
      if (data && data.genres) {
          genresMap = data.genres.reduce((map, genre) => {
              map[genre.id] = genre.name;
              return map;
          }, {});
          populateGenreFilter(data.genres);
      }
  }

  async function fetchMovies() {
      const params = {
          page: currentPage,
          sort_by: currentFilters.sortBy,
          'vote_average.gte': currentFilters.minRating > 0 ? currentFilters.minRating : null, // TMDb uses gte for minimum rating
          with_genres: currentFilters.genre || null, // Genre ID
          primary_release_year: currentFilters.year || null, // Release year
          'vote_count.gte': 100, // Optional: Filter out movies with very few votes for more reliable ratings
          include_adult: false,
      };

      // Use the 'discover' endpoint for filtering/sorting
      const data = await fetchFromTMDB('discover/movie', params);

      if (data) {
          renderMovies(data.results);
          totalPages = data.total_pages > 500 ? 500 : data.total_pages; // TMDb limits results beyond page 500
          updatePagination();
      } else {
          // Clear grid if fetch failed after a previous success
          movieGridEl.innerHTML = '';
          updatePagination(true); // Disable pagination if error
      }
  }

  // --- Rendering Functions ---
  function populateGenreFilter(genres) {
      genreFilterEl.innerHTML = '<option value="">All Genres</option>'; // Reset
      genres.forEach(genre => {
          const option = document.createElement('option');
          option.value = genre.id;
          option.textContent = genre.name;
          genreFilterEl.appendChild(option);
      });
  }

  function renderMovies(movies) {
      movieGridEl.innerHTML = ''; // Clear previous movies
      if (!movies || movies.length === 0) {
           showError("No movies found matching your criteria.");
           updatePagination(true); // Disable pagination
           return;
      }

      movies.forEach(movie => {
          const card = document.createElement('div');
          card.className = 'movie-card';

          const imageUrl = movie.poster_path
              ? `${baseImageUrl}${movie.poster_path}`
              : 'https://via.placeholder.com/500x750/cccccc/808080?text=No+Poster'; // Fallback

          card.innerHTML = `
              <img src="${imageUrl}" alt="${movie.title} Poster" loading="lazy">
              <div class="movie-card-content">
                  <h3>${movie.title}</h3>
                  <p class="year">${movie.release_date ? movie.release_date.substring(0, 4) : 'N/A'}</p>
                  ${movie.vote_average > 0 ? `<div class="rating">${movie.vote_average.toFixed(1)}</div>` : ''}
                  <!-- Optional: Add watchlist button etc. here -->
              </div>
          `;
          // Add click listener to card (e.g., to go to movie detail page)
          card.addEventListener('click', () => {
               console.log(`Clicked movie ID: ${movie.id}`);
               // window.location.href = `/movie/${movie.id}`; // Example navigation
          });

          movieGridEl.appendChild(card);
      });
  }

  function updatePagination(disable = false) {
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
      loadingIndicatorEl.style.display = isLoading ? 'block' : 'none';
      // Optionally disable controls while loading
      // filterControlsEl.disabled = isLoading; // Need a wrapper element for this
  }

   function showError(message) {
      movieGridEl.innerHTML = ''; // Clear grid on error
      errorMessageEl.textContent = message;
      errorMessageEl.style.display = 'block';
  }

  // --- Event Handlers ---
  function handleFilterChange() {
      currentFilters.genre = genreFilterEl.value;
      currentFilters.minRating = parseFloat(ratingFilterEl.value);
      currentFilters.year = yearFilterEl.value.trim();
      currentPage = 1; // Reset to first page when filters change
      fetchMovies();
  }

  function handleSortChange() {
      currentFilters.sortBy = sortCriteriaEl.value;
      currentPage = 1; // Reset to first page when sorting changes
      fetchMovies();
  }

  function handleResetFilters() {
      genreFilterEl.value = "";
      ratingFilterEl.value = "0";
      yearFilterEl.value = "";
      sortCriteriaEl.value = "popularity.desc"; // Reset sort to default

      // Update state and fetch
      currentFilters.genre = '';
      currentFilters.minRating = 0;
      currentFilters.year = '';
      currentFilters.sortBy = 'popularity.desc';
      currentPage = 1;
      fetchMovies();
  }

  function goToPrevPage() {
      if (currentPage > 1) {
          currentPage--;
          fetchMovies();
          window.scrollTo(0, 0); // Scroll to top
      }
  }

  function goToNextPage() {
      if (currentPage < totalPages) {
          currentPage++;
          fetchMovies();
          window.scrollTo(0, 0); // Scroll to top
      }
  }

  // --- Initialization ---
  function init() {
      if (!apiKey || apiKey === 'YOUR_TMDB_API_KEY') {
           showError("API Key Missing! Please add your TMDb API key to script.js.");
           showLoading(false);
           updatePagination(true); // Disable pagination
           return; // Stop execution if no API key
      }

      // Set current year in footer
      currentYearSpan.textContent = new Date().getFullYear();

      // Add event listeners
      genreFilterEl.addEventListener('change', handleFilterChange);
      ratingFilterEl.addEventListener('change', handleFilterChange);
      yearFilterEl.addEventListener('input', handleFilterChange); // Or 'change' if you prefer less frequent updates
      sortCriteriaEl.addEventListener('change', handleSortChange);
      resetFiltersBtn.addEventListener('click', handleResetFilters);
      prevPageBtn.addEventListener('click', goToPrevPage);
      nextPageBtn.addEventListener('click', goToNextPage);

      // Fetch initial data
      fetchGenres(); // Fetch genres first to populate the dropdown
      fetchMovies(); // Then fetch the default movie list
  }

  // --- Run Initialization ---
  init();

});