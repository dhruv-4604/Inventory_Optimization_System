import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Grid,
  Chip,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { 
  LocalShipping as ShippingIcon,
  CheckCircle as SuccessIcon,
  Refresh as RefreshIcon,
  AttachMoney as MoneyIcon,
  Inventory as InventoryIcon,
  ShoppingCart as ShoppingCartIcon
} from '@mui/icons-material';

import { optimizationAPI } from '../api';
import { useData } from '../contexts/DataContext';

const RestockPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Restock optimization
  const [budget, setBudget] = useState(1000);
  const [restockResult, setRestockResult] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');

  // Get data from context
  const { 
    items, 
    loadingItems,
    updateItem,
    fetchItems
  } = useData();

  // Get unique categories from items
  const getCategories = () => {
    const categories = new Set();
    items.forEach(item => {
      if (item.category) {
        categories.add(item.category);
      }
    });
    return Array.from(categories);
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
      
      const response = await optimizationAPI.getRestockRecommendations({
        budget,
        categoryFilter: categoryFilter || undefined
      });
      
      setRestockResult(response.data.data);
      setSuccess('Restock optimization completed successfully!');
    } catch (err) {
      console.error('Restock optimization error:', err);
      setError(err.response?.data?.message || 'Failed to optimize restock');
    } finally {
      setLoading(false);
    }
  };

  // Calculate total cost, profit, and ROI
  const calculateSummary = () => {
    if (!restockResult || !restockResult.itemsToRestock) return { cost: 0, profit: 0, roi: 0 };
    
    const totalCost = restockResult.totalCost || 
      restockResult.itemsToRestock.reduce((sum, item) => sum + (item.cost || 0), 0);
    
    const totalProfit = restockResult.itemsToRestock.reduce((sum, item) => {
      // If expected profit is available, use it
      if (item.expectedProfit) return sum + item.expectedProfit;
      
      // Otherwise calculate from the original item data
      const originalItem = items.find(i => i._id === item._id);
      if (!originalItem) return sum;
      
      const profitPerUnit = originalItem.sellingPrice - (originalItem.cost || originalItem.buyingPrice);
      return sum + (profitPerUnit * item.quantity);
    }, 0);
    
    const roi = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
    
    return { totalCost, totalProfit, roi };
  };

  const summary = calculateSummary();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Restock Optimization
      </Typography>
      <Typography variant="body1" paragraph>
        Use the knapsack algorithm to optimize your inventory restocking within your budget.
      </Typography>
      
      {/* Loading Indicator */}
      {loadingItems && !loading && (
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
      
      {/* Restock Optimization */}
      {!loadingItems && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Set Your Restock Budget
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Enter the maximum amount you want to spend on restocking inventory.
              </Typography>
              
              <TextField
                fullWidth
                label="Budget"
                type="number"
                value={budget}
                onChange={(e) => setBudget(parseFloat(e.target.value))}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                sx={{ mb: 2 }}
              />
              
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Category Filter (Optional)</InputLabel>
                <Select
                  value={categoryFilter}
                  label="Category Filter (Optional)"
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <MenuItem value="">
                    <em>All Categories</em>
                  </MenuItem>
                  {getCategories().map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Button
                fullWidth
                variant="contained"
                color="primary"
                onClick={optimizeRestock}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <ShippingIcon />}
              >
                {loading ? 'Optimizing...' : 'Optimize Restock'}
              </Button>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Restock Recommendations
              </Typography>
              {!restockResult ? (
                <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                  Set your budget and click "Optimize Restock" to see recommendations
                </Typography>
              ) : restockResult.itemsToRestock.length === 0 ? (
                <Alert severity="info" sx={{ my: 2 }}>
                  No items need restocking or the budget is too low.
                </Alert>
              ) : (
                <>
                  {/* Summary Cards */}
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={4}>
                      <Card>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary">
                            Budget
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                            <MoneyIcon color="primary" sx={{ mr: 1 }} />
                            ${budget.toFixed(2)}
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
                          <Typography variant="h5" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                            <InventoryIcon color="primary" sx={{ mr: 1 }} />
                            {restockResult.itemsToRestock.length}
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
                          <Typography 
                            variant="h5" 
                            sx={{ 
                              fontWeight: 'bold', 
                              color: restockResult.remainingBudget > 0 ? 'text.primary' : 'error.main',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <RefreshIcon color={restockResult.remainingBudget > 0 ? "primary" : "error"} sx={{ mr: 1 }} />
                            ${restockResult.remainingBudget.toFixed(2)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                  
                  {/* ROI Summary */}
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={4}>
                      <Card>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary">
                            Total Cost
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                            ${summary.totalCost.toFixed(2)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={4}>
                      <Card>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary">
                            Expected Profit
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                            ${summary.totalProfit.toFixed(2)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={4}>
                      <Card>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary">
                            ROI
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                            {summary.roi.toFixed(2)}%
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                  
                  {/* Restock Recommendations Table */}
                  <TableContainer component={Paper} variant="outlined" sx={{ mt: 3 }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Item</TableCell>
                          <TableCell align="right">Quantity</TableCell>
                          <TableCell align="right">Unit Cost</TableCell>
                          <TableCell align="right">Total Cost</TableCell>
                          <TableCell align="right">Expected Profit</TableCell>
                          <TableCell align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {restockResult.itemsToRestock.map((item) => {
                          const originalItem = items.find(i => i._id === item._id);
                          const unitCost = originalItem ? 
                            (originalItem.cost || originalItem.buyingPrice) : 0;
                          
                          return (
                            <TableRow key={item._id}>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  {originalItem?.name || item.name}
                                  {originalItem?.category && (
                                    <Chip 
                                      size="small" 
                                      label={originalItem.category} 
                                      sx={{ ml: 1 }} 
                                      variant="outlined"
                                    />
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell align="right">{item.quantity}</TableCell>
                              <TableCell align="right">${unitCost.toFixed(2)}</TableCell>
                              <TableCell align="right">${item.cost.toFixed(2)}</TableCell>
                              <TableCell align="right">${
                                item.expectedProfit ? 
                                item.expectedProfit.toFixed(2) : 
                                ((originalItem?.sellingPrice - unitCost) * item.quantity).toFixed(2)
                              }</TableCell>
                              <TableCell align="center">
                                <Button 
                                  variant="contained" 
                                  color="primary" 
                                  size="small"
                                  startIcon={<ShoppingCartIcon />}
                                  onClick={async () => {
                                    try {
                                      setLoading(true);
                                      setError(null);
                                      
                                      // Create a copy of the original item with updated quantity
                                      if (originalItem) {
                                        // Calculate new quantity
                                        const newQuantity = originalItem.quantity + item.quantity;
                                        console.log(`Restocking ${originalItem.name}: Current quantity: ${originalItem.quantity}, Adding: ${item.quantity}, New total: ${newQuantity}`);
                                        
                                        // Create updatedItem with the new quantity
                                        const updatedItem = {
                                          ...originalItem,
                                          quantity: newQuantity
                                        };
                                        
                                        // Use the optimizationAPI with the correct format
                                        const response = await optimizationAPI.applyAssignments({
                                          assignments: {
                                            [originalItem._id]: originalItem.compartment_id || null
                                          },
                                          items: [updatedItem]
                                        });
                                        
                                        console.log("Restock response:", response);
                                        
                                        // Refresh data after update
                                        await fetchItems();
                                        
                                        // Show success message
                                        setSuccess(`Successfully restocked ${originalItem.name} with ${item.quantity} units (new total: ${newQuantity})`);
                                      } else {
                                        setError(`Could not find original item for ${item.name}`);
                                      }
                                    } catch (err) {
                                      console.error('Error restocking item:', err);
                                      setError(err.response?.data?.message || 'Failed to restock item');
                                    } finally {
                                      setLoading(false);
                                    }
                                  }}
                                >
                                  Restock
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default RestockPage; 