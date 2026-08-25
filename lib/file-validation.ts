export function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  const allowedExtensions = ['.pdf', '.docx'];

  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 10MB limit' };
  }

  const fileName = file.name.toLowerCase();
  const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
  const hasValidType = allowedTypes.includes(file.type);

  if (!hasValidExtension || !hasValidType) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload PDF or DOCX files only.',
    };
  }

  return { valid: true };
}

export async function validateFileSignature(
  file: File
): Promise<{ valid: boolean; error?: string }> {
  const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const fileName = file.name.toLowerCase();

  const isPdf =
    header.length >= 5 &&
    header[0] === 0x25 &&
    header[1] === 0x50 &&
    header[2] === 0x44 &&
    header[3] === 0x46 &&
    header[4] === 0x2d;
  const isZip =
    header.length >= 4 &&
    header[0] === 0x50 &&
    header[1] === 0x4b &&
    ((header[2] === 0x03 && header[3] === 0x04) ||
      (header[2] === 0x05 && header[3] === 0x06) ||
      (header[2] === 0x07 && header[3] === 0x08));

  if ((fileName.endsWith('.pdf') && !isPdf) || (fileName.endsWith('.docx') && !isZip)) {
    return {
      valid: false,
      error: 'The file contents do not match the selected PDF or DOCX format.',
    };
  }

  return { valid: true };
}
