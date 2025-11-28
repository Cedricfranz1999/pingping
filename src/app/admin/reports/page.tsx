// ~/src/app/admin/reports/page.tsx
"use client";
import { useMemo, useState, type JSXElementConstructor, type Key, type ReactElement, type ReactNode, type ReactPortal } from "react";
import { useToast } from "~/components/ui/use-toast";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Calendar } from "~/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "~/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "~/components/ui/select";
// Removed Calendar date range UI in header per request
// import { Calendar } from "~/components/ui/calendar";
// Removed Popover date range UI in header per request
// import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import { format } from "date-fns";
import {
  Download,
  Calendar as CalendarIcon,
  Search,
  Package,
  FileText,
  Loader2,
  TrendingUp,
  ClipboardList,
  Users,
  Star,
  Filter,
} from "lucide-react";

const ReportsPage = () => {
  const { toast } = useToast();
  const safeFormat = (d?: Date, fmt = "LLL dd, y") => (d ? format(d, fmt) : "");
  const SHOW_PRODUCTS = false;
  const SHOW_FEEDBACK = false;

  // Shared filters
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>(
    { from: undefined, to: undefined }
  );
  // â¬‡ï¸ Removed stockFilter state
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>();

  // --- PRODUCTS (fetch ALL) ---
  const { data: summaryData, isLoading: summaryLoading } =
    api.reports.getStockSummary.useQuery();

  // Request a very large page to effectively return all records
  const { data: productsData, isLoading: productsLoading } =
    api.reports.getProducts.useQuery({
      skip: 0,
      take: 100000,
      search,
      // â¬‡ï¸ Removed stockFilter from query args
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
      categoryId: categoryFilter,
    });

  const { data: categories, isLoading: categoriesLoading } =
    api.reports.getCategories.useQuery();

  // --- ATTENDANCE (client-side pagination) ---
  const [attSearch, setAttSearch] = useState("");
  const [attPage, setAttPage] = useState(1);
  const attLimit = 10;
  const [attDate, setAttDate] = useState<Date | undefined>();

  // Normalize selected date to local noon to avoid timezone day-shift in server (UTC) environments
  const attDateMidday = attDate
    ? new Date(
        attDate.getFullYear(),
        attDate.getMonth(),
        attDate.getDate(),
        12,
        0,
        0,
        0,
      )
    : undefined;

  const { data: attendanceRaw, isLoading: attendanceLoading } =
    api.attendanceRecord.getAll.useQuery({
      search: attSearch || undefined,
      date: attDateMidday,
    });

  const attTotal = attendanceRaw?.length ?? 0;
  const attStart = (attPage - 1) * attLimit;
  const attRows = useMemo(
    () => (attendanceRaw ?? []).slice(attStart, attStart + attLimit),
    [attendanceRaw, attStart, attLimit],
  );

  // --- FEEDBACK ---
  const [fbSearch, setFbSearch] = useState("");
  // Exact star filter (1-5). null means All ratings
  const [fbStars, setFbStars] = useState<number | null>(null);
  const [fbPage, setFbPage] = useState(1);
  const fbLimit = 10;
  const [fbDateRange, setFbDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });

  const { data: feedbackData, isLoading: feedbackLoading } =
    api.feedback.getAll.useQuery({
      search: fbSearch || undefined,
      stars: fbStars ?? undefined,
      page: fbPage,
      limit: fbLimit,
      dateFrom: fbDateRange.from,
      dateTo: fbDateRange.to,
    });

  // --- EXPORTS (PDF) ---
  const exportProductsMutation = api.reports.exportProductsPDF.useMutation();
  const exportAttendanceMutation = api.attendanceRecord.exportPDF.useMutation();
  const exportFeedbackMutation = api.feedback.exportPDF.useMutation();

  // Open print-friendly PDF view in new tab
  const openPrint = (section: "products" | "attendance" | "feedback") => {
    const params = new URLSearchParams();
    params.set("section", section);

    if (section === "products") {
      if (search) params.set("search", search);
      if (dateRange.from) params.set("dateFrom", dateRange.from.toISOString());
      if (dateRange.to) params.set("dateTo", dateRange.to.toISOString());
      if (categoryFilter) params.set("categoryId", String(categoryFilter));
    } else if (section === "attendance") {
      if (attSearch) params.set("search", attSearch);
      if (attDateMidday) params.set("date", attDateMidday.toISOString());
    } else if (section === "feedback") {
      if (fbSearch) params.set("search", fbSearch);
      if (fbStars != null) params.set("stars", String(fbStars));
      if (fbDateRange.from) params.set("dateFrom", fbDateRange.from.toISOString());
      if (fbDateRange.to) params.set("dateTo", fbDateRange.to.toISOString());
    }

    window.open(`/admin/reports/print?${params.toString()}`, "_blank");
  };

  // PDF downloader
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

  // New PDF export handlers
  const handleExportProductsPDF = () => {
    exportProductsMutation.mutate(
      {
        search,
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
        categoryId: categoryFilter,
      } as any,
      {
        onSuccess: (data: { pdfBase64: string; filename?: string }) => {
          downloadPDF(data.pdfBase64, data.filename ?? `products-export-${format(new Date(), "yyyy-MM-dd")}.pdf`);
          toast({ title: "Export Successful", description: "Products PDF downloaded" });
        },
        onError: () => {
          toast({ title: "Export Failed", description: "Failed to export products PDF", variant: "destructive" });
        },
      },
    );
  };

  const handleExportAttendancePDF = () => {
    exportAttendanceMutation.mutate(
      {
        search: attSearch || undefined,
        date: attDateMidday ?? undefined,
      } as any,
      {
        onSuccess: (data: { pdfBase64: string; filename?: string }) => {
          downloadPDF(data.pdfBase64, data.filename ?? `attendance-export-${format(new Date(), "yyyy-MM-dd")}.pdf`);
          toast({ title: "Export Successful", description: "Attendance PDF downloaded" });
        },
        onError: () => {
          toast({ title: "Export Failed", description: "Failed to export attendance PDF", variant: "destructive" });
        },
      },
    );
  };

  const handleExportFeedbackPDF = () => {
    exportFeedbackMutation.mutate(
      {
        search: fbSearch || undefined,
        stars: fbStars ?? undefined,
        dateFrom: fbDateRange.from,
        dateTo: fbDateRange.to,
      },
      {
        onSuccess: (data: { pdfBase64: string; filename?: string }) => {
          downloadPDF(data.pdfBase64, data.filename ?? `feedback-export-${new Date().toISOString().slice(0, 10)}.pdf`);
          toast({ title: "Export Successful", description: "Feedback PDF downloaded" });
        },
        onError: () => {
          toast({ title: "Export Failed", description: "Failed to export feedback PDF", variant: "destructive" });
        },
      }
    );
  };

  // removed legacy CSV handlers
  const handleExportProductsCSV = () => {};
const handleExportAttendanceCSV = () => {};
const handleExportFeedbackCSV = () => {};

  if (summaryLoading || categoriesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="rounded-full bg-gradient-to-r from-[#f8610e] to-orange-600 p-3">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
          <p className="text-lg font-medium text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  const attendanceCount = attendanceRaw?.length ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <div className="container mx-auto space-y-8 p-6">
        {/* Header (hidden) */}
        {false && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#f8610e] to-orange-600 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-black/5"></div>
          <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-white/10 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-white/5 blur-2xl"></div>

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-2xl">
                Reports
              </h1>
              <p className="text-lg text-orange-100">Attendance Records</p>
            </div>

            {/* Top exports only (date range hidden) */}
            <div className="ml-auto flex flex-nowrap items-center gap-2 sm:gap-3">
              <Button
                onClick={() => openPrint("attendance")}
                disabled={exportAttendanceMutation.isPending}
                variant="secondary"
                size="sm"
                className="border-white/20 bg-white/10 text-white shadow-lg backdrop-blur-sm hover:bg-white/20 whitespace-nowrap"
              >
                Preview Attendance
              </Button>
            </div>
          </div>
        </div>
        )}

        {/* TOP: two cards with Export */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Products summary - hidden */}
          {false && (
          <Card className="group relative overflow-hidden rounded-2xl border-none bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg transition-all duration-300 hover:shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium tracking-wider text-blue-600 uppercase">
                    Total Products
                  </p>
                  <p className="text-3xl font-bold text-blue-900">
                    {summaryData?.totalProducts ?? 0}
                  </p>
                  <div className="flex items-center text-xs text-blue-600">
                    <TrendingUp className="mr-1 h-3 w-3" />
                    <span>Active Product</span>
                  </div>
                </div>
                {/* <div className="flex items-center gap-2">
                  <Button
                    onClick={() => openPrint("products")}
                    disabled={exportProductsMutation.isPending}
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-blue-300 bg-white/70 hover:bg-white"
                  >
                    {exportProductsMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Export
                  </Button>
                  <div className="rounded-xl bg-blue-500 p-3 shadow-lg transition-transform group-hover:scale-110">
                    <Package className="h-8 w-8 text-white" />
                  </div> */}
                {/* </div> */}
              </div>
            </CardContent>
          </Card>
          )}

          {/* Attendance summary (hidden) */}
          {false && (
          <Card className="group relative overflow-hidden rounded-2xl border-none bg-gradient-to-br from-green-50 to-green-100 shadow-lg transition-all duration-300 hover:shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium tracking-wider text-green-600 uppercase">
                    Attendance ({attDate ? safeFormat(attDate, "LLL dd, y") : "RECORD"})
                  </p>
                  <p className="text-3xl font-bold text-green-900">
                    {attendanceCount}
                  </p>
                  <div className="flex items-center text-xs text-green-600">
                    <ClipboardList className="mr-1 h-3 w-3" />
                    <span>Total records</span>
                  </div>
                </div>
                {/* <div className="flex items-center gap-2">
                  <Button
                    onClick={() => openPrint("attendance")}
                    disabled={exportAttendanceMutation.isPending}
                    variant="outline"
                    size="sm"
                    className="rounded-xl border-green-300 bg-white/70 hover:bg-white"
                  >
                    {exportAttendanceMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Export
                  </Button>
                  <div className="rounded-xl bg-green-500 p-3 shadow-lg transition-transform group-hover:scale-110">
                    <ClipboardList className="h-8 w-8 text-white" />
                  </div> */}
                {/* </div> */}
              </div>
            </CardContent>
          </Card>
          )}
        </div>

        {/* Advanced Filters (Products) - hidden */}
        {false && (
        <Card className="overflow-hidden rounded-2xl border-none shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 pb-4">
            <CardTitle className="flex items-center text-xl text-slate-800">
              <Filter className="mr-2 h-5 w-5 text-[#f8610e]" />
              Advanced Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="rounded-xl border-gray-200 pl-10 focus:border-[#f8610e] focus:ring-2 focus:ring-[#f8610e]/20"
                />
              </div>

              {/* â¬‡ï¸ Removed Stock Status dropdown completely */}

              <Select
                value={categoryFilter?.toString() ?? ""}
                onValueChange={(value: string) => setCategoryFilter(value ? parseInt(value) : undefined)}
                disabled={categoriesLoading}
              >
                <SelectTrigger className="w-[180px] rounded-xl border-gray-200 focus:border-[#f8610e] focus:ring-2 focus:ring-[#f8610e]/20">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all-categories">All Categories</SelectItem>
                  {categories?.map((category: { id: { toString: () => any } | string | number; name: any }) => (
                    <SelectItem key={category.id.toString()} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Hidden per request: Product date filter (Advanced Filters) */}
              {/**
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[280px] justify-start rounded-xl border-gray-200 text-left font-normal hover:border-[#f8610e]",
                      !dateRange.from && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto rounded-xl p-0">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              **/}
            </div>
          </CardContent>
        </Card>
        )}

        {/* PRODUCT INVENTORY TABLE (hidden) */}
        {false && (
        <Card className="overflow-hidden rounded-2xl border-none shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 pb-4">
            <div className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center text-xl text-slate-800">
                <Package className="mr-2 h-5 w-5 text-[#f8610e]" />
                Product Management
              </CardTitle>
              <Button
                onClick={() => openPrint("products")}
                disabled={exportProductsMutation.isPending}
                variant="outline"
                className="rounded-xl border-gray-200 hover:border-[#f8610e] hover:bg-[#f8610e] hover:text-white"
              >
                {exportProductsMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Preview
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {productsLoading ? (
              <div className="space-y-4 p-6">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-100 bg-gray-50/50">
                      <TableHead className="font-semibold text-gray-700">Product</TableHead>
                      <TableHead className="font-semibold text-gray-700">Categories</TableHead>
                      {/* Stock column hidden previously; keep hidden */}
                      <TableHead className="font-semibold text-gray-700">Price</TableHead>
                      {/* â¬‡ï¸ Removed Status column */}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {productsData?.data.map((product: { id: Key | null | undefined; name: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; description: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; categories: any[]; price: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; }, index: number) => (
                      <TableRow
                        key={product.id}
                        className={`border-b border-gray-50 transition-colors hover:bg-orange-50/50 ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                        }`}
                      >
                        <TableCell className="p-4">
                          <div className="space-y-1">
                            <div className="font-semibold text-gray-900">{product.name}</div>
                            <div className="line-clamp-1 text-sm text-gray-600">{product.description}</div>
                          </div>
                        </TableCell>

                        <TableCell className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {product.categories.map((pc) => (
                              <Badge
                                key={pc.id}
                                variant="outline"
                                className="rounded-full border-[#f8610e]/30 bg-[#f8610e]/5 font-medium text-[#f8610e]"
                              >
                                {pc.category.name}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>

                        {/* Stock cell still hidden */}

                        <TableCell className="p-4">
                          <span className="text-lg font-bold text-gray-900">
                            {product.price}
                          </span>
                        </TableCell>

                        {/* â¬‡ï¸ Removed Status cell */}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* {(!productsData || productsData.data.length === 0) && (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                    <FileText className="mb-2 h-8 w-8" />
                    No products found
                  </div> */}
                {/* )} */}
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* ATTENDANCE TABLE */}
        <Card className="overflow-hidden rounded-2xl border-none shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-xl text-slate-800">
                <ClipboardList className="mr-2 h-5 w-5 text-[#f8610e]" />
                Employee Attendance
              </CardTitle>
              <Button
                onClick={() => openPrint("attendance")}
                disabled={exportAttendanceMutation.isPending}
                variant="outline"
                className="rounded-xl border-gray-200 hover:border-[#f8610e] hover:bg-[#f8610e] hover:text-white"
              >
                {exportAttendanceMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Preview
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="relative md:col-span-2">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search employee..."
                  value={attSearch}
                  onChange={(e) => { setAttSearch(e.target.value); setAttPage(1); }}
                  className="rounded-xl border-gray-200 pl-10"
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start rounded-xl border-gray-200 text-left font-normal",
                      !attDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {attDate ? safeFormat(attDate, "LLL dd, y") : <span>Filter date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto rounded-xl p-0">
                  <Calendar
                    mode="single"
                    selected={attDate}
                    onSelect={(d) => { setAttDate(d ?? undefined); setAttPage(1); }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {attendanceLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50">
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time In</TableHead>
                      <TableHead>Time Out</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attRows.map((row: any) => {
                      const hours =
                        row.timeIn && row.timeOut
                          ? ((new Date(row.timeOut).getTime() - new Date(row.timeIn).getTime()) / 36e5).toFixed(2)
                          : "â€”";
                      const status = String(row.status ?? "").toLowerCase();
                      return (
                        <TableRow key={row.id} className="hover:bg-orange-50/40">
                          <TableCell>
                            <div className="font-medium">
                              {row.employee?.firstname} {row.employee?.lastname}
                            </div>
                            <div className="text-xs text-gray-500">
                              {row.employee?.username ?? row.employeeId}
                            </div>
                          </TableCell>
                          <TableCell>{row.date ? format(new Date(row.date), "MMM dd, yyyy") : "â€”"}</TableCell>
                          <TableCell>{row.timeIn ? format(new Date(row.timeIn), "hh:mm a") : "â€”"}</TableCell>
                          <TableCell>{row.timeOut ? format(new Date(row.timeOut), "hh:mm a") : "â€”"}</TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                "rounded-full",
                                status === "present" && "bg-green-100 text-green-700",
                                status === "late" && "bg-amber-100 text-amber-700",
                                status === "absent" && "bg-red-100 text-red-700",
                              )}
                            >
                              {row.status ?? "â€”"}
                            </Badge>
                          </TableCell>
                          <TableCell>{hours}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {attendanceRaw?.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                    <FileText className="mb-2 h-8 w-8" />
                    No attendance records found
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-gray-600">
                Showing {attTotal === 0 ? 0 : (attStart + 1)} - {Math.min(attStart + attLimit, attTotal)} of {attTotal} records
              </div>
              {attTotal > attLimit && (
                <div className="space-x-2">
                  <Button variant="outline" size="sm" disabled={attPage === 1} onClick={() => setAttPage(p => Math.max(1, p - 1))}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={attStart + attLimit >= attTotal} onClick={() => setAttPage(p => p + 1)}>Next</Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* FEEDBACK - hidden */}
        {false && (
        <Card className="overflow-hidden rounded-2xl border-none shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-xl text-slate-800">
                <Users className="mr-2 h-5 w-5 text-[#f8610e]" />
                Feedback
              </CardTitle>

              <Button
                onClick={() => openPrint("feedback")}
                disabled={exportFeedbackMutation.isPending}
                variant="outline"
                className="rounded-xl border-gray-200 hover:border-[#f8610e] hover:bg-[#f8610e] hover:text-white"
              >
                {exportFeedbackMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Preview
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="relative md:col-span-1 md:col-span-2">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search feedback..."
                  value={fbSearch}
                  onChange={(e) => { setFbSearch(e.target.value); setFbPage(1); }}
                  className="rounded-xl border-gray-200 pl-10"
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  {/* <Button
                    variant="outline"
                    className={cn(
                      "justify-start rounded-xl border-gray-200 text-left font-normal",
                      !fbDateRange.from && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fbDateRange.from ? (
                      fbDateRange.to ? (
                        <>
                          {format(fbDateRange.from, "LLL dd, y")} - {format(fbDateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(fbDateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Filter date</span>
                    )}
                  </Button> */}
                </PopoverTrigger>
                <PopoverContent className="w-auto rounded-xl p-0">
                  <Calendar
                    mode="range"
                    selected={{ from: fbDateRange.from, to: fbDateRange.to }}
                    onSelect={(range) => setFbDateRange({ from: range?.from, to: range?.to })}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              <Select
                value={fbStars?.toString() ?? "6"}
                onValueChange={(v: string) => { setFbStars(v === "all" || v === "6" ? null : parseInt(v)); setFbPage(1); }}
              >
                <SelectTrigger className="rounded-xl border-gray-200">
                  <SelectValue placeholder="Filter by rating" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="6">All ratings</SelectItem>
                  <SelectItem value="5">5â˜…</SelectItem>
                  <SelectItem value="4">4â˜…</SelectItem>
                  <SelectItem value="3">3â˜…</SelectItem>
                  <SelectItem value="2">2â˜…</SelectItem>
                  <SelectItem value="1">1â˜…</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {feedbackLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50">
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Feedback</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feedbackData?.feedbacks?.map((fb: any) => (
                      <TableRow key={fb.id} className="hover:bg-orange-50/40">
                        <TableCell>
                          <div className="font-medium">{fb.name}</div>
                          <div className="text-xs text-gray-500">{fb.email}</div>
                        </TableCell>
                        <TableCell>
                          <div>{fb.contact || "â€”"}</div>
                          <div className="text-xs text-gray-500">{fb.address || ""}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${i < fb.star ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                              />
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[420px]">
                          <div className="line-clamp-2 text-sm text-gray-700">{fb.feedback}</div>
                        </TableCell>
                        <TableCell>{new Date(fb.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {/* {(!feedbackData || feedbackData.feedbacks.length === 0) && (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                    <FileText className="mb-2 h-8 w-8" />
                    No feedback found
                  </div>
                )} */}
              </div>
            )}
{/* 
            {feedbackData && feedbackData.pagination?.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <div className="text-sm text-gray-600">
                  Showing {attRows.length} record(s)
                  {Math.min(fbPage * fbLimit, feedbackData.pagination.total)} of {feedbackData.pagination.total}
                </div>
                <div className="space-x-2">
                  <Button variant="outline" size="sm" disabled={fbPage === 1} onClick={() => setFbPage(p => Math.max(1, p - 1))}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={fbPage >= feedbackData.pagination.totalPages} onClick={() => setFbPage(p => p + 1)}>Next</Button>
                </div>
              </div> */}
            {/* )} */}
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;








