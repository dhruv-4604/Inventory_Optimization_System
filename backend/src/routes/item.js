const express = require('express');
const { 
  getItems, 
  getItem, 
  createItem, 
  updateItem, 
  deleteItem, 
  assignItemToCompartment
} = require('../controllers/item');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply protection to all routes
router.use(protect);

router.route('/')
  .get(getItems)
  .post(createItem);

router.route('/:id')
  .get(getItem)
  .put(updateItem)
  .delete(deleteItem);

router.route('/:id/assign')
  .put(assignItemToCompartment);

module.exports = router; 