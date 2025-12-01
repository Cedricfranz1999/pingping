"use client";
import { useMemo, useCallback, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";

function fmtDate(d?: Date | null) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "";
  }
}

export default function ReportsPrintPage() {
  const params = useSearchParams();
  const section = (params.get("section") || "").toLowerCase();
  // no print dialog; export PDF via server
  const [downloading, setDownloading] = useState(false);

  // Common filters from query string (memoize parsed values)
  const search = params.get("search") || undefined;
  const dateFromStr = params.get("dateFrom");
  const dateToStr = params.get("dateTo");
  const dateFrom = useMemo(() => (dateFromStr ? new Date(dateFromStr) : undefined), [dateFromStr]);
  const dateTo = useMemo(() => (dateToStr ? new Date(dateToStr) : undefined), [dateToStr]);

  // Products-specific
  const categoryIdStr = params.get("categoryId");
  const categoryId = useMemo(() => (categoryIdStr ? Number(categoryIdStr) : undefined), [categoryIdStr]);

  // Attendance-specific
  const attDateStr = params.get("date");
  const attDate = useMemo(() => (attDateStr ? new Date(attDateStr) : undefined), [attDateStr]);

  // Feedback-specific
  const starsStr = params.get("stars");
  const stars = useMemo(() => (starsStr ? Number(starsStr) : undefined), [starsStr]);
  // No client-side data fetching here; preview uses server PDF

  const title = useMemo(() => {
    if (section === "products") return "Products Report";
    if (section === "attendance") return "Attendance Report";
    if (section === "feedback") return "Feedback Report";
    return "Report";
  }, [section]);

  // State for inline PDF preview (via API route)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const downloadPDF = (base64: string, filename: string) => {
    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openPdfInNewTab = (base64: string) => {
    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const handleExportPDF = useCallback(() => {
    if (downloading) return;
    setDownloading(true);
    const qs = new URLSearchParams();
    if (section) qs.set("section", section);
    if (search) qs.set("search", search);
    if (dateFrom) qs.set("dateFrom", dateFrom.toISOString());
    if (dateTo) qs.set("dateTo", dateTo.toISOString());
    if (categoryId != null) qs.set("categoryId", String(categoryId));
    if (attDate) qs.set("date", attDate.toISOString());
    if (typeof stars === "number") qs.set("stars", String(stars));
    qs.set("download", "1");
    const url = `/api/reports/preview?${qs.toString()}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setDownloading(false);
  }, [section, search, dateFrom, dateTo, categoryId, attDate, stars, downloading]);

  // Build preview URL to the API route
  const buildPreviewUrl = useCallback(() => {
    if (!section) return null;
    const qs = new URLSearchParams();
    qs.set("section", section);
    if (search) qs.set("search", search);
    if (dateFrom) qs.set("dateFrom", dateFrom.toISOString());
    if (dateTo) qs.set("dateTo", dateTo.toISOString());
    if (categoryId != null) qs.set("categoryId", String(categoryId));
    if (attDate) qs.set("date", attDate.toISOString());
    if (typeof stars === "number") qs.set("stars", String(stars));
    return `/api/reports/preview?${qs.toString()}`;
  }, [section, search, dateFrom, dateTo, categoryId, attDate, stars]);

  // Generate PDF on load/filters change and show in preview
  // Ensures the preview matches the exported PDF format
  const loadPreview = useCallback(() => {
    if (!section) {
      setPdfUrl(null);
      return;
    }
    setPreviewError(null);
    setPreviewLoading(true);
    const url = buildPreviewUrl();
    setPdfUrl(url);
    const t = setTimeout(() => setPreviewLoading(false), 300);
    return () => clearTimeout(t);
  }, [section, buildPreviewUrl]);

  // Trigger preview generation
  useEffect(() => {
    const t = setTimeout(() => {
      loadPreview();
    }, 150);
    return () => {
      clearTimeout(t);
      setPdfUrl(null);
    };
  }, [loadPreview]);

  return (
    <div className="p-6 print:p-0">
      {/* Preview toolbar (hidden on print) */}
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <div className="text-sm text-gray-600">
          {title} - PDF Preview
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            disabled={downloading || previewLoading}
            className="rounded-md bg-[#f8610e] px-4 py-2 text-white shadow hover:opacity-90 disabled:opacity-60"
          >
            {downloading ? "Exporting..." : "Download PDF"}
          </button>
          {pdfUrl && (
            <a
              // href={pdfUrl}
              // target="_blank"
              // rel="noreferrer"
              // className="rounded-md border border-[#f8610e] px-4 py-2 text-[#f8610e] shadow hover:bg-orange-50"
            >
              {/* Open in New Tab */}
            </a>
          )}
        </div>
      </div>

      {/* Inline PDF preview to match export formatting */}
      {previewLoading && (
        <div className="flex h-[80vh] items-center justify-center text-gray-500">
          Generating PDF preview...</div>
      )}

      {!previewLoading && previewError && (
        <div className="text-center text-red-600">{previewError}</div>
      )}

      {!previewLoading && !previewError && !pdfUrl && section && (
        <div className="text-center text-gray-500">No preview available. Try Download PDF.</div>
      )}

      {!previewLoading && pdfUrl && (
        <object
          data={pdfUrl}
          type="application/pdf"
          className="h-[85vh] w-full rounded border"
        >
          <iframe src={pdfUrl} className="h-[85vh] w-full" title="PDF Preview" />
        </object>
      )}

      {/* Fallback when no section is specified */}
      {!section && (
        <p className="text-center text-gray-500">No section specified.</p>
      )}
    </div>
  );
}

