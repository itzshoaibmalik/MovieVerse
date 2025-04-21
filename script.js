document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const genreFilter = document.getElementById('genreFilter');
  const ratingFilter = document.getElementById('ratingFilter');
  const yearFilter = document.getElementById('yearFilter');
  const sortCriteria = document.getElementById('sortCriteria');
  const movieGrid = document.getElementById('movieGrid');
  const allMovieCards = Array.from(movieGrid.querySelectorAll('.movie-card')); // Store initial cards
  const noResultsMessage = document.getElementById('noResultsMessage');
  const resetButton = document.getElementById('resetFilters');

  // --- Event Listeners ---
  genreFilter.addEventListener('change', filterAndSortMovies);
  ratingFilter.addEventListener('change', filterAndSortMovies);
  yearFilter.addEventListener('input', filterAndSortMovies); // Use input for real-time filtering as user types year
  sortCriteria.addEventListener('change', filterAndSortMovies);
  resetButton.addEventListener('click', resetAllFilters);

  // --- Initial Load ---
  // No initial filtering needed, just sort by default (popularity/initial order)
  // sortMovies(); // Call sort initially if default isn't just HTML order

  // --- Filter and Sort Function ---
  function filterAndSortMovies() {
      // 1. Get Filter Values
      const selectedGenres = Array.from(genreFilter.selectedOptions).map(option => option.value);
      const minRating = parseFloat(ratingFilter.value);
      const releaseYear = yearFilter.value.trim(); // Get year as string

      // 2. Filter Movies
      let filteredMovies = allMovieCards.filter(card => {
          const cardGenres = JSON.parse(card.dataset.genres || '[]'); // Handle missing/invalid data
          const cardRating = parseFloat(card.dataset.rating);
          const cardYear = card.dataset.year;

          // Genre Check (must match ALL selected genres if multiple are selected, or ANY if that's desired - using ANY here)
          // Change to .every() if you need ALL selected genres to be present
          const genreMatch = selectedGenres.length === 0 || selectedGenres.some(g => cardGenres.includes(g));

          // Rating Check
          const ratingMatch = isNaN(minRating) || minRating === 0 || cardRating >= minRating;

          // Year Check
          const yearMatch = releaseYear === '' || cardYear === releaseYear;

          return genreMatch && ratingMatch && yearMatch;
      });

      // 3. Sort Movies
      const sortedMovies = sortMovies(filteredMovies); // Pass the filtered list to sort

      // 4. Update Grid Display
      updateGrid(sortedMovies);
  }

  // --- Sorting Function ---
  function sortMovies(movieCards) {
      const sortBy = sortCriteria.value;

      // Slice creates a mutable copy for sorting
      return movieCards.slice().sort((a, b) => {
          const titleA = a.dataset.title.toLowerCase();
          const titleB = b.dataset.title.toLowerCase();
          const ratingA = parseFloat(a.dataset.rating);
          const ratingB = parseFloat(b.dataset.rating);
          const yearA = parseInt(a.dataset.year);
          const yearB = parseInt(b.dataset.year);

          switch (sortBy) {
              case 'rating-desc':
                  return ratingB - ratingA; // Higher rating first
              case 'rating-asc':
                  return ratingA - ratingB; // Lower rating first
              case 'date-desc':
                  return yearB - yearA;     // Newer first
              case 'date-asc':
                  return yearA - yearB;     // Older first
              case 'title-asc':
                  if (titleA < titleB) return -1;
                  if (titleA > titleB) return 1;
                  return 0;
              case 'title-desc':
                  if (titleA > titleB) return -1;
                  if (titleA < titleB) return 1;
                  return 0;
              case 'popularity-desc': // Reset to original order (or implement real logic)
              default:
                  // To maintain original order for 'popularity', compare original indices
                  // This requires storing the original index, or just returning 0 here
                  // and relying on the filter function preserving relative order for the default.
                  // For simplicity here, we won't re-implement original order sorting.
                  // A better approach for 'popularity' would be a dedicated data attribute.
                  return 0; // Keep relative order from filtering step
          }
      });
  }

  // --- Update Grid Display ---
  function updateGrid(moviesToShow) {
      // Clear current grid content efficiently
      movieGrid.innerHTML = '';

      // Check if any movies are left after filtering
      if (moviesToShow.length === 0) {
          noResultsMessage.style.display = 'block';
      } else {
          noResultsMessage.style.display = 'none';
          // Append sorted and filtered movies
          moviesToShow.forEach(card => {
              movieGrid.appendChild(card); // Appending moves the element
          });
      }
  }

   // --- Reset Filters ---
  function resetAllFilters() {
      genreFilter.selectedIndex = -1; // Clear multi-select
      // Or loop and set selected = false:
      // Array.from(genreFilter.options).forEach(opt => opt.selected = false);

      ratingFilter.value = "0"; // Set back to 'Any'
      yearFilter.value = ""; // Clear year input
      sortCriteria.value = "popularity-desc"; // Reset sort to default

      // Re-run the filter/sort logic to show all movies in default order
      filterAndSortMovies();
  }

});