/**
 * Times the real parseDocument path on generated fixtures.
 *
 * No PDFs exist in the repo, so this builds a text PDF with a minimal, valid
 * PDF writer (no new dependency) and a DOCX via JSZip (already installed), then
 * runs the production parseDocument on each and reports p50/p95.
 */
import fs from 'node:fs';
import JSZip from 'jszip';
import { parseDocument } from '../../lib/document-parser.ts';

// ------------------------------------------------------------ minimal PDF writer
function buildPdf(pages) {
  const objects = [];
  const pageObjNums = [];
  // 1 = catalog, 2 = pages, 3 = font, then per page: page object + content stream
  let next = 4;
  for (let i = 0; i < pages.length; i += 1) {
    pageObjNums.push(next);
    next += 2;
  }

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  pages.forEach((lines, i) => {
    const pageNum = pageObjNums[i];
    const contentNum = pageNum + 1;
    let stream = 'BT /F1 10 Tf 12 TL 40 800 Td\n';
    for (const line of lines) {
      const safe = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
      stream += `(${safe}) Tj T*\n`;
    }
    stream += 'ET';
    objects[pageNum] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentNum} 0 R >>`;
    objects[contentNum] = `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`;
  });

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  for (let i = 1; i < objects.length; i += 1) {
    if (objects[i] === undefined) continue;
    offsets[i] = Buffer.byteLength(pdf, 'latin1');
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = Buffer.byteLength(pdf, 'latin1');
  const count = objects.length;
  pdf += `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (let i = 1; i < count; i += 1) {
    const off = offsets[i] ?? 0;
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

const WORDS = ('algorithm structure database network protocol latency throughput index query ' +
  'transaction isolation consistency replication cache buffer scheduler thread process memory ' +
  'allocation garbage collection compiler parser token lexer runtime virtual machine bytecode ' +
  'encryption hash signature certificate handshake session cookie token authorization').split(' ');

function paragraph(seed, words) {
  let out = [];
  let x = seed;
  for (let i = 0; i < words; i += 1) {
    x = (x * 1103515245 + 12345) % 2147483648;
    out.push(WORDS[x % WORDS.length]);
  }
  return out.join(' ');
}

function makePages(pageCount, linesPerPage, wordsPerLine) {
  const pages = [];
  for (let p = 0; p < pageCount; p += 1) {
    const lines = [];
    for (let l = 0; l < linesPerPage; l += 1) lines.push(paragraph(p * 97 + l + 1, wordsPerLine));
    pages.push(lines);
  }
  return pages;
}

async function makeDocx(text) {
  const zip = new JSZip();
  const esc = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('word/document.xml', `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${text.split('\n\n').map((p) => `<w:p><w:r><w:t>${esc(p)}</w:t></w:r></w:p>`).join('')}</w:body></w:document>`);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

const quantile = (v, q) => {
  const s = [...v].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)];
};

const results = { pdf: [], docx: [] };

// A "typical" study PDF: 20 pages, ~45 lines/page, ~9 words/line.
const typicalPages = makePages(20, 45, 9);
const typicalPdf = buildPdf(typicalPages);
fs.writeFileSync('docs/local/gemini-live/typical.pdf', typicalPdf);

const typicalText = typicalPages.map((lines) => lines.join('\n')).join('\n\n');
const typicalDocx = await makeDocx(typicalText);
fs.writeFileSync('docs/local/gemini-live/typical.docx', typicalDocx);

// Warm up once so JIT/module init is not counted as parse cost.
await parseDocument(new File([new Uint8Array(typicalPdf)], 'warm.pdf', { type: 'application/pdf' }));

for (let i = 0; i < 15; i += 1) {
  const t0 = performance.now();
  const parsed = await parseDocument(new File([new Uint8Array(typicalPdf)], `typical-${i}.pdf`, { type: 'application/pdf' }));
  results.pdf.push({ ms: +(performance.now() - t0).toFixed(1), pages: parsed.pageCount, chars: parsed.text.length, words: parsed.wordCount });
}

for (let i = 0; i < 15; i += 1) {
  const t0 = performance.now();
  const parsed = await parseDocument(new File([new Uint8Array(typicalDocx)], `typical-${i}.docx`, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }));
  results.docx.push({ ms: +(performance.now() - t0).toFixed(1), chars: parsed.text.length, words: parsed.wordCount });
}

const summarize = (rows) => {
  const ms = rows.map((r) => r.ms);
  return {
    runs: rows.length,
    p50: quantile(ms, 0.5),
    p95: quantile(ms, 0.95),
    min: Math.min(...ms),
    max: Math.max(...ms),
    mean: +(ms.reduce((a, b) => a + b, 0) / ms.length).toFixed(1),
  };
};

const report = {
  generatedAt: new Date().toISOString(),
  typicalPdf: {
    pages: results.pdf[0].pages,
    chars: results.pdf[0].chars,
    words: results.pdf[0].words,
    bytes: typicalPdf.length,
    ...summarize(results.pdf),
  },
  typicalDocx: {
    chars: results.docx[0].chars,
    words: results.docx[0].words,
    bytes: typicalDocx.length,
    ...summarize(results.docx),
  },
  raw: results,
};
fs.writeFileSync('docs/local/gemini-live/parse-latency.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
