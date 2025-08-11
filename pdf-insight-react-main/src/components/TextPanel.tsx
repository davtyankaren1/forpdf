import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, FileText, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TextPanelProps {
  extractedText: string;
  fileName?: string;
  onUpdateExtractedText?: (text: string) => void;
}

export const TextPanel = ({ extractedText, fileName, onUpdateExtractedText }: TextPanelProps) => {
  const { toast } = useToast();
  const [isFixing, setIsFixing] = useState(false);

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
    const blob = new Blob([extractedText], { type: 'text/plain' });
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

const wordCount = extractedText.trim().split(/\s+/).filter(word => word.length > 0).length;
const charCount = extractedText.length;

const refineLocally = (text: string) => {
  let t = text || '';
  t = t.replace(/-\n/g, '');
  t = t.replace(/\r/g, '');
  t = t.replace(/[ \t]+\n/g, '\n');
  t = t.replace(/\n{3,}/g, '\n\n');
  t = t.replace(/([.!?])\s+(?=[A-Z])/g, '$1\n\n');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
};

const fixText = async () => {
  if (!extractedText?.trim()) return;
  try {
    setIsFixing(true);
    const res = await fetch('/functions/v1/fix-text', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: extractedText }),
    });

    if (res.ok) {
      const data = await res.json();
      const newText = data.fixedText || data.text || data.result || refineLocally(extractedText);
      onUpdateExtractedText?.(newText);
      toast({ title: 'Text improved', description: 'AI formatting applied.' });
    } else {
      const newText = refineLocally(extractedText);
      onUpdateExtractedText?.(newText);
      toast({ title: 'AI not configured', description: 'Using local formatter. Connect Supabase to enable AI.' });
    }
  } catch (e) {
    const newText = refineLocally(extractedText);
    onUpdateExtractedText?.(newText);
    toast({ title: 'Local fix applied', description: 'AI unavailable; used smart paragraphing.' });
  } finally {
    setIsFixing(false);
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
        
        <div className="flex gap-2">
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
            disabled={!extractedText}
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        {extractedText ? (
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 h-full min-h-[400px] max-h-[600px] overflow-auto border">
            <pre className="whitespace-pre-wrap text-sm text-foreground font-mono leading-relaxed">
              {extractedText}
            </pre>
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