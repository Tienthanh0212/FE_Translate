import React, { useState, useRef } from "react";
import { pdfjs } from 'react-pdf';
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
import PDFViewer from './PDFViewer';
import mammoth from 'mammoth';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const TranslatorApp = () => {
  // Languages for translation
  const translationLanguages = [
    { code: "vi", name: "Tiếng Việt" },
    { code: "en", name: "Tiếng Anh" },
    { code: "zh", name: "Tiếng Trung" },
    { code: "ja", name: "Tiếng Nhật" },
    // { code: "korean", name: "Tiếng Hàn" },
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
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [sourcePdfFile, setSourcePdfFile] = useState(null);
  const [translatedPdfUrl, setTranslatedPdfUrl] = useState(null);

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
  const [currentProcessingFile, setCurrentProcessingFile] = useState(null); 
  const abortControllerRef = useRef(null);
  

  const SUPPORTED_FILE_TYPES = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/jpeg",
    "image/png",
  ];

  // Thêm hàm xử lý DOCX
  const convertDocxToImages = async (file) => {
    const images = [];
    
    try {
      // Đọc file DOCX
      const buffer = await file.arrayBuffer();
      const arrayBuffer = new Uint8Array(buffer);
      
      // Sử dụng mammoth để chuyển DOCX thành HTML
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const html = result.value;
      
      // Tạo một div tạm thời để chứa nội dung HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      // Tìm tất cả các elements (không chỉ paragraphs)
      const elements = tempDiv.children;
      
      // Thiết lập canvas với kích thước A4
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Kích thước A4 ở 300 DPI
      canvas.width = 2480;  // 8.27 inches * 300 DPI
      canvas.height = 3508; // 11.69 inches * 300 DPI
      
      // Thiết lập font và style
      ctx.font = '36px Arial'; // Tăng font size để rõ ràng hơn ở 300 DPI
      const lineHeight = 48;
      const margin = 100;
      const maxWidth = canvas.width - (margin * 2);
      
      let currentPage = [];
      let currentY = margin;
      const maxY = canvas.height - margin;
      
      // Hàm tạo trang mới
      const createNewPage = async () => {
        if (currentPage.length > 0) {
          // Tạo canvas mới cho trang
          const pageCanvas = document.createElement('canvas');
          const pageCtx = pageCanvas.getContext('2d');
          pageCanvas.width = canvas.width;
          pageCanvas.height = canvas.height;
          
          // Vẽ background trắng
          pageCtx.fillStyle = 'white';
          pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          
          // Vẽ nội dung
          pageCtx.font = ctx.font;
          pageCtx.fillStyle = 'black';
          
          currentPage.forEach(item => {
            pageCtx.fillText(item.text, item.x, item.y);
          });
          
          // Chuyển canvas thành blob
          const blob = await new Promise(resolve => pageCanvas.toBlob(resolve, 'image/png'));
          const imageFile = new File([blob], `page-${images.length + 1}.png`, { type: 'image/png' });
          images.push(imageFile);
          
          // Reset trang mới
          currentPage = [];
          currentY = margin;
        }
      };
      
      // Xử lý từng element
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const text = element.textContent.trim();
        
        if (text) {
          // Chia text thành các dòng dựa trên maxWidth
          const words = text.split(' ');
          let currentLine = '';
          
          for (let j = 0; j < words.length; j++) {
            const word = words[j];
            const testLine = currentLine + word + ' ';
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth) {
              // Thêm dòng hiện tại vào trang
              if (currentY + lineHeight > maxY) {
                await createNewPage();
              }
              
              currentPage.push({
                text: currentLine,
                x: margin,
                y: currentY
              });
              
              currentY += lineHeight;
              currentLine = word + ' ';
            } else {
              currentLine = testLine;
            }
          }
          
          // Xử lý dòng cuối cùng của đoạn
          if (currentLine) {
            if (currentY + lineHeight > maxY) {
              await createNewPage();
            }
            
            currentPage.push({
              text: currentLine,
              x: margin,
              y: currentY
            });
            
            currentY += lineHeight;
          }
          
          // Thêm khoảng trống giữa các đoạn
          currentY += lineHeight / 2;
        }
      }
      
      // Xử lý trang cuối cùng
      await createNewPage();
      
    } catch (error) {
      console.error('Error converting DOCX to images:', error);
    }
    
    return images;
  };

  const downloadAndProcessPdf = async (url) => {
    setIsPdfLoading(true);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to download PDF');
      
      const blob = await response.blob();
      const pdfFile = new File([blob], 'translated.pdf', { type: 'application/pdf' });
      setTranslatedPdfUrl(URL.createObjectURL(pdfFile));
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setDocumentTabTranslatedText("Lỗi khi tải file PDF");
    } finally {
      setIsPdfLoading(false);
    }
  };

  // Function to convert PDF to images
  const convertPdfToImages = async (file) => {
    const images = [];
    
    // Load the PDF file
    const fileArrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument(fileArrayBuffer).promise;
    
    // Convert each page to an image
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 }); // Adjust scale as needed
      
      // Create canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Render PDF page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      // Convert canvas to blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const imageFile = new File([blob], `page-${pageNum}.png`, { type: 'image/png' });
      images.push(imageFile);
    }
    
    return images;
  };

  const validateFiles = (files) => {
    const validFiles = Array.from(files).filter(file => 
      SUPPORTED_FILE_TYPES.includes(file.type)
    );

    if (validFiles.length !== files.length) {
      alert("Một số file không được hỗ trợ. Chỉ chấp nhận .docx, .pdf, hoặc ảnh");
    }

    return validFiles;
  };
  const handleTargetLanguageChange = (e) => {
    const newTargetLanguage = e.target.value;
    setTargetLanguage(newTargetLanguage);
    
    // Only process OCR if we're in document tab, have a file, and not in upload interface
    if (tabValue === 2 && currentProcessingFile && !showUploadInterface) {
      processOCR(currentProcessingFile, newTargetLanguage);
    }
  };


  const processOCR = async (file, targetLang = targetLanguage) => {
    if (!file) return;
  
    abortControllerRef.current = new AbortController();
    setIsProcessing(true);
    setDocumentTabTranslatedText("Đang xử lý...");
    setPageTexts([]);
    setCurrentPage(0);
    setShowUploadInterface(false);
    setDocumentTabSourceText("");
    setSourcePdfFile(file);
    setTranslatedPdfUrl(null);
    setCurrentProcessingFile(file); // Lưu file đang xử lý
  
    try {
      let filesToProcess = [];
      
      if (file.type === 'application/pdf') {
        setDocumentTabTranslatedText("Đang xử lý PDF...");
        const allImages = await convertPdfToImages(file);
        filesToProcess = allImages.slice(0, 3);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        setDocumentTabTranslatedText("Đang chuyển đổi DOCX sang ảnh...");
        const allImages = await convertDocxToImages(file);
        filesToProcess = allImages.slice(0, 3);
      } else if (file.type === 'image/jpeg' || file.type === 'image/png') {
        filesToProcess = [file];
      } else {
        throw new Error('Định dạng file không được hỗ trợ');
      }
  
      if (filesToProcess.length === 0) {
        throw new Error('Không thể xử lý file này');
      }
  
      const formData = new FormData();
      filesToProcess.forEach((file, index) => {
        formData.append('files', file);
      });
  
      const url = new URL('http://123.24.142.99:8010/ocr/');
      url.searchParams.append('in_lang', ocrLanguage);
      url.searchParams.append('out_lang', targetLang); // Sử dụng targetLang từ tham số
      url.searchParams.append('use_openai', 'false');
  
      setDocumentTabTranslatedText("Đang xử lý OCR...");
  
      const response = await fetch(url, {
        method: "POST",
        body: formData,
        signal: abortControllerRef.current.signal,
      });
  
      if (!response.ok) {
        let errorMessage = "Có lỗi xảy ra trong quá trình xử lý OCR";
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          console.error('Error parsing error response:', e);
        }
        throw new Error(errorMessage);
      }
  
      const responseData = await response.json();
  
      if (responseData.status === 200 && responseData.data.file_path) {
        const filePath = responseData.data.file_path;
        const processId = filePath.split('/')[1];
        const fileName = filePath.split('/').pop();
        const downloadUrl = `http://123.24.142.99:8010/downloads/${processId}/${fileName}`;
        
        setDocumentTabTranslatedText("Đang tải file PDF đã dịch...");
        await downloadAndProcessPdf(downloadUrl);
        setDocumentTabTranslatedText("Dịch hoàn tất");
      } else {
        throw new Error('Không nhận được kết quả từ server');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('OCR processing was cancelled');
        setDocumentTabTranslatedText("Đã hủy quá trình dịch");
      } else {
        console.error("Error in OCR process:", error);
        setDocumentTabSourceText("Đã xảy ra lỗi: " + error.message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const cancelProcessing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsProcessing(false);
      setIsPdfLoading(false);
      setDocumentTabTranslatedText("Đã hủy quá trình dịch");
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

  // Render functions
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
          onChange={handleTargetLanguageChange}
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
            setSourcePdfFile(null);
            setTranslatedPdfUrl(null);
            setIsPdfLoading(false);
            setCurrentProcessingFile(null); // Add this line to clear the current processing file
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

      <PDFViewer
        sourceFile={sourcePdfFile}
        translatedPdfUrl={translatedPdfUrl}
        isProcessing={isProcessing}
        isPdfLoading={isPdfLoading}
      />

      {/* File navigation */}
      {uploadedFiles.length > 1 && (
        <Box sx={{ 
          mt: 2, 
          pt: 2,
          borderTop: 1, 
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 2
        }}>
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
      )}
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