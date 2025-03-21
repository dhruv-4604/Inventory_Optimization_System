const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

// Import routes
const authRoutes = require('./src/routes/auth');
const itemRoutes = require('./src/routes/item');
const warehouseRoutes = require('./src/routes/warehouse');
const compartmentRoutes = require('./src/routes/compartment');
const optimizationRoutes = require('./src/routes/optimization');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-optimization')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/compartments', compartmentRoutes);
app.use('/api/optimization', optimizationRoutes);

// Base route
app.get('/', (req, res) => {
  res.send('Inventory Optimization API is running');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 