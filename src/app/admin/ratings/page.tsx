"use client";

import Image from "next/image";
import { api, type RouterOutputs } from "~/trpc/react";
import { Star } from "lucide-react";
import { useState } from "react";

const StarRow = ({ average }: { average: number }) => {
  const full = Math.floor(average);
  const stars = Array.from({ length: 5 }, (_, i) => i < full);
  return (
    <div className="flex items-center">
      {stars.map((filled, idx) => (
        <Star key={idx} className={filled ? "h-4 w-4 text-yellow-500 fill-yellow-500" : "h-4 w-4 text-gray-300"} />
      ))}
      <span className="ml-2 text-sm text-gray-600">{average.toFixed(1)}</span>
    </div>
  );
};

type AllRatings = RouterOutputs['product']['getAllRatings'];
type RatingItem = AllRatings['ratings'][number];

export default function AdminRatingsPage() {
  const [page, setPage] = useState(1);
  const limit = 20;
  const { data, isLoading } = api.product.getAllRatings.useQuery({ page, limit });

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Product Ratings</h1>
        <div className="text-sm text-gray-500">
          Total: {data?.pagination.total ?? 0}
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">Loading ratings…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Rating</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Comment</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {data?.ratings.map((r: RatingItem) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 overflow-hidden rounded-md bg-gray-100">
                        <Image src={r.product?.image || "/placeholder.svg"} alt={r.product?.name || "product"} fill unoptimized className="object-cover" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{r.product?.name}</div>
                        <div className="text-xs text-gray-500">ID: {r.productId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StarRow average={r.rating} />
                      <span className="text-sm text-gray-600">({r.rating})</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{r.comment ?? ""}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{new Date(r.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.pagination.totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
          >
            Prev
          </button>
          <div className="text-sm text-gray-600">Page {page} of {data.pagination.totalPages}</div>
          <button
            onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
            disabled={page === data.pagination.totalPages}
            className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
