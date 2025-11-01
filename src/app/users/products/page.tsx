// app/products/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, ShoppingCart, Heart, Plus, Minus, Star } from 'lucide-react';
import { api } from '~/trpc/react';
import Image from 'next/image';
import { useAuthStore } from '~/app/store/auth-store';
import { useToast } from '~/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

const ProductsPage = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [quantityModal, setQuantityModal] = useState<{
    isOpen: boolean;
    product: any | null;
    quantity: number;
  }>({
    isOpen: false,
    product: null,
    quantity: 1,
  });

  const { user, isAuthenticated } = useAuthStore();
  const userId = user?.userId;

  const { toast } = useToast();
  const { data: productsData, isLoading } = api.product.getAll.useQuery({
    page,
    limit,
    search,
    category: selectedCategory !== "All" ? selectedCategory : undefined,
    sortOrder,
  });

  // Get cart items
  const { data: cartData, refetch: refetchCart } = api.ordersProduct.getCart.useQuery(
    { userId: userId! }, 
    { enabled: !!userId }
  );

  const { data: categories } = api.product.getCategories.useQuery();

  // Ratings for current page products
  const pageProductIds = (productsData?.products ?? []).map((p: any) => p.id as number);
  const { data: ratingsMap } = api.product.getRatingsByProductIds.useQuery(
    { productIds: pageProductIds },
    { enabled: pageProductIds.length > 0 }
  );

  const StarRow = ({ average, count }: { average: number; count?: number }) => {
    const full = Math.floor(average);
    const stars = Array.from({ length: 5 }, (_, i) => i < full);
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <div className="flex items-center">
          {stars.map((filled, idx) => (
            <Star key={idx} className={filled ? 'h-4 w-4 text-yellow-500 fill-yellow-500' : 'h-4 w-4 text-gray-300'} />
          ))}
        </div>
        <span className="font-medium">{average.toFixed(1)}</span>
        {typeof count === 'number' && <span className="text-gray-400">({count})</span>}
      </div>
    );
  };

  // Add to cart mutation
  const addToCartMutation = api.ordersProduct.addToCart.useMutation({
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Product added to cart successfully",
        variant: "default",
      });
      refetchCart();
      setQuantityModal({ isOpen: false, product: null, quantity: 1 });
    },
    onError: (error: any) => {
      toast({
        title: "Error!",
        description: "Failed to add product to cart",
        variant: "destructive",
      });
    },
  });

  const handleAddToCartClick = (product: any) => {
    if (!userId) {
      toast({
        title: "Please login",
        description: "You need to login to add items to cart",
        variant: "default",
      });
      return;
    }
    
    setQuantityModal({
      isOpen: true,
      product,
      quantity: 1
    });
  };

  const handleConfirmAddToCart = () => {
    if (!userId || !quantityModal.product) return;
    
    addToCartMutation.mutate({ 
      userId, 
      productId: quantityModal.product.id, 
      quantity: quantityModal.quantity 
    });
  };

  const incrementQuantity = () => {
    setQuantityModal(prev => ({
      ...prev,
      quantity: prev.quantity + 1
    }));
  };

  const decrementQuantity = () => {
    if (quantityModal.quantity > 1) {
      setQuantityModal(prev => ({
        ...prev,
        quantity: prev.quantity - 1
      }));
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setQuantityModal(prev => ({
        ...prev,
        quantity: value
      }));
    }
  };

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      // Refetch will happen automatically due to query dependency change
    }, 500);
    
    return () => clearTimeout(timer);
  }, [search]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setPage(1);
  };

  const handleSortChange = (newSortBy: string) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Quantity Modal using Shadcn Dialog */}
      <Dialog open={quantityModal.isOpen} onOpenChange={(open) => setQuantityModal({...quantityModal, isOpen: open})}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Cart</DialogTitle>
          </DialogHeader>
          
          <div className="flex items-center gap-4 mb-6">
            <Image 
              src={quantityModal.product?.image || '/api/placeholder/100/100'} 
              alt="product"
              width={80}
              height={80}
              className="rounded-lg object-cover"
              unoptimized
            />
            <div>
              <h4 className="font-medium">{quantityModal.product?.name}</h4>
              <p className="text-lg font-bold text-[#f4834b]">₱{quantityModal.product?.price}</p>
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Quantity</label>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={decrementQuantity}
                disabled={quantityModal.quantity <= 1}
                className="h-10 w-10"
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <Input
                type="number"
                min="1"
                value={quantityModal.quantity}
                onChange={handleQuantityChange}
                className="w-20 text-center"
              />
              
              <Button
                variant="outline"
                size="icon"
                onClick={incrementQuantity}
                className="h-10 w-10"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setQuantityModal({ isOpen: false, product: null, quantity: 1 })}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAddToCart}
              disabled={addToCartMutation.isPending}
              className="flex-1 bg-[#f4834b] hover:bg-[#e07643]"
            >
              {addToCartMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adding...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Hero Section */}
      <div className="bg-[#f4834b] text-white py-12 px-4 md:px-8">
        <div className=" mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Products</h1>
          <p className="text-xl max-w-3xl mx-auto">
            Discover our amazing collection of high-quality products
          </p>
        </div>
      </div>

      <div className=" mx-auto px-4 md:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm p-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Filter className="h-5 w-5" />
                Filters
              </button>
            </div>
          </div>

          {/* Filter Panel */}
          {isFilterOpen && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="font-medium mb-3">Categories</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleCategoryChange('All')}
                  className={`px-4 py-2 rounded-full ${selectedCategory === 'All' ? 'bg-blue-100 text-[#f4834b]' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  All Products
                </button>
                {categories?.map((category) => (
                  <button
                    key={category}
                    onClick={() => handleCategoryChange(category)}
                    className={`px-4 py-2 rounded-full ${selectedCategory === category ? 'bg-blue-100 text-[#f4834b]' : 'bg-gray-100 hover:bg-gray-200'}`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {productsData?.products.map((product) => (
                <div key={product.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="relative">
                    <Image 
                      src={product.image || '/api/placeholder/300/300'} 
                      alt="product"
                      width={100}
                      height={100}
                      className="w-full h-48 object-cover"
                      unoptimized
                    />
                    <button className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors">
                      <Heart className="h-5 w-5 text-gray-600" />
                    </button>
                  </div>
                  
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-1 line-clamp-1">{product.name}</h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                  <div className="mb-2">
                    <StarRow average={ratingsMap?.[product.id]?.average ?? 0} count={ratingsMap?.[product.id]?.count ?? 0} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-gray-900">₱{product.price}</span>
                      <button 
                        onClick={() => handleAddToCartClick(product)}
                        className="flex items-center gap-2 py-2 px-4 rounded-lg transition-colors bg-[#c38262] hover:bg-[#a86a4d] text-white"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        Add To Cart
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {productsData?.pagination && productsData.pagination.totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-md disabled:opacity-50"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: productsData.pagination.totalPages }, (_, i) => i + 1).map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-4 py-2 rounded-md ${
                        page === pageNum 
                          ? 'bg-[#f4834b] text-white' 
                          : 'bg-white border border-gray-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setPage(prev => Math.min(prev + 1, productsData.pagination.totalPages))}
                    disabled={page === productsData.pagination.totalPages}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-md disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProductsPage;
