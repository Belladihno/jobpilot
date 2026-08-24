import { Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import type { ResumeParser } from './resume-parser.interface';

@Injectable()
export class PdfResumeParser implements ResumeParser {
  supports(mimeType: string): boolean {
    return mimeType === 'application/pdf';
  }

  async extract(buffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      const text = result.text.trim();
      if (!text) {
        throw new Error('PDF contained no extractable text');
      }
      return text;
    } finally {
      await parser.destroy();
    }
  }
}
