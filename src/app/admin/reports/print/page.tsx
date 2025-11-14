"use client";
import { useEffect, useMemo } from "react";
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

  // Common filters from query string
  const search = params.get("search") || undefined;
  const dateFrom = params.get("dateFrom") ? new Date(params.get("dateFrom")!) : undefined;
  const dateTo = params.get("dateTo") ? new Date(params.get("dateTo")!) : undefined;

  // Products-specific
  const categoryId = params.get("categoryId") ? Number(params.get("categoryId")) : undefined;

  // Attendance-specific
  const attDate = params.get("date") ? new Date(params.get("date")!) : undefined;

  // Feedback-specific
  const stars = params.get("stars") ? Number(params.get("stars")) : undefined;

  // Data fetching based on section
  const productsQuery = api.reports.getProducts.useQuery(
    section === "products"
      ? {
          skip: 0,
          take: 100000,
          search,
          dateFrom,
          dateTo,
          categoryId,
        }
      : ({} as any),
    { enabled: section === "products" }
  );

  const attendanceQuery = api.attendanceRecord.getAll.useQuery(
    section === "attendance"
      ? {
          search,
          date: attDate,
        }
      : ({} as any),
    { enabled: section === "attendance" }
  );

  const feedbackQuery = api.feedback.getAllForExport?.useQuery
    ? api.feedback.getAllForExport.useQuery(
        section === "feedback"
          ? {
              search,
              stars,
              dateFrom,
              dateTo,
            }
          : ({} as any),
        { enabled: section === "feedback" }
      )
    : ({ data: undefined, isLoading: false } as any);

  const isLoading =
    (section === "products" && productsQuery.isLoading) ||
    (section === "attendance" && attendanceQuery.isLoading) ||
    (section === "feedback" && feedbackQuery.isLoading);

  const title = useMemo(() => {
    if (section === "products") return "Products Report";
    if (section === "attendance") return "Attendance Report";
    if (section === "feedback") return "Feedback Report";
    return "Report";
  }, [section]);

  // Auto-print after data loads to allow easy Save as PDF
  useEffect(() => {
    if (!isLoading) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [isLoading]);

  return (
    <div className="p-6 print:p-0">
      {/* Header with logo and org details */}
      <div className="border-b pb-4 mb-6">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Logo" className="h-14 w-14 object-contain" />
          <div>
            <div className="text-xl font-bold leading-tight">PingPing</div>
            <div className="text-sm text-gray-700">{title}</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xs text-gray-600">Generated: {fmtDate(new Date())}</div>
            <div className="text-xs text-gray-600">
              {dateFrom || dateTo ? `Range: ${fmtDate(dateFrom)} - ${fmtDate(dateTo)}` : ""}
              {attDate ? ` ${dateFrom || dateTo ? "• " : ""}Date: ${fmtDate(attDate)}` : ""}
              {typeof stars === "number" ? ` ${dateFrom || dateTo || attDate ? "• " : ""}Stars: ${stars}` : ""}
            </div>
            {search && (
              <div className="text-xs text-gray-600">Search: "{search}"</div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {section === "products" && (
        <ProductsTable products={productsQuery.data?.data ?? []} />
      )}
      {section === "attendance" && (
        <AttendanceTable rows={attendanceQuery.data ?? []} />
      )}
      {section === "feedback" && (
        <FeedbackTable rows={feedbackQuery.data ?? []} />
      )}

      {/* Fallback for unknown section */}
      {!section && (
        <p className="text-center text-gray-500">No section specified.</p>
      )}
    </div>
  );
}

function ProductsTable({ products }: { products: any[] }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className="border p-2 text-left">ID</th>
          <th className="border p-2 text-left">Name</th>
          <th className="border p-2 text-left">Description</th>
          <th className="border p-2 text-right">Stock</th>
          <th className="border p-2 text-right">Price</th>
          <th className="border p-2 text-left">Categories</th>
          <th className="border p-2 text-left">Created</th>
        </tr>
      </thead>
      <tbody>
        {products.map((p) => (
          <tr key={p.id}>
            <td className="border p-2">{p.id}</td>
            <td className="border p-2">{p.name}</td>
            <td className="border p-2">{p.description}</td>
            <td className="border p-2 text-right">{p.stock}</td>
            <td className="border p-2 text-right">{p.price}</td>
            <td className="border p-2">{p.categories?.map((c: any) => c.category?.name).join(", ")}</td>
            <td className="border p-2">{fmtDate(p.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AttendanceTable({ rows }: { rows: any[] }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className="border p-2 text-left">ID</th>
          <th className="border p-2 text-left">Employee</th>
          <th className="border p-2 text-left">Username</th>
          <th className="border p-2 text-left">Date</th>
          <th className="border p-2 text-left">Time In</th>
          <th className="border p-2 text-left">Time Out</th>
          <th className="border p-2 text-left">Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="border p-2">{r.id}</td>
            <td className="border p-2">{`${r.employee?.firstname ?? ""} ${r.employee?.lastname ?? ""}`}</td>
            <td className="border p-2">{r.employee?.username ?? ""}</td>
            <td className="border p-2">{fmtDate(r.date)}</td>
            <td className="border p-2">{fmtDate(r.timeIn)}</td>
            <td className="border p-2">{fmtDate(r.timeOut)}</td>
            <td className="border p-2">{r.status ?? ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FeedbackTable({ rows }: { rows: any[] }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className="border p-2 text-left">ID</th>
          <th className="border p-2 text-left">Name</th>
          <th className="border p-2 text-left">Email</th>
          <th className="border p-2 text-left">Stars</th>
          <th className="border p-2 text-left">Feedback</th>
          <th className="border p-2 text-left">Created</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((f) => (
          <tr key={f.id}>
            <td className="border p-2">{f.id}</td>
            <td className="border p-2">{f.name}</td>
            <td className="border p-2">{f.email}</td>
            <td className="border p-2">{f.star}</td>
            <td className="border p-2">{f.feedback}</td>
            <td className="border p-2">{fmtDate(f.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
