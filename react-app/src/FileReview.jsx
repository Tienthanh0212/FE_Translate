import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';

const FilePreview = ({ file }) => {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }

    const loadFilePreview = async () => {
      try {
        if (file.type.includes('image')) {
          const reader = new FileReader();
          reader.onloadend = () => setPreview(reader.result);
          reader.readAsDataURL(file);
        } 
        else if (file.type === 'application/pdf') {
          const url = URL.createObjectURL(file);
          setPreview(url);
          return () => URL.revokeObjectURL(url);
        }
        else {
          setPreview('preview-not-available');
        }
      } catch (err) {
        console.error('Error loading file preview:', err);
        setError('Không thể tải xem trước file');
      }
    };

    loadFilePreview();
  }, [file]);

  if (!file) {
    return (
      <Box
        sx={{
          width: '100%',
          height: 300,
          bgcolor: 'grey.100',
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Chưa có file nào được chọn
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          width: '100%',
          height: 300,
          bgcolor: 'error.light',
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!preview) {
    return (
      <Box
        sx={{
          width: '100%',
          height: 300,
          bgcolor: 'grey.100',
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (preview === 'preview-not-available') {
    return (
      <Box
        sx={{
          width: '100%',
          height: 300,
          bgcolor: 'grey.100',
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Không hỗ trợ xem trước định dạng này
        </Typography>
      </Box>
    );
  }

  if (file.type.includes('image')) {
    return (
      <Box
        sx={{
          width: '100%',
          height: 300,
          bgcolor: 'grey.100',
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
      >
        <img
          src={preview}
          alt="Preview"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain'
          }}
        />
      </Box>
    );
  }

  if (file.type === 'application/pdf') {
    return (
      <Box
        sx={{
          width: '100%',
          height: 300,
          bgcolor: 'grey.100',
          borderRadius: 1,
          overflow: 'hidden'
        }}
      >
        <iframe
          src={preview}
          title="PDF Preview"
          style={{
            width: '100%',
            height: '100%',
            border: 'none'
          }}
        />
      </Box>
    );
  }

  return null;
};

export default FilePreview;