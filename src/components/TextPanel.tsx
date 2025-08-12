import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, FileText, Loader2, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { correctText } from '@/services/openai';
import { jsPDF } from 'jspdf';

interface TextPanelProps {
  extractedText: string;
  fileName?: string;
  onUpdateExtractedText?: (text: string) => void;
  isLoading?: boolean;
}

export const TextPanel = ({ extractedText, fileName, onUpdateExtractedText, isLoading }: TextPanelProps) => {
  const { toast } = useToast();
  const [isFixing, setIsFixing] = useState(false);
  const [isUsingAI, setIsUsingAI] = useState(false);
  const [editableText, setEditableText] = useState(extractedText);
  
  // Update editable text when extractedText changes
  useEffect(() => {
    setEditableText(extractedText);
  }, [extractedText]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(extractedText);
      toast({
        title: "Text copied",
        description: "Extracted text has been copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy text to clipboard",
        variant: "destructive",
      });
    }
  };

  const downloadText = () => {
    const blob = new Blob([editableText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName ? fileName.replace('.pdf', '') : 'extracted'}_text.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download started",
      description: "Text file download has been initiated",
    });
  };
  
  const downloadAsPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Split text into lines to fit on PDF page
      const textLines = doc.splitTextToSize(editableText, 180);
      
      // Add text to PDF
      doc.setFontSize(12);
      doc.text(textLines, 15, 15);
      
      // Save PDF
      doc.save(`${fileName ? fileName.replace('.pdf', '') : 'edited'}_document.pdf`);
      
      toast({
        title: "PDF Download started",
        description: "Edited document has been saved as PDF",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "PDF generation failed",
        description: "Failed to generate PDF from text",
        variant: "destructive",
      });
    }
  };

const wordCount = editableText.trim().split(/\s+/).filter(word => word.length > 0).length;
const charCount = editableText.length;

const refineLocally = (text: string) => {
  if (!text) return '';
  
  let t = text;
  
  // Remove emojis
  t = t.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
  
  // Remove page break markers
  t = t.replace(/---\s*Page\s*Break\s*---/gi, '');
  
  // Replace bullet symbols with spaces but preserve the text content
  t = t.replace(/([\u2022\u25cf\u25a0\u25c6\u25cb\u25e6-])\s*/g, ''); // Replace bullet symbols with nothing
  t = t.replace(/\|/g, ''); // Remove vertical bars
  
  // Fix spaced out letters (e.g., "A d m i n" -> "Admin")
  t = fixSpacedLetters(t);
  
  // Basic cleanup
  t = t.replace(/-\n/g, ''); // Join hyphenated words across lines
  t = t.replace(/\r/g, ''); // Remove carriage returns
  t = t.replace(/[ \t]+/g, ' '); // Replace multiple spaces/tabs with a single space
  t = t.replace(/[ \t]+\n/g, '\n'); // Remove spaces at end of lines
  t = t.replace(/\n[ \t]+/g, '\n'); // Remove spaces at beginning of lines
  
  // Fix common PDF extraction issues
  t = t.replace(/([a-z])- ?\n([a-z])/gi, '$1$2'); // Fix hyphenated words across lines
  t = t.replace(/([a-z])\n([a-z])/gi, '$1 $2'); // Join words broken across lines without hyphen
  
  // Improve section separation for date ranges and job titles
  // Format MM/YYYY - MM/YYYY or MM/YYYY - Present
  t = t.replace(/(\d{1,2}\/\d{4})\s*[-–—]\s*(\d{1,2}\/\d{4}|Present)/gi, '\n\n$&\n');
  
  // Format YYYY - YYYY or YYYY - Present
  t = t.replace(/(?<!\d)(\d{4})\s*[-–—]\s*(\d{4}|Present)(?!\d)/gi, '\n\n$&\n');
  
  // Handle job titles and positions
  t = t.replace(/^(.{0,50})(Project Manager|Head Of|Director|Manager|Engineer|Developer|Designer|Consultant|Analyst|Specialist)/gim, '\n\n$1$2');
  
  // Add spacing after common section headers
  const sectionHeaders = ['Experience', 'Education', 'Skills', 'Languages', 'Projects', 'Certifications', 'References', 'Responsibilities', 'Achievements', 'Key responsibilities'];
  const sectionRegex = new RegExp(`(^|\n)\s*\b(${sectionHeaders.join('|')})\b[^\n]*`, 'gim');
  t = t.replace(sectionRegex, '\n\n$&\n');
  
  // Improve paragraph structure
  t = t.replace(/\n{3,}/g, '\n\n'); // Replace 3+ newlines with just 2
  t = t.replace(/([.!?])\s+(?=[A-Z])/g, '$1\n\n'); // Add paragraph breaks after sentences
  t = t.replace(/\n{3,}/g, '\n\n'); // Clean up any resulting excessive newlines
  
  return t.trim();
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

// Basic text formatting using local functions
const fixTextLocally = async () => {
  if (!extractedText?.trim()) return;
  try {
    setIsFixing(true);
    const locallyRefined = refineLocally(extractedText);
    onUpdateExtractedText?.(locallyRefined);
    toast({ 
      title: 'Basic formatting applied', 
      description: 'Text improved with local formatting rules.'
    });
  } catch (e) {
    console.error('Local text fixing error:', e);
    toast({ 
      title: 'Error fixing text', 
      description: 'Failed to apply text formatting.'
    });
  } finally {
    setIsFixing(false);
  }
};

// Advanced text correction using local formatting
const fixTextWithAI = async () => {
  if (!extractedText?.trim()) return;
  
  try {
    setIsUsingAI(true);
    
    // Apply enhanced local text formatting
    const formattedText = await Promise.resolve(correctText(extractedText));
    onUpdateExtractedText?.(formattedText);
    
    toast({ 
      title: 'Text formatting complete', 
      description: 'Text improved with advanced formatting rules.'
    });
  } catch (e: any) {
    console.error('Text formatting error:', e);
    
    // Fall back to basic formatting
    const locallyRefined = refineLocally(extractedText);
    onUpdateExtractedText?.(locallyRefined);
    
    toast({ 
      title: 'Using basic formatting', 
      description: 'Applied basic text improvements only.',
      variant: 'destructive'
    });
  } finally {
    setIsUsingAI(false);
  }
};



  return (
    <Card className="h-full bg-text-panel">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Extracted Text
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline">{wordCount} words</Badge>
            <Badge variant="outline">{charCount} chars</Badge>
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm"
            onClick={copyToClipboard}
            disabled={!extractedText}
          >
            <Copy className="h-4 w-4 mr-1" />
            Copy
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={downloadText}
            disabled={!editableText}
          >
            <Download className="h-4 w-4 mr-1" />
            Download Text
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={downloadAsPDF}
            disabled={!editableText}
          >
            <FileDown className="h-4 w-4 mr-1" />
            Download PDF
          </Button>
          <Button 
            variant="default"
            size="sm"
            onClick={fixTextWithAI}
            disabled={!extractedText || isFixing || isUsingAI}
          >
            <FileText className="h-4 w-4 mr-1" />
            {isUsingAI ? "Formatting..." : "Format Text"}
            {isUsingAI && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        {editableText ? (
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 h-full min-h-[400px] max-h-[600px] overflow-auto border">
            <textarea 
              className="w-full h-full min-h-[400px] bg-transparent text-sm text-foreground font-mono leading-relaxed resize-none focus:outline-none focus:ring-0 border-none"
              value={editableText}
              onChange={(e) => {
                setEditableText(e.target.value);
                if (onUpdateExtractedText) {
                  onUpdateExtractedText(e.target.value);
                }
              }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Upload and view a PDF to extract text</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};