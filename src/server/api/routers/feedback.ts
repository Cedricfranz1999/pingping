import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import type { Prisma } from "@prisma/client";

export const feedbackRouter = createTRPCRouter({
  // Create new feedback
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        address: z.string().min(1),
        contact: z.string().min(1),
        star: z.number().min(1).max(5), // stars are 1..5 in DB
        feedback: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      return await db.feedback.create({ data: input });
    }),

  // Get all feedback with filters + pagination
  getAll: publicProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          // for filters, you previously used "6 == All"
          // we'll still accept 1..6 here for compatibility
          minStars: z.number().min(1).max(6).optional(),
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(100).default(10),
        })
        .default({ page: 1, limit: 10 }),
    )
    .query(async ({ input }) => {
      const { search, minStars, page, limit } = input;

      const where: Prisma.FeedbackWhereInput = {
        AND: [
          search
            ? {
                OR: [
                  { name:     { contains: search, mode: "insensitive" } },
                  { email:    { contains: search, mode: "insensitive" } },
                  { feedback: { contains: search, mode: "insensitive" } },
                ],
              }
            : {},
          minStars !== undefined && minStars !== 6
            ? { star: { gte: Math.min(5, Math.max(1, minStars)) } }
            : {},
        ].filter(Boolean) as Prisma.FeedbackWhereInput[],
      };

      const [feedbacks, total] = await Promise.all([
        db.feedback.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.feedback.count({ where }),
      ]);

      return {
        feedbacks,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  // CSV export
  exportCSV: publicProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          minStars: z.number().min(1).max(6).optional(), // 6 == All
        })
        .optional(),
    )
    .mutation(async ({ input }) => {
      const search = input?.search;
      const minStars = input?.minStars;

      const where: Prisma.FeedbackWhereInput = {
        AND: [
          search
            ? {
                OR: [
                  { name:     { contains: search, mode: "insensitive" } },
                  { email:    { contains: search, mode: "insensitive" } },
                  { feedback: { contains: search, mode: "insensitive" } },
                ],
              }
            : {},
          minStars !== undefined && minStars !== 6
            ? { star: { gte: Math.min(5, Math.max(1, minStars)) } }
            : {},
        ].filter(Boolean) as Prisma.FeedbackWhereInput[],
      };

      const rows = await db.feedback.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      const quote = (v: unknown) => {
        const s = String(v ?? "");
        return s.includes(",") || s.includes("\n") || s.includes('"')
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      };

      const header = ["ID","Name","Email","Contact","Address","Stars","Feedback","CreatedAt"];
      const csv = [
        header.join(","),
        ...rows.map((r) =>
          [
            r.id,
            quote(r.name),
            quote(r.email),
            quote(r.contact ?? ""),
            quote(r.address ?? ""),
            r.star ?? "",
            quote(r.feedback ?? ""),
            r.createdAt.toISOString(),
          ].join(","),
        ),
      ].join("\n");

      return { csv };
    }),

  // ✅ NEW: summary (average & count across ALL feedback)
  // Accepts optional {} so `useQuery({})` or `useQuery()` both work.
  getSummary: publicProcedure
    .input(
      z
        .object({
          // optional filter if you ever need it
          minStars: z.number().min(1).max(5).optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const where: Prisma.FeedbackWhereInput =
        input?.minStars
          ? { star: { gte: input.minStars } }
          : {};

      const [count, agg] = await Promise.all([
        db.feedback.count({ where }),
        db.feedback.aggregate({
          where,
          _avg: { star: true },
        }),
      ]);

      return {
        count,
        average: agg._avg.star ?? 0,
      };
    }),

  // Delete feedback
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await db.feedback.delete({ where: { id: input.id } });
    }),
});
