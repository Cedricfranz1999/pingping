// app/orders/page.tsx
"use client";

import React, { useState } from "react";
import {
  Package,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Plus,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/app/store/auth-store";
import { useToast } from "~/components/ui/use-toast";
import { Button } from "~/components/ui/button";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
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
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { format } from "date-fns";

const OrdersPage = () => {
  const { user, isAuthenticated } = useAuthStore();
  const userId = user?.userId;
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Get orders data
  const {
    data: ordersData,
    isLoading,
    refetch: refetchOrders,
  } = api.ordersProduct.getOrders.useQuery();

  // Delete order mutation
  const deleteOrderMutation = api.ordersProduct.deleteOrder.useMutation({
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Order deleted successfully",
        variant: "default",
      });
      refetchOrders();
      setIsDeleteDialogOpen(false);
      setSelectedOrder(null);
    },
    onError: (error) => {
      toast({
        title: "Error!",
        description: "Failed to delete order",
        variant: "destructive",
      });
    },
  });

  // Update order status mutation
  const updateOrderStatusMutation =
    api.ordersProduct.updateOrderStatus.useMutation({
      onSuccess: () => {
        toast({
          title: "Success!",
          description: "Order status updated successfully",
          variant: "default",
        });
        refetchOrders();
      },
      onError: (error) => {
        toast({
          title: "Error!",
          description: "Failed to update order status",
          variant: "destructive",
        });
      },
    });

  const handleDeleteOrder = (order: any) => {
    setSelectedOrder(order);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteOrder = () => {
    if (!selectedOrder) return;

    deleteOrderMutation.mutate({ orderId: selectedOrder.id });
  };

  const handleStatusChange = (orderId: number, newStatus: any) => {
    updateOrderStatusMutation.mutate({
      orderId,
      status: newStatus,
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "PENDING":
        return "secondary";
      case "CONFIRMED":
        return "default";
      case "DELIVERED":
        return "success";
      case "CANCELLED":
        return "destructive";
      default:
        return "outline";
    }
  };

  const filteredOrders = ordersData?.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.totalPrice.toString().includes(searchTerm);
    const matchesStatus =
      statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-md">
          <Package className="mx-auto mb-4 h-16 w-16 text-gray-400" />
          <h2 className="mb-4 text-2xl font-bold">Please log in</h2>
          <p className="mb-6 text-gray-600">
            You need to be logged in to view your orders
          </p>
          <Button asChild className="bg-[#f4834b] hover:bg-[#e07643]">
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#f4834b]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="mx-auto px-4 py-4 md:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/products">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <h1 className="text-2xl font-bold">Customer Orders</h1>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6 text-[#f4834b]" />
              <span className="font-medium">
                {ordersData?.length || 0} orders
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 py-8 md:px-8">
        {/* Filters and Search */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="relative max-w-md flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border px-3 py-2 text-sm"
              >
                <option value="all">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {!ordersData || ordersData.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow-sm">
            <Package className="mx-auto mb-4 h-16 w-16 text-gray-400" />
            <h2 className="mb-2 text-2xl font-bold">No orders yet</h2>
            <p className="mb-6 text-gray-600">Your orders will appear here</p>
            <Button asChild className="bg-[#f4834b] hover:bg-[#e07643]">
              <Link href="/products">Start Shopping</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders?.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>
                      {format(new Date(order.createdAt), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      {order.orderItems.length} item
                      {order.orderItems.length !== 1 ? "s" : ""}
                    </TableCell>
                    <TableCell>₱{order.totalPrice.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={getStatusBadgeVariant(order.status) as any}
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          {/* <DropdownMenuItem asChild>
                            <Link
                              href={`/users/orders/${order.id}`}
                              className="flex cursor-pointer items-center"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem> */}
                          <DropdownMenuSeparator />
                          {order.status === "PENDING" && (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusChange(order.id, "CONFIRMED")
                                }
                                className="cursor-pointer"
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Mark as Confirmed
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusChange(order.id, "CANCELLED")
                                }
                                className="cursor-pointer"
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Cancel Order
                              </DropdownMenuItem>
                            </>
                          )}
                          {order.status === "CONFIRMED" && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleStatusChange(order.id, "DELIVERED")
                              }
                              className="cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Mark as Delivered
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteOrder(order)}
                            className="cursor-pointer text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              order <strong>{selectedOrder?.orderNumber}</strong> and remove it
              from our servers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteOrder}
              disabled={deleteOrderMutation.isPending}
            >
              {deleteOrderMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdersPage;
