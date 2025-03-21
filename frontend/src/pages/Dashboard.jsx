import { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Card, 
  CardContent, 
  CardHeader, 
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import { 
  Inventory as InventoryIcon, 
  Warehouse as WarehouseIcon,
  ViewModule as CompartmentIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

const Dashboard = () => {
  const [lowStockItems, setLowStockItems] = useState([]);
  
  const { user } = useAuth();
  const { 
    items, 
    warehouses, 
    compartments, 
    loadingItems, 
    loadingWarehouses, 
    loadingCompartments, 
    itemsError, 
    warehousesError, 
    compartmentsError 
  } = useData();
  
  const navigate = useNavigate();

  // Calculate low stock items whenever items change
  useEffect(() => {
    if (items && items.length > 0) {
      const lowStock = items.filter(item => item.quantity <= item.restockPoint);
      setLowStockItems(lowStock);
    }
  }, [items]);

  const StatCard = ({ title, value, icon, loading, error, onClick }) => {
    return (
      <Card 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'transform 0.2s',
          '&:hover': onClick ? { transform: 'translateY(-5px)' } : {}
        }} 
        onClick={onClick}
        elevation={3}
      >
        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
          <Box sx={{ mb: 2, color: 'primary.main' }}>
            {icon}
          </Box>
          <Typography variant="h5" component="div" gutterBottom>
            {title}
          </Typography>
          {loading ? (
            <CircularProgress size={24} sx={{ my: 1 }} />
          ) : error ? (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          ) : (
            <Typography variant="h3" color="text.secondary" sx={{ fontWeight: 'bold' }}>
              {value}
            </Typography>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome back, {user?.name || 'User'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here's an overview of your inventory
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard 
            title="Total Items" 
            value={items.length} 
            icon={<InventoryIcon fontSize="large" />} 
            loading={loadingItems}
            error={itemsError}
            onClick={() => navigate('/items')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard 
            title="Warehouses" 
            value={warehouses.length} 
            icon={<WarehouseIcon fontSize="large" />} 
            loading={loadingWarehouses}
            error={warehousesError}
            onClick={() => navigate('/warehouses')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard 
            title="Compartments" 
            value={compartments.length} 
            icon={<CompartmentIcon fontSize="large" />} 
            loading={loadingCompartments}
            error={compartmentsError}
            onClick={() => navigate('/warehouses', { state: { tab: 1 } })}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <WarningIcon color="warning" sx={{ mr: 1 }} />
              <Typography variant="h6">Low Stock Items</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            {loadingItems ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : itemsError ? (
              <Alert severity="error">{itemsError}</Alert>
            ) : lowStockItems.length === 0 ? (
              <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                No items currently below restock point
              </Typography>
            ) : (
              <>
                <List>
                  {lowStockItems.slice(0, 5).map((item) => (
                    <ListItem key={item._id} divider>
                      <ListItemText
                        primary={item.name}
                        secondary={`Quantity: ${item.quantity} / Restock Point: ${item.restockPoint}`}
                      />
                    </ListItem>
                  ))}
                </List>
                {lowStockItems.length > 5 && (
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={() => navigate('/items', { state: { filter: 'low-stock' } })}
                    >
                      View All ({lowStockItems.length})
                    </Button>
                  </Box>
                )}
              </>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TrendingUpIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Optimization Tools</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Button 
                  variant="contained" 
                  fullWidth 
                  onClick={() => navigate('/optimization')}
                  startIcon={<TrendingUpIcon />}
                >
                  Storage Optimization
                </Button>
              </Grid>
              
              <Grid item xs={12}>
                <Button 
                  variant="outlined" 
                  fullWidth
                  onClick={() => navigate('/optimization', { state: { tab: 'restock' } })}
                  startIcon={<WarningIcon />}
                >
                  Restock Optimization
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 