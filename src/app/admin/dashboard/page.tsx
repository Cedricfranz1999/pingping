"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Users, Package, Tag, MessageSquare, ClipboardList, Inbox } from "lucide-react";
import { api } from "~/trpc/react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { format } from "date-fns";

export default function DashboardPage() {
  const { data: analytics, isLoading } = api.dashbooard.getAnalytics.useQuery();
  // Additional data for dashboard widgets
  // Compute start/end of today and filter client-side to avoid Date serialization issues
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const { data: allAttendance } = api.attendanceRecord.getAll.useQuery({});
  const todayAttendance = (allAttendance ?? []).filter((a: any) => {
    const d = new Date(a.date);
    return d >= todayStart && d < todayEnd;
  });
  const { data: recentFeedback } = api.feedback.getAll.useQuery({ page: 1, limit: 5, minStars: 6 });
  const { data: recentInquiries } = api.orders.getAll.useQuery({ page: 1, limit: 5, search: "" });

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center">
          <h1 className="text-lg font-semibold text-[#f8610e] md:text-2xl">
            Dashboard
          </h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-[#f8610e]/20">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="mb-2 h-4 w-3/4 rounded bg-gray-200"></div>
                  <div className="h-8 w-1/2 rounded bg-gray-200"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold text-[#f8610e] md:text-2xl">
          Dashboard
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card className="border-[#f8610e]/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#f8610e]">
              Total Products
            </CardTitle>
            <Package className="h-4 w-4 text-[#f8610e]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#f8610e]">
              {analytics?.products.total || 0}
            </div>
            <p className="text-muted-foreground text-xs">
              +{analytics?.products.today || 0} added today
            </p>
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
            <div className="text-2xl font-bold text-[#f8610e]">
              {analytics?.employees.total || 0}
            </div>
            <p className="text-muted-foreground text-xs">
              +{analytics?.employees.newToday || 0} new today
            </p>
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
            <div className="text-2xl font-bold text-[#f8610e]">
              {analytics?.categories.total || 0}
            </div>
            <p className="text-muted-foreground text-xs">
              +{analytics?.categories.newToday || 0} new today
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#f8610e]/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#f8610e]">
              Today Overview
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-[#f8610e]" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Attendance records</span>
              <span className="font-semibold text-[#f8610e]">{todayAttendance.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Recent feedback</span>
              <span className="font-semibold text-[#f8610e]">{recentFeedback?.pagination?.total ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Recent inquiries</span>
              <span className="font-semibold text-[#f8610e]">{recentInquiries?.total ?? 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-[#f8610e]/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#f8610e]"><MessageSquare className="h-4 w-4"/>Recent Feedback</CardTitle>
            <CardDescription>Latest user feedback</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentFeedback?.feedbacks?.slice(0,5).map((f: any) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.name}</TableCell>
                    <TableCell>{f.star}</TableCell>
                    <TableCell>{new Date(f.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                )) || null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-[#f8610e]/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#f8610e]"><ClipboardList className="h-4 w-4"/>Recent Attendance</CardTitle>
            <CardDescription>Latest attendance records</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Time In</TableHead>
                  <TableHead>Time Out</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(todayAttendance ?? []).slice(0,5).map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.employee?.firstname} {a.employee?.lastname}</TableCell>
                    <TableCell>{a.timeIn ? format(new Date(a.timeIn), "hh:mm a") : "-"}</TableCell>
                    <TableCell>{a.timeOut ? format(new Date(a.timeOut), "hh:mm a") : "-"}</TableCell>
                  </TableRow>
                )) || null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-[#f8610e]/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#f8610e]"><Inbox className="h-4 w-4"/>Recent Inquiries</CardTitle>
            <CardDescription>Latest customer inquiries</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInquiries?.orders?.slice(0,5).map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell>{o.firstname} {o.lastname}</TableCell>
                    <TableCell>{o.subject ?? "-"}</TableCell>
                    <TableCell>{new Date(o.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                )) || null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
