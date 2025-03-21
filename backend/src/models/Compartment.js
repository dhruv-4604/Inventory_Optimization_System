const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CompartmentSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Please provide the compartment name'],
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot be more than 200 characters']
  },
  capacity: {
    type: Number,
    required: [true, 'Please provide the compartment capacity'],
    min: [0, 'Capacity must be at least 0']
  },
  // Explicitly track remaining capacity
  remainingCapacity: {
    type: Number,
    default: function() {
      return this.capacity; // Initially set to full capacity
    }
  },
  maintenancePrice: {
    type: Number,
    required: [true, 'Please provide the maintenance price'],
    min: [0, 'Maintenance price must be at least 0']
  },
  warehouse_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: [true, 'Please provide a warehouse ID']
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for items in this compartment
CompartmentSchema.virtual('items', {
  ref: 'Item',
  localField: '_id',
  foreignField: 'compartment_id',
  justOne: false
});

// Method to add an item - updates the remaining capacity
CompartmentSchema.methods.addItem = function(size, quantity = 1) {
  const totalSize = size * quantity;
  
  if (totalSize > this.remainingCapacity) {
    throw new Error(`Cannot add item: total size (${totalSize}) exceeds available capacity (${this.remainingCapacity})`);
  }
  
  this.remainingCapacity -= totalSize;
  return this.remainingCapacity;
};

// Method to remove an item - updates the remaining capacity
CompartmentSchema.methods.removeItem = function(size, quantity = 1) {
  const totalSize = size * quantity;
  this.remainingCapacity += totalSize;
  
  // Ensure remaining capacity never exceeds total capacity
  if (this.remainingCapacity > this.capacity) {
    this.remainingCapacity = this.capacity;
  }
  
  return this.remainingCapacity;
};

// Pre-save hook to update updatedAt
CompartmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Compartment', CompartmentSchema); 