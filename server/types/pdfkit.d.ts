declare module 'pdfkit' {
  interface PDFDocumentOptions {
    margins?: {
      top?: number | string;
      bottom?: number | string;
      left?: number | string;
      right?: number | string;
    };
    size?: string | [number, number];
    autoFirstPage?: boolean;
    layout?: 'portrait' | 'landscape';
    info?: {
      Title?: string;
      Author?: string;
      Subject?: string;
      Keywords?: string;
    };
    bufferPages?: boolean;
    compress?: boolean;
    pageAdding?: Function;
    // Otras opciones que puedas necesitar
  }

  class PDFDocument {
    constructor(options?: PDFDocumentOptions);
    
    page: {
      width: number;
      height: number;
    };
    
    on(event: string, callback: Function): this;
    
    fontSize(size: number): this;
    font(font: string): this;
    text(text: string, options?: {
      align?: 'left' | 'center' | 'right' | 'justify',
      continued?: boolean,
      indent?: number,
      paragraphGap?: number,
      lineGap?: number,
      columns?: number,
      columnGap?: number,
      height?: number,
      ellipsis?: boolean | string,
      width?: number
    }): this;
    
    moveDown(lines?: number): this;
    end(): void;
    
    // Añade más métodos según los necesites
    y: number;
    x: number;
  }

  export default PDFDocument;
}

declare namespace PDFKit {
  interface PDFDocument {
    // Los métodos y propiedades ya definidos arriba
  }
}