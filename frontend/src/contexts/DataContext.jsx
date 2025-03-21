import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { itemsAPI, warehousesAPI, compartmentsAPI } from '../api';
import { useAuth } from './AuthContext';

// Create context
const DataContext = createContext();

// Custom hook to use the data context
export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

// Provider component
export const DataProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  // Items state
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState(null);
  
  // Warehouses state
  const [warehouses, setWarehouses] = useState([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [warehousesError, setWarehousesError] = useState(null);
  
  // Compartments state
  const [compartments, setCompartments] = useState([]);
  const [loadingCompartments, setLoadingCompartments] = useState(false);
  const [compartmentsError, setCompartmentsError] = useState(null);
  
  // Fetch items
  const fetchItems = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoadingItems(true);
      setItemsError(null);
      const response = await itemsAPI.getAll();
      
      // Map buyingPrice to cost for the frontend
      const mappedItems = response.data.data.map(item => ({
        ...item,
        cost: item.buyingPrice
      }));
      
      setItems(mappedItems);
    } catch (error) {
      setItemsError(error.response?.data?.message || 'Failed to fetch items');
      console.error('Error fetching items:', error);
    } finally {
      setLoadingItems(false);
    }
  }, [isAuthenticated]);
  
  // Fetch warehouses
  const fetchWarehouses = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoadingWarehouses(true);
      setWarehousesError(null);
      const response = await warehousesAPI.getAll();
      setWarehouses(response.data.data);
    } catch (error) {
      setWarehousesError(error.response?.data?.message || 'Failed to fetch warehouses');
      console.error('Error fetching warehouses:', error);
    } finally {
      setLoadingWarehouses(false);
    }
  }, [isAuthenticated]);
  
  // Fetch compartments
  const fetchCompartments = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoadingCompartments(true);
      setCompartmentsError(null);
      const response = await compartmentsAPI.getAll();
      setCompartments(response.data.data);
    } catch (error) {
      setCompartmentsError(error.response?.data?.message || 'Failed to fetch compartments');
      console.error('Error fetching compartments:', error);
    } finally {
      setLoadingCompartments(false);
    }
  }, [isAuthenticated]);
  
  // Fetch all data
  const refreshData = useCallback(() => {
    fetchItems();
    fetchWarehouses();
    fetchCompartments();
  }, [fetchItems, fetchWarehouses, fetchCompartments]);
  
  // Fetch data on initial render and authentication changes
  useEffect(() => {
    if (isAuthenticated) {
      refreshData();
    }
  }, [isAuthenticated, refreshData]);
  
  // CRUD operations for items
  const createItem = async (itemData) => {
    try {
      // Clean up undefined and empty string fields for compartment_id
      const cleanedData = { ...itemData };
      if (cleanedData.compartment_id === '' || cleanedData.compartment_id === undefined) {
        delete cleanedData.compartment_id;
      }
      
      // Ensure buyingPrice is set if not provided
      if (cleanedData.buyingPrice === undefined && cleanedData.cost !== undefined) {
        cleanedData.buyingPrice = cleanedData.cost;
      }
      
      const response = await itemsAPI.create(cleanedData);
      
      // Add cost field mapped from buyingPrice for frontend consistency
      const newItem = {
        ...response.data.data,
        cost: response.data.data.buyingPrice
      };
      
      setItems(prevItems => [...prevItems, newItem]);
      return newItem;
    } catch (error) {
      console.error('Error creating item:', error.response?.data || error);
      setItemsError(error.response?.data?.message || error.message || 'Failed to create item');
      throw error;
    }
  };
  
  const updateItem = async (id, itemData) => {
    try {
      // Clean up undefined and empty string fields for compartment_id
      const cleanedData = { ...itemData };
      if (cleanedData.compartment_id === '' || cleanedData.compartment_id === undefined) {
        delete cleanedData.compartment_id;
      }
      
      // Ensure buyingPrice is set if not provided
      if (cleanedData.buyingPrice === undefined && cleanedData.cost !== undefined) {
        cleanedData.buyingPrice = cleanedData.cost;
      }
      
      const response = await itemsAPI.update(id, cleanedData);
      
      // Add cost field mapped from buyingPrice for frontend consistency
      const updatedItem = {
        ...response.data.data,
        cost: response.data.data.buyingPrice
      };
      
      setItems(prevItems => 
        prevItems.map(item => item._id === id ? updatedItem : item)
      );
      
      return updatedItem;
    } catch (error) {
      console.error('Error updating item:', error.response?.data || error);
      setItemsError(error.response?.data?.message || error.message || 'Failed to update item');
      throw error;
    }
  };
  
  const deleteItem = async (id) => {
    try {
      await itemsAPI.delete(id);
      setItems(prevItems => prevItems.filter(item => item._id !== id));
    } catch (error) {
      throw error;
    }
  };
  
  // CRUD operations for warehouses
  const createWarehouse = async (warehouseData) => {
    try {
      const response = await warehousesAPI.create(warehouseData);
      setWarehouses(prevWarehouses => [...prevWarehouses, response.data.data]);
      return response.data.data;
    } catch (error) {
      throw error;
    }
  };
  
  const updateWarehouse = async (id, warehouseData) => {
    try {
      const response = await warehousesAPI.update(id, warehouseData);
      setWarehouses(prevWarehouses => 
        prevWarehouses.map(warehouse => warehouse._id === id ? response.data.data : warehouse)
      );
      return response.data.data;
    } catch (error) {
      throw error;
    }
  };
  
  const deleteWarehouse = async (id) => {
    try {
      await warehousesAPI.delete(id);
      setWarehouses(prevWarehouses => prevWarehouses.filter(warehouse => warehouse._id !== id));
    } catch (error) {
      throw error;
    }
  };
  
  // CRUD operations for compartments
  const createCompartment = async (compartmentData) => {
    try {
      if (!compartmentData.maintenancePrice && compartmentData.maintenancePrice !== 0) {
        throw new Error('Maintenance price is required');
      }
      
      const response = await compartmentsAPI.create(compartmentData);
      setCompartments(prevCompartments => [...prevCompartments, response.data.data]);
      return response.data.data;
    } catch (error) {
      setCompartmentsError(error.response?.data?.message || error.message || 'Failed to create compartment');
      throw error;
    }
  };
  
  const updateCompartment = async (id, compartmentData) => {
    try {
      const response = await compartmentsAPI.update(id, compartmentData);
      setCompartments(prevCompartments => 
        prevCompartments.map(compartment => compartment._id === id ? response.data.data : compartment)
      );
      return response.data.data;
    } catch (error) {
      setCompartmentsError(error.response?.data?.message || error.message || 'Failed to update compartment');
      throw error;
    }
  };
  
  const deleteCompartment = async (id) => {
    try {
      await compartmentsAPI.delete(id);
      setCompartments(prevCompartments => prevCompartments.filter(compartment => compartment._id !== id));
    } catch (error) {
      setCompartmentsError(error.response?.data?.message || error.message || 'Failed to delete compartment');
      throw error;
    }
  };
  
  // Context value
  const value = {
    // Data
    items,
    warehouses,
    compartments,
    
    // Loading states
    loadingItems,
    loadingWarehouses,
    loadingCompartments,
    
    // Error states
    itemsError,
    warehousesError,
    compartmentsError,
    
    // Refresh functions
    refreshData,
    fetchItems,
    fetchWarehouses,
    fetchCompartments,
    
    // CRUD operations
    createItem,
    updateItem,
    deleteItem,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
    createCompartment,
    updateCompartment,
    deleteCompartment,
  };
  
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export default DataContext; 