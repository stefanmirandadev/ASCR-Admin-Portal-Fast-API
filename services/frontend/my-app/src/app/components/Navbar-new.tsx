'use client';

import { Box, Typography, SvgIcon, TextField, InputAdornment, Paper, List, ListItemButton, ListItemText, Chip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api-config';

interface CellLineItem {
  name: string;
  location: 'working' | 'ready';
}


const ApplicationGridIcon = () => (
    <Image
      src="/icons/application-grid.png"
      alt="application grid"
      width={24}
      height={24}
      style={{
        maxWidth: 24,
        maxHeight: 24,
        objectFit: 'contain',
      }}
    />
  );

  const SettingsIcon = () => (
    <Image
      src="/icons/settings.png"
      alt="settings"
      width={24}
      height={24}
      style={{
        maxWidth: 24,
        maxHeight: 24,
        objectFit: 'contain',
      }}
    />
  );


// Cleaning icon component
const CleaningIcon = (props: any) => (
  <SvgIcon {...props} viewBox="0 0 20 20">
    <path d="M19.36 2.72L20.78 4.14L15.06 9.85C16.13 11.39 16.28 13.24 15.38 14.44L9.06 8.12C10.26 7.22 12.11 7.37 13.65 8.44L19.36 2.72ZM5.93 17.57C3.92 15.56 2.69 13.16 2.35 10.92L7.23 8.83L14.67 16.27L12.58 21.15C10.34 20.81 7.94 19.58 5.93 17.57Z"/>
  </SvgIcon>
);


const navbarStyles = {
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#fafafa',
  minHeight: '4rem',
  maxHeight: '4rem',
  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.08)',
}


const NavbarNew = () => {
  const router = useRouter();
  const [allCellLines, setAllCellLines] = useState<CellLineItem[]>([]);
  const [filteredCellLines, setFilteredCellLines] = useState<CellLineItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSettingsClick = () => {
    router.push('/settings');
  };

  // Fetch all cell lines on mount
  useEffect(() => {
    const fetchCellLines = async () => {
      try {
        const response = await fetch(getApiUrl('/get-all-cell-lines'));
        if (response.ok) {
          const data = await response.json();
          setAllCellLines(data.cell_lines || []);
        }
      } catch (error) {
        console.error('Error fetching cell lines:', error);
      }
    };
    fetchCellLines();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchInput = () => {
    const query = searchInputRef.current?.value.toLowerCase() || '';
    if (query.length === 0) {
      setFilteredCellLines([]);
      setShowDropdown(false);
      return;
    }
    const filtered = allCellLines.filter(cl => cl.name.toLowerCase().includes(query));
    setFilteredCellLines(filtered.slice(0, 10));
    setShowDropdown(filtered.length > 0);
  };

  const handleSelectCellLine = (cellLine: CellLineItem) => {
    setShowDropdown(false);
    if (searchInputRef.current) searchInputRef.current.value = '';
    router.push(`/tools/curation?cellLine=${encodeURIComponent(cellLine.name)}`);
  };

  return (

    <>
        {/* Navbar container */}
        <Box sx={navbarStyles}>

        {/* Left box */}
        <Box
          onClick={() => router.push('/')}
          sx={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'center',
            gap: 1.5,
            ml: 2,
            cursor: 'pointer',
            '&:hover': {
              opacity: 0.8,
            }
          }}
        >
          <CleaningIcon sx={{ color: 'text.primary', fontSize: 28 }} />
          <Typography variant="h6" color="text.primary" fontWeight={600}> ASCR AdminPortal </Typography>
        </Box>

        {/* Search Bar */}
        <Box ref={dropdownRef} sx={{ position: 'relative', flex: 1, maxWidth: 400, mx: 4 }}>
          <TextField
            inputRef={searchInputRef}
            placeholder="Search cell lines..."
            size="small"
            fullWidth
            onInput={handleSearchInput}
            onFocus={() => {
              if (filteredCellLines.length > 0) setShowDropdown(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                if (searchInputRef.current) {
                  searchInputRef.current.value = '';
                  searchInputRef.current.blur();
                }
                setFilteredCellLines([]);
                setShowDropdown(false);
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'background.paper',
                borderRadius: 2,
                '& fieldset': {
                  borderColor: 'grey.300',
                },
                '&:hover fieldset': {
                  borderColor: 'grey.400',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'primary.main',
                },
              },
            }}
          />
          {showDropdown && filteredCellLines.length > 0 && (
            <Paper
              sx={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                mt: 0.5,
                maxHeight: 300,
                overflow: 'auto',
                zIndex: 1000,
              }}
            >
              <List dense disablePadding>
                {filteredCellLines.map((cellLine) => (
                  <ListItemButton
                    key={`${cellLine.name}-${cellLine.location}`}
                    onClick={() => handleSelectCellLine(cellLine)}
                    sx={{ py: 1 }}
                  >
                    <ListItemText primary={cellLine.name} />
                    <Chip
                      label={cellLine.location}
                      size="small"
                      color={cellLine.location === 'working' ? 'warning' : 'success'}
                      sx={{ ml: 1, height: 20, fontSize: '0.7rem' }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          )}
        </Box>

        {/* Right box */}
        <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', gap: 1.5, mr: 2 }}>
            {/* Settings Icon */}
            <Box
                onClick={handleSettingsClick}
                sx={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: 999,
                px: 2,
                py: 1,
                border: '1px solid',
                borderColor: 'grey.300',
                gap: 1,
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'action.hover',
                  borderColor: 'grey.400',
                }
                }}>
                <SettingsIcon />
                <Typography variant="body2" color="text.primary"> Settings </Typography>
            </Box>

          {/* User Login Icon */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: 'action.selected',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'action.hover',
              }
            }}
          >
            <Typography variant="body2" color="text.primary" fontWeight={500}> U2 </Typography>
          </Box>
        </Box>


      </Box>
    </>

    
    
  );
};

export default NavbarNew;