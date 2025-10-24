// ~/src/app/admin/feedback/page.tsx
"use client";
import { useState } from "react";
import { type NextPage } from "next";
import Head from "next/head";
import { Search, Star, Trash2, Eye } from "lucide-react"; // ⬅️ Eye added
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

type FeedbackRow = {
  id: number;
  name: string;
  email: string | null;
  contact: string | null;
  address: string | null;
  star: number;
  feedback: string;
  createdAt: Date | string;
};

const FeedbackPage: NextPage = () => {
  const [search, setSearch] = useState("");
  const [minStars, setMinStars] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // View modal state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedViewFeedback, setSelectedViewFeedback] = useState<FeedbackRow | null>(null);

  const { data: feedbackData, refetch } = api.feedback.getAll.useQuery({
    search,
    minStars: minStars ?? undefined,
    page,
    limit,
  });

  const deleteFeedback = api.feedback.delete.useMutation({
    onSuccess: () => {
      void refetch();
      setIsDeleteModalOpen(false);
    },
  });

  const handleDelete = () => {
    if (selectedFeedback) {
      deleteFeedback.mutate({ id: selectedFeedback.id });
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
          />
        ))}
      </div>
    );
  };

  const formatDateTime = (d: Date | string) =>
    new Date(d).toLocaleString();

  return (
    <>
      <Head>
        <title>Feedback Management</title>
        <meta name="description" content="Manage customer feedback" />
      </Head>

      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[#f8610e] md:text-3xl">
          Customer Feedback
        </h1>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
            <Input
              placeholder="Search feedback..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>

          <Select
            value={minStars?.toString() ?? ""}
            onValueChange={(value) => {
              setMinStars(value ? parseInt(value) : null);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">All Ratings</SelectItem>
              <SelectItem value="5">5 Stars</SelectItem>
              <SelectItem value="4">4+ Stars</SelectItem>
              <SelectItem value="3">3+ Stars</SelectItem>
              <SelectItem value="2">2+ Stars</SelectItem>
              <SelectItem value="1">1+ Stars</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={limit.toString()}
            onValueChange={(value) => {
              setLimit(Number(value));
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Items per page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">Show 10</SelectItem>
              <SelectItem value="25">Show 25</SelectItem>
              <SelectItem value="50">Show 50</SelectItem>
              <SelectItem value="100">Show 100</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Feedback</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedbackData?.feedbacks.map((feedback: FeedbackRow) => (
                <TableRow key={feedback.id}>
                  <TableCell>
                    <div className="font-medium">{feedback.name}</div>
                    <div className="text-muted-foreground text-sm">
                      {feedback.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>{feedback.contact}</div>
                    <div className="text-muted-foreground text-sm">
                      {feedback.address}
                    </div>
                  </TableCell>
                  <TableCell>{renderStars(feedback.star)}</TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {feedback.feedback}
                  </TableCell>
                  <TableCell>
                    {new Date(feedback.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="flex items-center justify-end gap-1">
                    {/* View button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedViewFeedback(feedback);
                        setIsViewModalOpen(true);
                      }}
                      className="hover:bg-[#f8610e]/10"
                      aria-label="View feedback"
                      title="View feedback"
                    >
                      <Eye className="h-4 w-4 text-[#f8610e]" />
                    </Button>

                    {/* Delete button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedFeedback({
                          id: feedback.id,
                          name: feedback.name,
                        });
                        setIsDeleteModalOpen(true);
                      }}
                      className="hover:bg-red-100"
                      aria-label="Delete feedback"
                      title="Delete feedback"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {feedbackData && feedbackData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-muted-foreground text-sm">
              Showing {(page - 1) * limit + 1} to{" "}
              {Math.min(page * limit, feedbackData.pagination.total)} of{" "}
              {feedbackData.pagination.total} feedbacks
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={page === feedbackData.pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* View Feedback Dialog */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="text-[#f8610e]">
              Feedback from {selectedViewFeedback?.name}
            </DialogTitle>
            <DialogDescription>
              Submitted on{" "}
              {selectedViewFeedback
                ? formatDateTime(selectedViewFeedback.createdAt)
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm">{selectedViewFeedback?.email || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Contact</p>
                <p className="text-sm">{selectedViewFeedback?.contact || "—"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="text-sm">{selectedViewFeedback?.address || "—"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-muted-foreground">Rating</p>
                <div className="mt-1">{renderStars(selectedViewFeedback?.star ?? 0)}</div>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Message</p>
              <div className="mt-1 rounded-md border bg-white p-3 text-sm leading-relaxed">
                <p className="whitespace-pre-line">
                  {selectedViewFeedback?.feedback}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsViewModalOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Feedback Dialog */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Feedback</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete feedback from{" "}
              <span className="font-semibold">{selectedFeedback?.name}</span>? This action cannot be undone.
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
              disabled={deleteFeedback.isPending}
            >
              {deleteFeedback.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FeedbackPage;
