'use client';

import { Typography, Box, TextField, Button, Alert, Divider, IconButton, InputAdornment } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useState, useEffect } from 'react';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

export default function SettingsPage() {
  const theme = useTheme();
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [apiKeySource, setApiKeySource] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Fetch current settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('http://localhost:8001/settings');
        if (response.ok) {
          const data = await response.json();
          const settings = data.settings;

          // Load the full API key
          if (settings.OPENAI_API_KEY) {
            setApiKey(settings.OPENAI_API_KEY);
          }
          setApiKeySource(settings.OPENAI_API_KEY_SOURCE || null);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const response = await fetch('http://localhost:8001/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          OPENAI_API_KEY: apiKey || undefined,
        }),
      });

      if (response.ok) {
        setSaveSuccess(true);
        setApiKeySource(null);
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
      } else {
        const error = await response.json();
        setSaveError(error.detail || 'Failed to save settings');
      }
    } catch (error) {
      setSaveError('Network error. Please try again.');
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '40px' }}>
          <Typography variant="h4" fontWeight={600} color="text.primary">
            Settings
          </Typography>

          {/* Success notification - right aligned with fade in/out */}
          <Box
            sx={{
              opacity: saveSuccess ? 1 : 0,
              transform: saveSuccess ? 'translateX(0)' : 'translateX(20px)',
              transition: 'opacity 0.5s ease-in-out, transform 0.5s ease-in-out',
              pointerEvents: saveSuccess ? 'auto' : 'none',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.success.main,
                fontWeight: 500,
                fontSize: '0.95rem',
                whiteSpace: 'nowrap',
              }}
            >
              ✓ Settings saved
            </Typography>
          </Box>
        </Box>

        {saveError && (
          <Alert severity="error" onClose={() => setSaveError(null)}>
            {saveError}
          </Alert>
        )}

        <Box>
          <Typography variant="h6" fontWeight={600} color="text.primary" sx={{ mb: 1 }}>
            API Configuration
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="body1" fontWeight={500} sx={{ mb: 0.5 }}>
                OpenAI API Key
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Your OpenAI API key is used for AI-powered cell line curation. The key is stored securely and never exposed in logs or responses.
                {apiKeySource === 'environment' && (
                  <span style={{ color: theme.palette.warning.main, fontWeight: 500 }}>
                    {' '}Currently using key from environment variables.
                  </span>
                )}
              </Typography>
              <TextField
                fullWidth
                type={showPassword ? "text" : "password"}
                placeholder="Enter your OpenAI API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={isLoading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        disabled={isLoading}
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: theme.palette.background.paper,
                  },
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={isSaving || isLoading || !apiKey}
                sx={{
                  backgroundColor: theme.palette.secondary.dark,
                  '&:hover': {
                    backgroundColor: theme.palette.secondary.main,
                  },
                }}
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
