import { Box, Typography, Divider, Skeleton } from '@mui/material';

export default function HomeLoading() {
  return (
    <Box sx={{ p: 3 }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} color="text.primary" gutterBottom>
          Welcome to ASCR Admin Portal
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage cell line data with AI-powered workflows
        </Typography>
      </Box>

      {/* Two Column Layout */}
      <Box sx={{ display: 'flex', gap: 4 }}>
        {/* Left Half - Cell Line Counts */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={600} color="text.primary" sx={{ mb: 3 }}>
            Cell Line Counts
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[1, 2, 3, 4].map((i) => (
              <Box
                key={i}
                sx={{
                  backgroundColor: 'background.paper',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'grey.200',
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                <Skeleton variant="text" width="60%" height={20} />
                <Skeleton variant="text" width="40%" height={56} />
              </Box>
            ))}
          </Box>
        </Box>

        {/* Vertical Divider */}
        <Divider orientation="vertical" flexItem sx={{ borderColor: 'grey.300' }} />

        {/* Right Half - Quick Actions */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={600} color="text.primary" sx={{ mb: 3 }}>
            Quick Actions
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box
              sx={{
                backgroundColor: 'background.paper',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'grey.200',
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 200,
                textAlign: 'center',
              }}
            >
              <Skeleton variant="circular" width={48} height={48} />
              <Skeleton variant="text" width="60%" height={32} sx={{ mt: 2, mb: 1 }} />
              <Skeleton variant="text" width="80%" height={20} />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
