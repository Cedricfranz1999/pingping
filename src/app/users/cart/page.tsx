// app/cart/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, CreditCard, Loader2, Check } from 'lucide-react';
import { api } from '~/trpc/react';
import Image from 'next/image';
import { useAuthStore } from '~/app/store/auth-store';
import { useToast } from '~/components/ui/use-toast';
import { Button } from "~/components/ui/button";
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const CartPage = () => {
  const { user, isAuthenticated } = useAuthStore();
  const userId = user?.userId;
  const { toast } = useToast();
  const router = useRouter();
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);
  const [selectedItems, setSelectedItems] = useState<number[]>([]); // Add this state

  // Get cart data
  const { data: cartData, isLoading, refetch: refetchCart } = api.ordersProduct.getCart.useQuery(
    { userId: userId! }, 
    { 
      enabled: !!userId,
      refetchOnWindowFocus: false
    }
  );

  // Update cart item mutation
  const updateCartItemMutation = api.ordersProduct.updateCartItem.useMutation({
    onSuccess: () => {
      refetchCart();
      setIsUpdating(false);
      setUpdatingItemId(null);
    },
    onError: (error) => {
      toast({
        title: "Error!",
        description: "Failed to update cart item",
        variant: "destructive",
      });
      setIsUpdating(false);
      setUpdatingItemId(null);
    },
  });

  // Remove from cart mutation
  const removeFromCartMutation = api.ordersProduct.removeFromCart.useMutation({
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Item removed from cart",
        variant: "default",
      });
      refetchCart();
      // Remove from selected items if it was selected
      setSelectedItems(prev => prev.filter(id => id !== removeFromCartMutation.variables?.cartItemId));
    },
    onError: (error) => {
      toast({
        title: "Error!",
        description: "Failed to remove item from cart",
        variant: "destructive",
      });
    },
  });

  // Create order mutation
  const createOrderMutation = api.ordersProduct.createOrder.useMutation({
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Order placed successfully!",
        variant: "default",
      });
      refetchCart();
      setSelectedItems([]);
      router.push('/orders');
    },
    onError: (error) => {
      toast({
        title: "Error!",
        description: "Failed to place order",
        variant: "destructive",
      });
    },
  });

  // Add these selection functions
  const toggleItemSelection = (cartItemId: number) => {
    setSelectedItems(prev => 
      prev.includes(cartItemId) 
        ? prev.filter(id => id !== cartItemId)
        : [...prev, cartItemId]
    );
  };

  const selectAllItems = () => {
    if (!cartData?.items) return;
    
    if (selectedItems.length === cartData.items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(cartData.items.map(item => item.id));
    }
  };

  const handleQuantityChange = (cartItemId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setIsUpdating(true);
    setUpdatingItemId(cartItemId);
    updateCartItemMutation.mutate({
      cartItemId,
      quantity: newQuantity,
    });
  };

  const handleRemoveItem = (cartItemId: number) => {
    removeFromCartMutation.mutate({ cartItemId });
  };

  const handleCheckout = () => {
    if (!userId || !cartData?.items?.length || selectedItems.length === 0) return;
    
    // Get only the selected items
    const selectedCartItems = cartData.items.filter(item => selectedItems.includes(item.id));
    
    const totalPrice = selectedCartItems.reduce((total, item) => {
      return total + (parseFloat(item.product.price) * item.quantity);
    }, 0);
    
    createOrderMutation.mutate({
      userId,
      items: selectedCartItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: parseFloat(item.product.price)
      })),
      totalPrice,
      cartItemIds: selectedItems,
    });
  };

  const calculateSelectedTotal = () => {
    if (!cartData?.items || selectedItems.length === 0) return 0;
    
    return cartData.items
      .filter(item => selectedItems.includes(item.id))
      .reduce((total, item) => {
        return total + (parseFloat(item.product.price) * item.quantity);
      }, 0);
  };

  const getSelectedItemsCount = () => {
    return selectedItems.length;
  };

  useEffect(() => {
    // Reset selection when cart data changes
    setSelectedItems([]);
  }, [cartData]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Please log in</h2>
          <p className="text-gray-600 mb-6">You need to be logged in to view your cart</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b " >
        <div className=" mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/products">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <h1 className="text-2xl font-bold">Shopping Cart</h1>
            </div>
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-[#f4834b]" />
              <span className="font-medium">
                {cartData?.items?.length || 0} items
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className=" mx-auto px-4 md:px-8 py-8">
        {!cartData?.items || cartData.items.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Add some products to get started</p>
            <Button asChild className="bg-[#f4834b] hover:bg-[#e07643]">
              <Link href="/products">Continue Shopping</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Cart Items</h2>
                  {cartData.items.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllItems}
                      className="flex items-center gap-2"
                    >
                      {selectedItems.length === cartData.items.length ? (
                        <Check className="h-4 w-4" />
                      ) : null}
                      {selectedItems.length === cartData.items.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  )}
                </div>
                <div className="space-y-6">
                  {cartData.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 pb-6 border-b last:border-b-0">
                      {/* Checkbox for selection */}
                      <button
                        onClick={() => toggleItemSelection(item.id)}
                        className={`flex items-center justify-center w-5 h-5 rounded border-2 ${
                          selectedItems.includes(item.id)
                            ? 'bg-[#f4834b] border-[#f4834b] text-white'
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedItems.includes(item.id) && <Check className="h-3 w-3" />}
                      </button>
                      
                      <Image
                        src={item.product.image || '/api/placeholder/100/100'}
                        alt={item.product.name}
                        width={80}
                        height={80}
                        className="rounded-lg object-cover flex-shrink-0"
                        unoptimized
                      />
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg mb-1 truncate">{item.product.name}</h3>
                        <p className="text-gray-600 text-sm mb-2">₱{item.product.price}</p>
                        <p className="text-sm text-gray-500">
                          Stock: {item.product.stock > 0 ? (
                            <span className="text-green-600">{item.product.stock} available</span>
                          ) : (
                            <span className="text-red-600">Out of stock</span>
                          )}
                        </p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1 || isUpdating}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          
                          <div className="w-12 text-center">
                            {updatingItemId === item.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                            ) : (
                              <span className="font-medium">{item.quantity}</span>
                            )}
                          </div>
                          
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.product.stock || isUpdating}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={removeFromCartMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                        
                        <div className="text-lg font-bold">
                          ₱{(parseFloat(item.product.price) * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
                <h2 className="text-xl font-bold mb-6">Order Summary</h2>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between">
                    <span>Selected Items</span>
                    <span>{getSelectedItemsCount()} items</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₱{calculateSelectedTotal().toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className="text-green-600">Free</span>
                  </div>
                  
                  <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>₱{calculateSelectedTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <Button
                  className="w-full bg-[#f4834b] hover:bg-[#e07643] h-12 text-lg"
                  onClick={handleCheckout}
                  disabled={createOrderMutation.isPending || selectedItems.length === 0}
                >
                  {createOrderMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5 mr-2" />
                      Checkout ({getSelectedItemsCount()})
                    </>
                  )}
                </Button>
                
                {selectedItems.length === 0 && (
                  <p className="text-sm text-center text-gray-500 mt-3">
                    Select items to checkout
                  </p>
                )}
                
                <div className="mt-4 text-sm text-gray-500 text-center">
                  Your personal data will be used to process your order and for other purposes described in our privacy policy.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;