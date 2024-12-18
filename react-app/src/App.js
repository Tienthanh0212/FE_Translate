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

const TranslatorApp = () => {
  const languages = [
    { code: "vi", name: "Tiếng Việt" },
    { code: "en", name: "Tiếng Anh" },
    { code: "zh", name: "Tiếng Trung" },
    { code: "ja", name: "Tiếng Nhật" },
    { code: "ko", name: "Tiếng Hàn" },
    { code: "fr", name: "Tiếng Pháp" },
    { code: "de", name: "Tiếng Đức" },
  ];
  const [tabValue, setTabValue] = useState(0);
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [isProcessing, setIsProcessing] = useState(false);

  const [textTabSourceText, setTextTabSourceText] = useState("");
  const [textTabTranslatedText, setTextTabTranslatedText] = useState("");
  const [documentTabSourceText, setDocumentTabSourceText] = useState("");
  const [documentTabTranslatedText, setDocumentTabTranslatedText] =
    useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [showUploadInterface, setShowUploadInterface] = useState(true);
  const [pageTexts, setPageTexts] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const fileInputRef = useRef(null);

  const SUPPORTED_FILE_TYPES = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/jpeg",
    "image/png",
  ];

  const handleOCRResponse = (text) => {
    if (text) {
      setDocumentTabSourceText(text);
      setShowUploadInterface(false);
    }
  };

  const processOCR = async (file) => {
    if (!file) return;

    setIsProcessing(true);
    setDocumentTabTranslatedText("Đang xử lý...");
    setPageTexts([]);
    setCurrentPage(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8069/ocr/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Stream the response to handle page-by-page text extraction
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const pageTextResults = [];
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Split buffer by page delimiter
        const pageDelimiter = "---PAGE_BREAK---";
        const pages = buffer.split(pageDelimiter);

        // Process complete pages
        while (pages.length > 1) {
          const pageText = pages.shift().trim();
          if (pageText) {
            pageTextResults.push(pageText);
          }
        }

        // Keep the last (potentially incomplete) page in buffer
        buffer = pages[0];
      }

      // Add any remaining text in buffer
      if (buffer.trim()) {
        pageTextResults.push(buffer.trim());
      }

      // Update state with extracted page texts
      setPageTexts(pageTextResults);
      setDocumentTabSourceText(pageTextResults[0] || "");
      setShowUploadInterface(false);
      setCurrentPage(0);
    } catch (error) {
      console.error("Error processing file:", error);
      setDocumentTabSourceText("Đã xảy ra lỗi: " + error.message);
    } finally {
      setIsProcessing(false);
      setDocumentTabTranslatedText("");
    }
  };

  const handleDrag = (e) => {
    if (!e) return;
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const validateFile = (file) => {
    if (!file) return false;
    if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
      alert(
        "Định dạng file không được hỗ trợ. Vui lòng sử dụng .docx, .pdf, hoặc ảnh"
      );
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
  const handlePageNavigation = (pageIndex) => {
    if (pageIndex >= 0 && pageIndex < pageTexts.length) {
      setCurrentPage(pageIndex);
      setDocumentTabSourceText(pageTexts[pageIndex]);
    }
  };
  const renderLanguageSelectors = () => (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        p: 2,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <FormControl size="small" sx={{ width: 200 }}>
        <InputLabel>Ngôn ngữ muốn dịch</InputLabel>
        <Select
          value={targetLanguage}
          label="Ngôn ngữ muốn dịch"
          onChange={(e) => setTargetLanguage(e.target.value)}
        >
          {languages.map((lang) => (
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

      {uploadedFile ? (
        <Typography variant="h6" sx={{ textAlign: "center" }}>
          Đã chọn: {uploadedFile.name}
        </Typography>
      ) : (
        <>
          <Typography variant="h6" sx={{ textAlign: "center" }}>
            Kéo và thả
          </Typography>
          <Typography sx={{ textAlign: "center", mb: 2 }}>
            Hoặc chọn một tệp
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
          Tài liệu đã tải lên: {uploadedFile?.name}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<CloudUploadIcon />}
          onClick={() => setShowUploadInterface(true)}
          sx={{
            textTransform: "none",
            color: "#1967D2",
            borderColor: "#1967D2",
          }}
        >
          Tải lên tài liệu khác
        </Button>
      </Box>

      <Grid container>
        <Grid item xs={6} sx={{ p: 2, borderRight: 1, borderColor: "divider" }}>
          <TextField
            fullWidth
            multiline
            rows={10}
            placeholder="Nhập văn bản"
            variant="outlined"
            value={documentTabSourceText}
            onChange={(e) => setDocumentTabSourceText(e.target.value)}
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
              {documentTabSourceText.length} / 5000
            </Typography>
            {pageTexts.length > 1 && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Button
                  variant="outlined"
                  disabled={currentPage === 0}
                  onClick={() => handlePageNavigation(currentPage - 1)}
                >
                  Trang trước
                </Button>
                <Typography>
                  Trang {currentPage + 1} / {pageTexts.length}
                </Typography>
                <Button
                  variant="outlined"
                  disabled={currentPage === pageTexts.length - 1}
                  onClick={() => handlePageNavigation(currentPage + 1)}
                >
                  Trang sau
                </Button>
              </Box>
            )}
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
                {documentTabTranslatedText || "Chưa có kết quả dịch"}
              </Typography>
            )}
          </Box>
        </Grid>
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
