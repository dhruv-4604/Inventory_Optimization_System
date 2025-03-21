const Warehouse = require('../models/Warehouse');
const { searchItems } = require('../algorithms/searchSort');

/**
 * @desc    Get all warehouses
 * @route   GET /api/warehouses
 * @access  Private
 */
exports.getWarehouses = async (req, res) => {
  try {
    let warehouses = await Warehouse.find();
    
    // Apply search if query parameter exists
    if (req.query.search) {
      warehouses = searchItems(warehouses, req.query.search, ['name', 'description', 'location']);
    }

    res.status(200).json({
      success: true,
      count: warehouses.length,
      data: warehouses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching warehouses',
      error: error.message
    });
  }
};

/**
 * @desc    Get a single warehouse with its compartments and items
 * @route   GET /api/warehouses/:id
 * @access  Private
 */
exports.getWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id)
      .populate('compartments')
      .populate('items');

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    res.status(200).json({
      success: true,
      data: warehouse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching warehouse',
      error: error.message
    });
  }
};

/**
 * @desc    Create a new warehouse
 * @route   POST /api/warehouses
 * @access  Private
 */
exports.createWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.create(req.body);

    res.status(201).json({
      success: true,
      data: warehouse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating warehouse',
      error: error.message
    });
  }
};

/**
 * @desc    Update a warehouse
 * @route   PUT /api/warehouses/:id
 * @access  Private
 */
exports.updateWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    res.status(200).json({
      success: true,
      data: warehouse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating warehouse',
      error: error.message
    });
  }
};

/**
 * @desc    Delete a warehouse
 * @route   DELETE /api/warehouses/:id
 * @access  Private
 */
exports.deleteWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    // Check if warehouse has items or compartments
    const hasItems = await warehouse.populate('items');
    const hasCompartments = await warehouse.populate('compartments');

    if (hasItems.items.length > 0 || hasCompartments.compartments.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete warehouse with items or compartments assigned to it'
      });
    }

    await warehouse.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting warehouse',
      error: error.message
    });
  }
}; 