"use client";
import React, { useState } from "react";
import {
  Plus,
  Minus,
  ShoppingCart,
  Image as ImageIcon,
  Eye,
  Package,
  Trash2,
} from "lucide-react";
import { api } from "~/trpc/react";
import { useToast } from "~/components/ui/use-toast";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";
import Image from "next/image";
import Link from "next/link";

const WalkInPage = () => {
  const { toast } = useToast();
  const [cartItems, setCartItems] = useState<
    Array<{
      productId: number;
      name: string;
      price: number;
      quantity: number;
      image?: string;
      stock: number;
    }>
  >([]);
  const [activeTab, setActiveTab] = useState<"products" | "orders">("products");

  // Get products
  const { data: productsData, refetch: refetchProducts } = api.product.getAll.useQuery(
    {
      page: 1,
      limit: 100,
      search: "",
      category: "All",
      sortBy: "name",
      sortOrder: "asc",
    },
    {
      refetchOnWindowFocus: false,
    },
  );

  // Get orders without users
  const { data: ordersData, refetch: refetchOrders } =
    api.ordersProduct.getOrders.useQuery();

  // Create order without user mutation
  const createOrderWithoutUser =
    api.ordersProduct.createOrderWithoutUser.useMutation({
      onSuccess: () => {
        toast({
          title: "Success!",
          description: "Order created successfully",
          variant: "default",
        });
        setCartItems([]);
        refetchOrders();
        refetchProducts();
      },
      onError: () => {
        toast({
          title: "Error!",
          description: "Failed to create order",
          variant: "destructive",
        });
      },
    });

  const addToCart = (product: {
    id: number;
    name: string;
    price: string;
    stock: number;
    image: string | null;
  }) => {
    const existingItem = cartItems.find(
      (item) => item.productId === product.id,
    );
    if (existingItem) {
      const newQuantity = existingItem.quantity + 1;
      if (newQuantity > product.stock) {
        toast({
          title: "Error!",
          description: "Cannot add more than available stock",
          variant: "destructive",
        });
        return;
      }
      setCartItems(
        cartItems.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: newQuantity }
            : item,
        ),
      );
    } else {
      if (1 > product.stock) {
        toast({
          title: "Error!",
          description: "Product is out of stock",
          variant: "destructive",
        });
        return;
      }
      setCartItems([
        ...cartItems,
        {
          productId: product.id,
          name: product.name,
          price: parseFloat(product.price),
          quantity: 1,
          image: product.image || undefined,
          stock: product.stock,
        },
      ]);
    }
  };

  const updateQuantity = (productId: number, quantity: number) => {
    const item = cartItems.find((item) => item.productId === productId);
    if (!item) return;

    if (quantity > item.stock) {
      toast({
        title: "Error!",
        description: "Cannot add more than available stock",
        variant: "destructive",
      });
      return;
    }

    if (quantity === 0) {
      setCartItems(cartItems.filter((item) => item.productId !== productId));
    } else {
      setCartItems(
        cartItems.map((item) =>
          item.productId === productId ? { ...item, quantity } : item,
        ),
      );
    }
  };

  const removeFromCart = (productId: number) => {
    setCartItems(cartItems.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const totalPrice = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );

  const handleCreateOrder = () => {
    if (cartItems.length === 0) {
      toast({
        title: "Error!",
        description: "Please add items to the order",
        variant: "destructive",
      });
      return;
    }
    createOrderWithoutUser.mutate({
      items: cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      })),
      totalPrice,
    });
  };

  // Extract products and orders
  const products = productsData?.products || [];
  const orders = ordersData || [];

  // Filter orders without userId (walk-in orders)
  const walkInOrders = orders.filter((order) => order.userId === null);

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

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "PENDING":
        return {
          backgroundColor: "#fff3cd",
          color: "#856404",
          border: "1px solid #ffeaa7",
        };
      case "CONFIRMED":
        return {
          backgroundColor: "#d1ecf1",
          color: "#0c5460",
          border: "1px solid #b8daff",
        };
      case "DELIVERED":
        return {
          backgroundColor: "#d4edda",
          color: "#155724",
          border: "1px solid #c3e6cb",
        };
      case "CANCELLED":
        return {
          backgroundColor: "#f8d7da",
          color: "#721c24",
          border: "1px solid #f5c6cb",
        };
      default:
        return {
          backgroundColor: "#f8f9fa",
          color: "#6c757d",
          border: "1px solid #dee2e6",
        };
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-[#a85e38] to-[#8b4513] text-white shadow-lg">
        <div className="mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="mb-2 text-4xl font-bold">Process orders</h1>
              <p className="text-white/80">Manage in-store customer orders</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm">
                <div className="text-sm text-white/80">Cart Items</div>
                <div className="text-2xl font-bold">
                  {cartItems.reduce((total, item) => total + item.quantity, 0)}
                </div>
              </div>
              <div className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm">
                <div className="text-sm text-white/80">Total Amount</div>
                <div className="text-2xl font-bold">
                  ₱{totalPrice.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto px-6 py-6">
        {/* Enhanced Tabs */}
        <div className="mb-8 flex w-fit rounded-lg bg-gray-50 p-1">
          <button
            className={`rounded-md px-6 py-3 font-medium transition-all duration-200 ${
              activeTab === "products"
                ? "bg-white text-[#a85e38] shadow-sm"
                : "text-gray-600 hover:bg-white/50 hover:text-[#a85e38]"
            }`}
            onClick={() => setActiveTab("products")}
          >
            <ShoppingCart className="mr-2 inline-block h-4 w-4" />
            Products & Cart
          </button>
          <button
            className={`rounded-md px-6 py-3 font-medium transition-all duration-200 ${
              activeTab === "orders"
                ? "bg-white text-[#a85e38] shadow-sm"
                : "text-gray-600 hover:bg-white/50 hover:text-[#a85e38]"
            }`}
            onClick={() => setActiveTab("orders")}
          >
            <Package className="mr-2 inline-block h-4 w-4" />
            Today's order record ({walkInOrders.length})
          </button>
        </div>
        {activeTab === "products" ? (
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
            {/* Enhanced Products List */}
            <Card className="border-0 shadow-lg xl:col-span-2">
              <CardHeader className="border-b border-[#a85e38]/10 bg-gradient-to-r from-[#a85e38]/5 to-[#a85e38]/10">
                <CardTitle className="text-xl text-[#a85e38]">
                  Available Products
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Click to add products to your order
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <ScrollArea className="h-[650px]">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="group rounded-xl border border-gray-100 bg-white p-5 transition-all duration-300 hover:border-[#a85e38]/20 hover:shadow-lg"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            {product.image ? (
                              <Image
                                src={product.image}
                                alt={product.name}
                                width={90}
                                height={90}
                                className="h-[90px] w-[90px] rounded-xl border-2 border-gray-100 object-cover transition-colors group-hover:border-[#a85e38]/20"
                                unoptimized
                              />
                            ) : (
                              <div className="flex h-[90px] w-[90px] items-center justify-center rounded-xl border-2 border-gray-100 bg-gradient-to-br from-gray-100 to-gray-200 transition-colors group-hover:border-[#a85e38]/20">
                                <ImageIcon className="h-10 w-10 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="mb-1 line-clamp-2 text-base font-semibold text-gray-900">
                              {product.name}
                            </h3>
                            <p className="mb-1 text-xl font-bold text-[#a85e38]">
                              ₱{product.price}
                            </p>
                            <div className="mb-3 flex items-center gap-2">
                              <span className="text-sm text-gray-500">
                                Stock:
                              </span>
                              <Badge
                                variant={
                                  product.stock > 10
                                    ? "secondary"
                                    : product.stock > 0
                                      ? "default"
                                      : "destructive"
                                }
                                className={`text-xs ${
                                  product.stock > 10
                                    ? "border-green-200 bg-green-100 text-green-800"
                                    : product.stock > 0
                                      ? "border-yellow-200 bg-yellow-100 text-yellow-800"
                                      : "border-red-200 bg-red-100 text-red-800"
                                }`}
                              >
                                {product.stock}
                              </Badge>
                            </div>
                            <Button
                              onClick={() => addToCart(product)}
                              className="w-full border-0 bg-[#a85e38] text-white shadow-sm hover:bg-[#8b4513]"
                              size="sm"
                              disabled={product.stock === 0}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              {product.stock === 0
                                ? "Out of Stock"
                                : "Add to Cart"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
            {/* Enhanced Cart */}
            <Card className="border-0 shadow-lg xl:col-span-1">
              <CardHeader className="border-b border-[#a85e38]/10 bg-gradient-to-r from-[#a85e38]/5 to-[#a85e38]/10">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xl text-[#a85e38]">
                    <ShoppingCart className="h-6 w-6" />
                    Order Cart
                  </CardTitle>
                  {cartItems.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearCart}
                      className="text-gray-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {cartItems.length} items selected
                </p>
              </CardHeader>
              <CardContent className="p-6">
                {cartItems.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#a85e38]/10 to-[#a85e38]/20">
                      <ShoppingCart className="h-10 w-10 text-[#a85e38]/60" />
                    </div>
                    <h3 className="mb-1 font-semibold text-gray-900">
                      Your cart is empty
                    </h3>
                    <p className="text-sm text-gray-500">
                      Add products to start creating an order
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <ScrollArea className="h-[450px]">
                      <div className="space-y-4 pr-2">
                        {cartItems.map((item) => (
                          <div
                            key={item.productId}
                            className="group rounded-lg border border-gray-100 bg-gray-50 p-4 transition-all duration-200 hover:bg-[#a85e38]/5"
                          >
                            <div className="flex items-start gap-3">
                              {item.image ? (
                                <Image
                                  src={item.image}
                                  alt={item.name}
                                  width={60}
                                  height={60}
                                  className="h-15 w-15 flex-shrink-0 rounded-lg border border-gray-200 object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="flex h-15 w-15 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-gray-200 to-gray-300">
                                  <ImageIcon className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <h4 className="mb-1 line-clamp-2 text-sm font-semibold text-gray-900">
                                  {item.name}
                                </h4>
                                <p className="text-sm font-semibold text-[#a85e38]">
                                  ₱{item.price.toFixed(2)} each
                                </p>
                                <div className="mt-3 flex items-center justify-between">
                                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 hover:bg-[#a85e38] hover:text-white"
                                      onClick={() =>
                                        updateQuantity(
                                          item.productId,
                                          item.quantity - 1,
                                        )
                                      }
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="w-8 text-center text-sm font-semibold text-gray-900">
                                      {item.quantity}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 hover:bg-[#a85e38] hover:text-white"
                                      onClick={() =>
                                        updateQuantity(
                                          item.productId,
                                          item.quantity + 1,
                                        )
                                      }
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      removeFromCart(item.productId)
                                    }
                                    className="h-7 w-7 p-0 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="mt-2 text-right">
                                  <span className="text-sm font-bold text-gray-900">
                                    ₱{(item.price * item.quantity).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    {/* Enhanced Order Summary */}
                    <div className="space-y-4 border-t border-gray-200 pt-6">
                      <div className="rounded-lg border border-[#a85e38]/10 bg-[#a85e38]/5 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-semibold text-gray-900">
                            ₱{totalPrice.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-lg">
                          <span className="font-bold text-[#a85e38]">
                            Total:
                          </span>
                          <span className="text-xl font-bold text-[#a85e38]">
                            ₱{totalPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <Button
                        onClick={handleCreateOrder}
                        className="w-full border-0 bg-[#a85e38] text-white shadow-md transition-all duration-200 hover:bg-[#8b4513] hover:shadow-lg"
                        size="lg"
                        disabled={createOrderWithoutUser.isPending}
                      >
                        {createOrderWithoutUser.isPending ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            Creating Order...
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="mr-2 h-5 w-5" />
                            Create Order
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Enhanced Orders Table */
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b border-[#a85e38]/10 bg-gradient-to-r from-[#a85e38]/5 to-[#a85e38]/10">
              <CardTitle className="flex items-center gap-2 text-xl text-[#a85e38]">
                <Package className="h-6 w-6" />
                Today orders
              </CardTitle>
              <p className="text-sm text-gray-600">
                {walkInOrders.length} total orders • View and manage all walk-in
                customer orders
              </p>
            </CardHeader>
            <CardContent className="p-6">
              {walkInOrders.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#a85e38]/10 to-[#a85e38]/20">
                    <Package className="h-10 w-10 text-[#a85e38]/60" />
                  </div>
                  <h3 className="mb-1 font-semibold text-gray-900">
                    No walk-in orders yet
                  </h3>
                  <p className="text-sm text-gray-500">
                    Orders will appear here after creation
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-gray-200 bg-gray-50">
                        <tr>
                          <th className="p-4 text-left font-semibold text-gray-700">
                            Order #
                          </th>
                          <th className="p-4 text-left font-semibold text-gray-700">
                            Date & Time
                          </th>
                          <th className="p-4 text-left font-semibold text-gray-700">
                            Items
                          </th>
                          <th className="p-4 text-left font-semibold text-gray-700">
                            Total Amount
                          </th>
                          <th className="p-4 text-left font-semibold text-gray-700">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {walkInOrders.map((order, index) => (
                          <tr
                            key={order.id}
                            className={`border-b border-gray-100 transition-colors hover:bg-[#a85e38]/2 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                          >
                            <td className="p-4">
                              <div className="font-semibold text-gray-900">
                                {order.orderNumber}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="text-sm text-gray-900">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(order.createdAt).toLocaleTimeString()}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-[#a85e38]" />
                                <span className="text-sm font-medium text-gray-900">
                                  {order.orderItems.length} item
                                  {order.orderItems.length !== 1 ? "s" : ""}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="text-lg font-bold text-[#a85e38]">
                                ₱{order.totalPrice.toFixed(2)}
                              </span>
                            </td>
                            <td className="p-4">
                              <Badge
                                variant={
                                  getStatusBadgeVariant(order.status) as any
                                }
                                style={getStatusBadgeStyle(order.status)}
                                className="font-medium"
                              >
                                {order.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default WalkInPage;
