import { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Import required CSS for text layer
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker - using the recommended import method
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PDFViewerProps {
  file: File;
  onTextExtracted: (text: string, pageNumber?: number) => void;
}

export const PDFViewer = ({ file, onTextExtracted }: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const { toast } = useToast();

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    toast({
      title: "PDF loaded successfully",
      description: `Document has ${numPages} pages`,
    });
  }, [toast]);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('PDF load error:', error);
    toast({
      title: "Error loading PDF",
      description: "Failed to load the PDF document",
      variant: "destructive",
    });
  }, [toast]);

  const onPageLoadSuccess = useCallback((page: any) => {
    // Extract and format text from the current page
    page.getTextContent().then((textContent: any) => {
      const pageText = formatTextContent(textContent);
      onTextExtracted(pageText, pageNumber);
    });
  }, [pageNumber, onTextExtracted]);

  const goToPrevPage = () => {
    setPageNumber(Math.max(1, pageNumber - 1));
  };

  const goToNextPage = () => {
    setPageNumber(Math.min(numPages, pageNumber + 1));
  };

  const zoomIn = () => {
    setScale(Math.min(3, scale + 0.2));
  };

  const zoomOut = () => {
    setScale(Math.max(0.5, scale - 0.2));
  };

  const rotate = () => {
    setRotation((rotation + 90) % 360);
  };

  // Reconstruct lines and paragraphs from PDF text items
  const formatTextContent = (textContent: any) => {
    const items = textContent.items || [];
    const mapped = items.map((it: any) => ({
      str: it.str,
      x: (it.transform?.[4] ?? it.x ?? 0),
      y: (it.transform?.[5] ?? it.y ?? 0),
    })).sort((a: any, b: any) => (b.y - a.y) || (a.x - b.x));

    const lines: { y: number; text: string[] }[] = [];
    const yThreshold = 4;

    mapped.forEach((it) => {
      const last = lines[lines.length - 1];
      if (!last || Math.abs(last.y - it.y) > yThreshold) {
        lines.push({ y: it.y, text: [it.str] });
      } else {
        const prev = last.text[last.text.length - 1] ?? '';
        const needsSpace = prev && !prev.endsWith(' ') && !it.str.startsWith(' ');
        last.text.push((needsSpace ? ' ' : '') + it.str);
      }
    });

    let result = '';
    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i].text.join('');
      result += lineText.trim();
      const next = lines[i + 1];
      if (!next) break;
      const gap = Math.abs(lines[i].y - next.y);
      if (gap > 12) {
        result += '\n\n';
      } else {
        result += '\n';
      }
    }

    result = result.replace(/-\n/g, '');
    result = result.replace(/\n{3,}/g, '\n\n');
    result = result.replace(/([.!?])\s+(?=[A-Z])/g, '$1\n\n');
    return result.trim();
  };

  return (
    <Card className="h-full bg-viewer-panel">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">PDF Viewer</CardTitle>
          <Badge variant="secondary">
            Page {pageNumber} of {numPages}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={zoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs px-2 py-1 bg-muted rounded">
              {Math.round(scale * 100)}%
            </span>
            <Button variant="outline" size="sm" onClick={zoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          
          <Button variant="outline" size="sm" onClick={rotate}>
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 bg-viewer-bg overflow-auto">
        <div className="flex justify-center">
          <div className="shadow-lg shadow-[var(--viewer-shadow)] rounded-lg overflow-hidden bg-white">
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              }
            >
              <Page 
                pageNumber={pageNumber}
                scale={scale}
                rotate={rotation}
                onLoadSuccess={onPageLoadSuccess}
                loading={
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                }
              />
            </Document>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};