export {};

declare global {
  interface Window {
    electronAPI?: {
      getVersion: () => string;
      getPlatform: () => string;

      getPrinters?: () => Promise<
        Array<{
          name: string;
          displayName?: string;
          description?: string;
          isDefault?: boolean;
          status?: number;
        }>
      >;

      printPdf?: (
        pdfArrayBuffer: ArrayBuffer,
        options?: { deviceName?: string }
      ) => Promise<{ success: boolean; error?: string }>;

      openPrintersSettings?: () => Promise<boolean>;
    };
  }
}
