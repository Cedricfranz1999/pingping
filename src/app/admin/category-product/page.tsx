"use client";
import { useState } from "react";
import { type NextPage } from "next";
import Head from "next/head";
import { Plus, Search, Trash2 } from "lucide-react";
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

const CategoriesPage: NextPage = () => {
  const [search, setSearch] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const { data: categories, refetch } = api.categories.getAll.useQuery({
    search,
  });

  const createCategory = api.categories.create.useMutation({
    onSuccess: () => {
      void refetch();
      setIsCreateModalOpen(false);
      setNewCategoryName("");
    },
  });

  const deleteCategory = api.categories.remove.useMutation({
    onSuccess: () => {
      void refetch();
      setIsDeleteModalOpen(false);
    },
  });

  const handleCreate = () => {
    if (newCategoryName.trim()) {
      createCategory.mutate({ name: newCategoryName });
    }
  };

  const handleDelete = () => {
    if (selectedCategory) {
      deleteCategory.mutate({ id: selectedCategory.id });
    }
  };

  return (
    <>
      <Head>
        <title>Categories Management</title>
        <meta name="description" content="Manage product categories" />
      </Head>

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-[#f8610e] md:text-3xl">
            Categories
          </h1>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-[#f8610e] hover:bg-[#f8610e]/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </div>

        <div className="relative">
          <Search className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
          <Input
            placeholder="Search categories..."
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
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories?.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>{category.id}</TableCell>
                  <TableCell>{category.name}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCategory(category);
                        setIsDeleteModalOpen(true);
                      }}
                      className="hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create Category Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-[#f8610e]">
              Add New Category
            </DialogTitle>
            <DialogDescription>Create a new product category</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter category name"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createCategory.isPending}
                className="bg-[#f8610e] hover:bg-[#f8610e]/90"
              >
                {createCategory.isPending ? "Saving..." : "Save Category"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{selectedCategory?.name}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteCategory.isPending}
            >
              {deleteCategory.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CategoriesPage;

