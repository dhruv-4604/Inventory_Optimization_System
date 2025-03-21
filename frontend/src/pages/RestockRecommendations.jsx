import { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  Grid, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Divider,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { 
  Inventory as InventoryIcon,
  Calculate as CalculateIcon,
  ShoppingCart as ShoppingCartIcon
} from '@mui/icons-material';

import { useData } from '../contexts/DataContext';
import { optimizationAPI } from '../api';

const RestockRecommendations = () => {
  const [budget, setBudget] = useState(1000);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  
  const { items, categories, loadingItems } = useData();
  
  // Calculate available categories from items
  const availableCategories = Array.from(
    new Set(items.map(item => item.category).filter(Boolean))
  );
  
  const handleCalculate = async () => {
    if (budget <= 0) {
      setError('Budget must be greater than 0');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await optimizationAPI.getRestockRecommendations({
        budget,
        categoryFilter: categoryFilter || undefined
      });
      
      setRecommendations(response.data.data);
    } catch (err) {
      console.error('Error getting restock recommendations:', err);
      setError(err.response?.data?.message || 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };
  
  // Format currency values
  const formatCurrency = (value) => {
    return `$${parseFloat(value).toFixed(2)}`;
  };
  
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Restock Recommendations
      </Typography>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Calculate Optimal Restock Plan
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Our algorithm uses the Knapsack optimization method to determine the most profitable items to restock within your budget.
        </Typography>
        
        <Grid container spacing={3} alignItems="flex-end">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Budget"
              type="number"
              value={budget}
              onChange={(e) => setBudget(parseFloat(e.target.value))}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Category Filter (Optional)</InputLabel>
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                label="Category Filter (Optional)"
              >
                <MenuItem value="">
                  <em>All Categories</em>
                </MenuItem>
                {availableCategories.map(category => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleCalculate}
              disabled={loading || budget <= 0}
              startIcon={loading ? <CircularProgress size={24} /> : <CalculateIcon />}
            >
              Calculate Recommendations
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {recommendations && !loading && (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Allocated Budget
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(recommendations.totalCost)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Remaining Budget
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(recommendations.remainingBudget)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Items to Restock
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {recommendations.itemsToRestock.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          <Typography variant="h6" gutterBottom>
            Recommended Restock Plan (Optimized by Knapsack Algorithm)
          </Typography>
          
          {recommendations.itemsToRestock.length === 0 ? (
            <Alert severity="info">
              No items need restocking within the provided budget and constraints.
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
                    <TableCell align="right">ROI</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recommendations.itemsToRestock.map((item) => (
                    <TableRow key={item.item}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">{formatCurrency(item.cost)}</TableCell>
                      <TableCell align="right">{formatCurrency(item.expectedProfit)}</TableCell>
                      <TableCell align="right">
                        {((item.expectedProfit / item.cost) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
    </Box>
  );
};

export default RestockRecommendations; 