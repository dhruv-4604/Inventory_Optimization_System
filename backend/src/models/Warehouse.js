const mongoose = require('mongoose');

const WarehouseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a warehouse name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters'],
    unique: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  capacity: {
    type: Number,
    required: [true, 'Please provide the warehouse capacity'],
    min: [0, 'Capacity cannot be negative']
  },
  location: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual to get all compartments in this warehouse
WarehouseSchema.virtual('compartments', {
  ref: 'Compartment',
  localField: '_id',
  foreignField: 'warehouse_id',
  justOne: false
});

// Virtual to get all items in this warehouse
WarehouseSchema.virtual('items', {
  ref: 'Item',
  localField: '_id',
  foreignField: 'warehouse_id',
  justOne: false
});

// Update timestamp on save
WarehouseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Warehouse', WarehouseSchema); 