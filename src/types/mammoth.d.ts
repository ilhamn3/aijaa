declare module "mammoth" {
  export interface ConversionResult {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }
  export function convertToHtml(input: { buffer: Buffer }): Promise<ConversionResult>;
  export function extractRawText(input: { buffer: Buffer }): Promise<ConversionResult>;
}
