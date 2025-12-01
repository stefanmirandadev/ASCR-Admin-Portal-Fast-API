"use client";
import { usePathname } from 'next/navigation';
import { Box } from '@mui/material';
import NavbarNew from './Navbar-new';

const appContainerStyles = {
  minHeight: '100vh',
  backgroundColor: 'primary.light',
  paddingLeft: 2,
  paddingRight: 2,
  paddingTop: 0,
}

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (

    <Box sx={appContainerStyles}>

      
      {/* Navbar */}
      <NavbarNew />

      {/* Main content area with top margin to account for fixed navbar */}
      <Box component="main" sx={{}}>
        {children}
      </Box>
    </Box>



  );
};

export default AppLayout;