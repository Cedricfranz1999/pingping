"use client";
import { useState } from "react";
import { type NextPage } from "next";
import Head from "next/head";
import { Edit, Plus, Search, Trash2, Check, X } from "lucide-react";
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
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "~/components/ui/badge";

const Order = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<{
    id: number;
    firstname: string;
    lastname: string;
    email?: string | null;
    phone: string;
    subject?: string | null;
    message: string;
    status: boolean;
  } | null>(null);
  const formSchema = z.object({
    firstname: z.string().min(1, "First name is required"),
    lastname: z.string().min(1, "Last name is required"),
    email: z.string().email().optional().or(z.literal("")),
    phone: z
      .string()
      .min(11, "Phone must be 11 digits")
      .max(11, "Phone must be 11 digits"),
    subject: z.string().optional(),
    message: z.string().min(1, "Message is required"),
  });

  type FormData = z.infer<typeof formSchema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const { data: ordersData, refetch } = api.orders.getAll.useQuery({
    search,
    page,
    limit: 10,
  });

  const createOrder = api.orders.create.useMutation({
    onSuccess: () => {
      void refetch();
      setIsCreateModalOpen(false);
      reset();
    },
  });

  const updateOrder = api.orders.update.useMutation({
    onSuccess: () => {
      void refetch();
      setIsEditModalOpen(false);
    },
  });

  const deleteOrder = api.orders.delete.useMutation({
    onSuccess: () => {
      void refetch();
      setIsDeleteModalOpen(false);
    },
  });

  const toggleStatus = api.orders.toggleStatus.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const handleCreate = (data: FormData) => {
    createOrder.mutate({
      firstname: data.firstname,
      lastname: data.lastname,
      email: data.email || undefined,
      phone: data.phone,
      subject: data.subject || undefined,
      message: data.message,
    });
  };

  const handleUpdate = (data: FormData) => {
    if (selectedOrder) {
      updateOrder.mutate({
        id: selectedOrder.id,
        firstname: data.firstname,
        lastname: data.lastname,
        email: data.email || undefined,
        phone: data.phone,
        subject: data.subject || undefined,
        message: data.message,
      });
    }
  };

  const handleDelete = () => {
    if (selectedOrder) {
      deleteOrder.mutate({ id: selectedOrder.id });
    }
  };

  const handleToggleStatus = (id: number, currentStatus: boolean) => {
    console.log("current status",currentStatus)
    toggleStatus.mutate({ id, status: !currentStatus });
  };

  const openEditModal = (order: typeof selectedOrder) => {
    if (order) {
      setSelectedOrder(order);
      setValue("firstname", order.firstname);
      setValue("lastname", order.lastname);
      setValue("email", order.email || "");
      setValue("phone", order.phone);
      setValue("subject", order.subject || "");
      setValue("message", order.message);
      setIsEditModalOpen(true);
    }
  };

  return (
    <>
      <Head>
        <title>Orders Management</title>
        <meta name="description" content="Manage customer orders" />
      </Head>

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-[#f8610e] md:text-3xl">
            Orders
          </h1>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-[#f8610e] hover:bg-[#f8610e]/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Order
          </Button>
        </div>

        <div className="relative">
          <Search className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
          <Input
            placeholder="Search orders..."
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
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordersData?.orders.length ? (
                ordersData.orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.id}</TableCell>
                    <TableCell>
                      {order.firstname} {order.lastname}
                    </TableCell>
                    <TableCell>{order.email}</TableCell>
                    <TableCell>{order.phone}</TableCell>
                    <TableCell>{order.subject}</TableCell>
                    <TableCell>
                      <Badge
                        variant={order.status ? "default" : "secondary"}
                        className={
                          order.status
                            ? "bg-green-500 hover:bg-green-600"
                            : "bg-red-500 hover:bg-gray-600 text-white"
                        }
                      >
                        {order.status ? "Actioned" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(order.id, order.status)}
                        className={
                          order.status
                            ? "hover:bg-gray-100"
                            : "hover:bg-green-100"
                        }
                      >
                        {order.status ? (
                          <X className="h-4 w-4 text-gray-600" />
                        ) : (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(order)}
                      >
                        <Edit className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsDeleteModalOpen(true);
                        }}
                        className="hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-6 text-center text-gray-500"
                  >
                    No orders found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {ordersData && ordersData.total > 10 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {(page - 1) * 10 + 1}-
              {Math.min(page * 10, ordersData.total)} of {ordersData.total}{" "}
              orders
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={page * 10 >= ordersData.total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Order Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-[#f8610e]">Add New Order</DialogTitle>
            <DialogDescription>Create a new customer order</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleCreate)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstname">First Name</Label>
                <Input
                  id="firstname"
                  {...register("firstname")}
                  className={errors.firstname ? "border-red-500" : ""}
                  placeholder="Enter first name"
                />
                {errors.firstname && (
                  <p className="text-sm text-red-500">
                    {errors.firstname.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastname">Last Name</Label>
                <Input
                  id="lastname"
                  {...register("lastname")}
                  className={errors.lastname ? "border-red-500" : ""}
                  placeholder="Enter last name"
                />
                {errors.lastname && (
                  <p className="text-sm text-red-500">
                    {errors.lastname.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="Enter email"
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  {...register("phone")}
                  className={errors.phone ? "border-red-500" : ""}
                  placeholder="Enter phone number"
                />
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                {...register("subject")}
                placeholder="Enter subject"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <textarea
                id="message"
                rows={4}
                {...register("message")}
                className={`w-full rounded-md border px-3 py-2 text-sm ${
                  errors.message ? "border-red-500" : ""
                }`}
                placeholder="Enter message"
              />
              {errors.message && (
                <p className="text-sm text-red-500">{errors.message.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createOrder.isPending}
                className="bg-[#f8610e] hover:bg-[#f8610e]/90"
              >
                {createOrder.isPending ? "Saving..." : "Save Order"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Order Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-[#f8610e]">Edit Order</DialogTitle>
            <DialogDescription>Update customer order details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleUpdate)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstname">First Name</Label>
                <Input
                  id="edit-firstname"
                  {...register("firstname")}
                  className={errors.firstname ? "border-red-500" : ""}
                  placeholder="Enter first name"
                />
                {errors.firstname && (
                  <p className="text-sm text-red-500">
                    {errors.firstname.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastname">Last Name</Label>
                <Input
                  id="edit-lastname"
                  {...register("lastname")}
                  className={errors.lastname ? "border-red-500" : ""}
                  placeholder="Enter last name"
                />
                {errors.lastname && (
                  <p className="text-sm text-red-500">
                    {errors.lastname.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  {...register("email")}
                  placeholder="Enter email"
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  {...register("phone")}
                  className={errors.phone ? "border-red-500" : ""}
                  placeholder="Enter phone number"
                />
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-subject">Subject</Label>
              <Input
                id="edit-subject"
                {...register("subject")}
                placeholder="Enter subject"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-message">Message</Label>
              <textarea
                id="edit-message"
                rows={4}
                {...register("message")}
                className={`w-full rounded-md border px-3 py-2 text-sm ${
                  errors.message ? "border-red-500" : ""
                }`}
                placeholder="Enter message"
              />
              {errors.message && (
                <p className="text-sm text-red-500">{errors.message.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateOrder.isPending}
                className="bg-[#f8610e] hover:bg-[#f8610e]/90"
              >
                {updateOrder.isPending ? "Updating..." : "Update Order"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this order? This action cannot be
              undone.
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
              disabled={deleteOrder.isPending}
            >
              {deleteOrder.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
export default Order;