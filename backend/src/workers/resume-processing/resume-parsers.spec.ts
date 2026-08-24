import { ResumeParserRegistry } from './resume-parser.registry';
import { DocxResumeParser } from './parsers/docx.parser';
import { PdfResumeParser } from './parsers/pdf.parser';

jest.mock('pdf-parse', () => ({
  PDFParse: jest.fn().mockImplementation(() => ({
    getText: jest.fn().mockResolvedValue({ text: '  extracted pdf text  ' }),
    destroy: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('mammoth', () => ({
  extractRawText: jest
    .fn()
    .mockResolvedValue({ value: '  extracted docx text  ' }),
}));

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

describe('ResumeParserRegistry', () => {
  const registry = new ResumeParserRegistry(
    new PdfResumeParser(),
    new DocxResumeParser(),
  );

  it('finds the pdf parser for application/pdf', () => {
    expect(registry.find('application/pdf')).toBeInstanceOf(PdfResumeParser);
  });

  it('finds the docx parser for the docx mime', () => {
    expect(registry.find(DOCX_MIME)).toBeInstanceOf(DocxResumeParser);
  });

  it('returns null for unsupported mime types', () => {
    expect(registry.find('text/plain')).toBeNull();
  });
});

describe('PdfResumeParser', () => {
  it('extracts and trims text from a pdf buffer', async () => {
    const text = await new PdfResumeParser().extract(Buffer.from('%PDF'));
    expect(text).toBe('extracted pdf text');
  });

  it('rejects a pdf without extractable text', async () => {
    const { PDFParse } = jest.requireMock('pdf-parse') as {
      PDFParse: jest.Mock;
    };
    PDFParse.mockImplementationOnce(() => ({
      getText: jest.fn().mockResolvedValue({ text: '   ' }),
      destroy: jest.fn().mockResolvedValue(undefined),
    }));

    await expect(
      new PdfResumeParser().extract(Buffer.from('%PDF')),
    ).rejects.toThrow('no extractable text');
  });
});

describe('DocxResumeParser', () => {
  it('extracts and trims text from a docx buffer', async () => {
    const text = await new DocxResumeParser().extract(Buffer.from('docx'));
    expect(text).toBe('extracted docx text');
  });

  it('rejects a docx without extractable text', async () => {
    const mammoth = jest.requireMock('mammoth') as {
      extractRawText: jest.Mock;
    };
    mammoth.extractRawText.mockResolvedValueOnce({ value: '' });

    await expect(
      new DocxResumeParser().extract(Buffer.from('docx')),
    ).rejects.toThrow('no extractable text');
  });
});
