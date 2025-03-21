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
 * Optimizes storage of items in compartments using a greedy algorithm
 * @param {Array} items - Array of items with id, name, size, quantity and warehouse_id
 * @param {Array} compartments - Array of compartments with id, name, capacity, warehouse_id, and remainingCapacity
 * @returns {Object} Assignment result with compartmentAssignments and unassignedItems
 */
function optimizeStorage(items, compartments) {
  // Create copies to avoid modifying original arrays
  const itemsToAssign = [...items].map(item => ({
    ...item,
    _id: item._id?.toString() || item._id,
    warehouse_id: item.warehouse_id?.toString() || null,
    totalSize: item.size * (item.quantity || 1)
  }));
  
  const availableCompartments = [...compartments].map(comp => ({
    ...comp,
    _id: comp._id?.toString() || comp._id,
    warehouse_id: comp.warehouse_id?.toString() || null,
    remainingSpace: comp.remainingCapacity !== undefined 
      ? comp.remainingCapacity 
      : comp.capacity
  }));

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
      const sameWarehouse = (item.warehouse_id || '') === (compartment.warehouse_id || '');
      
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
  // Ensure budget is a positive number
  budget = Math.max(0, Number(budget) || 0);
  
  if (budget <= 0) {
    return {
      itemsToRestock: [],
      totalCost: 0,
      remainingBudget: 0
    };
  }
  
  // Prepare items with extended metadata for knapsack
  const itemsWithMetadata = items.map(item => {
    // Make sure necessary properties exist and are valid numbers
    const sellingPrice = Number(item.sellingPrice) || 0;
    const buyingPrice = Number(item.buyingPrice || item.cost) || 0;
    const quantity = Number(item.quantity) || 0;
    const restockPoint = Number(item.restockPoint) || 0;
    
    // Skip items with invalid pricing
    if (sellingPrice <= 0 || buyingPrice <= 0) {
      return null;
    }
    
    // Calculate profit per item
    const profit = sellingPrice - buyingPrice;
    
    // Only positive profit makes sense for restocking
    if (profit <= 0) {
      return null;
    }
    
    // Calculate how many units we need to restock
    const maxQuantity = Math.max(0, restockPoint - quantity);
    
    // Skip if no restocking needed
    if (maxQuantity <= 0) {
      return null;
    }
    
    // Calculate the total cost to fully restock this item
    const totalCost = maxQuantity * buyingPrice;
    
    // Calculate the potential total profit from restocking
    const totalProfit = maxQuantity * profit;
    
    // Calculate profit ratio (profit per cost unit) for efficiency
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
  }).filter(item => item !== null); // Filter out invalid items
  
  if (itemsWithMetadata.length === 0) {
    return {
      itemsToRestock: [],
      totalCost: 0,
      remainingBudget: budget
    };
  }
  
  // Sort by profit ratio for greedy approach fallback
  itemsWithMetadata.sort((a, b) => b.profitRatio - a.profitRatio);
  
  // Run knapsack to find the optimal allocation
  const knapsackResult = knapsackStorage(itemsWithMetadata, budget, 'value', 'size');
  
  // Process the results
  const result = {
    itemsToRestock: [],
    totalCost: 0,
    remainingBudget: budget
  };
  
  // Calculate the quantity to restock for each selected item
  knapsackResult.selectedItems.forEach(item => {
    const buyingPrice = Number(item.buyingPrice || item.cost) || 0;
    const sellingPrice = Number(item.sellingPrice) || 0;
    const profit = sellingPrice - buyingPrice;
    
    result.itemsToRestock.push({
      _id: item._id,
      name: item.name,
      quantity: item.maxQuantity,
      cost: item.totalCost,
      expectedProfit: item.maxQuantity * profit,
      unitCost: buyingPrice,
      unitProfit: profit
    });
    
    result.totalCost += item.totalCost;
  });
  
  result.remainingBudget = budget - result.totalCost;
  result.totalProfit = result.itemsToRestock.reduce((sum, item) => sum + item.expectedProfit, 0);
  result.roi = result.totalCost > 0 ? (result.totalProfit / result.totalCost) * 100 : 0;
  
  return result;
}

module.exports = {
  knapsackStorage,
  optimizeStorage,
  optimizeRestock
}; 