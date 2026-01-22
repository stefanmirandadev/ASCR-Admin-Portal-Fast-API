'use client';

import { Box, Typography, TextField, IconButton, Collapse, Button, Switch, FormControlLabel, Popover } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTheme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useState, useRef } from 'react';

// Convert snake_case to Title Case for display
const formatFieldName = (name: string): string => {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Convert snake_case key to Section Title (e.g., cell_line -> Cell Line)
const formatSectionName = (name: string): string => {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

interface FieldEditorProps {
  fieldName: string;
  value: any;
  inputName: string;
}

const FieldEditor = ({ fieldName, value, inputName }: FieldEditorProps) => {
  const theme = useTheme();
  const defaultValue = value === null || value === undefined ? '' : String(value);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1, py: 0.25 }}>
      <Typography
        variant="caption"
        sx={{
          minWidth: 160,
          fontWeight: 500,
          color: theme.palette.text.secondary,
          fontSize: '0.75rem',
        }}
      >
        {formatFieldName(fieldName)}
      </Typography>
      <TextField
        size="small"
        name={inputName}
        defaultValue={defaultValue}
        fullWidth
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: theme.palette.background.paper,
            fontSize: '0.8rem',
          },
          '& .MuiOutlinedInput-input': {
            py: 0.5,
            px: 1,
          },
        }}
      />
    </Box>
  );
};

interface InstanceEditorProps {
  instance: Record<string, any>;
  instanceIndex: number;
  sectionName: string;
}

const InstanceEditor = ({ instance, instanceIndex, sectionName }: InstanceEditorProps) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        p: 1,
        mb: 0.5,
        backgroundColor: theme.palette.grey[50],
        borderRadius: 1,
        border: `1px solid ${theme.palette.grey[200]}`,
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block', fontSize: '0.7rem' }}>
        Instance {instanceIndex + 1}
      </Typography>
      {Object.entries(instance).map(([fieldName, value]) => (
        <FieldEditor
          key={fieldName}
          fieldName={fieldName}
          value={value}
          inputName={`${sectionName}.${instanceIndex}.${fieldName}`}
        />
      ))}
    </Box>
  );
};

interface SectionProps {
  sectionName: string;
  sectionId: string;
  instances: any[];
}

const Section = ({ sectionName, sectionId, instances }: SectionProps) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(true);

  const hasData = instances && instances.length > 0;

  return (
    <Box id={sectionId} sx={{ mb: 1, scrollMarginTop: '8px' }}>
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 0.75,
          px: 1,
          backgroundColor: theme.palette.grey[100],
          borderRadius: 1,
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: theme.palette.grey[200],
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" fontWeight={600}>
            {formatSectionName(sectionName)}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
            ({instances?.length || 0})
          </Typography>
        </Box>
        <IconButton size="small" sx={{ p: 0.25 }}>
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ pt: 0.5 }}>
          {hasData ? (
            instances.map((instance, index) => (
              <InstanceEditor
                key={index}
                instance={instance}
                instanceIndex={index}
                sectionName={sectionName}
              />
            ))
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, fontStyle: 'italic' }}>
              No data available
            </Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

interface TableOfContentsProps {
  sections: string[];
  onSectionClick: (sectionId: string) => void;
}

const TableOfContents = ({ sections, onSectionClick }: TableOfContentsProps) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        width: 200,
        flexShrink: 0,
        minHeight: 0,
        borderLeft: `1px solid ${theme.palette.grey[200]}`,
        p: 2,
        overflow: 'auto',
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: theme.palette.grey[300],
          borderRadius: '3px',
        },
      }}
    >
      <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        SECTIONS
      </Typography>
      {sections.map((sectionName) => (
        <Typography
          key={sectionName}
          variant="body2"
          onClick={() => onSectionClick(`section-${sectionName}`)}
          sx={{
            py: 0.5,
            px: 1,
            cursor: 'pointer',
            borderRadius: 0.5,
            fontSize: '0.8rem',
            color: theme.palette.text.secondary,
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
              color: theme.palette.text.primary,
            },
          }}
        >
          {formatSectionName(sectionName)}
        </Typography>
      ))}
    </Box>
  );
};

interface CellLineEditorProps {
  data: Record<string, any[]>;
  cellLineName: string;
  filename: string;
  lastModified: string | null;
  onSave: (data: Record<string, any[]>) => void;
  onCreate: (name: string) => void;
  onDiscard: () => void;
}

const CellLineEditor = ({ data, cellLineName, filename, lastModified, onSave, onCreate, onDiscard }: CellLineEditorProps) => {
  const theme = useTheme();
  const formRef = useRef<HTMLFormElement>(null);
  const [isQueued, setIsQueued] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [createAnchor, setCreateAnchor] = useState<HTMLButtonElement | null>(null);
  const [discardAnchor, setDiscardAnchor] = useState<HTMLButtonElement | null>(null);
  const newNameInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (!formRef.current) return;

    const formData = new FormData(formRef.current);
    const newData: Record<string, any[]> = JSON.parse(JSON.stringify(data)); // Deep clone original

    // Parse form data back into nested structure
    for (const [key, value] of formData.entries()) {
      const [sectionName, indexStr, fieldName] = key.split('.');
      const index = parseInt(indexStr, 10);

      if (newData[sectionName] && newData[sectionName][index]) {
        newData[sectionName][index][fieldName] = value || null;
      }
    }

    onSave(newData);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ block: 'start' });
    }
  };

  if (!data || Object.keys(data).length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No cell line data to display
        </Typography>
      </Box>
    );
  }

  const sectionNames = Object.keys(data);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* Header section */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          p: 2,
          borderBottom: `1px solid ${theme.palette.grey[200]}`,
          flexShrink: 0,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={600}>
            {cellLineName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Last Edited: {lastModified ? new Date(lastModified).toLocaleString() : '—'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={isQueued}
                onChange={(e) => setIsQueued(e.target.checked)}
                size="small"
              />
            }
            label={isQueued ? 'Queued' : 'Working'}
            labelPlacement="start"
            sx={{ mr: 1 }}
          />
          <Button
            variant="contained"
            size="small"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={isSaving}
            sx={{
              backgroundColor: theme.palette.secondary.dark,
              '&:hover': {
                backgroundColor: theme.palette.secondary.main,
              },
            }}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={(e) => setCreateAnchor(e.currentTarget)}
            sx={{
              borderColor: theme.palette.secondary.dark,
              color: theme.palette.secondary.dark,
              '&:hover': {
                borderColor: theme.palette.secondary.main,
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            New
          </Button>
          <Popover
            open={Boolean(createAnchor)}
            anchorEl={createAnchor}
            onClose={() => setCreateAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          >
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 280 }}>
              <Typography variant="body2" fontWeight={500}>
                Enter a name for the new cell line
              </Typography>
              <TextField
                size="small"
                placeholder="e.g. AIBNi001-A"
                inputRef={newNameInputRef}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const value = newNameInputRef.current?.value.trim();
                    if (value) {
                      onCreate(value);
                      setCreateAnchor(null);
                    }
                  }
                }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={() => {
                  const value = newNameInputRef.current?.value.trim();
                  if (value) {
                    onCreate(value);
                    setCreateAnchor(null);
                  }
                }}
                sx={{
                  backgroundColor: theme.palette.secondary.dark,
                  '&:hover': {
                    backgroundColor: theme.palette.secondary.main,
                  },
                }}
              >
                Create
              </Button>
            </Box>
          </Popover>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={(e) => setDiscardAnchor(e.currentTarget)}
            sx={{
              borderColor: theme.palette.secondary.dark,
              color: theme.palette.secondary.dark,
              '&:hover': {
                borderColor: theme.palette.secondary.main,
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            Reset
          </Button>
          <Popover
            open={Boolean(discardAnchor)}
            anchorEl={discardAnchor}
            onClose={() => setDiscardAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          >
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 250 }}>
              <Typography variant="body2" fontWeight={500}>
                Are you sure you want to reset changes?
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button
                  size="small"
                  onClick={() => setDiscardAnchor(null)}
                >
                  No
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => {
                    setDiscardAnchor(null);
                    onDiscard();
                  }}
                  sx={{
                    backgroundColor: theme.palette.secondary.dark,
                    '&:hover': {
                      backgroundColor: theme.palette.secondary.main,
                    },
                  }}
                >
                  Yes
                </Button>
              </Box>
            </Box>
          </Popover>
        </Box>
      </Box>

      {/* Content area */}
      <Box sx={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* Main editor area */}
      <Box
        component="form"
        ref={formRef}
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          p: 2,
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.grey[300],
            borderRadius: '4px',
          },
        }}
      >
        {Object.entries(data).map(([sectionName, instances]) => (
          <Section
            key={sectionName}
            sectionName={sectionName}
            sectionId={`section-${sectionName}`}
            instances={instances as any[]}
          />
        ))}
      </Box>

      {/* Table of Contents */}
      <TableOfContents sections={sectionNames} onSectionClick={scrollToSection} />
      </Box>
    </Box>
  );
};

export default CellLineEditor;
