import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Container,
  Grid,
  IconButton,
  Paper,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  SwapHoriz as SwapHorizIcon,
  Edit as EditIcon,
  Translate as TranslateIcon,
  Description as DescriptionIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';

const TranslatorApp = () => {
  // Initialize all state values
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [selectedSourceLang, setSelectedSourceLang] = useState('Việt');
  const [selectedTargetLang, setSelectedTargetLang] = useState('Trung');
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  // File type validation
  const SUPPORTED_FILE_TYPES = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ];

  // Safe state update function
  const handleOCRResponse = (text) => {
    if (text) {
      setSourceText(text);
    }
  };

  // OCR Processing Function with error handling
  const processOCR = async (file) => {
    if (!file) return;

    setIsProcessing(true);
    setTranslatedText('Đang xử lý...');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8069/ocr/', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let combinedText = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line.replace('data: ', ''));
              if (data && data.text) {
                combinedText += data.text + '\n';
                handleOCRResponse(combinedText.trim());
              }
            } catch (e) {
              console.error('Error parsing line:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing file:', error);
      handleOCRResponse('Error processing file: ' + error.message);
    } finally {
      setIsProcessing(false);
      setTranslatedText('');
    }
  };

  // Event handlers with null checks
  const handleDrag = (e) => {
    if (!e) return;
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const validateFile = (file) => {
    if (!file) return false;
    if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
      alert('Định dạng file không được hỗ trợ. Vui lòng sử dụng .docx, .pdf, hoặc ảnh');
      return false;
    }
    return true;
  };

  const handleDrop = (e) => {
    if (!e) return;
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e?.dataTransfer?.files?.[0];
    if (file && validateFile(file)) {
      setUploadedFile(file);
      processOCR(file);
    }
  };

  const handleFileInput = (e) => {
    const file = e?.target?.files?.[0];
    if (file && validateFile(file)) {
      setUploadedFile(file);
      processOCR(file);
    }
  };

  // Safe render function
  const renderContent = () => {
    if (tabValue === 2) {
      return (
        <Box 
          sx={{ 
            p: 6, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            gap: 2,
            position: 'relative'
          }}
          onDragEnter={handleDrag}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,.pdf,.jpg,.jpeg,.png"
            style={{ display: 'none' }}
            onChange={handleFileInput}
          />

          <Box
            sx={{
              width: '200px',
              height: '200px',
              bgcolor: dragActive ? '#EDF3FF' : '#F8F9FA',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
              transition: 'background-color 0.3s'
            }}
          >
            {isProcessing ? (
              <CircularProgress size={80} />
            ) : (
              <CloudUploadIcon sx={{ fontSize: 80, color: '#1967D2' }} />
            )}
          </Box>
          
          {uploadedFile ? (
            <Typography variant="h6" sx={{ textAlign: 'center' }}>
              Đã chọn: {uploadedFile.name}
            </Typography>
          ) : (
            <>
              <Typography variant="h6" sx={{ textAlign: 'center' }}>
                Kéo và thả
              </Typography>
              <Typography sx={{ textAlign: 'center', mb: 2 }}>
                Hoặc chọn một tệp
              </Typography>
            </>
          )}

          <Button
            variant="contained"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            sx={{
              bgcolor: '#1967D2',
              color: 'white',
              textTransform: 'none',
              px: 4,
              '&:hover': {
                bgcolor: '#1557B0',
              },
            }}
          >
            Chọn tệp
          </Button>

          {dragActive && (
            <Box
              sx={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: 2,
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                bgcolor: 'rgba(25, 103, 210, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Typography variant="h6" sx={{ color: '#1967D2' }}>
                Thả tệp ở đây
              </Typography>
            </Box>
          )}
        </Box>
      );
    }

    return (
      <Grid container>
        <Grid item xs={6} sx={{ p: 2, borderRight: 1, borderColor: 'divider' }}>
          <TextField
            fullWidth
            multiline
            rows={10}
            placeholder="Nhập văn bản"
            variant="outlined"
            value={sourceText || ''}
            onChange={(e) => setSourceText(e.target.value)}
          />
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mt: 2 
          }}>
            <Typography variant="body2" color="text.secondary">
              {(sourceText || '').length} / 5000
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={6} sx={{ p: 2, bgcolor: 'grey.50' }}>
          <Box sx={{
            minHeight: '230px',
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {isProcessing ? (
              <CircularProgress />
            ) : (
              translatedText || ''
            )}
          </Box>
        </Grid>
      </Grid>
    );
  };

  // Main render
  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', gap: 1, py: 1 }}>
            <Button
              variant={tabValue === 0 ? "contained" : "text"}
              startIcon={<TranslateIcon />}
              onClick={() => setTabValue(0)}
              sx={{
                textTransform: 'none',
                backgroundColor: tabValue === 0 ? '#EDF3FF' : 'transparent',
                color: tabValue === 0 ? '#1967D2' : 'grey.600',
                '&:hover': {
                  backgroundColor: tabValue === 0 ? '#EDF3FF' : 'transparent',
                },
                boxShadow: 'none',
                px: 2,
                minWidth: 'auto',
              }}
            >
              Văn bản
            </Button>
            <Button
              variant={tabValue === 2 ? "contained" : "text"}
              startIcon={<DescriptionIcon />}
              onClick={() => setTabValue(2)}
              sx={{
                textTransform: 'none',
                backgroundColor: tabValue === 2 ? '#EDF3FF' : 'transparent',
                color: tabValue === 2 ? '#1967D2' : 'grey.600',
                '&:hover': {
                  backgroundColor: tabValue === 2 ? '#EDF3FF' : 'transparent',
                },
                boxShadow: 'none',
                px: 2,
                minWidth: 'auto',
              }}
            >
              Tài liệu
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ borderRadius: 2 }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            gap: 2
          }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Button
                  sx={{
                    minWidth: 'auto',
                    px: 1,
                    fontWeight: selectedSourceLang === 'Việt' ? 700 : 400,
                    color: selectedSourceLang === 'Việt' ? '#1967D2' : 'text.primary',
                  }}
                  onClick={() => {
                    setSelectedSourceLang('Việt');
                    setSelectedTargetLang('Trung');
                  }}
                >
                  Việt
                </Button>
                <Typography sx={{ mx: 1 }}>•</Typography>
                <Button
                  sx={{
                    minWidth: 'auto',
                    px: 1,
                    fontWeight: selectedSourceLang === 'Trung' ? 700 : 400,
                    color: selectedSourceLang === 'Trung' ? '#1967D2' : 'text.primary',
                  }}
                  onClick={() => {
                    setSelectedSourceLang('Trung');
                    setSelectedTargetLang('Việt');
                  }}
                >
                  Trung
                </Button>
              </Box>
            </Box>

            <IconButton 
              onClick={() => {
                const temp = selectedSourceLang;
                setSelectedSourceLang(selectedTargetLang);
                setSelectedTargetLang(temp);
              }}
            >
              <SwapHorizIcon />
            </IconButton>

            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <Button
                  sx={{
                    minWidth: 'auto',
                    px: 1,
                    fontWeight: selectedTargetLang === 'Việt' ? 700 : 400,
                    color: selectedTargetLang === 'Việt' ? '#1967D2' : 'text.primary',
                  }}
                  onClick={() => {
                    setSelectedTargetLang('Việt');
                    setSelectedSourceLang('Trung');
                  }}
                >
                  Việt
                </Button>
                <Typography sx={{ mx: 1 }}>•</Typography>
                <Button
                  sx={{
                    minWidth: 'auto',
                    px: 1,
                    fontWeight: selectedTargetLang === 'Trung' ? 700 : 400,
                    color: selectedTargetLang === 'Trung' ? '#1967D2' : 'text.primary',
                  }}
                  onClick={() => {
                    setSelectedTargetLang('Trung');
                    setSelectedSourceLang('Việt');
                  }}
                >
                  Trung
                </Button>
              </Box>
            </Box>
          </Box>

          {renderContent()}
        </Paper>
      </Container>
    </Box>
  );
};

export default TranslatorApp;