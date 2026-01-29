'use client';

import { createTheme } from '@mui/material/styles';

// Create a custom Material UI theme
export const theme = createTheme({

  palette: {
    primary: {
      main: '#86868E', 
      light: '#FAFAFA',
      dark: '#000000',
    },
    secondary: {
      main: '#64748b', // Slate-500
      light: '#94a3b8',
      dark: '#23293a',
    },
    background: {
      primary: '#fafafa', // Gray-50
      white: '#ffffff',
    },
    text: {
      primary: '#0f172a', // Slate-900
      secondary: '#64748b', // Slate-500
      white: '#fafafa'
    },
    success: {
      main: '#059669', // Emerald-600
      light: '#10b981',
      dark: '#047857',
    },
    warning: {
      main: '#d97706', // Amber-600
      light: '#f59e0b',
      dark: '#b45309',
    },
    error: {
      main: '#dc2626', // Red-600
      light: '#ef4444',
      dark: '#b91c1c',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.25rem', // text-4xl
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '1.875rem', // text-3xl
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.5rem', // text-2xl
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.25rem', // text-xl
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.125rem', // text-lg
      fontWeight: 500,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem', // text-base
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // Remove uppercase transform
          borderRadius: 8, // rounded-lg
          fontWeight: 500,
          padding: '8px 16px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12, // rounded-xl
          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          border: '1px solid #e2e8f0', // border-slate-200
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8, // rounded-lg
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16, // rounded-full
          fontWeight: 500,
        },
      },
    },
  },
  shape: {
    borderRadius: 8,
  },
});