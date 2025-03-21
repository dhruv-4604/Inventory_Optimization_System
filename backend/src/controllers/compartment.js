const Compartment = require('../models/Compartment');
const Item = require('../models/Item');
const Warehouse = require('../models/Warehouse');
const { searchItems } = require('../algorithms/searchSort');

/**
 * @desc    Get all compartments
 * @route   GET /api/compartments
 * @access  Private
 */
exports.getCompartments = async (req, res) => {
  try {
    let query = {};
    
    // Filter by warehouse if provided
    if (req.query.warehouse_id) {
      query.warehouse_id = req.query.warehouse_id;
    }
    
    let compartments = await Compartment.find(query);
    
    // Apply search if query parameter exists
    if (req.query.search) {
      compartments = searchItems(compartments, req.query.search, ['name', 'description']);
    }

    res.status(200).json({
      success: true,
      count: compartments.length,
      data: compartments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching compartments',
      error: error.message
    });
  }
};

/**
 * @desc    Get a single compartment with its items
 * @route   GET /api/compartments/:id
 * @access  Private
 */
exports.getCompartment = async (req, res) => {
  try {
    const compartment = await Compartment.findById(req.params.id).populate('items');

    if (!compartment) {
      return res.status(404).json({
        success: false,
        message: 'Compartment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: compartment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching compartment',
      error: error.message
    });
  }
};

/**
 * @desc    Create a new compartment
 * @route   POST /api/compartments
 * @access  Private
 */
exports.createCompartment = async (req, res) => {
  try {
    // Check if adding this compartment would exceed warehouse capacity
    const { warehouse_id, capacity } = req.body;
    
    if (warehouse_id && capacity) {
      const warehouse = await Warehouse.findById(warehouse_id);
      
      if (!warehouse) {
        return res.status(404).json({
          success: false,
          message: 'Warehouse not found'
        });
      }
      
      // Get all compartments in this warehouse
      const warehouseCompartments = await Compartment.find({ warehouse_id });
      const totalCompartmentCapacity = warehouseCompartments.reduce((sum, comp) => sum + comp.capacity, 0);
      
      // Check if adding this compartment would exceed warehouse capacity
      if (totalCompartmentCapacity + capacity > warehouse.capacity) {
        return res.status(400).json({
          success: false,
          message: `Cannot add compartment: Would exceed warehouse capacity (${warehouse.capacity - totalCompartmentCapacity} available)`
        });
      }
    }
    
    const compartment = await Compartment.create(req.body);

    res.status(201).json({
      success: true,
      data: compartment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating compartment',
      error: error.message
    });
  }
};

/**
 * @desc    Update a compartment
 * @route   PUT /api/compartments/:id
 * @access  Private
 */
exports.updateCompartment = async (req, res) => {
  try {
    const existingCompartment = await Compartment.findById(req.params.id).populate('items');
    
    if (!existingCompartment) {
      return res.status(404).json({
        success: false,
        message: 'Compartment not found'
      });
    }
    
    // Check warehouse capacity if increasing compartment capacity
    if (req.body.capacity !== undefined && req.body.capacity > existingCompartment.capacity) {
      const warehouse = await Warehouse.findById(existingCompartment.warehouse_id);
      
      if (!warehouse) {
        return res.status(404).json({
          success: false,
          message: 'Associated warehouse not found'
        });
      }
      
      // Get all compartments in this warehouse
      const warehouseCompartments = await Compartment.find({ warehouse_id: existingCompartment.warehouse_id });
      const totalCompartmentCapacity = warehouseCompartments.reduce((sum, comp) => {
        // Don't count the capacity of the compartment being updated
        if (comp._id.toString() === req.params.id) return sum;
        return sum + comp.capacity;
      }, 0);
      
      // Check if updating this compartment would exceed warehouse capacity
      if (totalCompartmentCapacity + req.body.capacity > warehouse.capacity) {
        return res.status(400).json({
          success: false,
          message: `Cannot update compartment: Would exceed warehouse capacity (${warehouse.capacity - totalCompartmentCapacity} available)`
        });
      }
    }

    // Don't allow changing the capacity if there are items that would no longer fit
    if (req.body.capacity !== undefined && req.body.capacity < existingCompartment.capacity) {
      const usedCapacity = existingCompartment.capacity - (existingCompartment.availableCapacity || 0);
      
      if (req.body.capacity < usedCapacity) {
        return res.status(400).json({
          success: false,
          message: 'Cannot reduce capacity: compartment contains items that would not fit'
        });
      }
    }

    const compartment = await Compartment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: compartment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating compartment',
      error: error.message
    });
  }
};

/**
 * @desc    Delete a compartment
 * @route   DELETE /api/compartments/:id
 * @access  Private
 */
exports.deleteCompartment = async (req, res) => {
  try {
    const compartment = await Compartment.findById(req.params.id);

    if (!compartment) {
      return res.status(404).json({
        success: false,
        message: 'Compartment not found'
      });
    }

    // Check if compartment has items
    const itemsInCompartment = await Item.find({ compartment_id: compartment._id });
    
    if (itemsInCompartment.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete compartment with items assigned to it'
      });
    }

    await compartment.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting compartment',
      error: error.message
    });
  }
}; 