import { Box, Skeleton } from '@mui/material';

export default function CurationLoading() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 4rem)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Skeleton variant="text" width={200} height={40} />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Skeleton variant="rectangular" width={100} height={36} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width={100} height={36} sx={{ borderRadius: 1 }} />
        </Box>
      </Box>

      {/* Main Content Area */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Panel - Text Input */}
        <Box
          sx={{
            width: '50%',
            borderRight: '1px solid',
            borderColor: 'divider',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Skeleton variant="text" width={150} height={28} />
          <Skeleton variant="rectangular" width="100%" height="100%" sx={{ borderRadius: 1 }} />
        </Box>

        {/* Right Panel - Editor */}
        <Box sx={{ width: '50%', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Skeleton variant="text" width={150} height={28} />

          {/* Section Skeletons */}
          {[1, 2, 3].map((section) => (
            <Box key={section} sx={{ mb: 3 }}>
              <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
              {[1, 2, 3, 4].map((field) => (
                <Box key={field} sx={{ mb: 2 }}>
                  <Skeleton variant="text" width="30%" height={20} sx={{ mb: 0.5 }} />
                  <Skeleton variant="rectangular" width="100%" height={40} sx={{ borderRadius: 1 }} />
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
