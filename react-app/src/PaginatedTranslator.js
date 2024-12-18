import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PaginatedTranslator = () => {
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const fileInputRef = useRef(null);
  
  const processOCR = async (file) => {
    if (!file) return;
    setIsLoading(true);
    
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

      // Create a reader to read the stream
      const reader = response.body.getReader();
      let allText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Convert the received chunk to text
        const chunk = new TextDecoder().decode(value);
        allText += chunk;
        
        // Split by "data: " prefix and process each line
        const lines = allText.split('data: ');
        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line.trim());
              if (data.page_number && data.text) {
                setPages(prevPages => {
                  const newPages = [...prevPages];
                  newPages[data.page_number - 1] = data.text;
                  setTotalPages(newPages.length);
                  return newPages;
                });
              }
            } catch (e) {
              console.error('Error parsing JSON:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error processing file:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setPages([]);
      setCurrentPage(0);
      processOCR(file);
    }
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="mb-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".pdf"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Upload PDF
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : pages.length > 0 ? (
        <div className="border rounded-lg p-4">
          <div className="min-h-[400px] bg-gray-50 p-4 rounded mb-4">
            {pages[currentPage]}
          </div>
          
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 0}
              className="flex items-center px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
              Previous
            </button>
            
            <span className="text-sm">
              Page {currentPage + 1} of {totalPages}
            </span>
            
            <button
              onClick={handleNextPage}
              disabled={currentPage >= totalPages - 1}
              className="flex items-center px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          Upload a PDF to see its content page by page
        </div>
      )}
    </div>
  );
};

export default PaginatedTranslator;