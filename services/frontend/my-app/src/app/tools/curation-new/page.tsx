'use client';

import { Container, Typography, Box, List, ListItem, ListItemIcon, ListItemText, Checkbox, IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import Card from '@/app/components/Card';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BlurOnOutlinedIcon from '@mui/icons-material/BlurOnOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useState, useRef } from 'react';



const headerStyles = {
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid #e0e0e0',
  height: '3rem',
  padding: 0.5
}

export default function CurationNewPage() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [hoveredFile, setHoveredFile] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ mouseX: number; mouseY: number } | null>(null);
  const [selectedFileForMenu, setSelectedFileForMenu] = useState<string | null>(null);

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return '/icons/pdf.png';
      case 'docx':
        return '/icons/docx-file.png';
      case 'txt':
        return '/icons/txt.png';
      case 'json':
      case 'jsonc':
        return '/icons/json.png';
      default:
        return '/icons/txt.png'; // fallback
    }
  };

  return (
    <Box sx={{display: 'flex', flexDirection: 'row', gap: 2, height: '92vh' }}>


        {/* Left quarter */}
        <Box id="left-quarter" sx={{
          flex: 1,
          backgroundColor: 'background.main',
          overflow: 'auto',
          maxHeight: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}>

          {/* Upload card */}
          <Card width="100%" height="40%" marginBottom={2}>


            {/* Content */}
            <Box id="upload-card-content" sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

              {/* Header */}
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flex: 1, gap: 2, marginX: 2, marginY: 1 }}>
              <Button
                component="label"
                id="upload-button"
                variant="contained"
                color="primary"
                sx={{
                  backgroundColor: 'transparent',
                  borderRadius: 20,
                  height: '40px',
                  border: '1px solid #e0e0e0',
                  flex: 1,
                  '&:hover': {
                    backgroundColor: 'background.main',
                    boxShadow: 'none'
                  },
                  color: 'primary.contrastText',
                  boxShadow: 'none'
                }}
              >
                <FileUploadOutlinedIcon sx={{ mr: 1 }} />
                Upload sources
                <input
                  type="file"
                  hidden
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.json,.jsonc"
                  onChange={(e: { target: { files: any; }; }) => {
                    const files = Array.from(e.target.files || []) as File[];
                    setUploadedFiles(prev => [...prev, ...files]);
                    console.log('Selected files:', files);
                  }}
                />
              </Button>

              <Typography variant="caption" color="text.secondary">
                {selectedFiles.length}/{uploadedFiles.length} sources selected
              </Typography>
            </Box>

            {/* Article list */}
            <Box id="article-list" sx={{
              paddingX: 2,
              paddingTop: 0,
              paddingBottom: 2,
              flex: 7,
              overflow: 'auto',
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'primary.grey',
                borderRadius: '4px',
              }
            }}>
              {/* Select all header */}
              <ListItem
                sx={{
                  borderBottom: '1px solid #e0e0e0',
                  mb: 1
                }}
                secondaryAction={
                  <Checkbox
                    edge="end"
                    checked={uploadedFiles.length > 0 && selectedFiles.length === uploadedFiles.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFiles(uploadedFiles.map(file => file.name));
                      } else {
                        setSelectedFiles([]);
                      }
                    }}
                    sx={{
                      '&.Mui-checked': {
                        color: 'grey.dark'  // Your custom color here
                      },
                      '&.Mui-indeterminate': {
                        color: 'grey.dark'
                      }
                    }}
                  />
                }
              >
                <ListItemText
                  primary="Select all sources"
                  primaryTypographyProps={{
                    variant: 'subtitle2',
                    fontWeight: 'medium',
                    color: 'text.secondary'
                  }}
                />
              </ListItem>

              <List>
                {uploadedFiles.map((file, index) => (
                  <ListItem
                    key={`${file.name}-${index}`}
                    onMouseEnter={() => setHoveredFile(file.name)}
                    onMouseLeave={() => setHoveredFile(null)}
                    onClick={() => {
                      if (selectedFiles.includes(file.name)) {
                        setSelectedFiles(prev => prev.filter(name => name !== file.name));
                      } else {
                        setSelectedFiles(prev => [...prev, file.name]);
                      }
                    }}
                    sx={{
                      cursor: 'pointer',
                      borderRadius: 2,
                      '&:hover': {
                        backgroundColor: 'background.main'
                      }
                    }}
                    secondaryAction={
                      <Checkbox
                        edge="end"
                        checked={selectedFiles.includes(file.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFiles(prev => [...prev, file.name]);
                          } else {
                            setSelectedFiles(prev => prev.filter(name => name !== file.name));
                          }
                        }}
                        sx={{
                          '&.Mui-checked': {
                            color: 'grey.dark'  // Your custom color here
                          }
                        }}
                      />
                    }
                  >
                    <ListItemIcon>
                      {hoveredFile === file.name ? (
                        <Tooltip
                          title="More"
                          slotProps={{
                            tooltip: {
                              sx: {
                                backgroundColor: 'grey.dark',
                                color: 'white',
                                fontSize: '0.875rem',
                                padding: '8px 12px'
                              }
                            }
                          }}
                        >
                          <IconButton
                            edge="start"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenuAnchor({
                                mouseX: rect.left,
                                mouseY: rect.bottom,
                              });
                              setSelectedFileForMenu(file.name);
                            }}
                            sx={{
                              '&:hover': {
                                backgroundColor: 'transparent'
                              }
                            }}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Box sx={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img
                            src={getFileIcon(file.name)}
                            alt={`${file.name} icon`}
                            style={{ width: 20, height: 20 }}
                          />
                        </Box>
                      )}
                    </ListItemIcon>
                    <ListItemText primary={file.name.split('.')[0]} />
                  </ListItem>
                ))}
              </List>

            </Box>

            {/* Start AI Curation Button */}
            <Button
              id="start-ai-curation-button"
              variant="contained"
              color="primary"
              sx={{
                backgroundColor: 'transparent',
                flex: 1,
                margin: 2,
                borderRadius: 20,
                height: '40px',
                width: '80%',
                alignSelf: 'center',
                border: '1px solid #e0e0e0',
                '&:hover': {
                  backgroundColor: 'primary.light',
                  boxShadow: 'none'
                },
                color: 'primary.contrastText',
                boxShadow: 'none'
              }}
            >
              <BlurOnOutlinedIcon sx={{ mr: 1 }} />
              Start AI Curation
            </Button>


            </Box>

            

          </Card>


        
          {/* Second card */}
          <Card width="100%" flex={1}>
            {/* Header section */}
            <Box sx={headerStyles}>
              <Typography variant="body1" color="text.secondary" padding={2}> View  </Typography>
            </Box>

          </Card>
            

            
        </Box>

        {/* Middle half (two quarters merged) */}
        <Box sx={{
          flex: 2,
          backgroundColor: '#ffffff',
          borderRadius: 5,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
          maxHeight: '100%'
        }}>

          {/* Header section */}
          <Box sx={headerStyles}>
            <Typography variant="body1" color="text.secondary" padding={2}> Cell Line Editor </Typography>
          </Box>

          {/* Body section */}
          <Box sx={{ p: 2 }}>
            Content here
          </Box>
        </Box>



        {/* Right quarter */}
        <Box sx={{
          flex: 1,
          backgroundColor: '#ffffff',
          borderRadius: 5,
          overflow: 'auto',
          maxHeight: '100%'
        }}>

          {/* Header section */}
          <Box sx={headerStyles}>
            <Typography variant="body1" color="text.secondary" padding={2}> Info </Typography>
          </Box>

          {/* Body section */}
          <Box sx={{ p: 2 }}>
            Content here
          </Box>
        </Box>

        {/* Context Menu */}
        <Menu
          open={Boolean(menuAnchor)}
          onClose={() => {
            setMenuAnchor(null);
            setSelectedFileForMenu(null);
          }}
          anchorReference="anchorPosition"
          anchorPosition={
            menuAnchor !== null
              ? { top: menuAnchor.mouseY, left: menuAnchor.mouseX }
              : undefined
          }
        >
          <MenuItem onClick={() => {
            // Handle rename logic here
            console.log('Rename:', selectedFileForMenu);
            setMenuAnchor(null);
            setSelectedFileForMenu(null);
          }}>
            Rename source
          </MenuItem>
          <MenuItem onClick={() => {
            // Handle remove logic here
            if (selectedFileForMenu) {
              setUploadedFiles(prev => prev.filter(file => file.name !== selectedFileForMenu));
              setSelectedFiles(prev => prev.filter(name => name !== selectedFileForMenu));
            }
            setMenuAnchor(null);
            setSelectedFileForMenu(null);
          }}>
            Remove source
          </MenuItem>
        </Menu>
      </Box>
  );
}