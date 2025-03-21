const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide an item name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  category: {
    type: String,
    trim: true,
    default: 'Uncategorized'
  },
  sellingPrice: {
    type: Number,
    required: [true, 'Please provide a selling price'],
    min: [0, 'Price cannot be negative']
  },
  buyingPrice: {
    type: Number,
    required: [true, 'Please provide a buying price'],
    min: [0, 'Price cannot be negative']
  },
  restockPoint: {
    type: Number,
    required: [true, 'Please provide a restock point'],
    min: [0, 'Restock point cannot be negative']
  },
  quantity: {
    type: Number,
    required: [true, 'Please provide a quantity'],
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  warehouse_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: [true, 'Please provide a warehouse ID']
  },
  size: {
    type: Number,
    required: [true, 'Please provide the item size (volume)'],
    min: [0, 'Size cannot be negative']
  },
  compartment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Compartment',
    default: null,
    required: false
  },
  status: {
    type: String,
    enum: ['pending', 'stored'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual for profit calculation
ItemSchema.virtual('profit').get(function() {
  return this.sellingPrice - this.buyingPrice;
});

// Virtual for total value
ItemSchema.virtual('totalValue').get(function() {
  return this.sellingPrice * this.quantity;
});

// Update timestamp on save
ItemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Item', ItemSchema); 