'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { validateFile } from '@/lib/file-validation';
import { Upload, FileText, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onFileUploaded: (file: File) => void;
  onAnalysisComplete: (text: string) => void;
  isAnalyzing?: boolean;
}

export default function FileUpload({ onFileUploaded, onAnalysisComplete, isAnalyzing = false }: FileUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setError(null);
    setUploading(true);
    setFileName(file.name);

    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      setUploading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/analyze-document', { method: 'POST', body: formData });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to analyze document');
      }
      const data = await response.json();
      onFileUploaded(file);
      onAnalysisComplete(data.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
      setFileName(null);
    } finally {
      setUploading(false);
    }
  }, [onFileUploaded, onAnalysisComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  if (isAnalyzing || uploading) {
    return (
      <div className="w-full max-w-2xl mx-auto liquid-glass rounded-3xl p-16 flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-white/50 text-sm font-medium">
          {uploading ? 'Uploading…' : 'Reading your document…'}
        </p>
        {fileName && <p className="text-white/30 text-xs">{fileName}</p>}
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3">
      <div
        {...getRootProps()}
        className={`liquid-glass rounded-3xl p-14 text-center cursor-pointer transition-all duration-200 ${
          isDragActive ? 'bg-white/5 scale-[1.01]' : 'hover:bg-white/[0.03]'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-5">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
            isDragActive ? 'bg-white/15' : 'bg-white/5 border border-white/10'
          }`}>
            {fileName ? (
              <FileText size={28} className="text-white/60" />
            ) : (
              <Upload size={28} className="text-white/40" />
            )}
          </div>
          <div className="space-y-1.5">
            <p className="text-white font-medium text-lg">
              {isDragActive
                ? 'Drop it here'
                : fileName
                ? fileName
                : 'Drag & drop your study material'}
            </p>
            <p className="text-white/40 text-sm">
              {fileName ? 'Click to choose a different file' : 'or click to browse — PDF, DOCX · Max 10 MB'}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="liquid-glass rounded-2xl px-4 py-3 flex items-center gap-2.5 text-red-400 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
