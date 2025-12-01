import { Box } from '@mui/material';
import React from 'react';
import { ReactNode } from 'react';


const cardStyles = {
    backgroundColor: 'background.white',
    borderRadius: 5,
    paddingLeft: 1
    
}
interface CardProps {
    children: React.ReactNode;
    width?: string | number;
    height?: string | number;
    flex?: string | number;
    flexBasis?: string | number;
    margin?: string | number;
    marginBottom?: string | number;
}

const Card = ({ children, width, height, flex, flexBasis, margin, marginBottom }: CardProps) => {
    return (
        <Box sx={{
            ...cardStyles,
            ...(width && { width }),
            ...(height && { height }),
            ...(flex && { flex }),
            ...(flexBasis && { flexBasis }),
            ...(margin && { margin }),
            ...(marginBottom && { marginBottom })
        }}>
            {children}
        </Box>
    )
}

export default Card;