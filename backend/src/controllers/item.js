const Item = require('../models/Item');
const Compartment = require('../models/Compartment');
const { searchItems, sortItems, filterItems } = require('../algorithms/searchSort');

/**
 * @desc    Get all items
 * @route   GET /api/items
 * @access  Private
 */
exports.getItems = async (req, res) => {
  try {
    let items = await Item.find();

    // Apply search if query parameter exists
    if (req.query.search) {
      items = searchItems(items, req.query.search);
    }

    // Apply filters
    if (req.query.filters) {
      try {
        const filters = JSON.parse(req.query.filters);
        items = filterItems(items, filters);
      } catch (error) {
        console.error('Error parsing filters:', error);
      }
    }

    // Apply sorting
    if (req.query.sort && req.query.direction) {
      items = sortItems(items, req.query.sort, req.query.direction);
    }

    res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching items',
      error: error.message
    });
  }
};

/**
 * @desc    Get a single item
 * @route   GET /api/items/:id
 * @access  Private
 */
exports.getItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    res.status(200).json({
      success: true,
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching item',
      error: error.message
    });
  }
};

/**
 * @desc    Create a new item
 * @route   POST /api/items
 * @access  Private
 */
exports.createItem = async (req, res) => {
  try {
    // If a compartment is being assigned, validate that the item fits
    if (req.body.compartment_id) {
      const compartment = await Compartment.findById(req.body.compartment_id);
      if (!compartment) {
        return res.status(404).json({
          success: false,
          message: 'Compartment not found'
        });
      }
      
      // Calculate total size needed by all items
      const totalSize = req.body.size * req.body.quantity;
      
      // Check if total item size is greater than remaining capacity
      if (totalSize > compartment.remainingCapacity) {
        return res.status(400).json({
          success: false,
          message: `Total item size (${totalSize}) exceeds compartment's remaining capacity (${compartment.remainingCapacity})`
        });
      }
      
      // We'll add the item to the compartment after creating it
    }

    const item = await Item.create(req.body);

    // If item has a compartment, update the compartment's remaining capacity
    if (req.body.compartment_id) {
      const compartment = await Compartment.findById(req.body.compartment_id);
      if (compartment) {
        try {
          // Add the item, considering quantity
          compartment.addItem(item.size, item.quantity);
          await compartment.save();
        } catch (error) {
          // If compartment update fails, delete the item and return error
          await Item.findByIdAndDelete(item._id);
          return res.status(400).json({
            success: false,
            message: error.message
          });
        }
      }
    }

    res.status(201).json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating item',
      error: error.message
    });
  }
};

/**
 * @desc    Update an existing item
 * @route   PUT /api/items/:id
 * @access  Private
 */
exports.updateItem = async (req, res) => {
  try {
    // Get the item that we're updating
    const existingItem = await Item.findById(req.params.id);
    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // If compartment is being changed or size/quantity is changing, validate capacity
    if (req.body.compartment_id || 
        (req.body.size && req.body.size !== existingItem.size) || 
        (req.body.quantity && req.body.quantity !== existingItem.quantity)) {
      
      const newCompartmentId = req.body.compartment_id || existingItem.compartment_id;
      const newSize = req.body.size || existingItem.size;
      const newQuantity = req.body.quantity || existingItem.quantity;
      
      // Only validate if a compartment is assigned
      if (newCompartmentId) {
        const compartment = await Compartment.findById(newCompartmentId);
        if (!compartment) {
          return res.status(404).json({
            success: false,
            message: 'Compartment not found'
          });
        }
        
        // Calculate current capacity usage by this item
        let currentUsage = 0;
        if (existingItem.compartment_id && 
            existingItem.compartment_id.toString() === newCompartmentId.toString()) {
          currentUsage = existingItem.size * existingItem.quantity;
        }
        
        // Calculate new capacity usage
        const newUsage = newSize * newQuantity;
        
        // Calculate effective change in capacity usage
        const capacityChange = newUsage - currentUsage;
        
        // If we're adding more space usage, check if it fits
        if (capacityChange > 0 && capacityChange > compartment.remainingCapacity) {
          return res.status(400).json({
            success: false,
            message: `Cannot update item: additional space needed (${capacityChange}) exceeds compartment's remaining capacity (${compartment.remainingCapacity})`
          });
        }
      }
    }

    // If the item already has a compartment and we're changing it
    if (existingItem.compartment_id) {
      // If we're removing the compartment or changing to a different one
      if (!req.body.compartment_id || 
          (req.body.compartment_id && req.body.compartment_id.toString() !== existingItem.compartment_id.toString())) {
        // Remove from old compartment
        const oldCompartment = await Compartment.findById(existingItem.compartment_id);
        if (oldCompartment) {
          oldCompartment.removeItem(existingItem.size, existingItem.quantity);
          await oldCompartment.save();
        }
      }
      // If just changing size or quantity but keeping same compartment
      else if (req.body.compartment_id && 
               req.body.compartment_id.toString() === existingItem.compartment_id.toString() &&
               (req.body.size !== undefined || req.body.quantity !== undefined)) {
        // Remove old size from compartment
        const compartment = await Compartment.findById(existingItem.compartment_id);
        if (compartment) {
          compartment.removeItem(existingItem.size, existingItem.quantity);
          // Will add back the new size after updating item
        }
      }
    }

    // Update the item
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    // If item has a compartment after update, add to compartment
    if (item.compartment_id) {
      const compartment = await Compartment.findById(item.compartment_id);
      if (compartment) {
        try {
          compartment.addItem(item.size, item.quantity);
          await compartment.save();
        } catch (error) {
          // If compartment update fails, revert to original values
          const revertedItem = await Item.findByIdAndUpdate(
            req.params.id,
            existingItem,
            { new: true }
          );
          
          return res.status(400).json({
            success: false,
            message: error.message
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating item',
      error: error.message
    });
  }
};

/**
 * @desc    Delete an item
 * @route   DELETE /api/items/:id
 * @access  Private
 */
exports.deleteItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // If the item is in a compartment, update the compartment's available size
    if (item.compartment_id) {
      const compartment = await Compartment.findById(item.compartment_id);
      if (compartment) {
        compartment.removeItem(item.size);
        await compartment.save();
      }
    }

    await item.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting item',
      error: error.message
    });
  }
};

/**
 * @desc    Assign item to a compartment
 * @route   PUT /api/items/:id/assign
 * @access  Private
 */
exports.assignItemToCompartment = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    const { compartmentId } = req.body;

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    if (!compartmentId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a compartment ID'
      });
    }

    // First, remove from old compartment if assigned
    if (item.compartment_id) {
      const oldCompartment = await Compartment.findById(item.compartment_id);
      if (oldCompartment) {
        oldCompartment.removeItem(item.size);
        await oldCompartment.save();
      }
    }

    // Assign to new compartment
    const newCompartment = await Compartment.findById(compartmentId);
    if (!newCompartment) {
      return res.status(404).json({
        success: false,
        message: 'Compartment not found'
      });
    }

    // Check if item fits in compartment
    if (!newCompartment.addItem(item.size)) {
      return res.status(400).json({
        success: false,
        message: 'Item does not fit in the selected compartment'
      });
    }

    // Update the item
    item.compartment_id = compartmentId;
    item.status = 'stored';
    await item.save();

    // Save the compartment
    await newCompartment.save();

    res.status(200).json({
      success: true,
      data: item
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error assigning item to compartment',
      error: error.message
    });
  }
}; 