const Item = require('../models/Item');
const Compartment = require('../models/Compartment');
const { knapsackStorage, optimizeStorage: algorithmOptimizeStorage, optimizeRestock } = require('../algorithms/knapsack');

/**
 * @desc    Optimize item storage using knapsack algorithm
 * @route   POST /api/optimization/storage
 * @access  Private
 */
exports.optimizeItemStorage = async (req, res) => {
  try {
    const { items: itemIds, compartmentId } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || !compartmentId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of item IDs and a compartment ID'
      });
    }

    // Get compartment
    const compartment = await Compartment.findById(compartmentId);
    if (!compartment) {
      return res.status(404).json({
        success: false,
        message: 'Compartment not found'
      });
    }

    // Get items
    const items = await Item.find({ _id: { $in: itemIds } });
    
    // Calculate value for each item (can be profit or another metric)
    const itemsWithValue = items.map(item => ({
      ...item.toObject(),
      value: item.sellingPrice - item.buyingPrice, // Using profit as value
    }));

    // Run knapsack algorithm
    const capacity = compartment.availableSize;
    const result = knapsackStorage(itemsWithValue, capacity);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error optimizing storage',
      error: error.message
    });
  }
};

/**
 * @desc    Optimize compartment assignment for multiple items
 * @route   POST /api/optimization/assign-compartments
 * @access  Private
 */
exports.optimizeCompartmentAssignment = async (req, res) => {
  try {
    const { items: itemIds, warehouseId, considerMaintenanceCost } = req.body;

    if (!itemIds || !Array.isArray(itemIds)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of item IDs'
      });
    }

    console.log("Starting optimization for items:", itemIds);
    console.log("Warehouse ID:", warehouseId);
    console.log("Consider maintenance cost:", considerMaintenanceCost);

    // Get items with complete information
    const items = await Item.find({ _id: { $in: itemIds } }).lean();
    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No items found with the provided IDs'
      });
    }
    
    console.log("\n===== OPTIMIZATION INPUT DETAILS =====");
    console.log("Items to optimize:");
    items.forEach(item => {
      const totalSize = item.size * item.quantity;
      console.log(`- ${item.name}: Size=${item.size}, Quantity=${item.quantity}, TotalSize=${totalSize}, Warehouse=${item.warehouse_id}`);
    });
    
    // Add value property to items based on sellingPrice
    const itemsWithValue = items.map(item => ({
      ...item,
      value: item.sellingPrice || 1  // Use selling price as value or default to 1
    }));
    
    // Get compartments, filtered by warehouse if provided
    const query = warehouseId ? { warehouse_id: warehouseId } : {};
    const compartments = await Compartment.find(query).lean();
    
    if (compartments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No compartments found'
      });
    }
    
    console.log("\nAvailable compartments:");
    compartments.forEach(comp => {
      console.log(`- ${comp.name}: Capacity=${comp.capacity}, Remaining=${comp.remainingCapacity}, Warehouse=${comp.warehouse_id}, Maintenance=${comp.maintenancePrice || 0}`);
    });
    
    console.log("\nCompatible compartments per item (where item would fit):");
    items.forEach(item => {
      const totalSize = item.size * item.quantity;
      const validCompartments = compartments.filter(comp => 
        comp.warehouse_id.toString() === item.warehouse_id.toString() && 
        comp.remainingCapacity >= totalSize
      );
      
      console.log(`\nItem ${item.name} (TotalSize=${totalSize}):`);
      if (validCompartments.length === 0) {
        console.log(`  NO COMPATIBLE COMPARTMENTS FOUND in warehouse ${item.warehouse_id}`);
      } else {
        console.log(`  ${validCompartments.length} compatible compartments found:`);
        validCompartments.forEach(comp => {
          console.log(`  - ${comp.name}: Capacity=${comp.capacity}, Remaining=${comp.remainingCapacity}, Maintenance=${comp.maintenancePrice || 0}`);
        });
      }
    });
    console.log("======================================\n");

    // Run optimization algorithm with maintenance cost consideration
    const result = algorithmOptimizeStorage(itemsWithValue, compartments, considerMaintenanceCost);
    
    // Debug: log the result
    console.log('Compartment assignment result:', result);
    console.log('compartmentAssignments:', result.compartmentAssignments);
    console.log('unassignedItems:', result.unassignedItems);
    
    // If any items were unassigned, let's see why
    if (result.unassignedItems && result.unassignedItems.length > 0) {
      console.log("\n=== ANALYZING UNASSIGNED ITEMS ===");
      
      for (const itemId of result.unassignedItems) {
        const item = items.find(i => i._id.toString() === itemId.toString());
        if (item) {
          const totalSize = item.size * item.quantity;
          const validCompartments = compartments.filter(comp => 
            comp.warehouse_id.toString() === item.warehouse_id.toString() && 
            comp.remainingCapacity >= totalSize
          );
          
          console.log(`\nUnassigned item ${item.name} (ID: ${item._id}):`);
          console.log(`  Size: ${item.size}, Quantity: ${item.quantity}, Total Size: ${totalSize}`);
          console.log(`  Warehouse: ${item.warehouse_id}`);
          console.log(`  Valid compartments found: ${validCompartments.length}`);
          
          if (validCompartments.length === 0) {
            console.log(`  No compartments with sufficient capacity in warehouse ${item.warehouse_id}`);
            
            // Show all compartments in this warehouse with their capacity info
            const warehouseCompartments = compartments.filter(
              comp => comp.warehouse_id.toString() === item.warehouse_id.toString()
            );
            
            console.log(`  All compartments in this warehouse (${warehouseCompartments.length}):`);
            warehouseCompartments.forEach(comp => {
              console.log(`    - ${comp.name}: capacity ${comp.capacity}, remaining ${comp.remainingCapacity}, ` +
                          `maintenance $${comp.maintenancePrice || 0}`);
            });
          } else {
            console.log(`  Valid compartments found but item was still not assigned:`);
            validCompartments.forEach(comp => {
              console.log(`    - ${comp.name}: capacity ${comp.capacity}, remaining ${comp.remainingCapacity}, ` +
                          `maintenance $${comp.maintenancePrice || 0}`);
            });
            
            // Try to explain why the item wasn't assigned
            console.log("  Possible reasons for non-assignment:");
            console.log("    - The algorithm might have assigned other items to these compartments first");
            console.log("    - There might be a bug in the assignment logic");
            console.log("    - The compartment's remaining capacity might have changed during optimization");
          }
        }
      }
      console.log("\n=== END ANALYSIS ===\n");
    }
    
    // Add details about successful assignments
    if (Object.keys(result.compartmentAssignments || {}).length > 0) {
      console.log("\n=== SUCCESSFUL ASSIGNMENTS ===");
      
      for (const [itemId, compartmentId] of Object.entries(result.compartmentAssignments)) {
        const item = items.find(i => i._id.toString() === itemId.toString());
        const compartment = compartments.find(c => c._id.toString() === compartmentId.toString());
        
        if (item && compartment) {
          const totalSize = item.size * item.quantity;
          console.log(`Item "${item.name}" (size: ${totalSize}) assigned to ` +
                     `"${compartment.name}" (capacity: ${compartment.capacity}, remaining: ${compartment.remainingCapacity}, ` +
                     `maintenance: $${compartment.maintenancePrice || 0})`);
        }
      }
      
      console.log("=== END ASSIGNMENTS ===\n");
    }
    
    // Ensure compartmentAssignments is an object
    if (!result.compartmentAssignments) {
      result.compartmentAssignments = {};
    }

    res.status(200).json({
      success: true,
      data: {
        compartmentAssignments: result.compartmentAssignments,
        unassignedItems: result.unassignedItems || [],
        totalItems: items.length,
        assignedCount: Object.keys(result.compartmentAssignments).length
      }
    });
  } catch (error) {
    console.error('Optimization error:', error);
    res.status(500).json({
      success: false,
      message: 'Error optimizing compartment assignments',
      error: error.message
    });
  }
};

/**
 * @desc    Apply optimized compartment assignments to items
 * @route   POST /api/optimization/apply-assignments
 * @access  Private
 */
exports.applyCompartmentAssignments = async (req, res) => {
  try {
    // Debug: log the incoming request
    console.log('Request body received:', req.body);
    
    const { assignments, items: updatedItems } = req.body;
    
    console.log('Assignments received:', assignments);
    console.log('Assignments type:', typeof assignments);
    console.log('Updated items received:', updatedItems);
    
    if (!assignments) {
      return res.status(400).json({
        success: false,
        message: 'Please provide assignments object (missing from request)',
        received: req.body
      });
    }
    
    if (typeof assignments !== 'object') {
      return res.status(400).json({
        success: false,
        message: `Assignments must be an object, received: ${typeof assignments}`,
        received: req.body
      });
    }
    
    const results = {
      success: [],
      failed: []
    };

    // Process each assignment
    for (const [itemId, compartmentId] of Object.entries(assignments)) {
      try {
        // Get item and check size
        const item = await Item.findById(itemId);
        if (!item) {
          results.failed.push({ itemId, reason: 'Item not found' });
          continue;
        }

        // If there's an updated version of this item in the request, use those values
        const updatedItem = updatedItems ? updatedItems.find(i => i._id === itemId) : null;
        if (updatedItem) {
          console.log(`Updating item ${itemId} with new values:`, updatedItem);
          // Update item fields from the updatedItem
          if (updatedItem.quantity !== undefined) {
            item.quantity = updatedItem.quantity;
          }
          if (updatedItem.size !== undefined) {
            item.size = updatedItem.size;
          }
          if (updatedItem.name !== undefined) {
            item.name = updatedItem.name;
          }
          if (updatedItem.description !== undefined) {
            item.description = updatedItem.description;
          }
          if (updatedItem.sellingPrice !== undefined) {
            item.sellingPrice = updatedItem.sellingPrice;
          }
          if (updatedItem.buyingPrice !== undefined) {
            item.buyingPrice = updatedItem.buyingPrice;
          }
          if (updatedItem.restockPoint !== undefined) {
            item.restockPoint = updatedItem.restockPoint;
          }
        }

        // Get compartment and check capacity
        let compartment = null;
        if (compartmentId) {
          compartment = await Compartment.findById(compartmentId);
          if (!compartment) {
            results.failed.push({ itemId, reason: 'Compartment not found' });
            continue;
          }

          // Calculate total size needed
          const totalSize = item.size * item.quantity;
            
          // Check if total size fits in compartment remaining capacity
          if (totalSize > compartment.remainingCapacity) {
            results.failed.push({ 
              itemId, 
              reason: `Total item size (${totalSize}) exceeds compartment remaining capacity (${compartment.remainingCapacity})` 
            });
            continue;
          }
        }

        // If item already has a compartment, remove it from the old one
        if (item.compartment_id) {
          const oldCompartment = await Compartment.findById(item.compartment_id);
          if (oldCompartment) {
            // Remove item from old compartment
            oldCompartment.removeItem(item.size, item.quantity);
            await oldCompartment.save();
          }
        }

        // Update item with new compartment (or null to remove assignment)
        item.compartment_id = compartmentId || null;
        await item.save();

        // Update compartment remainingCapacity if we have a new compartment
        if (compartment) {
          compartment.addItem(item.size, item.quantity);
          await compartment.save();
        }

        results.success.push(itemId);
      } catch (error) {
        console.error(`Error assigning item ${itemId}:`, error);
        results.failed.push({ itemId, reason: error.message });
      }
    }

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error applying assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Error applying compartment assignments',
      error: error.message
    });
  }
};

/**
 * @desc    Optimize restocking based on budget and profit
 * @route   POST /api/optimization/restock
 * @access  Private
 */
exports.optimizeRestock = async (req, res) => {
  try {
    const { budget } = req.body;

    if (!budget || isNaN(budget) || budget <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid budget'
      });
    }

    // Get all items
    const items = await Item.find();
    
    // Run optimization algorithm
    const result = optimizeRestock(items, budget);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error optimizing restock',
      error: error.message
    });
  }
};

/**
 * @desc    Optimize compartment assignment for temporary items (batch creation)
 * @route   POST /api/optimization/assign-temp-items
 * @access  Private
 */
exports.optimizeTempItemsAssignment = async (req, res) => {
  try {
    const { tempItems, warehouseId, considerMaintenanceCost } = req.body;

    if (!tempItems || !Array.isArray(tempItems)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of temporary items'
      });
    }

    // Get compartments, filtered by warehouse if provided
    const query = warehouseId ? { warehouse_id: warehouseId } : {};
    const compartments = await Compartment.find(query).lean();
    
    if (compartments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No compartments found'
      });
    }

    // Convert temp items to the format expected by the optimization algorithm
    const items = tempItems.map(item => ({
      _id: item.tempId.toString(), // Use the temporary ID as a string
      name: item.name,
      size: item.size,
      sellingPrice: item.sellingPrice,
      warehouse_id: item.warehouse_id,
      value: item.sellingPrice || 1 // Use selling price as value or default to 1
    }));

    // Run optimization algorithm with maintenance cost consideration
    const result = algorithmOptimizeStorage(items, compartments, considerMaintenanceCost);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Optimization error:', error);
    res.status(500).json({
      success: false,
      message: 'Error optimizing compartment assignments',
      error: error.message
    });
  }
};

/**
 * @desc    Get restock recommendations
 * @route   POST /api/optimization/restock
 * @access  Private
 */
exports.getRestockRecommendations = async (req, res) => {
  try {
    const { budget, categoryFilter } = req.body;

    if (!budget || isNaN(parseFloat(budget))) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid budget'
      });
    }

    // Build query for items
    const query = {};
    if (categoryFilter) {
      query.category = categoryFilter;
    }

    // Get all items for restock consideration
    const items = await Item.find(query).lean();
    
    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No items found to consider for restocking'
      });
    }

    // Run restock optimization
    const result = optimizeRestock(items, parseFloat(budget));

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Restock optimization error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating restock recommendations',
      error: error.message
    });
  }
};

/**
 * @desc    Get storage optimization recommendations
 * @route   POST /api/optimization/storage
 * @access  Private
 */
exports.optimizeStorage = async (req, res) => {
  try {
    const { warehouseId, considerMaintenanceCost = false } = req.body;

    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: 'Warehouse ID is required'
      });
    }

    // Get all items in this warehouse
    const items = await Item.find({ warehouse_id: warehouseId });

    // Get all compartments in this warehouse
    const compartments = await Compartment.find({ warehouse_id: warehouseId });

    if (items.length === 0 || compartments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No items or compartments found for this warehouse'
      });
    }

    // Run the optimization algorithm
    const optimizationResult = algorithmOptimizeStorage(items, compartments, considerMaintenanceCost);
    
    // Debug: log the result
    console.log('Optimization result:', optimizationResult);
    console.log('compartmentAssignments type:', typeof optimizationResult.compartmentAssignments);
    
    // Ensure compartmentAssignments is an object
    if (!optimizationResult.compartmentAssignments) {
      optimizationResult.compartmentAssignments = {};
    }

    // Return the optimized assignments
    res.status(200).json({
      success: true,
      data: {
        compartmentAssignments: optimizationResult.compartmentAssignments,
        unassignedItems: optimizationResult.unassignedItems || [],
        totalItems: items.length,
        assignedCount: Object.keys(optimizationResult.compartmentAssignments).length
      }
    });
  } catch (error) {
    console.error('Error optimizing storage:', error);
    res.status(500).json({
      success: false,
      message: 'Error optimizing storage',
      error: error.message
    });
  }
};

/**
 * Compartment allocation algorithm
 * This algorithm decides which compartment to store each item in to minimize costs
 * while respecting capacity constraints
 * 
 * @param {Array} items - Array of items with size properties
 * @param {Array} compartments - Array of compartments with capacity and maintenancePrice
 * @param {Boolean} considerMaintenanceCost - Whether to prioritize by maintenance cost (true) or just fit (false)
 * @returns {Object} Result with item-to-compartment assignments
 */
function optimizeStorage(items, compartments, considerMaintenanceCost = false) {
  // Make copies to avoid modifying original arrays
  const itemsCopy = [...items];
  const compartmentsCopy = [...compartments];
  
  if (considerMaintenanceCost) {
    // Sort compartments by maintenance price (ascending)
    compartmentsCopy.sort((a, b) => a.maintenancePrice - b.maintenancePrice);
  } else {
    // Sort compartments by capacity (descending) to maximize usage
    compartmentsCopy.sort((a, b) => b.capacity - a.capacity);
  }
  
  // Sort items by size (descending) to try to place larger items first
  itemsCopy.sort((a, b) => b.size - a.size);
  
  const result = {
    assignments: {},
    totalMaintenanceCost: 0,
    unassignedItems: []
  };
  
  // Keep track of remaining capacity in each compartment
  const remainingCapacity = {};
  compartmentsCopy.forEach(comp => {
    // Use availableCapacity if it exists, otherwise use capacity
    remainingCapacity[comp._id.toString()] = comp.availableCapacity !== undefined ? 
      comp.availableCapacity : comp.capacity;
  });

  // First validate that all items have a potential compartment they could fit in
  const largeUnassignableItems = itemsCopy.filter(item => {
    // Find any compartment with enough space for this item
    return !compartmentsCopy.some(compartment => {
      const compId = compartment._id.toString();
      const compWarehouseId = compartment.warehouse_id ? compartment.warehouse_id.toString() : null;
      const itemWarehouseId = item.warehouse_id ? item.warehouse_id.toString() : null;
      
      // If item has warehouse, it must match
      if (itemWarehouseId && compWarehouseId && itemWarehouseId !== compWarehouseId) {
        return false;
      }
      
      // Check if item fits in any compartment
      return item.size <= remainingCapacity[compId];
    });
  });
  
  // Add these to unassigned before trying assignment
  if (largeUnassignableItems.length > 0) {
    result.unassignedItems = [...largeUnassignableItems];
    
    // Process only assignable items
    const assignableItems = itemsCopy.filter(item => 
      !largeUnassignableItems.some(unassignable => unassignable._id === item._id));
    
    itemsCopy.length = 0; // Clear the array
    itemsCopy.push(...assignableItems); // Replace with only assignable items
  }
  
  // Try to assign each item
  itemsCopy.forEach(item => {
    let assigned = false;
    const itemId = item._id.toString();
    const itemWarehouseId = item.warehouse_id ? item.warehouse_id.toString() : null;
    
    // First try compartments in the same warehouse
    for (const comp of compartmentsCopy) {
      const compId = comp._id.toString();
      const compWarehouseId = comp.warehouse_id ? comp.warehouse_id.toString() : null;
      
      // Skip if item and compartment are in different warehouses
      if (itemWarehouseId && compWarehouseId && itemWarehouseId !== compWarehouseId) {
        continue;
      }
      
      // If item fits in this compartment
      if (item.size <= remainingCapacity[compId]) {
        // Assign item to this compartment
        result.assignments[itemId] = compId;
        remainingCapacity[compId] -= item.size;
        result.totalMaintenanceCost += comp.maintenancePrice || 0;
        assigned = true;
        break;
      }
    }
    
    // If not assigned to same warehouse, try any compartment (if warehouse_id is not set)
    if (!assigned && !itemWarehouseId) {
      for (const comp of compartmentsCopy) {
        const compId = comp._id.toString();
        
        // If item fits in this compartment
        if (item.size <= remainingCapacity[compId]) {
          // Assign item to this compartment
          result.assignments[itemId] = compId;
          remainingCapacity[compId] -= item.size;
          result.totalMaintenanceCost += comp.maintenancePrice || 0;
          assigned = true;
          break;
        }
      }
    }
    
    if (!assigned) {
      result.unassignedItems.push(item);
    }
  });
  
  return result;
} 