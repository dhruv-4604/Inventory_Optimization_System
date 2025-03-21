/**
 * Insertion sort algorithm for sorting arrays
 * @param {Array} array - Array to sort
 * @param {string} field - Field to sort by
 * @param {boolean} ascending - Sort direction (true = ascending, false = descending)
 * @returns {Array} - Sorted array
 */
export const insertionSort = (array, field, ascending = true) => {
  if (!array || array.length === 0) return [];
  
  // Create a copy of the array to avoid modifying the original
  const result = [...array];
  
  for (let i = 1; i < result.length; i++) {
    const current = result[i];
    let j = i - 1;
    
    // Compare based on field type (number or string)
    if (typeof current[field] === 'number') {
      while (j >= 0 && (ascending ? result[j][field] > current[field] : result[j][field] < current[field])) {
        result[j + 1] = result[j];
        j--;
      }
    } else { // String comparison
      while (j >= 0 && (ascending 
        ? (result[j][field] || '').localeCompare(current[field] || '') > 0
        : (result[j][field] || '').localeCompare(current[field] || '') < 0)) {
        result[j + 1] = result[j];
        j--;
      }
    }
    
    result[j + 1] = current;
  }
  
  return result;
}; 