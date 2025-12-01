import { NextResponse } from "next/server";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

// GET /api/reports/preview?section=products|attendance|feedback&...&download=1
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const section = (searchParams.get("section") || "").toLowerCase();
    const download = searchParams.get("download") === "1";

    if (!section || !["products", "attendance", "feedback"].includes(section)) {
      return new NextResponse("Missing or invalid section", { status: 400 });
    }

    const ctx = await createTRPCContext({ headers: new Headers(req.headers) });
    const trpc = createCaller(ctx);

    // Parse common params
    const search = searchParams.get("search") || undefined;
    const dateFromStr = searchParams.get("dateFrom");
    const dateToStr = searchParams.get("dateTo");
    const dateStr = searchParams.get("date");
    const starsStr = searchParams.get("stars");
    const categoryIdStr = searchParams.get("categoryId");

    const dateFrom = dateFromStr ? new Date(dateFromStr) : undefined;
    const dateTo = dateToStr ? new Date(dateToStr) : undefined;
    const date = dateStr ? new Date(dateStr) : undefined;
    const stars = starsStr ? Number(starsStr) : undefined;
    const categoryId = categoryIdStr ? Number(categoryIdStr) : undefined;

    let result: { pdfBase64: string; filename?: string } | undefined;

    if (section === "products") {
      result = await trpc.reports.exportProductsPDF({ search, dateFrom, dateTo, categoryId } as any);
    } else if (section === "attendance") {
      result = await trpc.attendanceRecord.exportPDF({ search, date } as any);
    } else if (section === "feedback") {
      result = await trpc.feedback.exportPDF({ search, stars, dateFrom, dateTo } as any);
    }

    if (!result?.pdfBase64) {
      return new NextResponse("Failed to generate PDF", { status: 500 });
    }

    const bytes = Buffer.from(result.pdfBase64, "base64");
    const headers = new Headers();
    headers.set("Content-Type", "application/pdf");
    headers.set(
      "Content-Disposition",
      `${download ? "attachment" : "inline"}; filename="${result.filename ?? "report.pdf"}"`
    );
    return new NextResponse(bytes, { status: 200, headers });
  } catch (err: any) {
    const msg = err?.message ?? "Internal Server Error";
    return new NextResponse(`Error generating PDF: ${msg}`.slice(0, 2000), { status: 500 });
  }
}

