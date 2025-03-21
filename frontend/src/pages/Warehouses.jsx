import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  CircularProgress,
  IconButton,
  Chip,
  Alert,
  Grid,
  Tooltip,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  ExpandMore as ExpandMoreIcon,
  Warehouse as WarehouseIcon,
  ViewModule as CompartmentIcon
} from '@mui/icons-material';

import { useData } from '../contexts/DataContext';

const Warehouses = () => {
  const location = useLocation();
  const [tabValue, setTabValue] = useState(location.state?.tab || 0);
  
  // State for warehouse dialog forms
  const [openWarehouseDialog, setOpenWarehouseDialog] = useState(false);
  const [warehouseDialogType, setWarehouseDialogType] = useState('add'); // 'add', 'edit', 'delete'
  const [currentWarehouse, setCurrentWarehouse] = useState(null);
  const [warehouseFormErrors, setWarehouseFormErrors] = useState({});
  
  // State for compartment dialog forms
  const [openCompartmentDialog, setOpenCompartmentDialog] = useState(false);
  const [compartmentDialogType, setCompartmentDialogType] = useState('add'); // 'add', 'edit', 'delete'
  const [currentCompartment, setCurrentCompartment] = useState(null);
  const [compartmentFormErrors, setCompartmentFormErrors] = useState({});
  
  // Form state for warehouse
  const [warehouseForm, setWarehouseForm] = useState({
    name: '',
    location: '',
    description: '',
    capacity: 0
  });
  
  // Form state for compartment
  const [compartmentForm, setCompartmentForm] = useState({
    name: '',
    capacity: 0,
    warehouse_id: '',
    maintenancePrice: 0
  });

  // Get data from context
  const { 
    warehouses, 
    compartments, 
    items,
    loadingWarehouses, 
    loadingCompartments,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
    createCompartment,
    updateCompartment,
    deleteCompartment,
    warehousesError,
    compartmentsError
  } = useData();

  useEffect(() => {
    // Update tab if navigation state changes
    if (location.state?.tab !== undefined) {
      setTabValue(location.state.tab);
    }
  }, [location.state]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Warehouse dialog handlers
  const handleOpenWarehouseDialog = (type, warehouse = null) => {
    setWarehouseDialogType(type);
    setWarehouseFormErrors({});
    
    if (warehouse && (type === 'edit' || type === 'delete')) {
      setCurrentWarehouse(warehouse);
      
      if (type === 'edit') {
        setWarehouseForm({
          name: warehouse.name,
          location: warehouse.location || '',
          description: warehouse.description || '',
          capacity: warehouse.capacity || 0
        });
      }
    } else {
      // Reset form for add
      setWarehouseForm({
        name: '',
        location: '',
        description: '',
        capacity: 0
      });
    }
    
    setOpenWarehouseDialog(true);
  };

  const handleCloseWarehouseDialog = () => {
    setOpenWarehouseDialog(false);
  };

  const validateWarehouseForm = () => {
    const errors = {};
    
    if (!warehouseForm.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (warehouseForm.capacity <= 0) {
      errors.capacity = 'Capacity must be greater than 0';
    }
    
    setWarehouseFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleWarehouseFormChange = (e) => {
    const { name, value } = e.target;
    setWarehouseForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleWarehouseSubmit = async () => {
    if (!validateWarehouseForm()) return;
    
    try {
      if (warehouseDialogType === 'add') {
        await createWarehouse(warehouseForm);
      } else if (warehouseDialogType === 'edit' && currentWarehouse) {
        await updateWarehouse(currentWarehouse._id, warehouseForm);
      } else if (warehouseDialogType === 'delete' && currentWarehouse) {
        await deleteWarehouse(currentWarehouse._id);
      }
      
      handleCloseWarehouseDialog();
    } catch (error) {
      console.error('Operation failed:', error);
    }
  };

  // Compartment dialog handlers
  const handleOpenCompartmentDialog = (type, compartment = null) => {
    setCompartmentDialogType(type);
    setCompartmentFormErrors({});
    
    if (compartment && (type === 'edit' || type === 'delete')) {
      setCurrentCompartment(compartment);
      
      if (type === 'edit') {
        setCompartmentForm({
          name: compartment.name,
          capacity: compartment.capacity,
          warehouse_id: compartment.warehouse_id || '',
          maintenancePrice: compartment.maintenancePrice || 0
        });
      }
    } else {
      // Reset form for add
      setCompartmentForm({
        name: '',
        capacity: 0,
        warehouse_id: '',
        maintenancePrice: 0
      });
    }
    
    setOpenCompartmentDialog(true);
  };

  const handleCloseCompartmentDialog = () => {
    setOpenCompartmentDialog(false);
  };

  // Helper function to check warehouse capacity
  const checkWarehouseCapacity = (warehouseId) => {
    const warehouseCompartments = getWarehouseCompartments(warehouseId);
    const totalCompartmentCapacity = warehouseCompartments.reduce((sum, comp) => sum + comp.capacity, 0);
    const warehouse = warehouses.find(w => w._id === warehouseId);
    
    if (!warehouse) return { available: 0, total: 0, used: 0 };
    
    return { 
      available: Math.max(0, warehouse.capacity - totalCompartmentCapacity),
      total: warehouse.capacity,
      used: totalCompartmentCapacity
    };
  };

  const validateCompartmentForm = () => {
    const errors = {};
    
    if (!compartmentForm.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (compartmentForm.capacity <= 0) {
      errors.capacity = 'Capacity must be greater than 0';
    }
    
    if (compartmentForm.maintenancePrice < 0) {
      errors.maintenancePrice = 'Maintenance price cannot be negative';
    }
    
    if (!compartmentForm.warehouse_id) {
      errors.warehouse_id = 'Warehouse is required';
    } else {
      // Check if adding this compartment would exceed warehouse capacity
      const capacityInfo = checkWarehouseCapacity(compartmentForm.warehouse_id);
      const currentCompartmentCapacity = currentCompartment ? currentCompartment.capacity : 0;
      const newCapacityUsed = capacityInfo.used - currentCompartmentCapacity + compartmentForm.capacity;
      
      if (newCapacityUsed > capacityInfo.total) {
        errors.capacity = `Capacity exceeds warehouse available space (${capacityInfo.available + currentCompartmentCapacity} available)`;
      }
    }
    
    setCompartmentFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCompartmentFormChange = (e) => {
    const { name, value } = e.target;
    setCompartmentForm(prev => ({
      ...prev,
      [name]: name === 'warehouse_id' ? value : 
              name === 'capacity' ? Number(value) :
              name === 'maintenancePrice' ? Number(value) : value
    }));
  };

  const handleCompartmentSubmit = async () => {
    if (!validateCompartmentForm()) return;
    
    try {
      if (compartmentDialogType === 'add') {
        await createCompartment(compartmentForm);
      } else if (compartmentDialogType === 'edit' && currentCompartment) {
        await updateCompartment(currentCompartment._id, compartmentForm);
      } else if (compartmentDialogType === 'delete' && currentCompartment) {
        await deleteCompartment(currentCompartment._id);
      }
      
      handleCloseCompartmentDialog();
    } catch (error) {
      console.error('Operation failed:', error);
    }
  };

  // Helper function to get compartments for a specific warehouse
  const getWarehouseCompartments = (warehouseId) => {
    return compartments.filter(comp => comp.warehouse_id === warehouseId);
  };

  // Helper function to get items for a specific compartment
  const getCompartmentItems = (compartmentId) => {
    return items.filter(item => item.compartment_id === compartmentId);
  };

  // Helper function to calculate storage usage
  const calculateCompartmentUsage = (compartmentId, capacity) => {
    const compartmentItems = getCompartmentItems(compartmentId);
    const totalSize = compartmentItems.reduce((sum, item) => sum + (item.size * item.quantity), 0);
    return { used: totalSize, percentage: Math.min(100, Math.round((totalSize / capacity) * 100)) };
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Warehouses & Storage
        </Typography>
        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange} centered>
            <Tab 
              label="Warehouses" 
              icon={<WarehouseIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="Compartments" 
              icon={<CompartmentIcon />} 
              iconPosition="start"
            />
          </Tabs>
        </Paper>
      </Box>
      
      {/* Warehouses Tab */}
      {tabValue === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              Manage Warehouses
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenWarehouseDialog('add')}
            >
              Add Warehouse
            </Button>
          </Box>
          
          {/* Error message from context */}
          {warehousesError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {warehousesError}
            </Alert>
          )}
          
          {/* Warehouses list */}
          {loadingWarehouses ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : warehouses.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <WarehouseIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No warehouses found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Add your first warehouse to get started
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {warehouses.map(warehouse => {
                const warehouseCompartments = getWarehouseCompartments(warehouse._id);
                const totalCapacity = warehouseCompartments.reduce((sum, comp) => sum + comp.capacity, 0);
                const totalUsed = warehouseCompartments.reduce((sum, comp) => {
                  const usage = calculateCompartmentUsage(comp._id, comp.capacity);
                  return sum + usage.used;
                }, 0);
                const usagePercentage = totalCapacity > 0 ? 
                  Math.min(100, Math.round((totalUsed / totalCapacity) * 100)) : 0;
                
                return (
                  <Grid item xs={12} md={6} key={warehouse._id}>
                    <Paper sx={{ p: 0, overflow: 'hidden' }}>
                      <Box sx={{ 
                        p: 2, 
                        borderBottom: 1, 
                        borderColor: 'divider',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <Box>
                          <Typography variant="h6">{warehouse.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {warehouse.location || 'No location specified'}
                          </Typography>
                        </Box>
                        <Box>
                          <Tooltip title="Edit">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleOpenWarehouseDialog('edit', warehouse)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleOpenWarehouseDialog('delete', warehouse)}
                              disabled={warehouseCompartments.length > 0}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                      
                      <Box sx={{ p: 2 }}>
                        <Grid container spacing={2} sx={{ mb: 2 }}>
                          <Grid item xs={4}>
                            <Typography variant="body2" color="text.secondary">
                              Compartments
                            </Typography>
                            <Typography variant="h6">
                              {warehouseCompartments.length}
                            </Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="body2" color="text.secondary">
                              Total Capacity
                            </Typography>
                            <Typography variant="h6">
                              {warehouse.capacity || 0}
                            </Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="body2" color="text.secondary">
                              Usage
                            </Typography>
                            <Typography variant="h6">
                              {usagePercentage}%
                            </Typography>
                          </Grid>
                        </Grid>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Compartment Capacity: {totalCapacity} of {warehouse.capacity || 0} used
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={usagePercentage}
                            color={usagePercentage > 90 ? "error" : usagePercentage > 70 ? "warning" : "success"}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>
                        
                        <Divider sx={{ my: 2 }} />
                        
                        <Typography variant="subtitle2" gutterBottom>
                          Compartments
                        </Typography>
                        
                        {warehouseCompartments.length === 0 ? (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            No compartments in this warehouse
                          </Typography>
                        ) : (
                          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Name</TableCell>
                                  <TableCell align="right">Capacity</TableCell>
                                  <TableCell align="right">Maintenance</TableCell>
                                  <TableCell align="right">Usage</TableCell>
                                  <TableCell align="right">Actions</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {warehouseCompartments.map(compartment => {
                                  const usage = calculateCompartmentUsage(compartment._id, compartment.capacity);
                                  const compartmentItems = getCompartmentItems(compartment._id);
                                  
                                  return (
                                    <TableRow key={compartment._id}>
                                      <TableCell>{compartment.name}</TableCell>
                                      <TableCell align="right">{compartment.capacity}</TableCell>
                                      <TableCell align="right">${compartment.maintenancePrice?.toFixed(2) || '0.00'}</TableCell>
                                      <TableCell align="right">
                                        <Tooltip title={`${usage.used} of ${compartment.capacity} used`}>
                                          <Chip 
                                            size="small" 
                                            label={`${usage.percentage}%`} 
                                            color={usage.percentage > 90 ? "error" : usage.percentage > 70 ? "warning" : "success"} 
                                            variant="outlined" 
                                          />
                                        </Tooltip>
                                      </TableCell>
                                      <TableCell align="right">
                                        <Tooltip title="Edit">
                                          <IconButton 
                                            size="small" 
                                            color="primary"
                                            onClick={() => handleOpenCompartmentDialog('edit', compartment)}
                                          >
                                            <EditIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                          <IconButton 
                                            size="small" 
                                            color="error"
                                            onClick={() => handleOpenCompartmentDialog('delete', compartment)}
                                            disabled={compartmentItems.length > 0}
                                          >
                                            <DeleteIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}
                        
                        <Button
                          startIcon={<AddIcon />}
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            setCompartmentForm(prev => ({
                              ...prev,
                              warehouse_id: warehouse._id
                            }));
                            handleOpenCompartmentDialog('add');
                          }}
                        >
                          Add Compartment
                        </Button>
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      )}
      
      {/* Compartments Tab */}
      {tabValue === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              All Compartments
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenCompartmentDialog('add')}
            >
              Add Compartment
            </Button>
          </Box>
          
          {/* Error message from context */}
          {compartmentsError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {compartmentsError}
            </Alert>
          )}
          
          {/* Compartments list */}
          {loadingCompartments ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : compartments.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <CompartmentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No compartments found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Add your first compartment to get started
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Warehouse</TableCell>
                    <TableCell align="right">Capacity</TableCell>
                    <TableCell align="right">Usage</TableCell>
                    <TableCell align="right">Maintenance Price</TableCell>
                    <TableCell align="right">Items Stored</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {compartments.map(compartment => {
                    const warehouse = warehouses.find(w => w._id === compartment.warehouse_id);
                    const usage = calculateCompartmentUsage(compartment._id, compartment.capacity);
                    const compartmentItems = getCompartmentItems(compartment._id);
                    
                    return (
                      <TableRow key={compartment._id}>
                        <TableCell>{compartment.name}</TableCell>
                        <TableCell>
                          {warehouse ? (
                            warehouse.name
                          ) : (
                            <Typography variant="body2" color="error">
                              No warehouse assigned
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">{compartment.capacity}</TableCell>
                        <TableCell align="right">
                          <Tooltip title={`${usage.used} of ${compartment.capacity} used`}>
                            <Chip 
                              size="small" 
                              label={`${usage.percentage}%`} 
                              color={usage.percentage > 90 ? "error" : usage.percentage > 70 ? "warning" : "success"} 
                              variant="outlined" 
                            />
                          </Tooltip>
                        </TableCell>
                        <TableCell align="right">${compartment.maintenancePrice?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell align="right">{compartmentItems.length}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleOpenCompartmentDialog('edit', compartment)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleOpenCompartmentDialog('delete', compartment)}
                              disabled={compartmentItems.length > 0}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}
      
      {/* Warehouse Dialog */}
      <Dialog open={openWarehouseDialog} onClose={handleCloseWarehouseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {warehouseDialogType === 'add' ? 'Add Warehouse' : 
           warehouseDialogType === 'edit' ? 'Edit Warehouse' : 'Delete Warehouse'}
        </DialogTitle>
        <DialogContent>
          {warehouseDialogType === 'delete' ? (
            <DialogContentText>
              Are you sure you want to delete the warehouse "{currentWarehouse?.name}"? 
              This action cannot be undone.
              {getWarehouseCompartments(currentWarehouse?._id).length > 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  This warehouse has compartments and cannot be deleted. Remove all compartments first.
                </Alert>
              )}
            </DialogContentText>
          ) : (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name"
                  name="name"
                  value={warehouseForm.name}
                  onChange={handleWarehouseFormChange}
                  error={!!warehouseFormErrors.name}
                  helperText={warehouseFormErrors.name}
                  autoFocus
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Capacity"
                  name="capacity"
                  type="number"
                  value={warehouseForm.capacity}
                  onChange={handleWarehouseFormChange}
                  error={!!warehouseFormErrors.capacity}
                  helperText={warehouseFormErrors.capacity}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Location"
                  name="location"
                  value={warehouseForm.location}
                  onChange={handleWarehouseFormChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={warehouseForm.description}
                  onChange={handleWarehouseFormChange}
                  multiline
                  rows={3}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseWarehouseDialog}>Cancel</Button>
          <Button 
            onClick={handleWarehouseSubmit} 
            variant="contained" 
            color={warehouseDialogType === 'delete' ? "error" : "primary"}
            startIcon={warehouseDialogType === 'delete' ? <DeleteIcon /> : 
                      warehouseDialogType === 'add' ? <AddIcon /> : <CheckIcon />}
            disabled={warehouseDialogType === 'delete' && getWarehouseCompartments(currentWarehouse?._id).length > 0}
          >
            {warehouseDialogType === 'add' ? 'Add' : 
             warehouseDialogType === 'edit' ? 'Save' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Compartment Dialog */}
      <Dialog open={openCompartmentDialog} onClose={handleCloseCompartmentDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {compartmentDialogType === 'add' ? 'Add Compartment' : 
           compartmentDialogType === 'edit' ? 'Edit Compartment' : 'Delete Compartment'}
        </DialogTitle>
        <DialogContent>
          {compartmentDialogType === 'delete' ? (
            <DialogContentText>
              Are you sure you want to delete the compartment "{currentCompartment?.name}"? 
              This action cannot be undone.
              {getCompartmentItems(currentCompartment?._id).length > 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  This compartment contains items and cannot be deleted. Move all items first.
                </Alert>
              )}
            </DialogContentText>
          ) : (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name"
                  name="name"
                  value={compartmentForm.name}
                  onChange={handleCompartmentFormChange}
                  error={!!compartmentFormErrors.name}
                  helperText={compartmentFormErrors.name}
                  autoFocus
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Capacity"
                  name="capacity"
                  type="number"
                  value={compartmentForm.capacity}
                  onChange={handleCompartmentFormChange}
                  error={!!compartmentFormErrors.capacity}
                  helperText={compartmentFormErrors.capacity}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Maintenance Price"
                  name="maintenancePrice"
                  type="number"
                  value={compartmentForm.maintenancePrice}
                  onChange={handleCompartmentFormChange}
                  error={!!compartmentFormErrors.maintenancePrice}
                  helperText={compartmentFormErrors.maintenancePrice}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth error={!!compartmentFormErrors.warehouse_id}>
                  <InputLabel>Warehouse</InputLabel>
                  <Select
                    name="warehouse_id"
                    value={compartmentForm.warehouse_id}
                    onChange={handleCompartmentFormChange}
                    label="Warehouse"
                  >
                    {warehouses.map(warehouse => (
                      <MenuItem key={warehouse._id} value={warehouse._id}>
                        {warehouse.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {compartmentFormErrors.warehouse_id && (
                    <Typography variant="caption" color="error">
                      {compartmentFormErrors.warehouse_id}
                    </Typography>
                  )}
                </FormControl>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCompartmentDialog}>Cancel</Button>
          <Button 
            onClick={handleCompartmentSubmit} 
            variant="contained" 
            color={compartmentDialogType === 'delete' ? "error" : "primary"}
            startIcon={compartmentDialogType === 'delete' ? <DeleteIcon /> : 
                      compartmentDialogType === 'add' ? <AddIcon /> : <CheckIcon />}
            disabled={compartmentDialogType === 'delete' && getCompartmentItems(currentCompartment?._id).length > 0}
          >
            {compartmentDialogType === 'add' ? 'Add' : 
             compartmentDialogType === 'edit' ? 'Save' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Warehouses; 