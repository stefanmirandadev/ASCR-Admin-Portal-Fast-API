import { Box, Typography } from '@mui/material';
import { Theme } from '@mui/material/styles';
import React from 'react';

const CARD_BORDER_RADIUS = 2;

const cardStyles = (theme: Theme) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: CARD_BORDER_RADIUS,
  border: `1px solid ${theme.palette.grey[200]}`,
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  minHeight: 0,
});

const headerStyles = (theme: Theme, customBgColor?: string) => ({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: `1px solid ${theme.palette.grey[200]}`,
  height: '2.5rem',
  padding: theme.spacing(1),
  backgroundColor: customBgColor || '#445669',
  borderTopLeftRadius: theme.shape.borderRadius * CARD_BORDER_RADIUS,
  borderTopRightRadius: theme.shape.borderRadius * CARD_BORDER_RADIUS,
  borderBottomLeftRadius: 0,
  borderBottomRightRadius: 0,
});

interface CardProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  headerBgColor?: string;
  headerTextColor?: string;
  width?: string | number;
  height?: string | number;
  flex?: string | number;
  flexBasis?: string | number;
  margin?: string | number;
  marginBottom?: string | number;
}

const Card = ({ children, header, headerBgColor, headerTextColor, width, height, flex, flexBasis, margin, marginBottom }: CardProps) => {
  return (
    <Box
      sx={(theme) => ({
        ...cardStyles(theme),
        ...(width && { width }),
        ...(height && { height }),
        ...(flex && { flex }),
        ...(flexBasis && { flexBasis }),
        ...(margin && { margin }),
        ...(marginBottom && { marginBottom }),
      })}
    >
      {header && (
        <Box sx={(theme) => headerStyles(theme, headerBgColor)}>
          {typeof header === 'string' ? (
            <Typography
              variant="subtitle1"
              fontWeight={600}
              sx={{
                px: 0.5,
                fontSize: '0.9rem',
                color: headerTextColor || 'white'
              }}
            >
              {header}
            </Typography>
          ) : (
            header
          )}
        </Box>
      )}
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {children}
      </Box>
    </Box>
  );
};

export default Card;
