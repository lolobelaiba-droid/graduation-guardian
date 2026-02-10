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

        /* Hide everything except the printable certificate */
        body > * {
          visibility: hidden !important;
          position: absolute !important;
          overflow: hidden !important;
        }

        /* Override the hidden wrapper so the certificate can escape */
        #printable-certificate-wrapper {
          position: fixed !important;
          left: 0 !important;
          top: 0 !important;
          width: ${options.widthMm}mm !important;
          height: ${options.heightMm}mm !important;
          overflow: visible !important;
          clip: auto !important;
          clip-path: none !important;
          white-space: normal !important;
          z-index: 999999 !important;
          visibility: visible !important;
        }

        /* Make the printable certificate visible */
        #printable-certificate {
          visibility: visible !important;
          position: relative !important;
          left: 0 !important;
          top: 0 !important;
          width: ${options.widthMm}mm !important;
          height: ${options.heightMm}mm !important;
          margin: 0 !important;
          padding: 0 !important;
          z-index: 999999 !important;
          background: white !important;
          overflow: hidden !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        /* Ensure all children of the printable certificate are visible */
        #printable-certificate * {
          visibility: visible !important;
        }

        /* Ensure images print with correct colors */
        #printable-certificate img {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* Hide scrollbars, shadows, borders */
        body {
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }

        /* Remove all backgrounds and shadows from non-print elements */
        html, body {
          background: white !important;
          box-shadow: none !important;
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
