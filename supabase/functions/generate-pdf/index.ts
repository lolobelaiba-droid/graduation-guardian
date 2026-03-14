import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { htmlContent, fontFamily, fontSize, lineHeight, margins, title } =
      await req.json();

    if (!htmlContent) {
      return new Response(JSON.stringify({ error: "Missing htmlContent" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a self-contained HTML page
    const fullHtml = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>${title || "وثيقة"}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=Amiri:wght@400;700&family=Cairo:wght@400;600;700&family=Tajawal:wght@400;500;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page {
    size: A4 portrait;
    margin: ${margins?.top ?? 20}mm ${margins?.left ?? 15}mm ${margins?.bottom ?? 20}mm ${margins?.right ?? 15}mm;
  }
  body {
    font-family: '${fontFamily || "IBM Plex Sans Arabic"}', 'IBM Plex Sans Arabic', sans-serif;
    font-size: ${fontSize || 14}px;
    line-height: ${lineHeight || 1.8};
    direction: rtl;
    color: #000;
  }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #333; padding: 8px; text-align: center; }
  th { background: #f0f0f0; font-weight: bold; }
  .variable-tag { background: transparent !important; color: inherit !important; padding: 0 !important; }
  @media print { body { -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>${htmlContent}</body>
</html>`;

    // Use Browserless/Chromium via Deno subprocess is not available in edge functions.
    // Instead, return the self-contained HTML as a downloadable file that the
    // browser can then print-to-PDF using its own rendering engine.
    // 
    // We return the HTML as a blob that the frontend will open in a new window
    // and auto-print with the "Save as PDF" destination pre-selected.
    //
    // Alternative: Return as application/pdf using a PDF generation library.
    // Since Deno edge functions don't have a headless browser, we return HTML
    // and let the frontend handle the conversion via a clever iframe approach.

    return new Response(fullHtml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(title || "document")}.html"`,
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
