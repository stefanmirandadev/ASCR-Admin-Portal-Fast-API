'use client';

import { Box, Typography, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '@mui/material/styles';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';

const SIDEBAR_WIDTH = 220;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Explore',
    items: [
      { label: 'Curation', path: '/tools/curation', icon: <ScienceOutlinedIcon fontSize="small" /> },
    ],
  },
];

const Sidebar = () => {
  const theme = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        minWidth: SIDEBAR_WIDTH,
        alignSelf: 'stretch',
        backgroundColor: 'transparent',
        display: 'flex',
        flexDirection: 'column',
        pb: 2,
      }}
    >
      {/* Applications header */}
      <Typography
        variant="body2"
        sx={{
          px: 2,
          py: 1,
          mb: 1,
          display: 'block',
          fontWeight: 400,
          color: theme.palette.text.secondary,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontSize: '0.8rem',
        }}
      >
        Applications
      </Typography>

      {navSections.map((section) => (
        <Box key={section.title} sx={{ mb: 2 }}>
          <Typography
            variant="caption"
            sx={{
              px: 2,
              py: 1,
              display: 'block',
              fontWeight: 600,
              color: theme.palette.text.secondary,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {section.title}
          </Typography>
          <List dense disablePadding>
            {section.items.map((item) => {
              const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
              return (
                <ListItemButton
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  sx={{
                    mx: 1,
                    borderRadius: 1,
                    backgroundColor: isActive ? theme.palette.action.selected : 'transparent',
                    '&:hover': {
                      backgroundColor: isActive
                        ? theme.palette.action.selected
                        : theme.palette.action.hover,
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: isActive ? theme.palette.primary.main : theme.palette.text.secondary }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      variant: 'body2',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? theme.palette.text.primary : theme.palette.text.secondary,
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Box>
      ))}
    </Box>
  );
};

export { SIDEBAR_WIDTH };
export default Sidebar;
