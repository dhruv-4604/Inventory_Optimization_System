/**
 * Simple search and sort algorithms for frontend and backend use
 */

/**
 * Search items by name, category, or description
 * Simple string matching algorithm
 * 
 * @param {Array} items - Array of items to search through
 * @param {String} query - Search query string
 * @param {Array} fields - Fields to search in (default: name, category, description)
 * @returns {Array} - Filtered array of items that match the query
 */
function searchItems(items, query, fields = ['name', 'category', 'description']) {
  if (!query || query.trim() === '') {
    return items;
  }
  
  const searchTerm = query.toLowerCase().trim();
  
  return items.filter(item => {
    return fields.some(field => {
      if (!item[field]) return false;
      return item[field].toLowerCase().includes(searchTerm);
    });
  });
}

/**
 * Sort items by a specific field and direction
 * 
 * @param {Array} items - Array of items to sort
 * @param {String} field - Field to sort by
 * @param {String} direction - Sort direction ('asc' or 'desc')
 * @returns {Array} - Sorted array of items
 */
function sortItems(items, field = 'name', direction = 'asc') {
  const sortedItems = [...items];
  
  return sortedItems.sort((a, b) => {
    // Handle special cases like profit which might be virtual
    if (field === 'profit') {
      const profitA = a.sellingPrice - a.buyingPrice;
      const profitB = b.sellingPrice - b.buyingPrice;
      return direction === 'asc' ? profitA - profitB : profitB - profitA;
    }
    
    // Handle missing values
    if (a[field] === undefined) return direction === 'asc' ? -1 : 1;
    if (b[field] === undefined) return direction === 'asc' ? 1 : -1;
    
    // Sort string fields alphabetically
    if (typeof a[field] === 'string') {
      return direction === 'asc' 
        ? a[field].localeCompare(b[field])
        : b[field].localeCompare(a[field]);
    }
    
    // Sort numeric fields
    return direction === 'asc' ? a[field] - b[field] : b[field] - a[field];
  });
}

/**
 * Filter items by a specific criteria
 * 
 * @param {Array} items - Array of items to filter
 * @param {Object} filters - Object with filter criteria
 * @returns {Array} - Filtered array of items
 */
function filterItems(items, filters) {
  if (!filters || Object.keys(filters).length === 0) {
    return items;
  }
  
  return items.filter(item => {
    return Object.keys(filters).every(key => {
      // Skip empty filter values
      if (filters[key] === undefined || filters[key] === null || filters[key] === '') {
        return true;
      }
      
      // Handle range filters
      if (key.includes('Min') || key.includes('Max')) {
        const baseKey = key.replace('Min', '').replace('Max', '');
        
        if (key.includes('Min')) {
          return item[baseKey] >= filters[key];
        } else {
          return item[baseKey] <= filters[key];
        }
      }
      
      // Handle exact match filters
      return item[key] === filters[key];
    });
  });
}

module.exports = {
  searchItems,
  sortItems,
  filterItems
}; 