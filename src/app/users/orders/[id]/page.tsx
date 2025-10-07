// app/orders/[id]/page.tsx
'use client';

import React from 'react';
import { Package, ArrowLeft, Calendar, User, MapPin, Phone, Mail, CreditCard, Truck, CheckCircle, XCircle, Clock } from 'lucide-react';
import { api } from '~/trpc/react';
import { useAuthStore } from '~/app/store/auth-store';
import { useToast } from '~/components/ui/use-toast';
import { Button } from "~/components/ui/button";
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Badge } from "~/components/ui/badge";
import { format } from 'date-fns';

const Page = () => {
  const { user, isAuthenticated } = useAuthStore();
  const userId = user?.userId;
  const { toast } = useToast();
  const params = useParams();
  const orderId = parseInt(params.id as string);

  // Get order details
  const { data: orderData, isLoading, error } = api.ordersProduct.getOrder.useQuery(
    { orderId }, 
    { 
      enabled: !!orderId && !isNaN(orderId),
      refetchOnWindowFocus: false
    }
  );

  // Update order status mutation
  const updateOrderStatusMutation = api.ordersProduct.updateOrderStatus.useMutation({
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Order status updated successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error!",
        description: "Failed to update order status",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (newStatus: string) => {
    if (!orderData) return;
    
    updateOrderStatusMutation.mutate({
      orderId: orderData.id,
      status: newStatus as any,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'CONFIRMED':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'DELIVERED':
        return <Truck className="h-5 w-5 text-green-500" />;
      case 'CANCELLED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'secondary';
      case 'CONFIRMED':
        return 'default';
      case 'DELIVERED':
        return 'success';
      case 'CANCELLED':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusActions = () => {
    if (!orderData) return null;

    switch (orderData.status) {
      case 'PENDING':
        return (
          <div className="flex gap-2">
            <Button 
              onClick={() => handleStatusChange('CONFIRMED')}
              disabled={updateOrderStatusMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Confirm Order
            </Button>
            <Button 
              onClick={() => handleStatusChange('CANCELLED')}
              variant="destructive"
              disabled={updateOrderStatusMutation.isPending}
            >
              Cancel Order
            </Button>
          </div>
        );
      case 'CONFIRMED':
        return (
          <Button 
            onClick={() => handleStatusChange('DELIVERED')}
            disabled={updateOrderStatusMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            Mark as Delivered
          </Button>
        );
      default:
        return null;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Please log in</h2>
          <p className="text-gray-600 mb-6">You need to be logged in to view order details</p>
          <Button asChild className="bg-[#f4834b] hover:bg-[#e07643]">
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f4834b]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Order Not Found</h2>
          <p className="text-gray-600 mb-6">The order youre looking for doesnt exist</p>
          <Button asChild className="bg-[#f4834b] hover:bg-[#e07643]">
            <Link href="/orders">Back to Orders</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/users/orders">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <h1 className="text-2xl font-bold">Order Details</h1>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6 text-[#f4834b]" />
              <span className="font-medium">{orderData.orderNumber}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 md:px-8 py-8 ">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Order Summary</h2>
                <div className="flex items-center gap-2">
                  {getStatusIcon(orderData.status)}
                  <Badge variant={getStatusBadgeVariant(orderData.status) as any}>
                    {orderData.status}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Order Date</span>
                  <span className="font-medium">
                    {format(new Date(orderData.createdAt), 'MMMM dd, yyyy HH:mm')}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Order Number</span>
                  <span className="font-medium">{orderData.orderNumber}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Items</span>
                  <span className="font-medium">
                    {orderData.orderItems.length} item{orderData.orderItems.length !== 1 ? 's' : ''}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-lg font-bold pt-4 border-t">
                  <span>Total Amount</span>
                  <span>₱{orderData.totalPrice.toFixed(2)}</span>
                </div>
              </div>

              {getStatusActions() && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-semibold mb-3">Order Actions</h3>
                  {getStatusActions()}
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold mb-6">Order Items</h2>
              <div className="space-y-6">
                {orderData.orderItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 pb-6 border-b last:border-b-0">
                    <Image
                      src={item.product.image || '/api/placeholder/100/100'}
                      alt={item.product.name}
                      width={80}
                      height={80}
                      className="rounded-lg object-cover flex-shrink-0"
                      unoptimized
                    />
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1">{item.product.name}</h3>
                      <p className="text-gray-600 text-sm mb-2">₱{item.price.toFixed(2)} each</p>
                      <p className="text-sm text-gray-500">
                        Quantity: {item.quantity}
                      </p>
                    </div>
                    
                    <div className="text-lg font-bold">
                      ₱{(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
              <h2 className="text-xl font-bold mb-6">Customer Information</h2>
              
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <h3 className="font-semibold">Contact Information</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">{orderData.user?.firstName} {orderData?.user?.lastName}</p>
                    {orderData?.user?.email && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span>{orderData.user.email}</span>
                      </div>
                    )}
                    {orderData?.user?.phone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="h-4 w-4" />
                        <span>{orderData.user.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {orderData.user?.address && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="h-5 w-5 text-gray-400" />
                      <h3 className="font-semibold">Shipping Address</h3>
                    </div>
                    <p className="text-sm text-gray-600">{orderData.user?.address}</p>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <h3 className="font-semibold">Order Timeline</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order Placed</span>
                      <span>{format(new Date(orderData.createdAt), 'MMM dd, yyyy')}</span>
                    </div>
                    {orderData.status === 'DELIVERED' && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Delivered On</span>
                        <span>{format(new Date(orderData.updatedAt), 'MMM dd, yyyy')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;