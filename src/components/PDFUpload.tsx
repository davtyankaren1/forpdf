import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PDFUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
}

export const PDFUpload = ({ onFileSelect, selectedFile }: PDFUploadProps) => {
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type === 'application/pdf') {
      onFileSelect(file);
      toast({
        title: "PDF uploaded successfully",
        description: `File: ${file.name}`,
      });
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
    }
  }, [onFileSelect, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false
  });

  return (
    <Card className="border-upload-border bg-upload-bg">
      <CardContent className="p-6">
        <div
          {...getRootProps()}
          className={`
            flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors
            ${isDragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-upload-border hover:border-primary/50'
            }
          `}
        >
          <input {...getInputProps()} />
          
          {selectedFile ? (
            <div className="flex flex-col items-center text-center">
              <FileText className="h-12 w-12 text-primary mb-4" />
              <p className="text-sm font-medium text-foreground mb-2">
                {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  // Trigger file input
                }}
              >
                Choose different file
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm font-medium text-foreground mb-2">
                {isDragActive ? 'Drop the PDF here' : 'Upload PDF'}
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Drag and drop a PDF file here, or click to browse
              </p>
              <Button variant="outline" size="sm">
                Choose file
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};