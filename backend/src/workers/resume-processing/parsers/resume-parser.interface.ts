export interface ResumeParser {
  supports(mimeType: string): boolean;
  extract(buffer: Buffer): Promise<string>;
}
