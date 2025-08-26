"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Users, Package, TrendingUp, Tag } from "lucide-react";
import { api } from "~/trpc/react";

export default function DashboardPage() {
  const { data: analytics, isLoading } = api.dashbooard.getAnalytics.useQuery();

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
              Sales Today
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-[#f8610e]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#f8610e]">
              {analytics?.sales.today || 0}
            </div>
            <p className="text-muted-foreground text-xs">transactions today</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid min-h-[600px] gap-4 md:gap-8">
        <Card className="border-[#f8610e]/20 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-[#f8610e]">Recent Activity</CardTitle>
            <CardDescription>
              Latest updates from your Tinapa business
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="h-2 w-2 rounded-full bg-[#f8610e]"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">New employee registered</p>
                  <p className="text-muted-foreground text-xs">
                    Juan Dela Cruz joined the team
                  </p>
                </div>
                <div className="text-muted-foreground text-xs">2 hours ago</div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="h-2 w-2 rounded-full bg-[#f8610e]"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    Product inventory updated
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Fresh fish stock replenished
                  </p>
                </div>
                <div className="text-muted-foreground text-xs">4 hours ago</div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="h-2 w-2 rounded-full bg-[#f8610e]"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    Customer feedback received
                  </p>
                  <p className="text-muted-foreground text-xs">
                    5-star rating for dried fish quality
                  </p>
                </div>
                <div className="text-muted-foreground text-xs">6 hours ago</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
