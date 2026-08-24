import { Injectable } from '@nestjs/common';
import type { ResumeParser } from './parsers/resume-parser.interface';
import { DocxResumeParser } from './parsers/docx.parser';
import { PdfResumeParser } from './parsers/pdf.parser';

@Injectable()
export class ResumeParserRegistry {
  private readonly parsers: ResumeParser[];

  constructor(pdfParser: PdfResumeParser, docxParser: DocxResumeParser) {
    this.parsers = [pdfParser, docxParser];
  }

  find(mimeType: string): ResumeParser | null {
    return this.parsers.find((parser) => parser.supports(mimeType)) ?? null;
  }
}
