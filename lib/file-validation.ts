export function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];
  const allowedExtensions = ['.pdf', '.docx', '.doc', '.ppt', '.pptx'];

  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 10MB limit' };
  }

  const fileName = file.name.toLowerCase();
  const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
  const hasValidType = allowedTypes.includes(file.type);

  if (!hasValidExtension && !hasValidType) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload PDF, DOCX, or PPT files only.',
    };
  }

  return { valid: true };
}
