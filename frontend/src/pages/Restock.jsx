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
  Inventory as InventoryIcon
} from '@mui/icons-material';

import { optimizationAPI } from '../api';
import { useData } from '../contexts/DataContext';

const Restock = () => {
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
    loadingItems
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
    if (!restockResult || !restockResult.itemsToRestock) return { totalCost: 0, totalProfit: 0, roi: 0 };
    
    const totalCost = restockResult.totalCost || 
      restockResult.itemsToRestock.reduce((sum, item) => sum + (item.cost || 0), 0);
    
    const totalProfit = restockResult.totalProfit || 
      restockResult.itemsToRestock.reduce((sum, item) => {
        // If expected profit is available, use it
        if (item.expectedProfit) return sum + item.expectedProfit;
        
        // Otherwise calculate from the original item data
        const originalItem = items.find(i => i._id === item._id);
        if (!originalItem) return sum;
        
        const profitPerUnit = originalItem.sellingPrice - (originalItem.cost || originalItem.buyingPrice);
        return sum + (profitPerUnit * item.quantity);
      }, 0);
    
    const roi = restockResult.roi || (totalCost > 0 ? (totalProfit / totalCost) * 100 : 0);
    
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
                            Expected ROI
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                            <MoneyIcon color="primary" sx={{ mr: 1 }} />
                            {summary.roi.toFixed(1)}%
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  {/* Results Table */}
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Item</TableCell>
                          <TableCell align="right">Quantity</TableCell>
                          <TableCell align="right">Unit Cost</TableCell>
                          <TableCell align="right">Total Cost</TableCell>
                          <TableCell align="right">Expected Profit</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {restockResult.itemsToRestock.map((item) => (
                          <TableRow key={item._id}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell align="right">{item.quantity}</TableCell>
                            <TableCell align="right">${item.unitCost?.toFixed(2) || "N/A"}</TableCell>
                            <TableCell align="right">${item.cost.toFixed(2)}</TableCell>
                            <TableCell align="right">${item.expectedProfit?.toFixed(2) || "N/A"}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={3} align="right" sx={{ fontWeight: 'bold' }}>
                            Total:
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                            ${summary.totalCost.toFixed(2)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                            ${summary.totalProfit.toFixed(2)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={3} align="right" sx={{ fontWeight: 'bold' }}>
                            Remaining Budget:
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }} colSpan={2}>
                            ${(restockResult.remainingBudget || (budget - summary.totalCost)).toFixed(2)}
                          </TableCell>
                        </TableRow>
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

export default Restock; 