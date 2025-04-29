declare module 'pdf-parse' {
  interface PDFData {
    text: string;
    info: any;
    metadata: any;
    numpages: number;
    [key: string]: any;
  }

  function parse(dataBuffer: Buffer, options?: any): Promise<PDFData>;
  
  export = parse;
}