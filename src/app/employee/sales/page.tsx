// ~/app/admin/sales/page.tsx
"use client";
import { useState } from "react";
import { type NextPage } from "next";
import Head from "next/head";
import { Search, Eye, Calendar, DollarSign, Package } from "lucide-react";
import { api } from "~/trpc/react";

// shadcn/ui imports
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

const SalesPage: NextPage = () => {
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Get delivered orders and totals
  const { data: salesData, refetch } = api.sales.getDeliveredOrders.useQuery({
    search,
    startDate,
    endDate
  });

  // Get sales summary
  const { data: salesSummary } = api.sales.getSalesSummary.useQuery();

  const markAsDelivered = api.sales.markAsDelivered.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const handleMarkAsDelivered = (orderId: number) => {
    markAsDelivered.mutate({ id: orderId });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  return (
    <>
      <Head>
        <title>Sales Management</title>
        <meta name="description" content="View sales and delivered orders" />
      </Head>

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-[#f8610e] md:text-3xl">
            Sales Dashboard
          </h1>
        </div>

        {/* Sales Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Todays Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(salesSummary?.today.total || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {salesSummary?.today.count || 0} orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(salesSummary?.week.total || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {salesSummary?.week.count || 0} orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(salesSummary?.month.total || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {salesSummary?.month.count || 0} orders
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
            <Input
              placeholder="Search orders or customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Input
              type="date"
              placeholder="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[140px]"
            />
            <Input
              type="date"
              placeholder="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-[140px]"
            />
          </div>
        </div>

        {/* Total Sales Summary */}
        {salesData && (
          <div className="bg-green-50 p-4 rounded-lg border">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-green-800">Total Delivered Orders</h3>
                <p className="text-2xl font-bold text-green-900">{salesData.orderCount} orders</p>
              </div>
              <div className="text-right">
                <h3 className="font-semibold text-green-800">Total Sales Amount</h3>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(salesData.totalSales)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Orders Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesData?.orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>
                    {order.user ? (
                      <div>
                        <div>{order.user.firstName} {order.user.lastName}</div>
                        <div className="text-sm text-muted-foreground">{order.user.email}</div>
                      </div>
                    ) : (
                      "Guest Customer"
                    )}
                  </TableCell>
                  <TableCell>
                    {order.orderItems.length} item(s)
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(order.totalPrice)}
                  </TableCell>
                  <TableCell>
                    {new Date(order.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      Delivered
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedOrder(order);
                        setIsDetailModalOpen(true);
                      }}
                      className="hover:bg-blue-100"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {salesData?.orders.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No delivered orders found</h3>
            <p className="text-muted-foreground">
              {search || startDate || endDate 
                ? "Try adjusting your search or date filters" 
                : "No orders have been marked as delivered yet"
              }
            </p>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-[#f8610e]">
              Order Details - {selectedOrder?.orderNumber}
            </DialogTitle>
            <DialogDescription>
              Delivered order information
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold">Customer Information</h3>
                  {selectedOrder.user ? (
                    <>
                      <p>{selectedOrder.user.firstName} {selectedOrder.user.lastName}</p>
                      <p className="text-sm text-muted-foreground">{selectedOrder.user.email}</p>
                    </>
                  ) : (
                    <p>Guest Customer</p>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">Order Information</h3>
                  <p>Status: <Badge variant="outline" className="bg-green-100 text-green-800">Delivered</Badge></p>
                  <p className="text-sm text-muted-foreground">
                    Date: {new Date(selectedOrder.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Total: {formatCurrency(selectedOrder.totalPrice)}
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Order Items</h3>
                <div className="border rounded-md">
                  {selectedOrder.orderItems.map((item: any) => (
                    <div key={item.id} className="p-3 border-b last:border-b-0">
                      <div className="flex justify-between">
                        <span>{item.product.name}</span>
                        <span>{formatCurrency(item.price)}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Quantity: {item.quantity} × {formatCurrency(parseFloat(item.product.price))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SalesPage;