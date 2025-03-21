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
  ViewModule as CompartmentIcon,
  Search as SearchIcon,
  Clear as ClearIcon
} from '@mui/icons-material';

import { useData } from '../contexts/DataContext';
import { binarySearch } from '../utils/binarySearch';
import { insertionSort } from '../utils/insertionSort';

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

  // Add search and sort functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({
    field: 'name',
    ascending: true
  });

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

  // Calculate compartment usage with detailed information
  const calculateCompartmentUsage = (compartmentId, capacity) => {
    const compartmentItems = items.filter(item => item.compartment_id === compartmentId);
    const usedCapacity = compartmentItems.reduce((total, item) => {
      return total + (item.size * item.quantity);
    }, 0);
    
    const remainingCapacity = capacity - usedCapacity;
    const usagePercentage = (usedCapacity / capacity) * 100;
    
    return {
      used: usedCapacity,
      remaining: remainingCapacity,
      percentage: usagePercentage,
      items: compartmentItems.length
    };
  };

  // Filter and sort warehouses using our algorithms
  const getFilteredWarehouses = () => {
    let filteredWarehouses = [...warehouses];
    
    // Apply binary search for search query
    if (searchQuery) {
      filteredWarehouses = binarySearch(filteredWarehouses, searchQuery, 'name');
    }
    
    // Apply sorting using insertion sort
    return insertionSort(filteredWarehouses, sortConfig.field, sortConfig.ascending);
  };
  
  // Handle sort
  const handleSort = (field) => {
    setSortConfig(prevConfig => ({
      field,
      ascending: prevConfig.field === field ? !prevConfig.ascending : true
    }));
  };
  
  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };
  
  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Render warehouse compartments
  const renderWarehouseCompartments = (warehouseId) => {
    const warehouseCompartments = getWarehouseCompartments(warehouseId);
    
    return (
      <>
        {warehouseCompartments.length === 0 ? (
          <Typography color="text.secondary" sx={{ mt: 2 }}>
            No compartments found for this warehouse.
          </Typography>
        ) : (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {warehouseCompartments.map(compartment => {
              const usage = calculateCompartmentUsage(compartment._id, compartment.capacity);
              const usageColor = 
                usage.percentage > 90 ? 'error' :
                usage.percentage > 70 ? 'warning' :
                'primary';
              
              return (
                <Grid item xs={12} sm={6} md={4} key={compartment._id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h6" component="div">
                          {compartment.name}
                        </Typography>
                        <Box>
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleOpenCompartmentDialog('edit', compartment)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleOpenCompartmentDialog('delete', compartment)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Capacity: {compartment.capacity} units
                      </Typography>
                      
                      <Box sx={{ mt: 2, mb: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Storage Usage:</span>
                          <span>{Math.round(usage.percentage)}% ({usage.used}/{compartment.capacity})</span>
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={usage.percentage} 
                          color={usageColor}
                          sx={{ height: 8, borderRadius: 4, mt: 0.5 }}
                        />
                      </Box>
                      
                      <Box sx={{ mt: 2 }}>
                        <Chip 
                          size="small" 
                          label={`${usage.items} items stored`}
                          color="primary" 
                          variant="outlined"
                          sx={{ mr: 1 }}
                        />
                        <Chip 
                          size="small" 
                          label={`${usage.remaining} units free`}
                          color={usage.remaining > 0 ? "success" : "error"}
                          variant="outlined"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
        
        <Box sx={{ mt: 2 }}>
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            size="small"
            onClick={() => {
              setCompartmentForm(prev => ({
                ...prev,
                warehouse_id: warehouseId
              }));
              handleOpenCompartmentDialog('add');
            }}
          >
            Add Compartment
          </Button>
        </Box>
      </>
    );
  };

  // Render warehouses tab content
  const renderWarehousesTabContent = () => {
    return (
      <Box>
        {/* Search and Add Bar */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <TextField
            placeholder="Search warehouses..."
            size="small"
            value={searchQuery}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleClearSearch}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={{ width: 300 }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenWarehouseDialog('add')}
          >
            Add Warehouse
          </Button>
        </Box>
        
        {/* Warehouses List */}
        {loadingWarehouses ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : getFilteredWarehouses().length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <WarehouseIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No warehouses found
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              {searchQuery ? "No warehouses match your search. Try different terms." : "Start by adding your first warehouse."}
            </Typography>
            {!searchQuery && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenWarehouseDialog('add')}
              >
                Add Warehouse
              </Button>
            )}
          </Paper>
        ) : (
          <Box>
            {getFilteredWarehouses().map(warehouse => {
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
                      
                      {renderWarehouseCompartments(warehouse._id)}
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Warehouse Management
      </Typography>
      
      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
        <Tab label="Warehouses" />
        <Tab label="Compartments" />
      </Tabs>
      
      {tabValue === 0 ? (
        renderWarehousesTabContent()
      ) : (
        // Compartments tab content
        <Box>
          {loadingCompartments || loadingWarehouses ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : compartments.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <CompartmentIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No compartments found
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Create a warehouse first, then add compartments to it.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenWarehouseDialog('add')}
                disabled={warehouses.length === 0}
              >
                {warehouses.length === 0 ? 'Create Warehouse First' : 'Add Warehouse'}
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {warehouses.map(warehouse => (
                <Grid item xs={12} key={warehouse._id}>
                  <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="h6">{warehouse.name} Compartments</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {renderWarehouseCompartments(warehouse._id)}
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}
      
      {/* Dialogs for warehouse operations */}
      <Dialog open={openWarehouseDialog} onClose={handleCloseWarehouseDialog}>
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
      
      {/* Dialogs for compartment operations */}
      <Dialog open={openCompartmentDialog} onClose={handleCloseCompartmentDialog}>
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