import React, { useState, useRef } from "react";
import {
  Box,
  Button,
  Container,
  Grid,
  Paper,
  TextField,
  Typography,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  Translate as TranslateIcon,
  Description as DescriptionIcon,
  CloudUpload as CloudUploadIcon,
} from "@mui/icons-material";
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CancelIcon from '@mui/icons-material/Cancel';

const TranslatorApp = () => {
  // Languages for translation
  const translationLanguages = [
    { code: "vi", name: "Tiếng Việt" },
    { code: "en", name: "Tiếng Anh" },
    { code: "zh", name: "Tiếng Trung" },
    { code: "ja", name: "Tiếng Nhật" },
    { code: "ko", name: "Tiếng Hàn" },
    { code: "fr", name: "Tiếng Pháp" },
    { code: "de", name: "Tiếng Đức" },
  ];

  // Languages for OCR
  const ocrLanguages = [
    { code: "en", name: "Tiếng Anh" },
    { code: "ch", name: "Tiếng Trung Giản Thể" },
    { code: "korean", name: "Tiếng Hàn" },
  
  ];

  const [tabValue, setTabValue] = useState(0);
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [ocrLanguage, setOcrLanguage] = useState("en");
  const [isProcessing, setIsProcessing] = useState(false);

  const [textTabSourceText, setTextTabSourceText] = useState("");
  const [textTabTranslatedText, setTextTabTranslatedText] = useState("");
  const [documentTabSourceText, setDocumentTabSourceText] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [documentTabTranslatedText, setDocumentTabTranslatedText] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [showUploadInterface, setShowUploadInterface] = useState(true);
  const [pageTexts, setPageTexts] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  const SUPPORTED_FILE_TYPES = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/jpeg",
    "image/png",
  ];

  const validateFiles = (files) => {
    const validFiles = Array.from(files).filter(file => 
      SUPPORTED_FILE_TYPES.includes(file.type)
    );

    if (validFiles.length !== files.length) {
      alert("Một số file không được hỗ trợ. Chỉ chấp nhận .docx, .pdf, hoặc ảnh");
    }

    return validFiles;
  };

  const cancelProcessing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsProcessing(false);
      setDocumentTabTranslatedText("Đã hủy quá trình dịch");
    }
  };

  let buffer = '';

  const processOCR = async (file) => {
    if (!file) return;

    abortControllerRef.current = new AbortController();
    setIsProcessing(true);
    setDocumentTabTranslatedText("Đang xử lý...");
    setPageTexts([]);
    setCurrentPage(0);
    setShowUploadInterface(false);
    setDocumentTabSourceText(""); 

    const formData = new FormData();
    formData.append("file", file);

    try {
        const url = new URL('http://123.24.142.99:8010/ocr/');
        url.searchParams.append('lang', ocrLanguage);

        console.log("Sending request to:", url.toString());

        const response = await fetch(url, {
            method: "POST",
            body: formData,
            signal: abortControllerRef.current.signal,
        });

        console.log("Response status:", response.status);

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Backend error:", errorData);
            throw new Error(errorData.detail || "An error occurred during OCR processing");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            let boundaryIndex;
            while ((boundaryIndex = buffer.indexOf('\n')) >= 0) {
                const jsonStr = buffer.slice(0, boundaryIndex).trim();
                buffer = buffer.slice(boundaryIndex + 1);

                if (jsonStr.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(jsonStr.substring(6));
                        console.log("Parsed data:", data);

                        if (data.text) {
                            setPageTexts((prev) => {
                                const newPageTexts = [...prev, data.text];
                                if (newPageTexts.length - 1 === currentPage) {
                                    setDocumentTabSourceText(data.text);
                                }
                                return newPageTexts;
                            });
                        }
                    } catch (e) {
                        console.error("Error parsing JSON:", e, jsonStr);
                    }
                }
            }
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('OCR processing was cancelled');
        } else {
            console.error("Error in OCR process:", error);
            setDocumentTabSourceText("Đã xảy ra lỗi: " + error.message);
        }
    } finally {
        setIsProcessing(false);
    }
};


  const handlePageNavigation = (pageIndex) => {
    if (pageIndex >= 0 && pageIndex < pageTexts.length) {
      setCurrentPage(pageIndex);
      setDocumentTabSourceText(pageTexts[pageIndex]);
    }
  };

  const handleDrag = (e) => {
    if (!e) return;
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e?.dataTransfer?.files;
    if (files) {
      const validFiles = validateFiles(files);
      setUploadedFiles(validFiles);
      
      if (validFiles.length > 0) {
        processOCR(validFiles[0]);
        setCurrentFileIndex(0);
      }
    }
  };

  const handleFileInput = (e) => {
    const files = e?.target?.files;
    if (files) {
      const validFiles = validateFiles(files);
      setUploadedFiles(validFiles);
      
      if (validFiles.length > 0) {
        processOCR(validFiles[0]);
        setCurrentFileIndex(0);
      }
    }
  };

  const handleNextFile = () => {
    const nextIndex = currentFileIndex + 1;
    if (nextIndex < uploadedFiles.length) {
      setCurrentFileIndex(nextIndex);
      processOCR(uploadedFiles[nextIndex]);
    }
  };

  const renderLanguageSelectors = () => (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        p: 2,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
       {tabValue === 2 && (
        <FormControl size="small" sx={{ width: 200 }}>
          <InputLabel>Ngôn ngữ nhận dạng OCR</InputLabel>
          <Select
            value={ocrLanguage}
            label="Ngôn ngữ nhận dạng OCR"
            onChange={(e) => setOcrLanguage(e.target.value)}
          >
            {ocrLanguages.map((lang) => (
              <MenuItem key={lang.code} value={lang.code}>
                {lang.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
      <FormControl size="small" sx={{ width: 200 }}>
        <InputLabel>Ngôn ngữ muốn dịch</InputLabel>
        <Select
          value={targetLanguage}
          label="Ngôn ngữ muốn dịch"
          onChange={(e) => setTargetLanguage(e.target.value)}
        >
          {translationLanguages.map((lang) => (
            <MenuItem key={lang.code} value={lang.code}>
              {lang.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

     
    </Box>
  );

  const renderUploadInterface = () => (
    <Box
      sx={{
        p: 6,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        position: "relative",
      }}
      onDragEnter={handleDrag}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,.pdf,.jpg,.jpeg,.png"
        multiple
        style={{ display: "none" }}
        onChange={handleFileInput}
      />

      <Box
        sx={{
          width: "200px",
          height: "200px",
          bgcolor: dragActive ? "#EDF3FF" : "#F8F9FA",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 2,
          transition: "background-color 0.3s",
        }}
      >
        {isProcessing ? (
          <CircularProgress size={80} />
        ) : (
          <CloudUploadIcon sx={{ fontSize: 80, color: "#1967D2" }} />
        )}
      </Box>

      {uploadedFiles.length > 0 ? (
        <Typography variant="h6" sx={{ textAlign: "center" }}>
          Đã chọn: {uploadedFiles.length} tệp
        </Typography>
      ) : (
        <>
          <Typography variant="h6" sx={{ textAlign: "center" }}>
            Kéo và thả nhiều tệp
          </Typography>
          <Typography sx={{ textAlign: "center", mb: 2 }}>
            Hoặc chọn một hoặc nhiều tệp
          </Typography>
        </>
      )}

      <Button
        variant="contained"
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        sx={{
          bgcolor: "#1967D2",
          color: "white",
          textTransform: "none",
          px: 4,
          "&:hover": {
            bgcolor: "#1557B0",
          },
        }}
      >
        Chọn tệp
      </Button>

      {dragActive && (
        <Box
          sx={{
            position: "absolute",
            width: "100%",
            height: "100%",
            borderRadius: 2,
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            bgcolor: "rgba(25, 103, 210, 0.05)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Typography variant="h6" sx={{ color: "#1967D2" }}>
            Thả tệp ở đây
          </Typography>
        </Box>
      )}
    </Box>
  );

  const renderDocumentTextInterface = () => (
    <Box sx={{ p: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">
          Tài liệu đã tải lên: {uploadedFiles[currentFileIndex]?.name}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {isProcessing && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              onClick={cancelProcessing}
              sx={{ textTransform: 'none' }}
            >
              Ngắt dịch
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            onClick={() => {
              setShowUploadInterface(true);
              setUploadedFiles([]);
            }}
            sx={{
              textTransform: "none",
              color: "#1967D2",
              borderColor: "#1967D2",
            }}
          >
            Tải lên tài liệu khác
          </Button>
        </Box>
      </Box>
  
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <TextField
            fullWidth
            multiline
            rows={12}
            placeholder="Nội dung văn bản"
            variant="outlined"
            value={documentTabSourceText}
            onChange={(e) => setDocumentTabSourceText(e.target.value)}
            InputProps={{
              readOnly: isProcessing,
            }}
          />
          <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {documentTabSourceText.length} / 5000
            </Typography>
            {isProcessing && (
              <Typography variant="body2" color="primary">
                Đang xử lý trang {pageTexts.length}...
              </Typography>
            )}
          </Box>
        </Grid>
  
        <Grid item xs={6}>
          <Box
            sx={{
              height: '100%',
              minHeight: '300px',
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isProcessing ? (
              <CircularProgress />
            ) : (
              <Typography variant="body1">
                {documentTabTranslatedText || "Chưa có kết quả dịch"}
              </Typography>
            )}
          </Box>
        </Grid>
  
        {pageTexts.length > 0 && (
          <Grid item xs={12} sx={{ mt: 2, borderTop: 1, borderColor: 'divider', pt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
              <Button
                disabled={currentPage === 0}
                onClick={() => handlePageNavigation(currentPage - 1)}
                startIcon={<ArrowBackIcon />}
              >
                Trang trước
              </Button>
              <Typography>
                Trang {currentPage + 1} / {pageTexts.length}
                {isProcessing && "..."}
              </Typography>
              <Button
                disabled={currentPage >= pageTexts.length - 1}
                onClick={() => handlePageNavigation(currentPage + 1)}
                endIcon={<ArrowForwardIcon />}
              >
                Trang sau
              </Button>
            </Box>
          </Grid>
        )}
  
        {uploadedFiles.length > 1 && (
          <Grid item xs={12} sx={{ mt: 2, borderTop: 1, borderColor: 'divider', pt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
              <Button
                disabled={currentFileIndex === 0}
                onClick={() => {
                  const prevIndex = currentFileIndex - 1;
                  setCurrentFileIndex(prevIndex);
                  processOCR(uploadedFiles[prevIndex]);
                }}
                startIcon={<ArrowBackIcon />}
              >
                Tệp trước
              </Button>
              <Typography>
                Tệp {currentFileIndex + 1} / {uploadedFiles.length}
              </Typography>
              <Button
                disabled={currentFileIndex >= uploadedFiles.length - 1}
                onClick={handleNextFile}
                endIcon={<ArrowForwardIcon />}
              >
                Tệp sau
              </Button>
            </Box>
          </Grid>
        )}
      </Grid>
    </Box>
  );

  const renderTextTab = () => (
    <Grid container>
      <Grid item xs={6} sx={{ p: 2, borderRight: 1, borderColor: "divider" }}>
        <TextField
          fullWidth
          multiline
          rows={10}
          placeholder="Nhập văn bản"
          variant="outlined"
          value={textTabSourceText}
          onChange={(e) => setTextTabSourceText(e.target.value)}
        />
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mt: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {textTabSourceText.length} / 5000
          </Typography>
        </Box>
      </Grid>

      <Grid item xs={6} sx={{ p: 2, bgcolor: "grey.50" }}>
        <Box
          sx={{
            minHeight: "230px",
            p: 2,
            bgcolor: "background.paper",
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isProcessing ? (
            <CircularProgress />
          ) : (
            <Typography variant="body1" sx={{ textAlign: "center" }}>
              {textTabTranslatedText || "Chưa có kết quả dịch"}
            </Typography>
          )}
        </Box>
      </Grid>
    </Grid>
  );

  return (
    <Box
      sx={{ width: "100%", minHeight: "100vh", bgcolor: "background.default" }}
    >
      <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "grey.50" }}>
        <Container maxWidth="lg">
          <Box sx={{ display: "flex", gap: 1, py: 1 }}>
            <Button
              variant={tabValue === 0 ? "contained" : "text"}
              startIcon={<TranslateIcon />}
              onClick={() => setTabValue(0)}
              sx={{
                textTransform: "none",
                backgroundColor: tabValue === 0 ? "#EDF3FF" : "transparent",
                color: tabValue === 0 ? "#1967D2" : "grey.600",
                "&:hover": {
                  backgroundColor: tabValue === 0 ? "#EDF3FF" : "transparent",
                },
                boxShadow: "none",
                px: 2,
                minWidth: "auto",
              }}
            >
              Văn bản
            </Button>
            <Button
              variant={tabValue === 2 ? "contained" : "text"}
              startIcon={<DescriptionIcon />}
              onClick={() => setTabValue(2)}
              sx={{
                textTransform: "none",
                backgroundColor: tabValue === 2 ? "#EDF3FF" : "transparent",
                color: tabValue === 2 ? "#1967D2" : "grey.600",
                "&:hover": {
                  backgroundColor: tabValue === 2 ? "#EDF3FF" : "transparent",
                },
                boxShadow: "none",
                px: 2,
                minWidth: "auto",
              }}
            >
              Tài liệu
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ borderRadius: 2 }}>
          {renderLanguageSelectors()}

          {tabValue === 2
            ? showUploadInterface
              ? renderUploadInterface()
              : renderDocumentTextInterface()
            : renderTextTab()}
        </Paper>
      </Container>
    </Box>
  );
};

export default TranslatorApp;