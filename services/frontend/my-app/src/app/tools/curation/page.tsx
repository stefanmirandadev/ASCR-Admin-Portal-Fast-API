'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  LinearProgress,
  Paper,
  Divider,
  Stack,
  Alert,
  Fade,
  Collapse,
  Modal,
  Backdrop,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Article as ArticleIcon,
  Biotech as BiotechIcon,
  HourglassEmpty as HourglassEmptyIcon,
} from '@mui/icons-material';
import CurationCellLineEditor from './components/CurationCellLineEditor';

interface CurationJob {
  status: 'processing' | 'completed' | 'error';
  currentArticle: number;
  totalArticles: number;
  message?: string;
}

interface CellLineEntry {
  id: string;
  data: any;
  status: 'pending' | 'saved' | 'error';
}

export default function CurationPage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [curationJob, setCurationJob] = useState<CurationJob | null>(null);
  const [cellLines, setCellLines] = useState<CellLineEntry[]>([]);
  const [selectedCellLineId, setSelectedCellLineId] = useState<string | null>(null);
  const [response, setResponse] = useState<any>(null);
  const [successModal, setSuccessModal] = useState<{ open: boolean; count: number }>({ open: false, count: 0 });

  // Auto-close success modal and reset page
  useEffect(() => {
    if (successModal.open) {
      const timer = setTimeout(() => {
        setSuccessModal({ open: false, count: 0 });
        // Reset page to initial state
        setSelectedFiles([]);
        setCurationJob(null);
        setCellLines([]);
        setSelectedCellLineId(null);
        setResponse(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [successModal.open]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length !== files.length) {
      alert('Only PDF files are allowed. Non-PDF files have been filtered out.');
    }
    
    if (pdfFiles.length > 0) {
      setSelectedFiles(pdfFiles);
      setResponse(null);
    } else {
      alert('Please select at least one PDF file');
      event.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setCurationJob({ status: 'processing', currentArticle: 1, totalArticles: selectedFiles.length });
    setCellLines([]);
    setSelectedCellLineId(null);
    
    try {
      let allCellLines: CellLineEntry[] = [];
      
      // Process each file sequentially
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        // Update progress
        setCurationJob({ 
          status: 'processing', 
          currentArticle: i + 1, 
          totalArticles: selectedFiles.length 
        });
        
        try {
          // Convert file to bytes
          const fileBytes = await file.arrayBuffer();
          
          // Call the curation service
          const response = await fetch('http://localhost:8001/single_article_curate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filename: file.name,
              file_data: Array.from(new Uint8Array(fileBytes))
            })
          });

          const result = await response.json();
          console.log(`Curation service response for ${file.name}:`, result);
          
          // Process the results into cell line entries
          if (result.curated_data && Object.keys(result.curated_data).length > 0) {
            const newCellLines: CellLineEntry[] = Object.entries(result.curated_data).map(([cellLineId, cellLineData]) => ({
              id: `${cellLineId}`, // Could add file prefix if needed: `${file.name}_${cellLineId}`
              data: cellLineData,
              status: 'pending' as const
            }));
            allCellLines = [...allCellLines, ...newCellLines];
            
            // Update cell lines in real-time as they're processed
            setCellLines([...allCellLines]);
          }
          
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError);
          // Continue with next file on error
        }
      }
      
      setCurationJob({ 
        status: 'completed', 
        currentArticle: selectedFiles.length, 
        totalArticles: selectedFiles.length 
      });
      
      setResponse({ 
        status: 'success',
        message: `Processed ${selectedFiles.length} files`,
        total_cell_lines: allCellLines.length
      });
      
    } catch (error) {
      console.error('Error during bulk upload:', error);
      setCurationJob({ 
        status: 'error', 
        currentArticle: 0, 
        totalArticles: selectedFiles.length, 
        message: 'Failed to process files' 
      });
    } finally {
      setUploading(false);
    }
  };

  // Handle saving a single cell line
  const handleSaveCellLine = async (cellLineId: string, cellLineData: any) => {
    try {
      const response = await fetch(`http://localhost:8002/curated-cell-lines/${encodeURIComponent(cellLineId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cellLineData),
      });

      if (response.ok) {
        // Mark as saved and remove from list
        setCellLines(prev => prev.filter(cl => cl.id !== cellLineId));
        console.log('Cell line saved successfully:', cellLineId);
      } else {
        // Mark as error
        setCellLines(prev => prev.map(cl => 
          cl.id === cellLineId ? { ...cl, status: 'error' as const } : cl
        ));
        console.error('Failed to save cell line:', cellLineId);
      }
    } catch (error) {
      setCellLines(prev => prev.map(cl => 
        cl.id === cellLineId ? { ...cl, status: 'error' as const } : cl
      ));
      console.error('Error saving cell line:', cellLineId, error);
    }
  };

  // Handle accepting all cell lines (save all and clear)
  const handleAcceptAll = async () => {
    const pendingCellLines = cellLines.filter(cl => cl.status === 'pending');
    const count = pendingCellLines.length;
    
    for (const cellLine of pendingCellLines) {
      await handleSaveCellLine(cellLine.id, cellLine.data);
    }
    
    // Show success modal
    setSuccessModal({ open: true, count });
  };

  // Get selected cell line data
  const selectedCellLine = cellLines.find(cl => cl.id === selectedCellLineId);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h1" component="h1">
            <ArticleIcon sx={{ mr: 2, fontSize: 'inherit', verticalAlign: 'middle' }} />
            Article Curation
          </Typography>
          
          {selectedFiles.length > 0 && (
            <Button
              variant={uploading || curationJob ? "contained" : "outlined"}
              onClick={handleUpload}
              disabled={uploading}
              startIcon={uploading ? <HourglassEmptyIcon /> : <SaveIcon />}
            >
              {uploading ? 'Processing...' : `Start Curation (${selectedFiles.length} files)`}
            </Button>
          )}
        </Box>
        
        <Grid container spacing={3}>
          {/* Left Panel - Upload & Progress */}
          <Grid item xs={12} md={4}>
            <Stack spacing={3}>
              {/* Upload Component */}
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5" component="h2">
                      <CloudUploadIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Upload PDF Articles
                    </Typography>
                    
                    <Button
                      variant="outlined"
                      component="label"
                    >
                      Browse files
                      <input
                        type="file"
                        accept=".pdf"
                        multiple
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                      />
                    </Button>
                  </Box>

                  {/* Selected Files Display */}
                  <Collapse in={selectedFiles.length > 0}>
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle1" component="h4" sx={{ mb: 2 }}>
                        Selected Files ({selectedFiles.length})
                      </Typography>
                      
                      <Box sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 1, overflow: 'hidden' }}>
                        {selectedFiles.map((file, index) => (
                          <Box
                            key={index}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              px: 2,
                              py: 1,
                              borderBottom: index < selectedFiles.length - 1 ? '1px solid' : 'none',
                              borderColor: 'grey.100',
                              '&:hover': { bgcolor: 'grey.50' }
                            }}
                          >
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.875rem' }} noWrap>
                                {file.name}
                              </Typography>
                            </Box>
                            <IconButton
                              onClick={() => removeFile(index)}
                              disabled={uploading}
                              size="small"
                              sx={{ ml: 1, p: 0.5 }}
                            >
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Collapse>
                </CardContent>
              </Card>

              {/* Progress Tracking */}
              {curationJob && (
                <Fade in={Boolean(curationJob)}>
                  <Card>
                    <CardContent>
                      <Typography variant="h5" component="h3" gutterBottom>
                        Curation Progress
                      </Typography>
                      
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          {curationJob.status === 'processing' && (
                            <Box sx={{ mr: 2 }}>
                              <LinearProgress 
                                variant="determinate" 
                                value={(curationJob.currentArticle / curationJob.totalArticles) * 100}
                                sx={{ width: 40, height: 6, borderRadius: 3 }}
                              />
                            </Box>
                          )}
                          {curationJob.status === 'completed' && (
                            <CheckCircleIcon sx={{ mr: 2, color: 'success.main' }} />
                          )}
                          {curationJob.status === 'error' && (
                            <ErrorIcon sx={{ mr: 2, color: 'error.main' }} />
                          )}
                          
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {curationJob.status === 'processing' && `Curating... Article ${curationJob.currentArticle}/${curationJob.totalArticles}`}
                            {curationJob.status === 'completed' && `Completed! Found ${cellLines.length} cell lines`}
                            {curationJob.status === 'error' && `Error: ${curationJob.message}`}
                          </Typography>
                        </Box>
                        
                        {curationJob.status === 'processing' && (
                          <LinearProgress 
                            variant="indeterminate"
                            sx={{ 
                              mt: 1,
                              '& .MuiLinearProgress-bar': {
                                animationDuration: '2s'
                              }
                            }}
                          />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Fade>
              )}

              {/* Cell Lines List */}
              {cellLines.length > 0 && (
                <Fade in={cellLines.length > 0}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h5" component="h3">
                          <BiotechIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                          Cell Lines
                        </Typography>
                        {cellLines.filter(cl => cl.status === 'pending').length > 0 && (
                          <Button
                            variant="contained"
                            color="success"
                            onClick={handleAcceptAll}
                            size="small"
                          >
                            Accept All
                          </Button>
                        )}
                      </Box>
                      
                      <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
                        <List>
                          {cellLines.map((cellLine) => (
                            <ListItemButton
                              key={cellLine.id}
                              onClick={() => setSelectedCellLineId(cellLine.id)}
                              selected={selectedCellLineId === cellLine.id}
                              divider
                            >
                              <ListItemText
                                primary={cellLine.id}
                                primaryTypographyProps={{ fontWeight: 500 }}
                              />
                              <Chip
                                size="small"
                                label={
                                  cellLine.status === 'pending' ? 'Pending' :
                                  cellLine.status === 'saved' ? 'Saved' :
                                  'Error'
                                }
                                color={
                                  cellLine.status === 'pending' ? 'warning' :
                                  cellLine.status === 'saved' ? 'success' :
                                  'error'
                                }
                                variant="outlined"
                              />
                            </ListItemButton>
                          ))}
                        </List>
                      </Paper>
                    </CardContent>
                  </Card>
                </Fade>
              )}
            </Stack>
          </Grid>

          {/* Right Panel - Editor */}
          <Grid item xs={12} md={8}>
            {selectedCellLine ? (
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" component="h3">
                      Editing: {selectedCellLine.id}
                    </Typography>
                    <IconButton
                      onClick={() => setSelectedCellLineId(null)}
                      color="default"
                    >
                      <CloseIcon />
                    </IconButton>
                  </Box>
                  
                  <CurationCellLineEditor
                    cellLineId={selectedCellLine.id}
                    cellLineData={selectedCellLine.data}
                    onSave={(savedData) => {
                      handleSaveCellLine(selectedCellLine.id, savedData);
                      setSelectedCellLineId(null);
                    }}
                    onError={(error) => {
                      console.error('Error saving cell line:', selectedCellLine.id, error);
                      alert(`Error saving ${selectedCellLine.id}: ${error}`);
                    }}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 8 }}>
                  <BiotechIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h5" component="h3" gutterBottom>
                    No Cell Line Selected
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {cellLines.length > 0 
                      ? 'Click on a cell line from the list to edit it'
                      : 'Upload and curate an article to see cell lines here'
                    }
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
        
        {/* Success Modal */}
        <Modal
          open={successModal.open}
          onClose={() => {}} // Prevent manual close
          closeAfterTransition
          BackdropComponent={Backdrop}
          BackdropProps={{
            timeout: 500,
            sx: { backgroundColor: 'rgba(0, 0, 0, 0.3)' }
          }}
        >
          <Fade in={successModal.open}>
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 400,
                bgcolor: 'background.paper',
                borderRadius: 2,
                boxShadow: 24,
                p: 4,
                textAlign: 'center',
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" component="h2" gutterBottom>
                Success!
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Saved {successModal.count} cell line{successModal.count !== 1 ? 's' : ''}
              </Typography>
            </Box>
          </Fade>
        </Modal>
      </Container>
    </Box>
  );
}