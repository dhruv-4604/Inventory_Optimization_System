/**
 * Binary search algorithm for finding items in a sorted array
 * @param {Array} array - Sorted array to search in
 * @param {string} query - Search query
 * @param {string} field - Field to search on
 * @returns {Array} - Items that match the search
 */
export const binarySearch = (array, query, field) => {
  if (!array || array.length === 0 || !query) return [];
  
  const searchQuery = query.toLowerCase();
  const results = [];
  
  // Sort the array by the specified field
  const sortedArray = [...array].sort((a, b) => {
    const valueA = (a[field] || '').toLowerCase();
    const valueB = (b[field] || '').toLowerCase();
    return valueA.localeCompare(valueB);
  });
  
  // Binary search to find the first matching element
  let left = 0;
  let right = sortedArray.length - 1;
  let firstMatch = -1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midValue = (sortedArray[mid][field] || '').toLowerCase();
    
    if (midValue.includes(searchQuery)) {
      firstMatch = mid;
      right = mid - 1; // Continue searching left for earlier matches
    } else if (midValue < searchQuery) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
  // If no match was found
  if (firstMatch === -1) return [];
  
  // Collect all matches starting from firstMatch
  for (let i = firstMatch; i < sortedArray.length; i++) {
    const value = (sortedArray[i][field] || '').toLowerCase();
    if (value.includes(searchQuery)) {
      results.push(sortedArray[i]);
    } else if (value > searchQuery) {
      break; // No more possible matches
    }
  }
  
  // Also check for matches before firstMatch (in case there are duplicates)
  for (let i = firstMatch - 1; i >= 0; i--) {
    const value = (sortedArray[i][field] || '').toLowerCase();
    if (value.includes(searchQuery)) {
      results.push(sortedArray[i]);
    } else {
      break; // No more possible matches
    }
  }
  
  return results;
}; 