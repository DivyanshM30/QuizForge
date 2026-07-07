'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { validateFile } from '@/lib/file-validation';
import { useQuizStore } from '@/store/quiz-store';

export type UploadState = 'idle' | 'uploading' | 'analyzing' | 'error';

interface UseFileUploadOptions {
  /**
   * Runs after a file passes validation, before the upload starts.
   * Return `false` to abort (e.g. redirect an unauthenticated user to login).
   */
  onBeforeUpload?: (file: File) => boolean;
}

/**
 * Shared upload flow for the hero pill and the dashboard pill: file selection,
 * drag-and-drop, validation, the POST to /api/analyze-document, and the jump to
 * the quiz config step. Previously this ~90-line state machine was duplicated
 * verbatim across HeroSection and the dashboard.
 *
 * Presentation (the pill markup) stays in each consumer — only the logic is shared.
 */
export function useFileUpload({ onBeforeUpload }: UseFileUploadOptions = {}) {
  const router = useRouter();
  const { setDocumentText } = useQuizStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedFileRef = useRef<File | null>(null); // stores the file before Generate is clicked

  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isBusy = uploadState === 'uploading' || uploadState === 'analyzing';

  /* Upload + analyze the file, then advance to the config step. */
  const processFile = useCallback(
    async (file: File) => {
      const validation = validateFile(file);
      if (!validation.valid) {
        setUploadError(validation.error || 'Invalid file');
        setUploadState('error');
        return;
      }

      if (onBeforeUpload && onBeforeUpload(file) === false) return;

      setFileName(file.name);
      setUploadError(null);
      setUploadState('uploading');

      try {
        const formData = new FormData();
        formData.append('file', file);
        setUploadState('analyzing');
        const res = await fetch('/api/analyze-document', { method: 'POST', body: formData });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to analyze document');
        }
        const data = await res.json();
        setDocumentText(data.text);
        router.push('/upload?step=config');
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed');
        setUploadState('error');
      }
    },
    [onBeforeUpload, router, setDocumentText]
  );

  /* Select a file without calling the API yet (Generate triggers the upload). */
  const selectFile = useCallback((file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      setUploadState('error');
      selectedFileRef.current = null;
      return;
    }
    selectedFileRef.current = file;
    setFileName(file.name);
    setUploadState('idle');
    setUploadError(null);
  }, []);

  const handleGenerate = useCallback(() => {
    if (isBusy) return;
    if (uploadState === 'error') {
      setUploadState('idle');
      setFileName(null);
      selectedFileRef.current = null;
      return;
    }
    if (selectedFileRef.current) {
      processFile(selectedFileRef.current);
    } else {
      // No file selected yet — open the picker
      fileInputRef.current?.click();
    }
  }, [isBusy, uploadState, processFile]);

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) selectFile(file);
      e.target.value = '';
    },
    [selectFile]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  const onDragLeave = useCallback(() => setIsDragging(false), []);
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) selectFile(file);
    },
    [selectFile]
  );

  const clearFile = useCallback(() => {
    setFileName(null);
    setUploadState('idle');
    selectedFileRef.current = null;
  }, []);

  const pillLabel = () => {
    if (uploadState === 'uploading') return 'Uploading…';
    if (uploadState === 'analyzing') return 'Reading document…';
    if (uploadState === 'error') return uploadError ?? 'Upload failed — click Generate to retry';
    return fileName ?? 'Drop your PDF, DOCX, or click to browse…';
  };

  return {
    fileInputRef,
    selectedFileRef,
    fileName,
    isDragging,
    uploadState,
    uploadError,
    isBusy,
    handleGenerate,
    onFileChange,
    onDragOver,
    onDragLeave,
    onDrop,
    clearFile,
    pillLabel,
  };
}
