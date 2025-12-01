import { Box, Typography, SvgIcon } from '@mui/material';
import Image from 'next/image';


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
        color: 'text.primary '
      }}
    />
  );

  const SettingsIcon = () => (
    <Image
      src="/icons/settings.png"
      alt="application grid"
      width={24}
      height={24}
      style={{

        maxWidth: 24,
        maxHeight: 24,
        objectFit: 'contain',
        color: 'text.primary ',
        marginLeft: 15
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
  backgroundColor: 'background.main',
  minHeight: '4rem',
  maxHeight: '4rem',
}


const NavbarNew = () => {
  return (

    <>
        {/* Navbar container */}
        <Box sx={navbarStyles}>

        {/* Left box */}
        <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
          <CleaningIcon sx={{ ml: 2, mr: 1 }} />
          <Typography variant="title" color="text.title" padding={2}> ASCR AdminPortal </Typography>
        </Box>

        {/* Right box */}
        <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', gap: 2 }}>


            {/* Settings Icon */}
            <Box sx={{
                display: 'flex', 
                flexDirection: 'row', 
                justifyContent: 'flex-start', 
                alignItems: 'center', 
                borderRadius: 5, 
                padding: 1, 
                border: '1px solid #e0e0e0', 
                gap: 1,
                cursor: 'pointer'
                }}>
                <SettingsIcon />
                <Typography variant="body2" color="text.primary" marginRight={2}> Settings </Typography>
                </Box>


            {/* Application grid icon */}
          <ApplicationGridIcon />

          {/* User Login Icon */}
          <Typography variant="body1" color="text.secondary" padding={2}> User2 </Typography>
        </Box>


      </Box>
    </>

    
    
  );
};

export default NavbarNew;