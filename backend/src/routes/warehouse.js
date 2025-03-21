const express = require('express');
const { 
  getWarehouses, 
  getWarehouse, 
  createWarehouse, 
  updateWarehouse, 
  deleteWarehouse 
} = require('../controllers/warehouse');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Apply protection to all routes
router.use(protect);

router.route('/')
  .get(getWarehouses)
  .post(createWarehouse);

router.route('/:id')
  .get(getWarehouse)
  .put(updateWarehouse)
  .delete(deleteWarehouse);

module.exports = router; 