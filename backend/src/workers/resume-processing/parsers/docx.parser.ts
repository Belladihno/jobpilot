import { Injectable } from '@nestjs/common';
import mammoth from 'mammoth';
import type { ResumeParser } from './resume-parser.interface';

@Injectable()
export class DocxResumeParser implements ResumeParser {
  supports(mimeType: string): boolean {
    return (
      mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  }

  async extract(buffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value.trim();
    if (!text) {
      throw new Error('DOCX contained no extractable text');
    }
    return text;
  }
}
