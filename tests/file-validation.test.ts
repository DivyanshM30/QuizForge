import { describe, expect, it } from 'vitest';
import { validateFile, validateFileSignature } from '@/lib/file-validation';

const PDF_TYPE = 'application/pdf';
const DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

describe('file validation', () => {
  it('accepts a PDF whose extension, MIME, and signature agree', async () => {
    const file = new File(['%PDF-1.7\n'], 'notes.pdf', { type: PDF_TYPE });

    expect(validateFile(file)).toEqual({ valid: true });
    await expect(validateFileSignature(file)).resolves.toEqual({ valid: true });
  });

  it('rejects a spoofed MIME type or extension', () => {
    const spoofedMime = new File(['content'], 'payload.exe', { type: PDF_TYPE });
    const spoofedExtension = new File(['content'], 'payload.pdf', {
      type: 'application/octet-stream',
    });

    expect(validateFile(spoofedMime).valid).toBe(false);
    expect(validateFile(spoofedExtension).valid).toBe(false);
  });

  it('rejects content whose signature does not match its declared format', async () => {
    const fakePdf = new File(['not a pdf'], 'notes.pdf', { type: PDF_TYPE });
    const fakeDocx = new File(['not a zip'], 'notes.docx', { type: DOCX_TYPE });

    await expect(validateFileSignature(fakePdf)).resolves.toMatchObject({ valid: false });
    await expect(validateFileSignature(fakeDocx)).resolves.toMatchObject({ valid: false });
  });

  it('rejects mismatched ZIP signature byte pairs', async () => {
    const invalidZipPair = new File(
      [new Uint8Array([0x50, 0x4b, 0x03, 0x06, 0x00])],
      'notes.docx',
      { type: DOCX_TYPE }
    );

    await expect(validateFileSignature(invalidZipPair)).resolves.toMatchObject({ valid: false });
  });
});
