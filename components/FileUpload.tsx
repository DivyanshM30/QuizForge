'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { validateFile } from '@/lib/file-validation';
import LoadingSpinner from './LoadingSpinner';

interface FileUploadProps {
  onFileUploaded: (file: File) => void;
  onAnalysisComplete: (text: string) => void;
  isAnalyzing?: boolean;
}

export default function FileUpload({
  onFileUploaded,
  onAnalysisComplete,
  isAnalyzing = false,
}: FileUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      setError(null);
      setUploading(true);

      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        setUploading(false);
        return;
      }

      try {
        // Upload and analyze document
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/analyze-document', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to analyze document');
        }

        const data = await response.json();
        onFileUploaded(file);
        onAnalysisComplete(data.text);
      } catch (err: any) {
        setError(err.message || 'Failed to upload file');
      } finally {
        setUploading(false);
      }
    },
    [onFileUploaded, onAnalysisComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  if (isAnalyzing || uploading) {
    return (
      <div className="w-full">
        <LoadingSpinner
          message={isAnalyzing ? 'Analyzing document...' : 'Uploading file...'}
          size="lg"
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20 scale-[1.02]'
            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-slate-800 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-primary-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <div>
            <p className="text-xl font-bold text-indigo-950 dark:text-slate-100 mb-2">
              {isDragActive ? 'Drop your file here' : 'Drag & drop your study document'}
            </p>
            <p className="text-slate-600 dark:text-slate-300 font-medium mb-4">or click to browse</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Supports PDF, DOCX, PPT (Max 10MB)
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg shadow-sm">
          <p className="text-red-600 font-medium text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
