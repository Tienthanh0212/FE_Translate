import React, { useState, useEffect } from "react";
import { Box, Grid, Typography, CircularProgress } from "@mui/material";
import mammoth from "mammoth";

const PDFViewer = ({
  sourceFile,
  translatedPdfUrl,
  isProcessing,
  isPdfLoading,
}) => {
  const [isSourcePdfLoading, setIsSourcePdfLoading] = useState(true);
  const [isTranslatedPdfLoading, setIsTranslatedPdfLoading] = useState(true);
  const [docxContent, setDocxContent] = useState("");

  const handleSourcePdfLoad = () => {
    setIsSourcePdfLoading(false);
  };

  const handleTranslatedPdfLoad = () => {
    setIsTranslatedPdfLoading(false);
  };

  // Style cho DOCX content
  const docxStyles = `
    p {
      margin-bottom: 1em;
      line-height: 1.5;
      font-size: 14px;
    }
    h1, h2, h3, h4, h5, h6 {
      margin: 1em 0;
      font-weight: bold;
    }
    h1 { font-size: 24px; }
    h2 { font-size: 20px; }
    h3 { font-size: 18px; }
    h4 { font-size: 16px; }
    table {
      border-collapse: collapse;
      margin: 1em 0;
      width: 100%;
    }
    td, th {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f5f5f5;
    }
    ul, ol {
      margin: 1em 0;
      padding-left: 2em;
    }
    li {
      margin-bottom: 0.5em;
    }
    img {
      max-width: 100%;
      height: auto;
      margin: 1em 0;
    }
  `;

  useEffect(() => {
    const displayDocx = async () => {
      if (
        sourceFile?.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        try {
          const arrayBuffer = await sourceFile.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setDocxContent(result.value);
          setIsSourcePdfLoading(false); // Reset loading state for DOCX
        } catch (error) {
          console.error("Error displaying DOCX:", error);
          setDocxContent(
            '<p style="color: red;">Lỗi khi hiển thị file DOCX</p>'
          );
          setIsSourcePdfLoading(false);
        }
      }
    };

    if (sourceFile) {
      setIsSourcePdfLoading(true);
      if (
        sourceFile.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        displayDocx();
      }
    }
  }, [sourceFile]);

  return (
    <Grid container spacing={2}>
      {/* Original File */}
      <Grid item xs={6}>
        <Typography variant="h6" gutterBottom>
          File gốc
        </Typography>
        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            height: "800px",
            overflow: "hidden",
            position: "relative",
            bgcolor: "background.paper",
          }}
        >
          {sourceFile ? (
            sourceFile.type === "application/pdf" ? (
              <>
                {isSourcePdfLoading && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "background.paper",
                      zIndex: 1,
                    }}
                  >
                    <CircularProgress size={40} />
                    <Typography sx={{ mt: 2 }}>Đang tải file gốc...</Typography>
                  </Box>
                )}
                <iframe
                  src={URL.createObjectURL(sourceFile)}
                  width="100%"
                  height="100%"
                  title="Original PDF"
                  style={{ border: "none" }}
                  onLoad={handleSourcePdfLoad}
                />
              </>
            ) : sourceFile.type.startsWith("image/") ? ( // Nếu là file ảnh
              <Box
                sx={{
                  p: 3,
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={URL.createObjectURL(sourceFile)}
                  alt="Uploaded Image"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                  }}
                  onLoad={handleSourcePdfLoad}
                />
              </Box>
            ) : (
              <Box
                sx={{
                  p: 3,
                  height: "100%",
                  overflow: "auto",
                }}
              >
                <style>{docxStyles}</style>
                {isSourcePdfLoading ? (
                  <Box
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CircularProgress size={40} />
                    <Typography sx={{ mt: 2 }}>Đang tải file gốc...</Typography>
                  </Box>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: docxContent }} />
                )}
              </Box>
            )
          ) : (
            <Box
              sx={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography color="text.secondary">Chưa có file gốc</Typography>
            </Box>
          )}
        </Box>
      </Grid>

      {/* Translated PDF */}
      <Grid item xs={6}>
        <Typography variant="h6" gutterBottom>
          File PDF đã dịch
        </Typography>
        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            height: "800px",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {isProcessing ? (
            <Box
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CircularProgress size={40} />
              <Typography sx={{ mt: 2 }}>Đang xử lý dịch...</Typography>
            </Box>
          ) : isPdfLoading ? (
            <Box
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CircularProgress size={40} />
              <Typography sx={{ mt: 2 }}>
                Đang tải file PDF đã dịch...
              </Typography>
            </Box>
          ) : translatedPdfUrl ? (
            <>
              {isTranslatedPdfLoading && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "background.paper",
                    zIndex: 1,
                  }}
                >
                  <CircularProgress size={40} />
                  <Typography sx={{ mt: 2 }}>Đang tải bản dịch...</Typography>
                </Box>
              )}
              <iframe
                src={translatedPdfUrl}
                width="100%"
                height="100%"
                title="Translated PDF"
                style={{ border: "none" }}
                onLoad={handleTranslatedPdfLoad}
              />
            </>
          ) : (
            <Box
              sx={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography color="text.secondary">Chưa có bản dịch</Typography>
            </Box>
          )}
        </Box>
      </Grid>
    </Grid>
  );
};

export default PDFViewer;
