"use client";
import { useState } from "react";
import { type NextPage } from "next";
import Head from "next/head";
import { type Product, type Category, ProductType } from "@prisma/client";
import {
  ChevronDown,
  ChevronUp,
  Search,
  Plus,
  Edit,
  Trash2,
  RotateCcw,
  Filter,
  ChevronLeft,
  ChevronRight,
  Package,
  Upload,
} from "lucide-react";
import { api } from "~/trpc/react";

// shadcn/ui imports
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";

// Extend Product shape locally to include `size` in case
// generated Prisma types are not yet refreshed in the editor.
type ProductWithCategories = Product & {
  size?: string | null;
  categories: {
    category: Category;
  }[];
};

type ProductFormData = {
  name: string;
  description: string;
  price: string;
  stock: number;
  image?: string;
  category: string;
  productType: ProductType;
  imageFile?: File | null;
  size: string;
};

const ProductsPage: NextPage = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState<"name" | "price" | "stock">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<ProductWithCategories | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: "",
    price: "0",
    stock: 0,
    productType: "TINAPA",

    image: "",
    category: "",
    imageFile: null,
    size: "SMALL",
  });

  const {
    data: productsData,
    isLoading,
    refetch,
  } = api.product.getAll.useQuery({
    page,
    limit,
    search,
    category: selectedCategory !== "All" ? selectedCategory : undefined,
    sortBy,
    sortOrder,
  });

  console.log("TEST", productsData);

  const { data: categories } = api.product.getCategories.useQuery();
  const { data: allProducts } = api.product.getAllSimple.useQuery();

  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<ProductWithCategories[]>([]);
  const [hasExactDuplicate, setHasExactDuplicate] = useState(false);
  const [pendingCreatePayload, setPendingCreatePayload] = useState<any | null>(null);
  const [duplicateBlockedOpen, setDuplicateBlockedOpen] = useState(false);
  const [duplicateBlockedMessage, setDuplicateBlockedMessage] = useState("Hindi puwedeng magkapareho ang product name at size.");

  const sizeOptions = ["SMALL", "MEDIUM", "LARGE"] as const;

  const createProduct = api.product.create.useMutation({
    onSuccess: () => {
      void refetch();
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (err) => {
      if (
        err instanceof Error &&
        err.message.toLowerCase().includes("same name and size")
      ) {
        setDuplicateBlockedMessage("Hindi puwedeng magkapareho ang product name at size.");
        setDuplicateBlockedOpen(true);
      }
    },
  });

  const updateProduct = api.product.update.useMutation({
    onSuccess: () => {
      void refetch();
      setIsEditModalOpen(false);
      resetForm();
    },
    onError: (err) => {
      if (
        err instanceof Error &&
        err.message.toLowerCase().includes("same name and size")
      ) {
        setDuplicateBlockedMessage("Hindi puwedeng magkapareho ang product name at size.");
        setDuplicateBlockedOpen(true);
      }
    },
  });

  const deleteProduct = api.product.delete.useMutation({
    onSuccess: () => {
      void refetch();
      setIsDeleteModalOpen(false);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "0",
      stock: 0,
      image: "",
      category: "",
      productType: "TINAPA",
      imageFile: null,
      size: "SMALL",
    });
  };

  const handleSort = (column: "name" | "price" | "stock") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const openEditModal = (product: ProductWithCategories) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      productType: product.productType,
      image: product.image || "",
      category: product.categories[0]?.category.name || "",
      imageFile: null,
      size: sizeOptions.includes((product.size as any) ?? "")
        ? (product.size as any)
        : "SMALL",
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (product: ProductWithCategories) => {
    setSelectedProduct(product);
    setIsDeleteModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setIsUploading(true);

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormData((prev) => ({
            ...prev,
            image: event.target?.result as string,
            imageFile: file,
          }));
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side duplicate check to provide a friendly dialog
    if (!isEditModalOpen) {
      const normalizedName = formData.name.trim().toLowerCase();
      const normalizedSize = (formData.size || "REGULAR").trim().toLowerCase();
      const sameNameMatches = (allProducts ?? []).filter(
        (p: any) =>
          p.name.trim().toLowerCase() === normalizedName &&
          p.productType === formData.productType,
      ) as ProductWithCategories[];

      const exact = sameNameMatches.some(
        (p) => (p.size ?? "REGULAR").trim().toLowerCase() === normalizedSize,
      );

      if (sameNameMatches.length > 0) {
        setDuplicateMatches(sameNameMatches);
        setHasExactDuplicate(exact);
        setPendingCreatePayload({
          name: formData.name,
          description: formData.description,
          price: formData.price,
          stock: formData.stock,
          image: formData.image,
          category: formData.category,
          productType: formData.productType,
          size: formData.size || "REGULAR",
        });
        setIsDuplicateDialogOpen(true);
        if (exact) return; // block exact duplicate here
        // If only same name with different sizes found, show dialog first
        return;
      }
    }

    const payload = {
      name: formData.name,
      description: formData.description,
      price: formData.price,
      stock: formData.stock,
      image: formData.image,
      category: formData.category,
      productType: formData.productType,
      size: formData.size || "REGULAR",
    };

    if (isEditModalOpen && selectedProduct) {
      updateProduct.mutate({
        id: selectedProduct.id,
        ...payload,
      });
    } else {
      createProduct.mutate(payload);
    }
  };

  const handleDelete = () => {
    if (selectedProduct) {
      deleteProduct.mutate({ id: selectedProduct.id });
    }
  };

  const getStockBadgeVariant = (stock: number) => {
    if (stock > 20) return "default";
    if (stock > 0) return "secondary";
    return "destructive";
  };

  const getStockText = (stock: number) => {
    if (stock > 20) return "In Stock";
    if (stock > 0) return "Low Stock";
    return "Out of Stock";
  };

  return (
    <>
      <Head>
        <title>Products Management</title>
        <meta name="description" content="Manage your products" />
      </Head>

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-[#f8610e]" />
            <h1 className="text-2xl font-bold text-[#f8610e] md:text-3xl">
              Products
            </h1>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-[#f8610e] hover:bg-[#f8610e]/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>

        <Card className="border-[#f8610e]/20">
          <CardHeader>
            <CardTitle className="text-[#f8610e]">Filters</CardTitle>
            <CardDescription>Search and filter your products</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="relative">
                <Search className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger>
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((category: any) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={limit.toString()}
                onValueChange={(value) => setLimit(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Items per page" />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      Show {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("All");
                  setSortBy("name");
                  setSortOrder("asc");
                }}
                className="border-[#f8610e]/20 hover:bg-[#f8610e]/5"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#f8610e]/20">
          <CardHeader>
            <CardTitle className="text-[#f8610e]">Products List</CardTitle>
            <CardDescription>Manage your product</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center">
                        Name
                        {sortBy === "name" ? (
                          sortOrder === "asc" ? (
                            <ChevronUp className="ml-1 h-4 w-4" />
                          ) : (
                            <ChevronDown className="ml-1 h-4 w-4" />
                          )
                        ) : (
                          <span className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Price Range</TableHead>
                    {/* <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("stock")}
                    >
                      <div className="flex items-center">
                        Stock
                        {sortBy === "stock" ? (
                          sortOrder === "asc" ? (
                            <ChevronUp className="ml-1 h-4 w-4" />
                          ) : (
                            <ChevronDown className="ml-1 h-4 w-4" />
                          )
                        ) : (
                          <span className="ml-1 h-4 w-4" />
                        )}
                      </div>
                    </TableHead> */}
                    <TableHead>Category</TableHead>
                    {/* Hidden per request: Type column */}
                    {/** <TableHead>Type</TableHead> **/}

                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center">
                        <div className="flex items-center justify-center">
                          <Package className="mr-2 h-4 w-4 animate-spin" />
                          Loading products...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : productsData?.products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Package className="text-muted-foreground h-8 w-8" />
                          <p className="text-muted-foreground">
                            No products found
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    (() => {
                      const grouped = new Map<string, any[]>();
                      productsData?.products.forEach((p: any) => {
                        const key = p.name.trim().toLowerCase();
                        const arr = grouped.get(key) ?? [];
                        arr.push(p);
                        grouped.set(key, arr);
                      });
                      const groups = Array.from(grouped.entries());
                      return groups.map(([key, variants]) => {
                        const first = variants[0];
                        const prices = variants
                          .map((v) => parseFloat(v.price))
                          .filter((n) => !Number.isNaN(n));
                        const min = Math.min(...prices);
                        const max = Math.max(...prices);
                        const hasMultiple = variants.length > 1;
                        const isExpanded = expandedGroups.has(key);
                        return (
                          <>
                            <TableRow key={key} className="hover:bg-muted/50">
                              <TableCell>
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={first.image || "/placeholder.svg"} alt={first.name} />
                                  <AvatarFallback>
                                    <Package className="h-4 w-4" />
                                  </AvatarFallback>
                                </Avatar>
                              </TableCell>
                              <TableCell>
                                {hasMultiple ? (
                                  <button
                                    type="button"
                                    className="text-left font-medium flex items-center gap-2"
                                    onClick={() => {
                                      const next = new Set(expandedGroups);
                                      if (next.has(key)) next.delete(key);
                                      else next.add(key);
                                      setExpandedGroups(next);
                                    }}
                                  >
                                    {first.name}
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </button>
                                ) : (
                                  <div className="font-medium">{first.name}</div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="text-muted-foreground max-w-[240px] truncate">
                                  {first.description}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">
                                  {hasMultiple
                                    ? min === max
                                      ? `₱${min.toFixed(2)}`
                                      : `₱${min.toFixed(2)} - ₱${max.toFixed(2)}`
                                    : `₱${parseFloat(first.price).toFixed(2)}`}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="border-[#f8610e]/20 text-[#f8610e]">
                                  {first.categories?.[0]?.category?.name || "Uncategorized"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {hasMultiple ? (
                                  <div className="text-sm text-muted-foreground">
                                    {variants.length} variants
                                  </div>
                                ) : (
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openEditModal(first)}
                                      className="hover:bg-[#f8610e]/10"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openDeleteModal(first)}
                                      className="hover:bg-red-100"
                                    >
                                      <Trash2 className="h-4 w-4 text-red-600" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                            {hasMultiple && isExpanded && (
                              <TableRow>
                                <TableCell colSpan={6}>
                                  <div className="rounded-md border p-4 space-y-3">
                                    <div className="text-sm font-medium">Variants</div>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                      {variants
                                        .sort((a, b) => (a.size || '').localeCompare(b.size || ''))
                                        .map((v: any) => (
                                          <div key={v.id} className="flex items-center justify-between rounded-md border p-3">
                                            <div className="space-y-1">
                                              <div className="flex items-center gap-2">
                                                <Badge variant="outline">
                                                  {(v.size || 'REGULAR').charAt(0) + (v.size || 'REGULAR').slice(1).toLowerCase()}
                                                </Badge>
                                                <span className="font-medium">₱{parseFloat(v.price).toFixed(2)}</span>
                                              </div>
                                              <div className="text-xs text-muted-foreground max-w-[300px] truncate">
                                                {v.description}
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="hover:bg-[#f8610e]/10"
                                                onClick={() => openEditModal(v)}
                                              >
                                                <Edit className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="hover:bg-red-100"
                                                onClick={() => openDeleteModal(v)}
                                              >
                                                <Trash2 className="h-4 w-4 text-red-600" />
                                              </Button>
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        );
                      });
                    })()
                  )}
                </TableBody>
              </Table>
            </div>

            {productsData && productsData.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <div className="text-muted-foreground text-sm">
                  Showing {(page - 1) * limit + 1} to{" "}
                  {Math.min(page * limit, productsData.pagination.total)} of{" "}
                  {productsData.pagination.total} results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from(
                      {
                        length: Math.min(5, productsData.pagination.totalPages),
                      },
                      (_, i) => {
                        let pageNum;
                        if (productsData.pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (
                          page >=
                          productsData.pagination.totalPages - 2
                        ) {
                          pageNum = productsData.pagination.totalPages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={page === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(pageNum)}
                            className={
                              page === pageNum
                                ? "bg-[#f8610e] hover:bg-[#f8610e]/90"
                                : ""
                            }
                          >
                            {pageNum}
                          </Button>
                        );
                      },
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((p) =>
                        Math.min(productsData.pagination.totalPages, p + 1),
                      )
                    }
                    disabled={page === productsData.pagination.totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#f8610e]">
              Add New Product
            </DialogTitle>
            <DialogDescription>
              Create a new product.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter product name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="size">Variant/Size</Label>
              <Select
                value={formData.size}
                onValueChange={(value) => setFormData({ ...formData, size: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {sizeOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt.charAt(0) + opt.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                required
                className="min-h-24 max-h-48 resize-none overflow-y-auto"
                value={formData.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: e.target.value,
                  })
                }
                placeholder="Enter product description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (â‚±)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: e.target.value,
                    })
                  }
                  placeholder="0.00"
                />
              </div>

              {/* Hidden per request: Stock field (no inventory) */}
              {/**
              <div className="space-y-2">
                <Label htmlFor="stock">Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  required
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stock: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                />
              </div>
              **/}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    ?.filter((c: any) => c !== "All")
                    .map((category: any) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">Product Image</Label>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="file-upload"
                  className="border-input bg-background hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium shadow-sm"
                >
                  <Upload className="h-4 w-4" />
                  {formData.imageFile
                    ? formData.imageFile.name
                    : "Upload Image"}
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {isUploading && <Package className="h-4 w-4 animate-spin" />}
              </div>
              {formData.image && (
                <div className="mt-2">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={formData.image} alt="Preview" />
                    <AvatarFallback>
                      <Package className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createProduct.isPending || isUploading}
                className="bg-[#f8610e] hover:bg-[#f8610e]/90"
              >
                {createProduct.isPending ? "Saving..." : "Save Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#f8610e]">Edit Product</DialogTitle>
            <DialogDescription>
              Update the product information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Product Name</Label>
              <Input
                id="edit-name"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter product name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-size">Variant/Size</Label>
              <Select
                value={formData.size}
                onValueChange={(value) => setFormData({ ...formData, size: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {sizeOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt.charAt(0) + opt.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                required
                className="min-h-24 max-h-48 resize-none overflow-y-auto"
                value={formData.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: e.target.value,
                  })
                }
                placeholder="Enter product description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-price">Price (â‚±)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: e.target.value,
                    })
                  }
                  placeholder="0.00"
                />
              </div>

              {/* Hidden per request: Stock field in edit form (no inventory) */}
              {/**
              <div className="space-y-2">
                <Label htmlFor="edit-stock">Stock</Label>
                <Input
                  id="edit-stock"
                  type="number"
                  min="0"
                  required
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stock: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                />
              </div>
              **/}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    ?.filter((c) => c !== "All")
                    .map((category: any) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-image">Product Image</Label>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="edit-file-upload"
                  className="border-input bg-background hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium shadow-sm"
                >
                  <Upload className="h-4 w-4" />
                  {formData.imageFile
                    ? formData.imageFile.name
                    : "Change Image"}
                </label>
                <input
                  id="edit-file-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {isUploading && <Package className="h-4 w-4 animate-spin" />}
              </div>
              {(formData.image || selectedProduct?.image) && (
                <div className="mt-2">
                  <Avatar className="h-16 w-16">
                    <AvatarImage
                      src={formData.image || selectedProduct?.image || ""}
                      alt="Preview"
                    />
                    <AvatarFallback>
                      <Package className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateProduct.isPending || isUploading}
                className="bg-[#f8610e] hover:bg-[#f8610e]/90"
              >
                {updateProduct.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Duplicate warning dialog */}
      <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#f8610e]">Duplicate product</DialogTitle>
            {hasExactDuplicate ? (
              <DialogDescription>
                A product with the same name and size already exists. You cannot add an exact duplicate. Edit the existing product or change the size.
              </DialogDescription>
            ) : (
              <DialogDescription>
                Products with the same name already exist. You can add a new variant with a different size, or edit an existing one below.
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-3">
            {duplicateMatches.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded border p-3">
                <div className="space-y-1">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Size: <span className="font-medium">{p.size ?? "REGULAR"}</span> Â· Price: â‚±{parseFloat(p.price as any).toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Category: {p.categories?.[0]?.category?.name ?? "Uncategorized"}
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDuplicateDialogOpen(false);
                    setIsCreateModalOpen(false);
                    openEditModal(p as any);
                  }}
                >
                  Edit
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <div className="flex w-full items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDuplicateDialogOpen(false)}>
                Change size
              </Button>
              {!hasExactDuplicate && (
                <Button
                  className="bg-[#f8610e] hover:bg-[#f8610e]/90"
                  onClick={() => {
                    if (pendingCreatePayload) {
                      createProduct.mutate(pendingCreatePayload);
                      setIsDuplicateDialogOpen(false);
                      setPendingCreatePayload(null);
                    }
                  }}
                >
                  Add as new size
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate blocked dialog */}
      <Dialog open={duplicateBlockedOpen} onOpenChange={setDuplicateBlockedOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Hindi puwede</DialogTitle>
            <DialogDescription>
              {duplicateBlockedMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateBlockedOpen(false)}>
              Okay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{selectedProduct?.name}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteProduct.isPending}
            >
              {deleteProduct.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProductsPage;


