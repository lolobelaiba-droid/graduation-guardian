/**
 * useCssPrint - Hook for CSS-based native printing
 * 
 * Injects dynamic @page CSS rules and triggers window.print()
 * for native print preview with correct paper dimensions.
 */

import { useCallback, useRef } from "react";

interface CssPrintOptions {
  widthMm: number;
  heightMm: number;
  orientation?: 'portrait' | 'landscape';
}

export function useCssPrint() {
  const styleRef = useRef<HTMLStyleElement | null>(null);

  const injectPrintStyles = useCallback((options: CssPrintOptions) => {
    // Remove any previous print style
    if (styleRef.current) {
      styleRef.current.remove();
      styleRef.current = null;
    }

    const style = document.createElement('style');
    style.id = 'dynamic-print-styles';
    style.textContent = `
      @media print {
        @page {
          size: ${options.widthMm}mm ${options.heightMm}mm;
          margin: 0;
        }

        /* Hide everything */
        body * {
          visibility: hidden !important;
        }

        /* Remove non-print elements from flow entirely */
        [data-print-hide] {
          display: none !important;
        }

        body, html {
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
          background: white !important;
          box-shadow: none !important;
        }

        /* Show printable wrapper and all its descendants */
        #printable-certificate-wrapper,
        #printable-certificate-wrapper * {
          visibility: visible !important;
        }

        /* Hide background image inside printable area - only used for alignment */
        #printable-certificate-wrapper [data-print-hide] {
          display: none !important;
          visibility: hidden !important;
        }

        #printable-certificate-wrapper {
          display: block !important;
          position: fixed !important;
          left: 0 !important;
          top: 0 !important;
          width: ${options.widthMm}mm !important;
          height: ${options.heightMm}mm !important;
          z-index: 999999 !important;
          background: white !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        #printable-certificate {
          position: relative !important;
          left: 0 !important;
          top: 0 !important;
          width: ${options.widthMm}mm !important;
          height: ${options.heightMm}mm !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        #printable-certificate img {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `;
    document.head.appendChild(style);
    styleRef.current = style;
  }, []);

  const removePrintStyles = useCallback(() => {
    if (styleRef.current) {
      styleRef.current.remove();
      styleRef.current = null;
    }
  }, []);

  const print = useCallback((options: CssPrintOptions): Promise<void> => {
    return new Promise((resolve) => {
      // Inject the dynamic print styles
      injectPrintStyles(options);

      // Small delay to ensure styles are applied
      requestAnimationFrame(() => {
        // Listen for after-print to clean up
        const cleanup = () => {
          removePrintStyles();
          window.removeEventListener('afterprint', cleanup);
          resolve();
        };
        window.addEventListener('afterprint', cleanup);

        // Trigger native print dialog
        window.print();
      });
    });
  }, [injectPrintStyles, removePrintStyles]);

  return { print, injectPrintStyles, removePrintStyles };
}
