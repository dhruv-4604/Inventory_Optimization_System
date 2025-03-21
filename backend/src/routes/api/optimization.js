const express = require('express');
const router = express.Router();
const optimizationController = require('../../controllers/optimization');
const { protect } = require('../../middleware/auth');

// @route   POST /api/optimization/assign-compartments
// @desc    Optimize compartment assignment for items
// @access  Private
router.post('/assign-compartments', protect, optimizationController.optimizeCompartmentAssignment);

// @route   POST /api/optimization/apply-assignments
// @desc    Apply compartment assignments to items
// @access  Private
router.post('/apply-assignments', protect, optimizationController.applyCompartmentAssignments);

// @route   POST /api/optimization/assign-temp-items
// @desc    Optimize compartment assignment for temporary items
// @access  Private
router.post('/assign-temp-items', protect, optimizationController.optimizeTempItemsAssignment);

// @route   POST /api/optimization/restock
// @desc    Get restock recommendations based on budget
// @access  Private
router.post('/restock', protect, optimizationController.getRestockRecommendations);

module.exports = router; 