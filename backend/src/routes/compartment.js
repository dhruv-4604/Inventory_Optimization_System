const express = require('express');
const { 
  getCompartments, 
  getCompartment, 
  createCompartment, 
  updateCompartment, 
  deleteCompartment 
} = require('../controllers/compartment');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply protection to all routes
router.use(protect);

router.route('/')
  .get(getCompartments)
  .post(createCompartment);

router.route('/:id')
  .get(getCompartment)
  .put(updateCompartment)
  .delete(deleteCompartment);

module.exports = router; 