// ~/app/inventory/page.tsx
"use client";
import { useState } from "react";
import { type NextPage } from "next";
import Head from "next/head";
import { Search, Minus, Plus } from "lucide-react";
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
import { Label } from "~/components/ui/label";

const InventoryPage: NextPage = () => {
  const [search, setSearch] = useState("");
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isDecreaseModalOpen, setIsDecreaseModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{
    id: number;
    name: string;
    stock: number;
  } | null>(null);
  const [newStock, setNewStock] = useState(0);
  const [decreaseQuantity, setDecreaseQuantity] = useState(1);

  const { data: products, refetch } = api.product.getAll.useQuery({
    search,
  });

  const updateStock = api.product.updateStock.useMutation({
    onSuccess: () => {
      void refetch();
      setIsUpdateModalOpen(false);
      setNewStock(0);
      setSelectedProduct(null);
    },
  });

  const decreaseStock = api.product.decreaseStock.useMutation({
    onSuccess: () => {
      void refetch();
      setIsDecreaseModalOpen(false);
      setDecreaseQuantity(1);
      setSelectedProduct(null);
    },
  });

  const handleUpdateStock = () => {
    if (selectedProduct && newStock >= 0) {
      updateStock.mutate({ id: selectedProduct.id, stock: newStock });
    }
  };

  const handleDecreaseStock = () => {
    if (
      selectedProduct &&
      decreaseQuantity > 0 &&
      decreaseQuantity <= selectedProduct.stock
    ) {
      decreaseStock.mutate({
        id: selectedProduct.id,
        quantity: decreaseQuantity,
      });
    }
  };

  return (
    <>
      <Head>
        <title>Inventory Management</title>
        <meta name="description" content="Manage product inventory" />
      </Head>

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-[#f8610e] md:text-3xl">
            Inventory
          </h1>
        </div>

        <div className="relative">
          <Search className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products?.products?.map((product: any) => (
                <TableRow key={product.id}>
                  <TableCell>{product.id}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.productType}</TableCell>
                  <TableCell
                    className={
                      product.stock === 0
                        ? "font-semibold text-red-600"
                        : product.stock < 11
                          ? "font-semibold text-yellow-600"
                          : "font-semibold text-green-600"
                    }
                  >
                    {product.stock}
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedProduct(product);
                        setNewStock(product.stock);
                        setIsUpdateModalOpen(true);
                      }}
                      className="hover:bg-blue-100"
                    >
                      <Plus className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedProduct(product);
                        setDecreaseQuantity(1);
                        setIsDecreaseModalOpen(true);
                      }}
                      disabled={product.stock === 0}
                      className="hover:bg-orange-100"
                    >
                      <Minus className="h-4 w-4 text-orange-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Update Stock Modal */}
      <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-[#f8610e]">Update Stock</DialogTitle>
            <DialogDescription>
              Update stock quantity for {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stock-quantity">New Stock Quantity</Label>
              <Input
                id="stock-quantity"
                type="number"
                min="0"
                value={newStock}
                onChange={(e) => setNewStock(Number(e.target.value))}
                placeholder="Enter stock quantity"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsUpdateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateStock}
                disabled={updateStock.isPending}
                className="bg-[#f8610e] hover:bg-[#f8610e]/90"
              >
                {updateStock.isPending ? "Updating..." : "Update Stock"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Decrease Stock Modal */}
      <Dialog open={isDecreaseModalOpen} onOpenChange={setIsDecreaseModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-[#f8610e]">Decrease Stock</DialogTitle>
            <DialogDescription>
              Decrease stock quantity for {selectedProduct?.name}
              {selectedProduct && (
                <span className="text-muted-foreground mt-1 block text-sm">
                  Current stock: {selectedProduct.stock}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="decrease-quantity">Quantity to Decrease</Label>
              <Input
                id="decrease-quantity"
                type="number"
                min="1"
                max={selectedProduct?.stock}
                value={decreaseQuantity}
                onChange={(e) => setDecreaseQuantity(Number(e.target.value))}
                placeholder="Enter quantity"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDecreaseModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDecreaseStock}
                disabled={
                  decreaseStock.isPending ||
                  !decreaseQuantity ||
                  decreaseQuantity > (selectedProduct?.stock || 0)
                }
                className="bg-[#f8610e] hover:bg-[#f8610e]/90"
              >
                {decreaseStock.isPending ? "Updating..." : "Decrease Stock"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InventoryPage;
