import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export interface ParsedDocument {
  text: string;
  pageCount?: number;
  wordCount: number;
}

export async function parsePDF(buffer: Buffer): Promise<ParsedDocument> {
  try {
    const data = await pdfParse(buffer);
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
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;
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

  // Determine file type
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return parsePDF(buffer);
  } else if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.endsWith('.docx')
  ) {
    return parseDOCX(buffer);
  } else if (
    fileType === 'application/vnd.ms-powerpoint' ||
    fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    fileName.endsWith('.ppt') ||
    fileName.endsWith('.pptx')
  ) {
    // For PPT files, we'll try to extract text (basic implementation)
    // Note: Full PPT parsing would require additional libraries
    throw new Error('PPT/PPTX parsing is not fully supported. Please convert to PDF or DOCX first.');
  } else {
    throw new Error(`Unsupported file type: ${fileType || 'unknown'}`);
  }
}

