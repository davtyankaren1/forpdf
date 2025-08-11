import { useState } from 'react';
import { PDFUpload } from '@/components/PDFUpload';
import { PDFViewer } from '@/components/PDFViewer';
import { TextPanel } from '@/components/TextPanel';
import { FileText } from 'lucide-react';

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setExtractedText(''); // Reset text when new file is selected
  };

  const handleTextExtracted = (text: string, pageNumber?: number) => {
    if (pageNumber === 1) {
      // For the first page, start fresh
      setExtractedText(text);
    } else if (pageNumber && pageNumber > 1) {
      // For subsequent pages, append to existing text
      setExtractedText(prev => prev + `\n\n--- Page ${pageNumber} ---\n\n` + text);
    } else {
      // Fallback for when pageNumber is not provided
      setExtractedText(text);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
              <FileText className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">PDF Insight</h1>
              <p className="text-sm text-muted-foreground">Upload, view, and extract text from PDF documents</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Upload Section */}
            <PDFUpload 
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
            />
            
            {/* PDF Viewer */}
            {selectedFile && (
              <PDFViewer 
                file={selectedFile}
                onTextExtracted={handleTextExtracted}
              />
            )}
          </div>

          {/* Right Column - Text Panel */}
          <div className="lg:sticky lg:top-8 lg:h-fit">
            <TextPanel 
              extractedText={extractedText}
              fileName={selectedFile?.name}
            />
          </div>
        </div>

        {/* Empty State */}
        {!selectedFile && (
          <div className="mt-12 text-center">
            <div className="max-w-md mx-auto">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-foreground mb-2">Get started with PDF processing</h3>
              <p className="text-muted-foreground">
                Upload a PDF file above to view it and extract text content. Perfect for document analysis, 
                content extraction, and text processing workflows.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
