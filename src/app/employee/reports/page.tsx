"use client";
import { useState, type JSXElementConstructor, type Key, type ReactElement, type ReactNode, type ReactPortal } from "react";
import { useToast } from "~/components/ui/use-toast";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import {
  Download,
  Calendar as CalendarIcon,
  Search,
  Package,
  AlertTriangle,
  FileText,
  Loader2,
  TrendingUp,
  Eye,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Plus,
  Edit,
  Trash,
} from "lucide-react";

const ProductReportsPage = () => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined; }>({ from: undefined, to: undefined });
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>();
  const [actionFilter, setActionFilter] = useState<"ADD" | "EDIT" | "DELETE" | undefined>();

  const pageSize = 10;

  // Fetch actual data from the database
  const { data: summaryData, isLoading: summaryLoading } = api.reports.getStockSummary.useQuery();
  const { data: productsData, isLoading: productsLoading } =
    api.reports.getProducts.useQuery({
      skip: (page - 1) * pageSize,
      take: pageSize,
      search,
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
      categoryId: categoryFilter,
    });
  const { data: activityData, isLoading: activityLoading } =
    api.reports.getActivityLogs.useQuery({
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
      action: actionFilter,
    });
  const { data: chartData, isLoading: chartLoading } =
    api.reports.getChartData.useQuery({
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
    });
  const { data: categories, isLoading: categoriesLoading } =
    api.reports.getCategories.useQuery();

  // Export mutations
  const exportProductsMutation = api.reports.exportProductsCSV.useMutation();
  const exportActivityMutation = api.reports.exportActivityCSV.useMutation();

  const handleExportProductsCSV = () => {
    exportProductsMutation.mutate(
      {
        search,
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
        categoryId: categoryFilter,
      },
      {
        onSuccess: (data: { csv: string; }) => {
          downloadCSV(data.csv, `products-export-${format(new Date(), "yyyy-MM-dd")}.csv`);
          toast({ title: "Export Successful", description: "Products data has been exported to CSV" });
        },
        onError: () => {
          toast({ title: "Export Failed", description: "Failed to export products data", variant: "destructive" });
        },
      }
    );
  };

  const handleExportActivityCSV = () => {
    exportActivityMutation.mutate(
      {
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
        action: actionFilter,
      },
      {
        onSuccess: (data: { csv: string; }) => {
          downloadCSV(data.csv, `activity-export-${format(new Date(), "yyyy-MM-dd")}.csv`);
          toast({ title: "Export Successful", description: "Activity data has been exported to CSV" });
        },
        onError: () => {
          toast({ title: "Export Failed", description: "Failed to export activity data", variant: "destructive" });
        },
      }
    );
  };

  const downloadCSV = (csvData: string, filename: string) => {
    const blob = new Blob([csvData], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Color palette for pie chart
  const COLORS = ["#f97316","#3b82f6","#10b981","#ef4444","#8b5cf6","#06b6d4","#84cc16","#ec4899","#6366f1","#f59e0b"];

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <div className="container mx-auto space-y-8 p-6">
        {/* Enhanced Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#f8610e] to-orange-600 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-black/5"></div>
          <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-white/10 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-white/5 blur-2xl"></div>

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-2xl">Product Reports</h1>
              <p className="text-lg text-orange-100">Comprehensive inventory management and analytics dashboard</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleExportProductsCSV}
                disabled={exportProductsMutation.isPending}
                variant="secondary"
                size="lg"
                className="border-white/20 bg-white/10 text-white shadow-lg backdrop-blur-sm hover:bg-white/20"
              >
                {exportProductsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Export Products
              </Button>
              <Button
                onClick={handleExportActivityCSV}
                disabled={exportActivityMutation.isPending}
                variant="secondary"
                size="lg"
                className="border-white/20 bg-white/10 text-white shadow-lg backdrop-blur-sm hover:bg-white/20"
              >
                {exportActivityMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Export Activity
              </Button>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="group relative overflow-hidden rounded-2xl border-none bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg transition-all duration-300 hover:shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium tracking-wider text-blue-600 uppercase">Total Products</p>
                  <p className="text-3xl font-bold text-blue-900">{summaryData?.totalProducts ?? 0}</p>
                  <div className="flex items-center text-xs text-blue-600">
                    <TrendingUp className="mr-1 h-3 w-3" />
                    <span>Active inventory</span>
                  </div>
                </div>
                <div className="rounded-xl bg-blue-500 p-3 shadow-lg transition-transform group-hover:scale-110">
                  <Package className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden rounded-2xl border-none bg-gradient-to-br from-orange-50 to-orange-100 shadow-lg transition-all duration-300 hover:shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium tracking-wider text-orange-600 uppercase">Low Stock</p>
                  <p className="text-3xl font-bold text-orange-900">{summaryData?.lowStockCount ?? 0}</p>
                  <div className="flex items-center text-xs text-orange-600">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    <span>Needs attention</span>
                  </div>
                </div>
                <div className="rounded-xl bg-orange-500 p-3 shadow-lg transition-transform group-hover:scale-110">
                  <AlertTriangle className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden rounded-2xl border-none bg-gradient-to-br from-red-50 to-red-100 shadow-lg transition-all duration-300 hover:shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium tracking-wider text-red-600 uppercase">Out of Stock</p>
                  <p className="text-3xl font-bold text-red-900">{summaryData?.outOfStockCount ?? 0}</p>
                  <div className="flex items-center text-xs text-red-600">
                    <Eye className="mr-1 h-3 w-3" />
                    <span>Requires restock</span>
                  </div>
                </div>
                <div className="rounded-xl bg-red-500 p-3 shadow-lg transition-transform group-hover:scale-110">
                  <AlertTriangle className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden rounded-2xl border-none bg-gradient-to-br from-green-50 to-green-100 shadow-lg transition-all duration-300 hover:shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium tracking-wider text-green-600 uppercase">Recent Activities</p>
                  <p className="text-3xl font-bold text-green-900">{summaryData?.recentActivities ?? 0}</p>
                  <div className="flex items-center text-xs text-green-600">
                    <Activity className="mr-1 h-3 w-3" />
                    <span>Active tracking</span>
                  </div>
                </div>
                <div className="rounded-xl bg-green-500 p-3 shadow-lg transition-transform group-hover:scale-110">
                  <FileText className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Charts Section */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Stock Levels Chart */}
          <Card className="overflow-hidden rounded-2xl border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 pb-4">
              <CardTitle className="flex items-center text-xl text-slate-800">
                <BarChart3 className="mr-2 h-5 w-5 text-[#f8610e]" />
                Top Products by Stock
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-80">
                {chartLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="flex flex-col items-center space-y-2">
                      <Loader2 className="h-8 w-8 animate-spin text-[#f8610e]" />
                      <p className="text-sm text-gray-500">Loading chart data...</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData?.stockChart ?? []} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} tick={{ fill: "#64748b", fontSize: 12 }} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
                      <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                      <Legend />
                      <Bar dataKey="stock" name="Stock Level" fill="#f97316" radius={[4, 4, 0, 0]} className="drop-shadow-sm" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Category Distribution Chart */}
          <Card className="overflow-hidden rounded-2xl border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 pb-4">
              <CardTitle className="flex items-center text-xl text-slate-800">
                <PieChartIcon className="mr-2 h-5 w-5 text-[#f8610e]" />
                Products by Category
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-80">
                {chartLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="flex flex-col items-center space-y-2">
                      <Loader2 className="h-8 w-8 animate-spin text-[#f8610e]" />
                      <p className="text-sm text-gray-500">Loading chart data...</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData?.categoryChart ?? []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${((percent as any) * 100).toFixed(0)}%`}
                        className="text-sm font-medium"
                      >
                        {chartData?.categoryChart.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="drop-shadow-sm" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Filters */}
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

              {/* Removed the Stock dropdown here */}

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

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[280px] justify-start rounded-xl border-gray-200 text-left font-normal hover:border-[#f8610e]",
                      !dateRange.from && "text-muted-foreground"
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
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Products Table */}
        <Card className="overflow-hidden rounded-2xl border-none shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 pb-4">
            <div className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center text-xl text-slate-800">
                <Package className="mr-2 h-5 w-5 text-[#f8610e]" />
                Product Inventory
              </CardTitle>
              <Button
                onClick={handleExportProductsCSV}
                disabled={exportProductsMutation.isPending}
                variant="outline"
                className="rounded-xl border-gray-200 hover:border-[#f8610e] hover:bg-[#f8610e] hover:text-white"
              >
                {exportProductsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Export
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
                      <TableHead className="font-semibold text-gray-700">Stock</TableHead>
                      <TableHead className="font-semibold text-gray-700">Price</TableHead>
                      {/* Status column removed */}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productsData?.data.map((product: { id: Key | null | undefined; name: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; description: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; categories: any[]; stock: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; price: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; }, index: number) => (
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
                        {/* <TableCell className="p-4">
                          <span
                            className={`text-lg font-bold ${
                              product.stock === 0
                                ? "text-red-600"
                                : product.stock <= 10
                                ? "text-orange-600"
                                : "text-green-600"
                            }`}
                          >
                            {product.stock}
                          </span>
                        </TableCell> */}
                        <TableCell className="p-4">
                          <span className="text-lg font-bold text-gray-900">{product.price}</span>
                        </TableCell>
                        {/* Status cell removed */}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Activity Logs */}
        <Card className="overflow-hidden rounded-2xl border-none shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 pb-4">
            <div className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center text-xl text-slate-800">
                <Activity className="mr-2 h-5 w-5 text-[#f8610e]" />
                Recent Activity
              </CardTitle>
              <div className="flex gap-2">
                <Select
                  value={actionFilter ?? ""}
                  onValueChange={(value: "ADD" | "EDIT" | "DELETE" | "") => setActionFilter(value || undefined)}
                >
                  <SelectTrigger className="w-[180px] rounded-xl border-gray-200">
                    <SelectValue placeholder="Filter by action" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all-actions">All Actions</SelectItem>
                    <SelectItem value="ADD">Added</SelectItem>
                    <SelectItem value="EDIT">Edited</SelectItem>
                    <SelectItem value="DELETE">Deleted</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleExportActivityCSV}
                  disabled={exportActivityMutation.isPending}
                  variant="outline"
                  className="rounded-xl border-gray-200 hover:border-[#f8610e] hover:bg-[#f8610e] hover:text-white"
                >
                  {exportActivityMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {activityLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {activityData?.map((log: { id: Key | null | undefined; action: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; employee: { firstname: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; lastname: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; }; product: { name: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; }; timestamp: string | number | Date; oldStock: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; newStock: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; oldPrice: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; newPrice: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; }) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="flex items-start space-x-4">
                      <div
                        className={`rounded-full p-2 ${
                          log.action === "ADD"
                            ? "bg-green-100 text-green-600"
                            : log.action === "EDIT"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {log.action === "ADD" && <Plus className="h-5 w-5" />}
                        {log.action === "EDIT" && <Edit className="h-5 w-5" />}
                        {log.action === "DELETE" && <Trash className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {log.employee.firstname} {log.employee.lastname}
                        </div>
                        <div className="text-sm text-gray-600">{log.product.name}</div>
                        <div className="mt-1 text-xs text-gray-500">
                          {format(new Date(log.timestamp), "MMM dd, yyyy 'at' hh:mm a")}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        variant={
                          log.action === "ADD" ? "default" : log.action === "EDIT" ? "secondary" : "destructive"
                        }
                        className="rounded-full px-3 py-1"
                      >
                        {log.action}
                      </Badge>
                      {log.action === "EDIT" && (
                        <div className="flex flex-wrap gap-2 text-xs">
                          {log.oldStock !== null && log.newStock !== null && (
                            <div className="flex items-center space-x-1 rounded-full bg-orange-50 px-2 py-1">
                              <span className="text-orange-600">Stock:</span>
                              <span className="text-orange-500 line-through">{log.oldStock}</span>
                              <span className="font-medium text-orange-800">→ {log.newStock}</span>
                            </div>
                          )}
                          {log.oldPrice && log.newPrice && (
                            <div className="flex items-center space-x-1 rounded-full bg-blue-50 px-2 py-1">
                              <span className="text-blue-600">Price:</span>
                              <span className="text-blue-500 line-through">{log.oldPrice}</span>
                              <span className="font-medium text-blue-800">→ {log.newPrice}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {activityData?.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <FileText className="mb-4 h-10 w-10 text-gray-400" />
                    <p className="text-gray-500">No activity records found</p>
                    <p className="mt-1 text-sm text-gray-400">Try adjusting your filters</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination Controls */}
        {productsData && productsData.total > pageSize && (
          <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow">
            <div className="text-sm text-gray-600">
              Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to{" "}
              <span className="font-medium">{Math.min(page * pageSize, productsData.total)}</span> of{" "}
              <span className="font-medium">{productsData.total}</span> products
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="rounded-xl border-gray-200 hover:border-[#f8610e] hover:bg-[#f8610e]/10"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page * pageSize >= productsData.total}
                className="rounded-xl border-gray-200 hover:border-[#f8610e] hover:bg-[#f8610e]/10"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductReportsPage;
