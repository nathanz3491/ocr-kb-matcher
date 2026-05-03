import * as fs from 'fs/promises';
import * as path from 'path';
import mammoth from 'mammoth';
import JSZip from 'jszip';

export async function extractFromPDF(filePath: string): Promise<string> {
  const _origParse = JSON.parse.bind(JSON);
  const { PDFParse } = await import('pdf-parse');
  JSON.parse = _origParse;
  const dataBuffer = await fs.readFile(filePath);
  const parser = new PDFParse({ data: dataBuffer as any });
  const textResult = await parser.getText();
  await parser.destroy();
  return textResult.text.trim();
}

export async function extractFromDOCX(filePath: string): Promise<string> {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value.trim();
}

export async function extractFromPPTX(filePath: string): Promise<string> {
  const data = await fs.readFile(filePath);
  const zip = await JSZip.loadAsync(data);
  const slideTexts: string[] = [];

  const slideFiles = Object.keys(zip.files).filter((name) => {
    return name.startsWith('ppt/slides/slide') && name.endsWith('.xml') && !name.includes('_rels');
  });

  for (const slideFile of slideFiles) {
    const xmlContent = await zip.files[slideFile].async('string');
    const text = extractTextFromSlideXML(xmlContent);
    if (text) {
      slideTexts.push(text);
    }
  }

  return slideTexts.join('\n\n').trim();
}

function extractTextFromSlideXML(xml: string): string {
  const texts: string[] = [];
  const regex = /<a:t>([^<]*)<\/a:t>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const text = match[1].trim();
    if (text) {
      texts.push(text);
    }
  }
  return texts.join(' ');
}

export async function extractFromText(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, 'utf-8');
  return content.trim();
}

export async function extractFromFile(filePath: string, mimeType: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (mimeType === 'application/pdf' || ext === '.pdf') {
    return extractFromPDF(filePath);
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === '.docx') {
    return extractFromDOCX(filePath);
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || ext === '.pptx') {
    return extractFromPPTX(filePath);
  }
  if (mimeType === 'text/plain' || ext === '.txt') {
    return extractFromText(filePath);
  }
  if (mimeType === 'text/markdown' || ext === '.md') {
    return extractFromText(filePath);
  }

  throw new Error(`Unsupported file type: ${mimeType} (${ext})`);
}
