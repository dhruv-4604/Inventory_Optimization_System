import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  IconButton,
  Chip,
  Alert,
  Grid,
  Tooltip,
  InputAdornment,
  Stepper,
  Step,
  StepLabel,
  List,
  ListItem,
  ListItemText,
  Divider,
  Card,
  CardContent,
  Snackbar,
  LinearProgress,
  FormHelperText
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Inventory as InventoryIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Save as SaveIcon,
  AutoFixHigh as OptimizeIcon,
  NavigateNext as NextIcon,
  ArrowBack as BackIcon,
  Sort as SortIcon
} from '@mui/icons-material';

import { useData } from '../contexts/DataContext';
import { optimizationAPI } from '../api';
import { binarySearch } from '../utils/binarySearch';
import { insertionSort } from '../utils/insertionSort';

const Items = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initialFilter = location.state?.filter || '';

  // State for dialog forms
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState('add'); // 'add', 'edit', 'delete', 'batch'
  const [currentItem, setCurrentItem] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  
  // State for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(initialFilter === 'low-stock');
  const [filterPendingStorage, setFilterPendingStorage] = useState(false);
  
  // Form state
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    quantity: 0,
    cost: 0,
    sellingPrice: 0,
    size: 1,
    restockPoint: 0,
    warehouse_id: '',
    category: ''
  });

  // Batch add state
  const [batchItems, setBatchItems] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const [optimizationLoading, setOptimizationLoading] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [optimizationError, setOptimizationError] = useState(null);

  // Add this with the other state declarations at the top of the component
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Add this with the other state declarations at the top of the component
  const [sortConfig, setSortConfig] = useState({
    field: 'name',
    ascending: true
  });

  // Get data from context
  const { 
    items, 
    compartments, 
    warehouses,
    loadingItems, 
    loadingCompartments,
    loadingWarehouses,
    createItem,
    updateItem,
    deleteItem,
    fetchItems,
    itemsError
  } = useData();

  // Filter for pending items (items without compartment assignment)
  const pendingItems = items.filter(item => !item.compartment_id);

  const handleOpenDialog = (type, item = null) => {
    setDialogType(type);
    setFormErrors({});
    
    if (type === 'batch') {
      setBatchItems([]);
      setActiveStep(0);
      setOptimizationResult(null);
      setOptimizationError(null);
      setItemForm({
        name: '',
        description: '',
        quantity: 1,
        cost: 1,
        sellingPrice: 1,
        size: 1,
        restockPoint: 5,
        warehouse_id: warehouses.length > 0 ? warehouses[0]._id : '',
        category: ''
      });
    } else if (item && (type === 'edit' || type === 'delete')) {
      setCurrentItem(item);
      
      if (type === 'edit') {
        setItemForm({
          name: item.name,
          description: item.description || '',
          quantity: item.quantity,
          cost: item.cost !== undefined ? item.cost : (item.buyingPrice || 0),
          sellingPrice: item.sellingPrice,
          size: item.size,
          restockPoint: item.restockPoint,
          warehouse_id: item.warehouse_id || '',
          compartment_id: item.compartment_id || '',
          category: item.category || ''
        });
      }
    } else {
      // Reset form for add
      setItemForm({
        name: '',
        description: '',
        quantity: 0,
        cost: 0,
        sellingPrice: 0,
        size: 1,
        restockPoint: 0,
        warehouse_id: '',
        category: ''
      });
    }
    
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setActiveStep(0);
    setBatchItems([]);
    setOptimizationResult(null);
  };

  const validateForm = (formData) => {
    const errors = {};

    // Basic validations
    if (!formData.name) errors.name = 'Name is required';
    if (!formData.description) errors.description = 'Description is required';
    if (!formData.category) errors.category = 'Category is required';
    if (!formData.warehouse_id) errors.warehouse_id = 'Warehouse is required';
    
    // Number validations
    if (formData.sellingPrice <= 0) errors.sellingPrice = 'Selling price must be greater than 0';
    if (formData.buyingPrice <= 0 && formData.cost <= 0) errors.cost = 'Buying price must be greater than 0';
    if (formData.restockPoint < 0) errors.restockPoint = 'Restock point must be non-negative';
    if (formData.quantity < 0) errors.quantity = 'Quantity must be non-negative';
    if (formData.size <= 0) errors.size = 'Size must be greater than 0';

    // Check if size is valid for compartments
    if (formData.warehouse_id && formData.size > 0 && formData.quantity > 0) {
      const warehouseCompartments = compartments.filter(
        comp => comp.warehouse_id === formData.warehouse_id
      );
      
      // Calculate the total size
      const totalSize = formData.size * formData.quantity;
      
      if (warehouseCompartments.length > 0) {
        // Find largest remaining capacity
        const largestRemainingCapacity = Math.max(
          ...warehouseCompartments.map(comp => 
            comp.remainingCapacity !== undefined ? comp.remainingCapacity : comp.capacity
          )
        );
        
        if (totalSize > largestRemainingCapacity) {
          errors.size = `Total size (${totalSize}) exceeds largest available compartment capacity (${largestRemainingCapacity})`;
        }
      } else {
        errors.warehouse_id = 'Selected warehouse has no compartments';
      }
    }

    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    let parsedValue = value;
    // Parse numbers
    if (['sellingPrice', 'cost', 'buyingPrice', 'quantity', 'size', 'restockPoint'].includes(name)) {
      parsedValue = parseFloat(value) || 0;
    }
    
    console.log(`Setting form field ${name} to:`, parsedValue);
    
    setItemForm(prevForm => ({
      ...prevForm,
      [name]: parsedValue
    }));
    
    // Clear specific error when field is modified
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleSubmit = async () => {
    // Use different validation for batch mode vs regular mode
    let errors = {};
    
    if (dialogType === 'batch') {
      // Simplified validation for batch items
      if (!itemForm.name) errors.name = 'Name is required';
      if (itemForm.sellingPrice <= 0) errors.sellingPrice = 'Selling price must be greater than 0';
      if (itemForm.cost <= 0) errors.cost = 'Cost must be greater than 0';
      if (itemForm.size <= 0) errors.size = 'Size must be greater than 0';
      if (itemForm.quantity <= 0) errors.quantity = 'Quantity must be greater than 0';
      // Warehouse is required but we'll check it separately to provide a clear error message
      if (!itemForm.warehouse_id) errors.warehouse_id = 'Warehouse is required';
    } else {
      // Full validation for regular add/edit
      errors = validateForm(itemForm);
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      // Prepare form data for API
      const formData = {
        ...itemForm,
        buyingPrice: itemForm.cost, // Ensure backward compatibility
        // Ensure numbers are passed as numbers, not strings
        quantity: Number(itemForm.quantity),
        cost: Number(itemForm.cost),
        sellingPrice: Number(itemForm.sellingPrice),
        size: Number(itemForm.size),
        restockPoint: Number(itemForm.restockPoint)
      };

      // Handle the batch add case specifically
      if (dialogType === 'batch') {
        // Generate a temporary id for the batch item
        const tempId = `temp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // Add the new item to the batch
        setBatchItems([
          ...batchItems,
          {
            id: tempId,
            ...formData
          }
        ]);
        
        // Reset only certain fields to make adding multiple items easier
        setItemForm({
          ...itemForm,
          name: '',
          description: '',
          quantity: 1
        });
        
        // Clear errors after successful add
        setFormErrors({});
        
        // Show success message
        setSnackbar({
          open: true,
          message: 'Item added to batch!',
          severity: 'success'
        });
        
        return; // Exit early since we're just adding to batch
      }

      if (dialogType === 'add') {
        await createItem(formData);
        setSnackbar({
          open: true,
          message: 'Item added successfully!',
          severity: 'success'
        });
      } else if (dialogType === 'edit') {
        await updateItem(currentItem._id, formData);
        setSnackbar({
          open: true,
          message: 'Item updated successfully!',
          severity: 'success'
        });
      } else if (dialogType === 'delete') {
        await deleteItem(currentItem._id);
        setSnackbar({
          open: true,
          message: 'Item deleted successfully!',
          severity: 'success'
        });
      }

      // Close dialog and reset form
      handleCloseDialog();
      
      // Refresh items data
      fetchItems();
    } catch (error) {
      console.error('Error handling item:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message || 'Something went wrong'}`,
        severity: 'error'
      });
    }
  };

  const handleRemoveBatchItem = (itemId) => {
    setBatchItems(batchItems.filter(item => item.id !== itemId));
  };

  const handleNextStep = async () => {
    if (activeStep === 0) {
      if (batchItems.length === 0) {
        return;
      }
      
      // Check if compartment_id is provided for any item and validate total capacity
      for (const item of batchItems) {
        if (item.compartment_id) {
          const compartment = compartments.find(c => c._id === item.compartment_id);
          if (compartment) {
            const availableCapacity = compartment.availableCapacity !== undefined ? 
              compartment.availableCapacity : compartment.capacity;
            
            // Calculate total size needed for this item
            const totalSize = item.size * item.quantity;
            
            if (totalSize > availableCapacity) {
              setSnackbar({
                open: true,
                message: `Item "${item.name}" (total size: ${totalSize}) exceeds compartment "${compartment.name}" available capacity (${availableCapacity})`,
                severity: 'error'
              });
              return;
            }
          }
        }
      }
      
      // Continue with optimization
      setOptimizationLoading(true);
      setOptimizationError(null);
      setOptimizationResult(null);
      
      try {
        // Get unique warehouse IDs from batch items
        const warehouseIds = [...new Set(batchItems.map(item => item.warehouse_id).filter(id => id))];
        
        // Run optimization to assign compartments - modify to not pass temporary _id
        const response = await optimizationAPI.assignTempItems({
          tempItems: batchItems.map(item => ({ 
            tempId: item.id,
            name: item.name,
            size: item.size,
            sellingPrice: item.sellingPrice,
            warehouse_id: item.warehouse_id
          })),
          warehouseId: warehouseIds.length === 1 ? warehouseIds[0] : undefined,
          considerMaintenanceCost: true
        });
        
        setOptimizationResult(response.data.data);
        // Move to the next step after optimization completes successfully
        setActiveStep(activeStep + 1);
      } catch (error) {
        console.error('Optimization error:', error.response?.data || error);
        setOptimizationError(error.response?.data?.message || 'Failed to optimize item placement');
      } finally {
        setOptimizationLoading(false);
      }
    } else if (activeStep === 1) {
      // Save all items with their assigned compartments
      try {
        setOptimizationLoading(true);
        
        // Create items one by one
        for (const item of batchItems) {
          const itemData = { ...item };
          delete itemData.id; // Remove temp id
          
          // Ensure buyingPrice is set
          itemData.buyingPrice = itemData.cost;
          
          // Set compartment_id from optimization result if available
          if (optimizationResult && optimizationResult.compartmentAssignments) {
            itemData.compartment_id = optimizationResult.compartmentAssignments[item.id] || undefined;
          }
          
          await createItem(itemData);
        }
        
        handleCloseDialog();
        fetchItems(); // Refresh items list
      } catch (error) {
        console.error('Failed to save items:', error);
        setOptimizationError(error.response?.data?.message || 'Failed to save items');
      } finally {
        setOptimizationLoading(false);
      }
    }
  };

  const handleBackStep = () => {
    setActiveStep(activeStep - 1);
  };

  const handleOptimizePendingItems = async () => {
    if (pendingItems.length === 0) return;
    
    try {
      setOptimizationLoading(true);
      
      // Show a message to indicate optimization is starting
      setSnackbar({
        open: true,
        message: `Optimizing ${pendingItems.length} pending items...`,
        severity: 'info'
      });
      
      // Create a debug summary of items
      const pendingItemsDebug = pendingItems.map(item => ({ 
        id: item._id, 
        name: item.name, 
        size: item.size, 
        quantity: item.quantity,
        totalSize: item.size * item.quantity,
        warehouse: item.warehouse_id
      }));
      
      console.log("===== OPTIMIZATION REQUEST DETAILS =====");
      console.log("Pending items to optimize:", pendingItemsDebug);
      
      // Show warehouse capacity information for debugging
      const warehouseSummary = {};
      pendingItems.forEach(item => {
        const warehouseId = item.warehouse_id;
        if (!warehouseSummary[warehouseId]) {
          const warehouse = warehouses.find(w => w._id === warehouseId);
          const warehouseCompartments = compartments.filter(c => c.warehouse_id === warehouseId);
          
          warehouseSummary[warehouseId] = {
            name: warehouse?.name || 'Unknown',
            compartments: warehouseCompartments.map(c => ({
              id: c._id,
              name: c.name,
              capacity: c.capacity,
              remainingCapacity: c.remainingCapacity,
              maintenancePrice: c.maintenancePrice
            }))
          };
        }
      });
      
      console.log("Warehouses and compartments available:");
      Object.entries(warehouseSummary).forEach(([id, info]) => {
        console.log(`Warehouse: ${info.name} (${id})`);
        console.log("Compartments:");
        info.compartments.forEach(c => {
          console.log(`- ${c.name}: capacity=${c.capacity}, remaining=${c.remainingCapacity}, maintenance=${c.maintenancePrice || 0}`);
        });
      });
      
      console.log("REQUEST PAYLOAD:", {
        items: pendingItems.map(item => item._id),
        considerMaintenanceCost: true
      });
      console.log("=======================================");
      
      // Run optimization for all pending items
      const response = await optimizationAPI.assignCompartments({
        items: pendingItems.map(item => item._id),
        considerMaintenanceCost: true
      });
      
      console.log("===== OPTIMIZATION RESPONSE =====");
      console.log("Full response:", response);
      
      // API returns data.data.compartmentAssignments (not assignments)
      const result = response.data.data;
      
      if (!result) {
        console.error("Missing result in response:", response.data);
        setSnackbar({
          open: true,
          message: 'Error: The optimization response is missing result data',
          severity: 'error'
        });
        return;
      }
      
      console.log("Compartment assignments:", result.compartmentAssignments);
      console.log("Unassigned items:", result.unassignedItems);
      console.log("Total items:", result.totalItems);
      console.log("Assigned count:", result.assignedCount);
      console.log("=================================");
      
      // Check for unassigned items
      if (result.unassignedItems && result.unassignedItems.length > 0) {
        console.log("Some items could not be assigned:", result.unassignedItems);
        
        // Get detailed info about unassigned items
        const unassignedItemsInfo = pendingItems
          .filter(item => result.unassignedItems.includes(item._id))
          .map(item => {
            const totalSize = item.size * item.quantity;
            return `${item.name} (Size: ${item.size} × Qty: ${item.quantity} = Total: ${totalSize})`;
          });
        
        // Show more detailed warning
        setSnackbar({
          open: true,
          message: `Warning: ${unassignedItemsInfo.length} items couldn't be assigned. Check that compartments have enough capacity. Items: ${unassignedItemsInfo.join(', ')}`,
          severity: 'warning'
        });
      }
      
      // Check if we have any compartment assignments
      if (!result.compartmentAssignments || Object.keys(result.compartmentAssignments).length === 0) {
        console.warn("No compartment assignments returned:", result);
        
        // Show a more informative message about why nothing was assigned
        const itemSummary = pendingItems.map(item => {
          const totalSize = item.size * item.quantity;
          return `${item.name} (${totalSize})`;
        }).join(', ');
        
        setSnackbar({
          open: true,
          message: `No items could be assigned to compartments. This typically happens when the total item sizes (${itemSummary}) exceed available compartment capacities. Try creating more compartments or reducing item quantities.`,
          severity: 'warning'
        });
        return;
      }
      
      // Create a properly structured payload
      const payload = {
        assignments: {}
      };
      
      // Manually copy each assignment to ensure it's a proper object
      Object.entries(result.compartmentAssignments).forEach(([itemId, compartmentId]) => {
        payload.assignments[itemId] = compartmentId;
      });
      
      console.log("Sending assignments payload:", payload);
      
      try {
        // Apply the assignments with the correct property name
        const applyResponse = await optimizationAPI.applyAssignments(payload);
        console.log("Apply assignments response:", applyResponse.data);
        
        // Check if any assignments were successfully applied
        const successCount = applyResponse.data.data?.success?.length || 0;
        const failedCount = applyResponse.data.data?.failed?.length || 0;
        
        if (successCount > 0) {
          setSnackbar({
            open: true,
            message: `Successfully assigned ${successCount} items to compartments${failedCount > 0 ? ` (${failedCount} failed)` : ''}`,
            severity: 'success'
          });
        } else if (failedCount > 0) {
          // Show detailed failure reasons
          const failureReasons = applyResponse.data.data.failed
            .map(f => `${pendingItems.find(i => i._id === f.itemId)?.name || 'Item'}: ${f.reason}`)
            .join('; ');
            
          setSnackbar({
            open: true,
            message: `Failed to assign ${failedCount} items to compartments: ${failureReasons}`,
            severity: 'error'
          });
        } else {
          setSnackbar({
            open: true,
            message: 'No changes were made during assignment',
            severity: 'info'
          });
        }
      } catch (applyError) {
        console.error("Error applying assignments:", applyError);
        setSnackbar({
          open: true,
          message: `Error applying assignments: ${applyError.response?.data?.message || applyError.message}`,
          severity: 'error'
        });
      }
      
      // Refresh the items list regardless of the result
      fetchItems();
    } catch (error) {
      console.error('Failed to optimize pending items:', error);
      setSnackbar({
        open: true,
        message: `Optimization failed: ${error.response?.data?.message || error.message}`,
        severity: 'error'
      });
    } finally {
      setOptimizationLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterLowStock(false);
    setFilterPendingStorage(false);
    navigate('/items', { replace: true });
  };

  // Get filtered items based on search and filters
  const getFilteredItems = () => {
    let filteredItems = [...items];
    
    // Apply binary search for search query
    if (searchQuery) {
      filteredItems = binarySearch(filteredItems, searchQuery, 'name');
    }
    
    // Apply filters
    if (filterLowStock) {
      filteredItems = filteredItems.filter(item => item.quantity <= item.restockPoint);
    }
    
    if (filterPendingStorage) {
      filteredItems = filteredItems.filter(item => !item.compartment_id);
    }
    
    // Apply sorting using insertion sort
    return insertionSort(filteredItems, sortConfig.field, sortConfig.ascending);
  };
  
  // Sort handler
  const handleSort = (field) => {
    setSortConfig(prevConfig => ({
      field,
      ascending: prevConfig.field === field ? !prevConfig.ascending : true
    }));
  };

  // Get compartment remaining capacity
  const getCompartmentRemainingSpace = (compartmentId) => {
    if (!compartmentId) return null;
    
    const compartment = compartments.find(comp => comp._id === compartmentId);
    if (!compartment) return null;
    
    // Calculate used space by summing up item sizes
    const usedSpace = items
      .filter(item => item.compartment_id === compartmentId)
      .reduce((total, item) => total + (item.size * item.quantity), 0);
    
    const remainingSpace = compartment.capacity - usedSpace;
    return {
      total: compartment.capacity,
      used: usedSpace,
      remaining: remainingSpace,
      percentUsed: Math.round((usedSpace / compartment.capacity) * 100)
    };
  };

  // Step labels for the batch add workflow
  const steps = ['Add Items', 'Storage Optimization'];

  const batchValidateForm = () => {
    const errors = {};
    
    // Validate required fields
    if (!itemForm.name) errors.name = 'Name is required';
    if (!itemForm.description) errors.description = 'Description is required';
    if (!itemForm.sellingPrice) errors.sellingPrice = 'Selling price is required';
    if (!itemForm.cost) errors.cost = 'Cost is required';
    if (!itemForm.restockPoint) errors.restockPoint = 'Restock point is required';
    if (!itemForm.quantity) errors.quantity = 'Quantity is required';
    if (!itemForm.warehouse_id) errors.warehouse_id = 'Warehouse is required';
    if (!itemForm.size || itemForm.size <= 0) errors.size = 'Size must be greater than 0';
    
    // Validate size against compartment capacity if a compartment is directly selected
    if (itemForm.compartment_id && itemForm.size && itemForm.quantity) {
      const selectedCompartment = compartments.find(c => c._id === itemForm.compartment_id);
      if (selectedCompartment) {
        const totalItemSize = itemForm.size * itemForm.quantity;
        const availableCapacity = selectedCompartment.availableCapacity !== undefined ? 
          selectedCompartment.availableCapacity : selectedCompartment.capacity;
        
        if (totalItemSize > availableCapacity) {
          errors.size = `Total size (${totalItemSize}) exceeds compartment's available capacity (${availableCapacity})`;
          errors.quantity = 'Reduce quantity or size to fit in compartment';
        }
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Inventory Items
        </Typography>
        <Box>
          {pendingItems.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<OptimizeIcon />}
              onClick={handleOptimizePendingItems}
              disabled={optimizationLoading}
              sx={{ mr: 2 }}
            >
              {optimizationLoading ? (
                <CircularProgress size={20} sx={{ mr: 1 }} />
              ) : null}
              Optimize {pendingItems.length} Pending Items
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog('batch')}
          >
            Add Items
          </Button>
        </Box>
      </Box>
      
      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            label="Search Items"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={6}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              variant={filterLowStock ? "contained" : "outlined"}
              color={filterLowStock ? "warning" : "primary"}
              startIcon={<WarningIcon />}
              onClick={() => setFilterLowStock(!filterLowStock)}
              sx={{ height: '100%' }}
            >
              Low Stock Items
            </Button>
            
            <Button 
              variant={filterPendingStorage ? "contained" : "outlined"}
              color={filterPendingStorage ? "secondary" : "primary"}
              startIcon={<InventoryIcon />}
              onClick={() => setFilterPendingStorage(!filterPendingStorage)}
              sx={{ height: '100%' }}
            >
              Pending Storage
            </Button>
            
            {(searchQuery || filterLowStock || filterPendingStorage) && (
              <Button
                variant="text"
                startIcon={<ClearIcon />}
                onClick={handleClearFilters}
                sx={{ height: '100%' }}
              >
                Clear Filters
              </Button>
            )}
          </Box>
        </Grid>
      </Grid>
      
      {/* Error message from context */}
      {itemsError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {itemsError}
        </Alert>
      )}
      
      {/* Items table */}
      {loadingItems ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : getFilteredItems().length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <InventoryIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No items found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchQuery || filterLowStock || filterPendingStorage ? 
              'Try adjusting your search or filters' : 
              'Add your first inventory item to get started'}
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} 
                       onClick={() => handleSort('name')}>
                    Name
                    {sortConfig.field === 'name' && (
                      <SortIcon sx={{ fontSize: 18, ml: 0.5, transform: sortConfig.ascending ? 'none' : 'rotate(180deg)' }} />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} 
                       onClick={() => handleSort('quantity')}>
                    Quantity
                    {sortConfig.field === 'quantity' && (
                      <SortIcon sx={{ fontSize: 18, ml: 0.5, transform: sortConfig.ascending ? 'none' : 'rotate(180deg)' }} />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} 
                       onClick={() => handleSort('sellingPrice')}>
                    Price
                    {sortConfig.field === 'sellingPrice' && (
                      <SortIcon sx={{ fontSize: 18, ml: 0.5, transform: sortConfig.ascending ? 'none' : 'rotate(180deg)' }} />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} 
                       onClick={() => handleSort('cost')}>
                    Cost
                    {sortConfig.field === 'cost' && (
                      <SortIcon sx={{ fontSize: 18, ml: 0.5, transform: sortConfig.ascending ? 'none' : 'rotate(180deg)' }} />
                    )}
                  </Box>
                </TableCell>
                <TableCell>Warehouse</TableCell>
                <TableCell>Compartment</TableCell>
                <TableCell>Storage</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {getFilteredItems().map((item) => {
                const warehouse = warehouses.find(w => w._id === item.warehouse_id);
                const compartment = compartments.find(c => c._id === item.compartment_id);
                const storage = getCompartmentRemainingSpace(item.compartment_id);
                
                return (
                  <TableRow key={item._id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      {item.quantity} {item.quantity <= item.restockPoint && (
                        <Tooltip title="Low stock">
                          <WarningIcon color="warning" fontSize="small" />
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>${item.sellingPrice.toFixed(2)}</TableCell>
                    <TableCell>${(item.cost || item.buyingPrice).toFixed(2)}</TableCell>
                    <TableCell>{warehouse ? warehouse.name : 'None'}</TableCell>
                    <TableCell>{compartment ? compartment.name : 'None'}</TableCell>
                    <TableCell>
                      {storage ? (
                        <Tooltip title={`${storage.used}/${storage.total} (${storage.remaining} remaining)`}>
                          <Box sx={{ width: '100%' }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={storage.percentUsed} 
                              color={storage.percentUsed > 90 ? "error" : storage.percentUsed > 70 ? "warning" : "primary"}
                            />
                          </Box>
                        </Tooltip>
                      ) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <IconButton color="primary" onClick={() => handleOpenDialog('edit', item)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleOpenDialog('delete', item)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* Add/Edit Dialog */}
      <Dialog open={openDialog && (dialogType === 'add' || dialogType === 'edit')} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{dialogType === 'add' ? 'Add New Item' : 'Edit Item'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={itemForm.name}
                onChange={handleChange}
                error={!!formErrors.name}
                helperText={formErrors.name}
                autoFocus
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={itemForm.description}
                onChange={handleChange}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Quantity"
                name="quantity"
                type="number"
                value={itemForm.quantity}
                onChange={handleChange}
                error={!!formErrors.quantity}
                helperText={formErrors.quantity}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Cost"
                name="cost"
                type="number"
                value={itemForm.cost}
                onChange={handleChange}
                error={!!formErrors.cost}
                helperText={formErrors.cost}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Selling Price"
                name="sellingPrice"
                type="number"
                value={itemForm.sellingPrice}
                onChange={handleChange}
                error={!!formErrors.sellingPrice}
                helperText={formErrors.sellingPrice}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Size"
                name="size"
                type="number"
                value={itemForm.size}
                onChange={handleChange}
                error={!!formErrors.size}
                helperText={formErrors.size}
              />
              {/* Size warning section */}
              {/* Check warehouse capacity */}
              {itemForm.size > 0 && itemForm.warehouse_id && (() => {
                const warehouseId = itemForm.warehouse_id;
                const relevantCompartments = compartments.filter(
                  comp => !warehouseId || comp.warehouse_id === warehouseId
                );
                
                if (relevantCompartments.length > 0) {
                  const largestCapacity = Math.max(
                    ...relevantCompartments.map(
                      comp => comp.availableCapacity !== undefined ? comp.availableCapacity : comp.capacity
                    )
                  );
                  
                  if (itemForm.size > largestCapacity) {
                    return (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        This item is too large for any available compartment in the selected warehouse.
                      </Alert>
                    );
                  }
                }
                return null;
              })()}

              {/* Check compartment capacity */}
              {itemForm.size > 0 && itemForm.quantity > 0 && itemForm.compartment_id && (() => {
                const selectedCompartment = compartments.find(c => c._id === itemForm.compartment_id);
                if (selectedCompartment) {
                  const totalItemSize = itemForm.size * itemForm.quantity;
                  const availableCapacity = selectedCompartment.availableCapacity !== undefined ? 
                    selectedCompartment.availableCapacity : selectedCompartment.capacity;
                  
                  if (totalItemSize > availableCapacity) {
                    return (
                      <Alert severity="error" sx={{ mt: 1 }}>
                        Total size ({totalItemSize}) exceeds compartment's available capacity ({availableCapacity})
                      </Alert>
                    );
                  }
                }
                return null;
              })()}
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Restock Point"
                name="restockPoint"
                type="number"
                value={itemForm.restockPoint}
                onChange={handleChange}
                error={!!formErrors.restockPoint}
                helperText={formErrors.restockPoint}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Warehouse</InputLabel>
                <Select
                  name="warehouse_id"
                  value={itemForm.warehouse_id}
                  onChange={handleChange}
                  label="Warehouse"
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {loadingWarehouses ? (
                    <MenuItem disabled>
                      <CircularProgress size={20} />
                    </MenuItem>
                  ) : (
                    warehouses.map(warehouse => (
                      <MenuItem key={warehouse._id} value={warehouse._id}>
                        {warehouse.name}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>
            {dialogType === 'edit' && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Compartment</InputLabel>
                  <Select
                    name="compartment_id"
                    value={itemForm.compartment_id}
                    onChange={handleChange}
                    label="Compartment"
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {loadingCompartments ? (
                      <MenuItem disabled>
                        <CircularProgress size={20} />
                      </MenuItem>
                    ) : (
                      compartments
                        .filter(comp => !itemForm.warehouse_id || comp.warehouse_id === itemForm.warehouse_id)
                        .map(compartment => (
                          <MenuItem key={compartment._id} value={compartment._id}>
                            {compartment.name}
                          </MenuItem>
                        ))
                    )}
                  </Select>
                </FormControl>
              </Grid>
            )}
            {itemForm.compartment_id && itemForm.size && itemForm.quantity && (
              <Grid item xs={12}>
                {(() => {
                  const selectedCompartment = compartments.find(c => c._id === itemForm.compartment_id);
                  if (selectedCompartment) {
                    const totalItemSize = itemForm.size * itemForm.quantity;
                    const availableCapacity = selectedCompartment.availableCapacity !== undefined ? 
                      selectedCompartment.availableCapacity : selectedCompartment.capacity;
                    
                    if (totalItemSize > availableCapacity) {
                      return (
                        <Alert severity="error">
                          Total size ({totalItemSize}) exceeds compartment's available capacity ({availableCapacity})
                        </Alert>
                      );
                    }
                  }
                  return null;
                })()}
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            startIcon={dialogType === 'add' ? <AddIcon /> : <CheckIcon />}
          >
            {dialogType === 'add' ? 'Add' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Batch Add Items Dialog */}
      <Dialog 
        open={openDialog && dialogType === 'batch'} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Add Multiple Items
        </DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} sx={{ pt: 3, pb: 5 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          {activeStep === 0 && (
            <>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Item Details
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Name"
                        name="name"
                        value={itemForm.name}
                        onChange={handleChange}
                        error={!!formErrors.name}
                        helperText={formErrors.name}
                        autoFocus
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Description"
                        name="description"
                        value={itemForm.description}
                        onChange={handleChange}
                        multiline
                        rows={2}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Quantity"
                        name="quantity"
                        type="number"
                        value={itemForm.quantity}
                        onChange={handleChange}
                        error={!!formErrors.quantity}
                        helperText={formErrors.quantity}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Size"
                        name="size"
                        type="number"
                        value={itemForm.size}
                        onChange={handleChange}
                        error={!!formErrors.size}
                        helperText={formErrors.size}
                      />
                      {itemForm.size > 0 && itemForm.quantity > 0 && itemForm.compartment_id && (() => {
                        const selectedCompartment = compartments.find(c => c._id === itemForm.compartment_id);
                        if (selectedCompartment) {
                          const totalItemSize = itemForm.size * itemForm.quantity;
                          const availableCapacity = selectedCompartment.availableCapacity !== undefined ? 
                            selectedCompartment.availableCapacity : selectedCompartment.capacity;
                          
                          if (totalItemSize > availableCapacity) {
                            return (
                              <Alert severity="error" sx={{ mt: 1 }}>
                                Total size ({totalItemSize}) exceeds compartment's available capacity ({availableCapacity})
                              </Alert>
                            );
                          }
                        }
                        return null;
                      })()}
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Cost"
                        name="cost"
                        type="number"
                        value={itemForm.cost}
                        onChange={handleChange}
                        error={!!formErrors.cost}
                        helperText={formErrors.cost}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>
                        }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Selling Price"
                        name="sellingPrice"
                        type="number"
                        value={itemForm.sellingPrice}
                        onChange={handleChange}
                        error={!!formErrors.sellingPrice}
                        helperText={formErrors.sellingPrice}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>
                        }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Restock Point"
                        name="restockPoint"
                        type="number"
                        value={itemForm.restockPoint}
                        onChange={handleChange}
                        error={!!formErrors.restockPoint}
                        helperText={formErrors.restockPoint}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <FormControl fullWidth>
                        <InputLabel>Warehouse</InputLabel>
                        <Select
                          name="warehouse_id"
                          value={itemForm.warehouse_id}
                          onChange={handleChange}
                          label="Warehouse"
                        >
                          <MenuItem value="">
                            <em>None</em>
                          </MenuItem>
                          {loadingWarehouses ? (
                            <MenuItem disabled>
                              <CircularProgress size={20} />
                            </MenuItem>
                          ) : (
                            warehouses.map(warehouse => (
                              <MenuItem key={warehouse._id} value={warehouse._id}>
                                {warehouse.name}
                              </MenuItem>
                            ))
                          )}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleSubmit}
                        disabled={!itemForm.name}
                      >
                        Add to Batch
                      </Button>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Items in Batch ({batchItems.length})
                  </Typography>
                  {batchItems.length === 0 ? (
                    <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'background.default' }}>
                      <Typography color="text.secondary">
                        No items added yet. Fill the form and click "Add to Batch".
                      </Typography>
                    </Paper>
                  ) : (
                    <Box sx={{ maxHeight: 400, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <List dense>
                        {batchItems.map((item, index) => (
                          <ListItem 
                            key={item.id}
                            secondaryAction={
                              <IconButton edge="end" onClick={() => handleRemoveBatchItem(item.id)}>
                                <DeleteIcon />
                              </IconButton>
                            }
                          >
                            <ListItemText
                              primary={item.name}
                              secondary={
                                <>
                                  Qty: {item.quantity} × Size: {item.size}
                                  <br />
                                  Cost: ${item.cost} | Price: ${item.sellingPrice.toFixed(2)}
                                </>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </Grid>
              </Grid>
            </>
          )}
          
          {activeStep === 1 && (
            <>
              <Typography variant="h6" gutterBottom>
                Storage Optimization
              </Typography>
              
              {optimizationLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                  <CircularProgress />
                </Box>
              ) : optimizationError ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {optimizationError}
                </Alert>
              ) : !optimizationResult ? (
                <Alert severity="info" sx={{ mb: 2 }}>
                  No optimization results available
                </Alert>
              ) : (
                <>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={3}>
                      <Card>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary">
                            Total Items
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                            {batchItems.length}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={3}>
                      <Card>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary">
                            Items Assigned
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                            {Object.keys(optimizationResult.compartmentAssignments || {}).length}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={3}>
                      <Card>
                        <CardContent>
                          <Typography 
                            variant="subtitle2" 
                            sx={{ 
                              color: optimizationResult.unassignedItems?.length > 0 ? "error.main" : "text.secondary"
                            }}
                          >
                            Unassigned Items
                          </Typography>
                          <Typography 
                            variant="h5" 
                            sx={{ 
                              fontWeight: 'bold',
                              color: optimizationResult.unassignedItems?.length > 0 ? "error.main" : "text.secondary"
                            }}
                          >
                            {optimizationResult.unassignedItems?.length || 0}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={3}>
                      <Card>
                        <CardContent>
                          <Typography variant="subtitle2" color="text.secondary">
                            Daily Maintenance
                          </Typography>
                          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                            ${typeof optimizationResult.totalMaintenanceCost === 'number' ? 
                              optimizationResult.totalMaintenanceCost.toFixed(2) : '0.00'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                  
                  {optimizationResult.unassignedItems?.length > 0 && (
                    <Alert severity="warning" sx={{ mb: 3 }}>
                      {optimizationResult.unassignedItems.length} items could not be assigned to any compartment
                    </Alert>
                  )}
                  
                  <TableContainer component={Paper} sx={{ mb: 3 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Item</TableCell>
                          <TableCell align="right">Size</TableCell>
                          <TableCell>Assignment</TableCell>
                          <TableCell align="right">Maintenance</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {batchItems.map(item => {
                          const assignedCompartmentId = optimizationResult?.compartmentAssignments?.[item.id];
                          const compartment = assignedCompartmentId ? 
                            compartments.find(c => c._id === assignedCompartmentId) : null;
                          const isAssigned = !!assignedCompartmentId;
                          
                          return (
                            <TableRow key={item.id} sx={{ 
                              backgroundColor: isAssigned ? 'inherit' : 'error.lighter'
                            }}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell align="right">{item.size}</TableCell>
                              <TableCell>
                                {isAssigned ? (
                                  <Tooltip title={`Warehouse: ${
                                    warehouses.find(w => w._id === compartment?.warehouse_id)?.name || 'Unknown'
                                  }`}>
                                    <Chip 
                                      size="small" 
                                      label={compartment?.name || 'Unknown compartment'} 
                                      color="primary" 
                                      variant="outlined" 
                                    />
                                  </Tooltip>
                                ) : (
                                  <Chip 
                                    size="small" 
                                    label="Not assigned" 
                                    color="error" 
                                    variant="outlined" 
                                  />
                                )}
                              </TableCell>
                              <TableCell align="right">
                                {isAssigned ? 
                                  (compartment ? `$${(compartment.maintenancePrice !== undefined ? compartment.maintenancePrice.toFixed(2) : '0.00')}` : '$0.00') : 
                                  '-'
                                }
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          {activeStep > 0 && (
            <Button onClick={handleBackStep} startIcon={<BackIcon />}>
              Back
            </Button>
          )}
          <Button 
            variant="contained" 
            onClick={handleNextStep}
            startIcon={activeStep === steps.length - 1 ? <SaveIcon /> : <NextIcon />}
            disabled={(activeStep === 0 && batchItems.length === 0) || optimizationLoading}
          >
            {activeStep === steps.length - 1 ? 'Save All Items' : 'Next'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={openDialog && dialogType === 'delete'} onClose={handleCloseDialog}>
        <DialogTitle>Delete Item</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the item "{currentItem?.name}"? 
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="error" 
            startIcon={<DeleteIcon />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Items; 