import { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
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
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [allText, setAllText] = useState<string>('');
  const extractedTextRef = useRef<{[key: number]: string}>({});
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

  const onPageLoadSuccess = useCallback((page: any, pageIndex: number) => {
    // Extract and format text from the current page
    page.getTextContent().then((textContent: any) => {
      const pageText = formatTextContent(textContent);
      const pageNumber = pageIndex + 1;
      
      // Store text for this page
      extractedTextRef.current[pageNumber] = pageText;
      
      // Combine all extracted text in page order
      const combinedText = Object.entries(extractedTextRef.current)
        .sort(([pageA], [pageB]) => parseInt(pageA) - parseInt(pageB))
        .map(([_, text]) => text)
        .join('\n\n');
      
      setAllText(combinedText);
      onTextExtracted(combinedText);
    });
  }, [onTextExtracted]);
  
  // Update combined text whenever pages are loaded
  useEffect(() => {
    if (Object.keys(extractedTextRef.current).length > 0) {
      const combinedText = Object.entries(extractedTextRef.current)
        .sort(([pageA], [pageB]) => parseInt(pageA) - parseInt(pageB))
        .map(([_, text]) => text)
        .join('\n\n');
      
      setAllText(combinedText);
      onTextExtracted(combinedText);
    }
  }, [extractedTextRef.current, onTextExtracted]);



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

    // Basic text cleanup
    result = result.replace(/-\n/g, '');
    result = result.replace(/\n{3,}/g, '\n\n');
    result = result.replace(/([.!?])\s+(?=[A-Z])/g, '$1\n\n');
    
    // Apply advanced text processing
    result = cleanAndFormatText(result);
    
    return result.trim();
  };
  
  // Advanced text processing to fix common PDF extraction issues
  const cleanAndFormatText = (text: string): string => {
    if (!text) return '';
    
    // Remove emojis
    text = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
    
    // Remove page break markers
    text = text.replace(/---\s*Page\s*Break\s*---/gi, '');
    
    // Replace bullet symbols with spaces but preserve the text content
    text = text.replace(/([\u2022\u25cf\u25a0\u25c6\u25cb\u25e6-])\s*/g, ''); // Replace bullet symbols with nothing
    text = text.replace(/\|/g, ''); // Remove vertical bars
    
    // Fix spaced out letters (e.g., "A d m i n" -> "Admin")
    text = fixSpacedLetters(text);
    
    // Remove excessive whitespace
    text = text.replace(/[ \t]+/g, ' '); // Replace multiple spaces/tabs with a single space
    text = text.replace(/\n\s+/g, '\n'); // Remove spaces at the beginning of lines
    text = text.replace(/\s+\n/g, '\n'); // Remove spaces at the end of lines
    text = text.replace(/\n{3,}/g, '\n\n'); // Replace 3+ newlines with just 2
    
    // Fix common PDF extraction issues
    text = text.replace(/([a-z])- ?\n([a-z])/gi, '$1$2'); // Fix hyphenated words across lines
    text = text.replace(/([a-z])\n([a-z])/gi, '$1 $2'); // Join words broken across lines without hyphen
    
    // Improve section separation
    // Add extra spacing for date ranges (like MM/YYYY - MM/YYYY or YYYY - Present)
    text = text.replace(/(\d{1,2}\/\d{4}|\d{4})\s*[-–—]\s*(\d{1,2}\/\d{4}|\d{4}|Present)/gi, '\n\n$&\n');
    
    // Handle job titles and positions that follow date ranges
    text = text.replace(/^(.{0,50})(Project Manager|Head Of|Director|Manager|Engineer|Developer|Designer|Consultant|Analyst|Specialist)/gim, '\n\n$1$2');
    
    // Add spacing after common section headers
    const sectionHeaders = ['Experience', 'Education', 'Skills', 'Languages', 'Projects', 'Certifications', 'References', 'Responsibilities', 'Achievements'];
    const sectionRegex = new RegExp(`(^|\n)\s*\b(${sectionHeaders.join('|')})\b[^\n]*`, 'gim');
    text = text.replace(sectionRegex, '\n\n$&\n');
    
    // Improve paragraph structure
    text = text.replace(/([.!?])\s+(?=[A-Z])/g, '$1\n\n'); // Add paragraph breaks after sentences
    
    // Final cleanup of excessive newlines
    text = text.replace(/\n{3,}/g, '\n\n');
    
    return text.trim();
  };
  
  // Function to fix spaced out letters (e.g., "A d m i n" -> "Admin")
  const fixSpacedLetters = (text: string): string => {
    // Pattern to detect single letters separated by spaces
    const singleLetterPattern = /(?:\b([a-zA-Z]) )+([a-zA-Z])\b/g;
    
    // Find all instances of spaced out letters
    const matches = Array.from(text.matchAll(singleLetterPattern));
    
    // If no matches, return the original text
    if (matches.length === 0) return text;
    
    // Process each match
    let result = text;
    for (const match of matches) {
      const fullMatch = match[0];
      // Join the letters without spaces
      const joined = fullMatch.replace(/ /g, '');
      
      // Only replace if the joined version is likely a real word (more than 2 letters)
      if (joined.length > 2) {
        result = result.replace(fullMatch, joined);
      }
    }
    
    return result;
  };

  return (
    <Card className="h-full bg-viewer-panel">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">PDF Viewer</CardTitle>
          <Badge variant="secondary">
            {numPages} {numPages === 1 ? 'page' : 'pages'}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          
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
        <div className="flex flex-col items-center gap-8">
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
            {Array.from(new Array(numPages), (_, index) => (
              <div key={`page_${index + 1}`} className="mb-8 shadow-lg shadow-[var(--viewer-shadow)] rounded-lg overflow-hidden bg-white">
                <Page
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  scale={scale}
                  rotate={rotation}
                  onLoadSuccess={(page) => onPageLoadSuccess(page, index)}
                  loading={
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  }
                />
                <div className="bg-gray-100 py-1 px-3 text-xs text-center border-t">
                  Page {index + 1} of {numPages}
                </div>
              </div>
            ))}
          </Document>
        </div>
      </CardContent>
    </Card>
  );
};