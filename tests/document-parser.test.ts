import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { assertSafeDocxArchive, parseDOCX } from '@/lib/document-parser';

function centralDirectoryEntry(
  name: string,
  compressedSize: number,
  expandedSize: number
): Buffer {
  const fileName = Buffer.from(name);
  const entry = Buffer.alloc(46 + fileName.length);
  entry.writeUInt32LE(0x02014b50, 0);
  entry.writeUInt32LE(compressedSize, 20);
  entry.writeUInt32LE(expandedSize, 24);
  entry.writeUInt16LE(fileName.length, 28);
  fileName.copy(entry, 46);
  return entry;
}

describe('DOCX parser budgets', () => {
  it('extracts text from an ordinary DOCX using the patched XML parser', async () => {
    const zip = new JSZip();
    zip.file(
      '[Content_Types].xml',
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
    );
    zip.file(
      'word/document.xml',
      '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hello QuizForge</w:t></w:r></w:p></w:body></w:document>'
    );
    const archive = await zip.generateAsync({ type: 'nodebuffer' });

    await expect(parseDOCX(archive)).resolves.toMatchObject({
      text: expect.stringContaining('Hello QuizForge'),
    });
  });

  it('accepts an ordinary DOCX central directory', () => {
    const archive = Buffer.concat([
      centralDirectoryEntry('[Content_Types].xml', 100, 500),
      centralDirectoryEntry('word/document.xml', 1_000, 5_000),
    ]);

    expect(() => assertSafeDocxArchive(archive)).not.toThrow();
  });

  it('rejects a high-ratio archive before decompression', () => {
    const archive = centralDirectoryEntry('word/document.xml', 1, 10_000);

    expect(() => assertSafeDocxArchive(archive)).toThrow('safe compression ratio');
  });

  it('rejects a ZIP file that is not a DOCX document', () => {
    const archive = centralDirectoryEntry('payload.bin', 100, 100);

    expect(() => assertSafeDocxArchive(archive)).toThrow('not a valid DOCX');
  });
});
