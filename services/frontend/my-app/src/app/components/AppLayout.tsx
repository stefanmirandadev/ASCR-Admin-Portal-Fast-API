"use client";
import { Box } from '@mui/material';
import NavbarNew from './Navbar-new';
import Sidebar from './Sidebar';

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <NavbarNew />

      {/* Content area below navbar */}
      <Box
        sx={{
          flex: 1,
          backgroundColor: 'background.primary',
          display: 'flex',
          gap: 1,
          paddingTop: 2
        }}
      >
        {/* Sidebar */}
        <Sidebar />

        {/* Main content */}
        <Box component="main" sx={{ flex: 1, overflow: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;