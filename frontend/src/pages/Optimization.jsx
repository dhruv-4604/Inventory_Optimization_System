import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Chip,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { 
  AutoFixHigh as OptimizeIcon,
  LocalShipping as ShippingIcon,
  Save as SaveIcon,
  CheckCircle as SuccessIcon
} from '@mui/icons-material';

import api, { optimizationAPI } from '../api';
import { useData } from '../contexts/DataContext';

const Optimization = () => {
  const location = useLocation();
  const initialTab = location.state?.tab === 'restock' ? 1 : 0;
  
  const [tabValue, setTabValue] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Storage optimization
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [optimizationResult, setOptimizationResult] = useState(null);
  
  // Restock optimization
  const [budget, setBudget] = useState(1000);
  const [restockResult, setRestockResult] = useState(null);

  // Get data from context
  const { 
    items, 
    warehouses, 
    compartments, 
    loadingItems, 
    loadingWarehouses, 
    loadingCompartments,
    fetchItems,
    fetchCompartments 
  } = useData();

  // Filter for pending items (items without compartment assignment)
  const pendingItems = items.filter(item => !item.compartment_id);

  const handleTabChange = (_, newValue) => {
    setTabValue(newValue);
    // Reset states when changing tabs
    setError(null);
    setSuccess(null);
    setOptimizationResult(null);
    setRestockResult(null);
  };

  const handleWarehouseChange = (e) => {
    setSelectedWarehouse(e.target.value);
    setOptimizationResult(null);
  };

  const handleItemSelect = (itemId) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
    setOptimizationResult(null);
  };

  // Storage optimization function
  const optimizeStorage = async () => {
    if (selectedItems.length === 0) {
      setError('Please select at least one item to optimize');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      console.log("Sending optimization request with:", {
        items: selectedItems,
        warehouseId: selectedWarehouse || undefined
      });
      
      const response = await optimizationAPI.assignCompartments({
        items: selectedItems,
        warehouseId: selectedWarehouse || undefined
      });
      
      console.log("Optimization API response:", response);
      
      // Check if the response has the expected structure
      if (response.data && response.data.data) {
        // Create a properly structured result object
        const result = {
          ...response.data.data,
          compartmentAssignments: {}
        };
        
        // Ensure compartmentAssignments is a proper object
        if (response.data.data.compartmentAssignments) {
          // Copy each assignment to ensure it's a regular object
          Object.entries(response.data.data.compartmentAssignments).forEach(([itemId, compartmentId]) => {
            result.compartmentAssignments[itemId] = compartmentId;
          });
        }
        
        setOptimizationResult(result);
        console.log("Set optimization result to:", result);
        
        // Verify compartmentAssignments exists and has the right format
        if (Object.keys(result.compartmentAssignments).length > 0) {
          console.log("Assignments found:", result.compartmentAssignments);
          console.log("Assignments JSON:", JSON.stringify(result.compartmentAssignments));
        } else {
          console.warn("No assignments found or empty:", result.compartmentAssignments);
        }
      } else {
        console.warn("Unexpected response format:", response.data);
      }
      
      setSuccess('Optimization completed successfully!');
    } catch (err) {
      console.error("Optimization API error:", err);
      setError(err.response?.data?.message || 'Failed to optimize storage');
    } finally {
      setLoading(false);
    }
  };

  // Apply storage optimization
  const applyOptimization = async () => {
    setLoading(true);
    
    try {
      // Check if optimization result exists and has compartmentAssignments
      if (!optimizationResult || 
          !optimizationResult.compartmentAssignments || 
          Object.keys(optimizationResult.compartmentAssignments).length === 0) {
        setError('No optimization results to apply');
        setLoading(false);
        return;
      }
      
      // Debug logging
      console.log("Original optimizationResult:", optimizationResult);
      
      // Create a properly structured payload - make sure assignments is actually populated
      const payload = {
        assignments: {}
      };
      
      // Manually copy the assignments to ensure it's a proper object
      Object.entries(optimizationResult.compartmentAssignments).forEach(([itemId, compartmentId]) => {
        payload.assignments[itemId] = compartmentId;
      });
      
      console.log("Sending payload:", payload);
      console.log("Payload JSON:", JSON.stringify(payload));
      
      // Use fetch directly - more reliable for debugging
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/optimization/apply-assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth token if available
          ...(localStorage.getItem('token') && { 
            'Authorization': `Bearer ${localStorage.getItem('token')}` 
          })
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      console.log("API response:", data);
      
      if (data.success) {
        setSuccess('Assignments applied successfully!');
        
        // Refresh items and compartments data
        await fetchItems();
        await fetchCompartments();
        
        // Reset selected items
        setSelectedItems([]);
        setOptimizationResult(null);
      } else {
        setError(data.message || 'Failed to apply assignments');
      }
    } catch (error) {
      console.error("API error:", error);
      setError('Failed to apply assignments: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Restock optimization function
  const optimizeRestock = async () => {
    if (!budget || budget <= 0) {
      setError('Please enter a valid budget');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await optimizationAPI.optimizeRestock(budget);
      setRestockResult(response.data.data);
      setSuccess('Restock optimization completed successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to optimize restock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Inventory Optimization
      </Typography>
      <Typography variant="body1" paragraph>
        Use the knapsack algorithm to optimize your inventory storage and restocking.
      </Typography>
      
      <Paper sx={{ mb: 4 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="fullWidth"
        >
          <Tab 
            label="Storage Optimization" 
            icon={<OptimizeIcon />} 
            iconPosition="start"
          />
          <Tab 
            label="Restock Optimization" 
            icon={<ShippingIcon />} 
            iconPosition="start"
          />
        </Tabs>
      </Paper>
      
      {/* Loading Indicator */}
      {(loadingItems || loadingWarehouses || loadingCompartments) && !loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {/* Success and Error Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert 
          severity="success" 
          sx={{ mb: 2 }}
          icon={<SuccessIcon fontSize="inherit" />}
        >
          {success}
        </Alert>
      )}
      
      {/* Storage Optimization Tab */}
      {tabValue === 0 && !(loadingItems || loadingWarehouses || loadingCompartments) && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                1. Select Warehouse (Optional)
              </Typography>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="warehouse-select-label">Warehouse</InputLabel>
                <Select
                  labelId="warehouse-select-label"
                  value={selectedWarehouse}
                  label="Warehouse"
                  onChange={handleWarehouseChange}
                >
                  <MenuItem value="">
                    <em>All Warehouses</em>
                  </MenuItem>
                  {warehouses.map((warehouse) => (
                    <MenuItem key={warehouse._id} value={warehouse._id}>
                      {warehouse.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" gutterBottom>
                2. Select Items to Store
              </Typography>
              <Box sx={{ maxHeight: 300, overflow: 'auto', mb: 2 }}>
                {pendingItems.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No pending items to store
                  </Typography>
                ) : (
                  <List dense>
                    {pendingItems.map((item) => (
                      <ListItem 
                        key={item._id} 
                        button 
                        onClick={() => handleItemSelect(item._id)}
                        selected={selectedItems.includes(item._id)}
                      >
                        <ListItemText 
                          primary={item.name} 
                          secondary={`Size: ${item.size} | Value: $${item.sellingPrice}`} 
                        />
                        {selectedItems.includes(item._id) && (
                          <Chip 
                            label="Selected" 
                            color="primary" 
                            size="small" 
                            sx={{ ml: 1 }}
                          />
                        )}
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
              
              <Button
                variant="contained"
                fullWidth
                onClick={optimizeStorage}
                disabled={loading || selectedItems.length === 0}
                startIcon={loading ? <CircularProgress size={20} /> : <OptimizeIcon />}
              >
                Optimize Storage
              </Button>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Optimization Results
              </Typography>
              
              {!optimizationResult ? (
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexDirection: 'column', 
                    py: 8 
                  }}
                >
                  <OptimizeIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    Select items and click "Optimize Storage" to see results
                  </Typography>
                </Box>
              ) : (
                <>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6}>
                      <Card>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary">
                            Total Cost
                          </Typography>
                          <Typography variant="h4">
                            ${(optimizationResult.totalCost || 0).toFixed(2)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6}>
                      <Card>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary">
                            Items Assigned
                          </Typography>
                          <Typography variant="h4">
                            {Object.keys(optimizationResult.compartmentAssignments || {}).length}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                  
                  {optimizationResult.unassignedItems.length > 0 && (
                    <Alert severity="warning" sx={{ mb: 3 }}>
                      {optimizationResult.unassignedItems.length} items could not be assigned to any compartment
                    </Alert>
                  )}
                  
                  <TableContainer component={Paper} sx={{ mb: 3 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Item</TableCell>
                          <TableCell>Size</TableCell>
                          <TableCell>Assigned To</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(optimizationResult.compartmentAssignments || {}).map(([itemId, compartmentId]) => {
                          const item = items.find(i => i._id === itemId);
                          const compartment = compartments.find(c => c._id === compartmentId);
                          
                          if (!item || !compartment) return null;
                          
                          return (
                            <TableRow key={itemId}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell>{item.size} x {item.quantity} = {item.size * item.quantity}</TableCell>
                              <TableCell>{compartment.name}</TableCell>
                              <TableCell>{compartment.remainingCapacity}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                    onClick={applyOptimization}
                    disabled={loading}
                    fullWidth
                  >
                    {loading ? 'Applying...' : 'Apply Optimization'}
                  </Button>
                </>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
      
      {/* Restock Optimization Tab */}
      {tabValue === 1 && !(loadingItems || loadingWarehouses || loadingCompartments) && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Restock Parameters
              </Typography>
              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  label="Budget"
                  type="number"
                  InputProps={{
                    startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                  }}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  sx={{ mb: 2 }}
                />
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  The restock optimization algorithm will maximize profit based on:
                </Typography>
                
                <List dense>
                  <ListItem>
                    <ListItemText primary="Item profitability" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Current stock levels" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Restock thresholds" />
                  </ListItem>
                </List>
              </Box>
              
              <Button
                variant="contained"
                fullWidth
                onClick={optimizeRestock}
                disabled={loading || budget <= 0}
                startIcon={loading ? <CircularProgress size={20} /> : <OptimizeIcon />}
              >
                Calculate Optimal Restock
              </Button>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Restock Recommendations
              </Typography>
              
              {!restockResult ? (
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexDirection: 'column', 
                    py: 8 
                  }}
                >
                  <ShippingIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    Set your budget and click "Calculate" for restock recommendations
                  </Typography>
                </Box>
              ) : (
                <>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={4}>
                      <Card>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary">
                            Total Cost
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                            ${restockResult.totalCost.toFixed(2)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={4}>
                      <Card>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary">
                            Remaining Budget
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                            ${restockResult.remainingBudget.toFixed(2)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={4}>
                      <Card>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary">
                            Items to Restock
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                            {restockResult.itemsToRestock.length}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                  
                  {restockResult.itemsToRestock.length === 0 ? (
                    <Alert severity="info">
                      No items need restocking at this time
                    </Alert>
                  ) : (
                    <TableContainer component={Paper}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Item</TableCell>
                            <TableCell align="right">Quantity</TableCell>
                            <TableCell align="right">Cost</TableCell>
                            <TableCell align="right">Expected Profit</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {restockResult.itemsToRestock.map((item) => (
                            <TableRow key={item.item}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell align="right">{item.quantity}</TableCell>
                              <TableCell align="right">${item.cost.toFixed(2)}</TableCell>
                              <TableCell align="right" sx={{ color: 'success.main' }}>
                                ${item.expectedProfit.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default Optimization; 