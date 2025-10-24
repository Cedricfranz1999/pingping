// ~/app/admin/inquiry/page.tsx  (or wherever your Orders page lives)
"use client";
import { useState } from "react";
import { type NextPage } from "next";
import Head from "next/head";
import { Eye, Plus, Search, Trash2, Check, X } from "lucide-react";
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

const Order: NextPage = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
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
    createdAt?: Date;
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

  const handleDelete = () => {
    if (selectedOrder) {
      deleteOrder.mutate({ id: selectedOrder.id });
    }
  };

  const handleToggleStatus = (id: number, currentStatus: boolean) => {
    toggleStatus.mutate({ id, status: !currentStatus });
  };

  const openViewModal = (order: typeof selectedOrder) => {
    if (order) {
      setSelectedOrder(order);
      setIsViewModalOpen(true);
    }
  };

  return (
    <>
      <Head>
        <title>Orders / Inquiries</title>
        <meta name="description" content="View customer inquiries (orders)" />
      </Head>

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-[#f8610e] md:text-3xl">
            Inquiries
          </h1>
          {/* <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-[#f8610e] hover:bg-[#f8610e]/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Inquiry
          </Button> */}
        </div>

       <div className="relative w-64">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          aria-label="Search inquiries"
          placeholder="Search inquiries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 pl-10 text-sm"
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
                    <TableCell>{order.email ?? "—"}</TableCell>
                    <TableCell>{order.phone}</TableCell>
                    <TableCell>{order.subject ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={order.status ? "default" : "secondary"}
                        className={
                          order.status
                            ? "bg-green-500 hover:bg-green-600"
                            : "bg-red-500 text-white hover:bg-gray-600"
                        }
                      >
                        {order.status ? "Actioned" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleToggleStatus(order.id, order.status)
                        }
                        className={
                          order.status
                            ? "hover:bg-gray-100"
                            : "hover:bg-green-100"
                        }
                        title={order.status ? "Mark as Pending" : "Mark as Actioned"}
                      >
                        {order.status ? (
                          <X className="h-4 w-4 text-gray-600" />
                        ) : (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                      </Button>

                      {/* View-only modal trigger */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openViewModal(order)}
                        title="View"
                      >
                        <Eye className="h-4 w-4 text-blue-600" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsDeleteModalOpen(true);
                        }}
                        className="hover:bg-red-100"
                        title="Delete"
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
                    No inquiries found
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
              inquiries
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

      {/* Create Inquiry Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-[#f8610e]">Add New Inquiry</DialogTitle>
            <DialogDescription>Create a new customer inquiry</DialogDescription>
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
              <Input id="subject" {...register("subject")} placeholder="Subject" />
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
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createOrder.isPending}
                className="bg-[#f8610e] hover:bg-[#f8610e]/90"
              >
                {createOrder.isPending ? "Saving..." : "Save Inquiry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Inquiry Modal (read-only) */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-[#f8610e]">View Inquiry</DialogTitle>
            <DialogDescription>Read-only details</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <div className="mt-1 rounded-md border bg-gray-50 px-3 py-2 text-sm">
                  {selectedOrder?.firstname ?? "—"}
                </div>
              </div>
              <div>
                <Label>Last Name</Label>
                <div className="mt-1 rounded-md border bg-gray-50 px-3 py-2 text-sm">
                  {selectedOrder?.lastname ?? "—"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <div className="mt-1 truncate rounded-md border bg-gray-50 px-3 py-2 text-sm">
                  {selectedOrder?.email ?? "—"}
                </div>
              </div>
              <div>
                <Label>Phone</Label>
                <div className="mt-1 rounded-md border bg-gray-50 px-3 py-2 text-sm">
                  {selectedOrder?.phone ?? "—"}
                </div>
              </div>
            </div>

            <div>
              <Label>Subject</Label>
              <div className="mt-1 rounded-md border bg-gray-50 px-3 py-2 text-sm">
                {selectedOrder?.subject ?? "—"}
              </div>
            </div>

            <div>
              <Label>Message</Label>
              <div className="mt-1 whitespace-pre-wrap rounded-md border bg-gray-50 px-3 py-2 text-sm">
                {selectedOrder?.message ?? "—"}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                ID: {selectedOrder?.id ?? "—"}
              </div>
              <Badge
                variant={selectedOrder?.status ? "default" : "secondary"}
                className={
                  selectedOrder?.status
                    ? "bg-green-500"
                    : "bg-red-500 text-white"
                }
              >
                {selectedOrder?.status ? "Actioned" : "Pending"}
              </Badge>
            </div>

            <DialogFooter>
              <Button onClick={() => setIsViewModalOpen(false)} className="bg-[#f8610e] hover:bg-[#f8610e]/90">
                Close
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Inquiry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this inquiry? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
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
