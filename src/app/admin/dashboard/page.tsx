"use client";

import Link from "next/link";
import { format, startOfDay } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  MessageSquare,
  ClipboardList,
  Users,
  Package,
  Tag,
  ArrowRight,
  Star,
  Loader2,
} from "lucide-react";
import { api } from "~/trpc/react";

export default function DashboardPage() {
  // Top KPI analytics
  const { data: analytics, isLoading: analyticsLoading } =
    api.dashbooard.getAnalytics.useQuery();

  // Recent inquiries (reads from Orders; last 7 days, top 5)
  const { data: dashInquiries, isLoading: dashInquiriesLoading } =
    api.orders.getDashboardInquiries.useQuery();

  // Today’s attendance
  const todayStart = startOfDay(new Date());
  const { data: attendanceToday, isLoading: attendanceLoading } =
    api.attendanceRecord.getAll.useQuery({ date: todayStart });

  // Latest 5 feedback (list only)
  const { data: feedbackData, isLoading: feedbackLoading } =
    api.feedback.getAll.useQuery({ page: 1, limit: 5 });

  // Overall feedback summary (average across ALL feedback rows)
  const { data: feedbackSummary, isLoading: summaryLoading } =
    api.feedback.getSummary.useQuery({}); // input optional; {} keeps TS happy

  const inquiries = dashInquiries?.data ?? [];
  const totalInquiries = dashInquiries?.total ?? 0;

  const todayAttendance = attendanceToday ?? [];

  // ---------- FIX: make "present" robust ----------
  const isPresentNow = (r: any) => {
    const s = String(r.status ?? "").trim().toLowerCase();
    // If your backend sets a status, recognize common variants
    if (s) {
      if (["present", "on_duty", "checked_in"].includes(s)) return true;
      if (["absent", "on_leave", "rest_day"].includes(s)) return false;
    }
    // Fallback: considered present if has timeIn and NO timeOut yet (still on-site)
    const hasTimeIn = !!r.timeIn;
    const hasTimeOut = !!r.timeOut;
    return hasTimeIn && !hasTimeOut;
  };

  const presentCount = todayAttendance.filter(isPresentNow).length;
  // -----------------------------------------------

  const feedbacks = feedbackData?.feedbacks ?? [];
  const overallAvg =
    !summaryLoading && typeof feedbackSummary?.average === "number"
      ? feedbackSummary.average.toFixed(1)
      : "—";
  const overallCount = feedbackSummary?.count ?? 0;

  return (
    <>
      <div className="mb-2 flex items-center">
        <h1 className="text-lg font-semibold text-[#f8610e] md:text-2xl">
          Dashboard
        </h1>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
        <Card className="border-[#f8610e]/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#f8610e]">
              Total Products
            </CardTitle>
            <Package className="h-4 w-4 text-[#f8610e]" />
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-[#f8610e]">
                  {analytics?.products.total ?? 0}
                </div>
                <p className="text-muted-foreground text-xs">
                  +{analytics?.products.today ?? 0} added today
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#f8610e]/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#f8610e]">
              Total Employees
            </CardTitle>
            <Users className="h-4 w-4 text-[#f8610e]" />
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-[#f8610e]">
                  {analytics?.employees.total ?? 0}
                </div>
                <p className="text-muted-foreground text-xs">
                  +{analytics?.employees.newToday ?? 0} new today
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#f8610e]/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#f8610e]">
              Product Categories
            </CardTitle>
            <Tag className="h-4 w-4 text-[#f8610e]" />
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-[#f8610e]">
                  {analytics?.categories.total ?? 0}
                </div>
                <p className="text-muted-foreground text-xs">
                  +{analytics?.categories.newToday ?? 0} new today
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 2-column: Recent Inquiries + Today’s Attendance */}
      <div className="mt-6 grid gap-4 md:grid-cols-2 md:gap-8">
        {/* Recent Inquiries */}
        <Card className="border-[#f8610e]/20">
          <CardHeader className="flex items-start justify-between">
            <div>
              <Link
                href="/admin/inquiry"
                className="group inline-flex items-center"
              >
                <CardTitle className="text-[#f8610e] group-hover:underline">
                  Recent Inquiries
                </CardTitle>
                <ArrowRight className="ml-2 h-4 w-4 opacity-0 transition group-hover:opacity-100" />
              </Link>
              <CardDescription>
                Last 7 days • {totalInquiries} total
              </CardDescription>
            </div>
            <Badge className="bg-[#f8610e] hover:bg-[#f8610e]/90">
              <MessageSquare className="mr-1 h-3 w-3" />
              {totalInquiries}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashInquiriesLoading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading inquiries…
              </div>
            ) : (inquiries.length ? (
              inquiries.map((inq: any) => (
                <Link
                  href="/admin/inquiry"
                  key={inq.id}
                  className="block rounded-lg border border-[#f8610e]/10 bg-white p-3 hover:bg-orange-50/40"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {inq.firstname} {inq.lastname}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(inq.createdAt), "MMM dd, yyyy")}
                    </div>
                  </div>
                  <div className="mt-1 line-clamp-1 text-sm text-gray-700">
                    <span className="font-semibold">
                      {inq.subject ?? "—"}:
                    </span>{" "}
                    {inq.message ?? "No message"}
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
                No inquiries in the last 7 days.
              </div>
            ))}

            <div className="pt-1">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/admin/inquiry">
                  View All Inquiries <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Today’s Attendance */}
        <Card className="border-[#f8610e]/20">
          <CardHeader className="flex items-start justify-between">
            <div>
              <Link
                href="/admin/record-attendance"
                className="group inline-flex items-center"
              >
                <CardTitle className="text-[#f8610e] group-hover:underline">
                  Today’s Attendance
                </CardTitle>
                <ArrowRight className="ml-2 h-4 w-4 opacity-0 transition group-hover:opacity-100" />
              </Link>
              <CardDescription>
                {format(todayStart, "PPP")} • {todayAttendance.length} records
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-green-300 text-green-700">
              <ClipboardList className="mr-1 h-3 w-3" />
              {presentCount} present
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {attendanceLoading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading attendance…
              </div>
            ) : (todayAttendance.length ? (
              todayAttendance.slice(0, 5).map((row: any) => (
                <Link
                  href="/admin/record-attendance"
                  key={row.id}
                  className="flex items-center justify-between rounded-lg border border-[#f8610e]/10 bg-white p-3 hover:bg-orange-50/40"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-gray-900">
                      {row.employee?.firstname} {row.employee?.lastname}
                    </div>
                    <div className="text-xs text-gray-500">
                      {row.status ?? "—"}
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-600">
                    <div>
                      In:{" "}
                      {row.timeIn
                        ? format(new Date(row.timeIn), "hh:mm a")
                        : "—"}
                    </div>
                    <div>
                      Out:{" "}
                      {row.timeOut
                        ? format(new Date(row.timeOut), "hh:mm a")
                        : "—"}
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
                No attendance recorded today.
              </div>
            ))}

            <div className="pt-1">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/admin/record-attendance">
                  Go to Attendance <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Latest Feedback */}
      <div className="mt-6">
        <Card className="border-[#f8610e]/20">
          <CardHeader className="flex items-start justify-between">
            <div>
              <CardTitle className="text-[#f8610e]">Latest Feedback</CardTitle>
              <CardDescription>
                Most recent 5 • Avg rating (all):{" "}
                {summaryLoading ? (
                  <span className="inline-flex items-center gap-2 text-gray-500">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Loading…</span>
                  </span>
                ) : (
                  <span className="font-semibold">
                    {overallAvg}
                    {overallCount > 0 ? ` (${overallCount})` : ""}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center text-[#f8610e]">
              <Star className="mr-1 h-4 w-4 fill-current" />
              <span className="text-sm font-semibold">{overallAvg}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {feedbackLoading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading feedback…
              </div>
            ) : (feedbacks.length ? (
              feedbacks.map((fb: any) => (
                <div
                  key={fb.id}
                  className="rounded-lg border border-[#f8610e]/10 bg-white p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="truncate text-sm font-medium text-gray-900">
                        {fb.name ?? "Anonymous"}
                      </div>
                      <div className="line-clamp-2 text-sm text-gray-700">
                        {fb.feedback ?? "—"}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < (Number(fb.star) || 0)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {new Date(fb.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
                No feedback yet.
              </div>
            ))}

            <div className="pt-1">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/admin/feedback">
                  View All Feedback <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
