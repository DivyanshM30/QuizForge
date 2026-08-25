import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export const DOCUMENT_LIMITS = {
  maxPdfPages: 500,
  maxExtractedTextChars: 2_000_000,
  maxDocxEntries: 5_000,
  maxDocxExpandedBytes: 25 * 1024 * 1024,
  maxDocxCompressionRatio: 100,
} as const;

export interface ParsedDocument {
  text: string;
  pageCount?: number;
  wordCount: number;
}

function assertTextBudget(text: string): void {
  if (text.length > DOCUMENT_LIMITS.maxExtractedTextChars) {
    throw new Error('Document contains too much extracted text. Please upload a smaller document.');
  }
}

/** Inspect DOCX ZIP metadata before decompression to reject expansion bombs. */
export function assertSafeDocxArchive(buffer: Buffer): void {
  let offset = 0;
  let entries = 0;
  let totalCompressed = 0;
  let totalExpanded = 0;
  let hasWordDocument = false;

  while (offset <= buffer.length - 46) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      offset += 1;
      continue;
    }

    const compressedSize = buffer.readUInt32LE(offset + 20);
    const expandedSize = buffer.readUInt32LE(offset + 24);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const recordLength = 46 + fileNameLength + extraLength + commentLength;

    if (offset + recordLength > buffer.length) {
      throw new Error('DOCX archive metadata is malformed.');
    }

    const fileName = buffer
      .subarray(offset + 46, offset + 46 + fileNameLength)
      .toString('utf8');
    hasWordDocument ||= fileName === 'word/document.xml';
    entries += 1;
    totalCompressed += compressedSize;
    totalExpanded += expandedSize;

    if (
      entries > DOCUMENT_LIMITS.maxDocxEntries ||
      totalExpanded > DOCUMENT_LIMITS.maxDocxExpandedBytes
    ) {
      throw new Error('DOCX archive exceeds safe extraction limits.');
    }

    offset += recordLength;
  }

  if (entries === 0 || !hasWordDocument) {
    throw new Error('The file is not a valid DOCX document.');
  }

  const ratio = totalExpanded / Math.max(totalCompressed, 1);
  if (ratio > DOCUMENT_LIMITS.maxDocxCompressionRatio) {
    throw new Error('DOCX archive exceeds the safe compression ratio.');
  }
}

export async function parsePDF(buffer: Buffer): Promise<ParsedDocument> {
  try {
    const data = await pdfParse(buffer, { max: DOCUMENT_LIMITS.maxPdfPages + 1 });
    if (data.numpages > DOCUMENT_LIMITS.maxPdfPages) {
      throw new Error(`PDF exceeds the ${DOCUMENT_LIMITS.maxPdfPages}-page limit.`);
    }
    assertTextBudget(data.text);
    return {
      text: data.text,
      pageCount: data.numpages,
      wordCount: data.text.split(/\s+/).length,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error';

    // pdf-parse / pdf.js will throw "Invalid PDF structure" for corrupted or
    // partially generated PDFs. We surface a clearer, user-facing message.
    if (message.toLowerCase().includes('invalid pdf structure')) {
      throw new Error(
        'The PDF appears to be corrupted or has an invalid structure. Please re-export or re-download the file and try again.'
      );
    }

    throw new Error(`Failed to parse PDF: ${message}`);
  }
}

export async function parseDOCX(buffer: Buffer): Promise<ParsedDocument> {
  try {
    assertSafeDocxArchive(buffer);
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;
    assertTextBudget(text);
    return {
      text,
      wordCount: text.split(/\s+/).length,
    };
  } catch (error) {
    throw new Error(`Failed to parse DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function parseDocument(
  file: File
): Promise<ParsedDocument> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  // validateFile requires MIME and extension to agree; keep dispatch equally strict.
  if (fileType === 'application/pdf' && fileName.endsWith('.pdf')) {
    return parsePDF(buffer);
  } else if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
    fileName.endsWith('.docx')
  ) {
    return parseDOCX(buffer);
  } else {
    throw new Error(`Unsupported file type: ${fileType || 'unknown'}`);
  }
}
