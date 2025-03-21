/**
 * Knapsack algorithms for inventory optimization
 */

/**
 * Basic 0/1 Knapsack algorithm for storage optimization
 * This algorithm decides which items to store in a compartment to maximize value
 * while respecting the size/capacity constraints
 * 
 * @param {Array} items - Array of items with value and size properties
 * @param {Number} capacity - Maximum capacity of the compartment
 * @param {String} valueProperty - Property to use as value (default: 'value')
 * @param {String} sizeProperty - Property to use as size (default: 'size')
 * @returns {Object} Result containing selected items and total value
 */
function knapsackStorage(items, capacity, valueProperty = 'value', sizeProperty = 'size') {
  // Create a table to store results of subproblems
  const n = items.length;
  const dp = Array(n + 1).fill().map(() => Array(capacity + 1).fill(0));
  
  // Build the dp table in bottom-up manner
  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= capacity; w++) {
      // Get the current item's value and size
      const currentItemValue = items[i-1][valueProperty] || 0;
      const currentItemSize = items[i-1][sizeProperty] || 0;
      
      // If item size is larger than current capacity, skip it
      if (currentItemSize > w) {
        dp[i][w] = dp[i-1][w];
      } else {
        // Choose maximum: include current item or exclude it
        dp[i][w] = Math.max(
          currentItemValue + dp[i-1][w - currentItemSize],
          dp[i-1][w]
        );
      }
    }
  }
  
  // Find which items are selected
  const result = {
    selectedItems: [],
    totalValue: dp[n][capacity],
    remainingCapacity: capacity
  };
  
  let w = capacity;
  for (let i = n; i > 0; i--) {
    const currentItemSize = items[i-1][sizeProperty] || 0;
    
    // If result comes from including this item
    if (dp[i][w] !== dp[i-1][w]) {
      result.selectedItems.push(items[i-1]);
      result.remainingCapacity -= currentItemSize;
      w -= currentItemSize;
    }
  }
  
  return result;
}

/**
 * Optimizes storage of items in compartments using a heuristic algorithm
 * @param {Array} items - Array of items with id, name, size, quantity and warehouse_id
 * @param {Array} compartments - Array of compartments with id, name, capacity, warehouse_id, and remainingCapacity
 * @param {Boolean} considerMaintenance - Whether to consider maintenance costs
 * @returns {Object} Assignment result with compartmentAssignments and unassignedItems
 */
function optimizeStorage(items, compartments, considerMaintenance = false) {
  // Create copies to avoid modifying original arrays
  const itemsToAssign = [...items].map(item => {
    // Ensure we have string IDs and calculate totalSize
    return {
      ...item,
      _id: item._id?.toString() || item._id,
      warehouse_id: item.warehouse_id?.toString() || null,
      totalSize: item.size * (item.quantity || 1)
    };
  });
  
  const availableCompartments = [...compartments].map(comp => {
    // Ensure we have string IDs and correct remaining space
    return {
      ...comp,
      _id: comp._id?.toString() || comp._id,
      warehouse_id: comp.warehouse_id?.toString() || null,
      remainingSpace: comp.remainingCapacity !== undefined 
        ? comp.remainingCapacity 
        : comp.capacity
    };
  });

  // Sort compartments by maintenance price (lowest first)
  availableCompartments.sort((a, b) => (a.maintenancePrice || 0) - (b.maintenancePrice || 0));

  // Sort items by total size (largest first)
  itemsToAssign.sort((a, b) => b.totalSize - a.totalSize);

  const result = {
    compartmentAssignments: {},
    unassignedItems: []
  };

  // Try to assign each item to the best compartment
  for (const item of itemsToAssign) {
    // Skip if item has zero size or quantity
    if (item.totalSize <= 0) continue;
    
    let assigned = false;
    
    // Try each compartment in sorted order (by maintenance cost)
    for (const compartment of availableCompartments) {
      // Compare warehouse IDs as strings
      const sameWarehouse = 
        (item.warehouse_id || '') === (compartment.warehouse_id || '');
      
      // Check both warehouse match and capacity
      if (sameWarehouse && compartment.remainingSpace >= item.totalSize) {
        // Assign item to this compartment
        result.compartmentAssignments[item._id] = compartment._id;
        
        // Update remaining space
        compartment.remainingSpace -= item.totalSize;
        
        assigned = true;
        break;
      }
    }
    
    // If we couldn't assign this item, add to unassigned list
    if (!assigned) {
      result.unassignedItems.push(item._id);
    }
  }

  return result;
}

/**
 * Restock optimization algorithm using knapsack
 * This algorithm decides which items to restock to maximize profit within a budget
 * 
 * @param {Array} items - Array of items with profit, buyingPrice, and sales data
 * @param {Number} budget - Maximum budget for restocking
 * @returns {Object} Result with items to restock and quantities
 */
function optimizeRestock(items, budget) {
  // Prepare items with extended metadata for knapsack
  const itemsWithMetadata = items.map(item => {
    // Calculate profit per item
    const profit = item.sellingPrice - item.buyingPrice;
    
    // Factor in popularity/demand rate if available
    const popularity = item.salesRate || 1; // Default to 1 if no sales data
    
    // Calculate how many units we need to restock
    const maxQuantity = Math.max(0, item.restockPoint - item.quantity);
    
    // Calculate the total cost to fully restock this item
    const totalCost = maxQuantity * item.buyingPrice;
    
    // Calculate the potential total profit from restocking
    const totalProfit = maxQuantity * profit * popularity;
    
    // Calculate profit ratio (profit per cost unit)
    const profitRatio = totalCost > 0 ? totalProfit / totalCost : 0;
    
    return {
      ...item,
      maxQuantity,
      totalCost,
      totalProfit,
      profitRatio,
      // For knapsack: value = potential profit, size = cost
      value: totalProfit,
      size: totalCost 
    };
  }).filter(item => item.maxQuantity > 0); // Only consider items that need restocking
  
  if (itemsWithMetadata.length === 0) {
    return {
      itemsToRestock: [],
      totalCost: 0,
      remainingBudget: budget
    };
  }
  
  // If we have more than one quantity per item, we need to split into individual units
  // for the knapsack algorithm
  let knapsackItems = [];
  let itemIndices = new Map(); // Keep track of which items are represented at which indices
  
  // We have two approaches:
  // 1. For a small number of items with small quantities, we can represent each quantity as a separate item
  // 2. For larger problems, we use binary representation of quantities (powers of 2)
  
  const totalUnits = itemsWithMetadata.reduce((acc, item) => acc + item.maxQuantity, 0);
  
  if (totalUnits <= 1000) { // Use approach 1 for smaller problems
    // Create individual items for each quantity
    itemsWithMetadata.forEach((item, itemIndex) => {
      for (let i = 0; i < item.maxQuantity; i++) {
        knapsackItems.push({
          originalItemIndex: itemIndex,
          value: item.profit * (item.popularity || 1), // Value of adding 1 unit
          size: item.buyingPrice // Cost of adding 1 unit
        });
      }
    });
  } else { // Use approach 2 for larger problems (binary representation)
    itemsWithMetadata.forEach((item, itemIndex) => {
      // Break quantity into powers of 2
      let remaining = item.maxQuantity;
      let binaryDigit = 1;
      
      while (remaining > 0) {
        const units = Math.min(binaryDigit, remaining);
        const unitCost = units * item.buyingPrice;
        const unitProfit = units * item.profit * (item.popularity || 1);
        
        knapsackItems.push({
          originalItemIndex: itemIndex,
          units,
          value: unitProfit,
          size: unitCost
        });
        
        remaining -= units;
        binaryDigit *= 2;
      }
    });
  }
  
  // Run knapsack to find the optimal allocation
  const knapsackResult = knapsackStorage(knapsackItems, budget, 'value', 'size');
  
  // Process the results
  const result = {
    itemsToRestock: [],
    totalCost: 0,
    remainingBudget: budget
  };
  
  // Count how many units of each item were selected
  const selectedCounts = new Map();
  
  knapsackResult.selectedItems.forEach(selection => {
    const { originalItemIndex, units = 1 } = selection;
    const currentCount = selectedCounts.get(originalItemIndex) || 0;
    selectedCounts.set(originalItemIndex, currentCount + units);
  });
  
  // Create the final restock recommendations
  selectedCounts.forEach((count, itemIndex) => {
    const originalItem = itemsWithMetadata[itemIndex];
    const cost = count * originalItem.buyingPrice;
    
    result.itemsToRestock.push({
      item: originalItem._id,
      name: originalItem.name,
      quantity: count,
      cost: cost,
      expectedProfit: count * (originalItem.sellingPrice - originalItem.buyingPrice) * 
                      (originalItem.popularity || 1)
    });
    
    result.totalCost += cost;
  });
  
  result.remainingBudget = budget - result.totalCost;
  
  // Sort by highest expected profit
  result.itemsToRestock.sort((a, b) => b.expectedProfit - a.expectedProfit);
  
  return result;
}

module.exports = {
  knapsackStorage,
  optimizeStorage,
  optimizeRestock
}; 