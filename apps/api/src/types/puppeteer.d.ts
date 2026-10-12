declare module 'puppeteer' {
  export interface PDFOptions {
    format?: string;
    printBackground?: boolean;
    margin?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
  }

  export interface SetContentOptions {
    waitUntil?: string | string[];
    timeout?: number;
  }

  export interface Page {
    setContent(html: string, options?: SetContentOptions): Promise<void>;
    pdf(options?: PDFOptions): Promise<Buffer>;
    close(): Promise<void>;
  }

  export interface BrowserLaunchArgumentOptions {
    headless?: boolean | 'new' | 'shell';
    args?: string[];
  }

  export interface Browser {
    connected: boolean;
    newPage(): Promise<Page>;
    close(): Promise<void>;
  }

  export function launch(options?: BrowserLaunchArgumentOptions): Promise<Browser>;

  const puppeteer: {
    launch(options?: BrowserLaunchArgumentOptions): Promise<Browser>;
  };

  export default puppeteer;
}
