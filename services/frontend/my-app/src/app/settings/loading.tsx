import { Typography, Box, Divider, Skeleton } from '@mui/material';

export default function SettingsLoading() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        minHeight: '92vh',
        backgroundColor: 'background.primary',
        p: 3,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: '680px',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '40px' }}>
          <Typography variant="h4" fontWeight={600} color="text.primary">
            Settings
          </Typography>
        </Box>

        {/* API Configuration Section */}
        <Box>
          <Typography variant="h6" fontWeight={600} color="text.primary" sx={{ mb: 1 }}>
            API Configuration
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* OpenAI API Key Field */}
            <Box>
              <Typography variant="body1" fontWeight={500} sx={{ mb: 0.5 }}>
                OpenAI API Key
              </Typography>
              <Skeleton variant="text" width="80%" height={20} sx={{ mb: 1.5 }} />
              <Skeleton variant="rectangular" width="100%" height={56} sx={{ borderRadius: 1 }} />
            </Box>

            {/* Save Button */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Skeleton variant="rectangular" width={140} height={36} sx={{ borderRadius: 1 }} />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
