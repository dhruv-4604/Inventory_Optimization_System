const express = require('express');
const { 
  optimizeItemStorage,
  optimizeCompartmentAssignment,
  applyCompartmentAssignments,
  getRestockRecommendations,
  optimizeTempItemsAssignment
} = require('../controllers/optimization');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply protection to all routes
router.use(protect);

router.post('/storage', optimizeItemStorage);
router.post('/assign-compartments', optimizeCompartmentAssignment);
router.post('/assign-temp-items', optimizeTempItemsAssignment);
router.post('/apply-assignments', applyCompartmentAssignments);
router.post('/restock', getRestockRecommendations);

module.exports = router; 