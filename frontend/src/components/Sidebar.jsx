import { useLocation, Link } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  useTheme
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  Warehouse as WarehouseIcon,
  BarChart as OptimizationIcon,
  ShoppingCart as ShoppingCartIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';

import { useAuth } from '../contexts/AuthContext';

const Sidebar = ({ open, onClose, drawerWidth = 240 }) => {
  const location = useLocation();
  const theme = useTheme();
  const { logout } = useAuth();
  
  const menuItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: <DashboardIcon />
    },
    {
      name: 'Items',
      path: '/items',
      icon: <InventoryIcon />
    },
    {
      name: 'Warehouses',
      path: '/warehouses',
      icon: <WarehouseIcon />
    },
    {
      name: 'Optimization',
      path: '/optimization',
      icon: <OptimizationIcon />
    },
    {
      name: 'Restock Recommendations',
      path: '/restock',
      icon: <ShoppingCartIcon />
    }
  ];
  
  const handleLogout = () => {
    logout();
  };
  
  const drawer = (
    <>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" noWrap component="div">
          Inventory System
        </Typography>
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem 
            button 
            key={item.name} 
            component={Link} 
            to={item.path}
            selected={location.pathname === item.path}
            sx={{ 
              '&.Mui-selected': { 
                backgroundColor: theme.palette.action.selected,
                '&:hover': {
                  backgroundColor: theme.palette.action.hover
                }
              }
            }}
          >
            <ListItemIcon>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.name} />
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem button onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </List>
    </>
  );
  
  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
    >
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: drawerWidth 
          },
        }}
      >
        {drawer}
      </Drawer>
      
      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: drawerWidth 
          },
        }}
      >
        {drawer}
      </Drawer>
    </Box>
  );
};

export default Sidebar; 