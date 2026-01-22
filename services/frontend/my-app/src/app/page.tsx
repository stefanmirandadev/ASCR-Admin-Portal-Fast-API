'use client';

import { Box, Typography, Divider } from '@mui/material';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import { getApiUrl } from '@/lib/api-config';

interface CellLineStats {
  total: number;
  working: number;
  queued: number;
  ready: number;
}

export default function Home() {
  const router = useRouter();
  const [stats, setStats] = useState<CellLineStats>({
    total: 0,
    working: 0,
    queued: 0,
    ready: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(getApiUrl('/stats'));
        if (response.ok) {
          const data = await response.json();
          setStats({
            total: data.total_cell_lines || 0,
            working: data.working_count || 0,
            queued: data.queued_count || 0,
            ready: data.registered_count || 0,
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const quickActions = [
    {
      title: 'AI Curation',
      description: 'Use AI to extract cell line metadata from text',
      icon: <ScienceOutlinedIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
      path: '/tools/curation',
    },
  ];

  const statCards = [
    { label: 'Total Cell Lines', value: stats.total },
    { label: 'Working Cell Lines', value: stats.working },
    { label: 'Queued Cell Lines', value: stats.queued },
    { label: 'Ready Cell Lines', value: stats.ready },
  ];

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
            {loading ? (
              <Typography variant="body2" color="text.secondary">
                Loading statistics...
              </Typography>
            ) : (
              statCards.map((stat) => (
                <Box
                  key={stat.label}
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
                  <Typography variant="body2" color="text.secondary">
                    {stat.label}
                  </Typography>
                  <Typography variant="h3" fontWeight={700} color="text.primary">
                    {stat.value}
                  </Typography>
                </Box>
              ))
            )}
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
            {quickActions.map((action) => (
              <Box
                key={action.title}
                onClick={() => router.push(action.path)}
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
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                  },
                }}
              >
                {action.icon}
                <Typography variant="h6" fontWeight={600} color="text.primary" sx={{ mt: 2, mb: 1 }}>
                  {action.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {action.description}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
