// ~/server/api/routers/feedback.ts
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
        // Enforce 1-5 star ratings for creation
        star: z.number().min(1).max(5),
        feedback: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      return await db.feedback.create({
        data: input,
      });
    }),

  // Get all feedback with filters
  getAll: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        // Backward compat: keep minStars for existing callers (interpreted as >=)
        minStars: z.number().min(1).max(6).optional(),
        // New: exact stars filter (1-5)
        stars: z.number().min(1).max(5).optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      }),
    )
    .query(async ({ input }) => {
      const { search, minStars, stars, page, limit, dateFrom, dateTo } = input;

      // Build date range normalized to day boundaries
      let createdAtFilter: Prisma.DateTimeFilter | undefined = undefined;
      if (dateFrom) {
        const start = new Date(
          dateFrom.getFullYear(),
          dateFrom.getMonth(),
          dateFrom.getDate(),
          0,
          0,
          0,
          0,
        );
        const endBase = dateTo ?? dateFrom;
        const end = new Date(
          endBase.getFullYear(),
          endBase.getMonth(),
          endBase.getDate() + 1,
          0,
          0,
          0,
          0,
        );
        createdAtFilter = { gte: start, lt: end };
      }

      const where: Prisma.FeedbackWhereInput = {
        AND: [
          search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                  { feedback: { contains: search, mode: "insensitive" } },
                ],
              }
            : {},
          stars ? { star: { equals: stars } } : {},
          !stars && minStars !== 6 ? { star: { gte: minStars } } : {},
          createdAtFilter ? { createdAt: createdAtFilter } : {},
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

  // Delete feedback
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await db.feedback.delete({
        where: { id: input.id },
      });
    }),

  // Export feedback as CSV (legacy consumer compatibility)
  exportCSV: publicProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          minStars: z.number().min(1).max(6).optional(),
          // Export supports exact star filter 1-5
          stars: z.number().min(1).max(5).optional(),
          dateFrom: z.date().optional(),
          dateTo: z.date().optional(),
        })
        .optional(),
    )
    .mutation(async ({ input }) => {
      // Build date range if provided
      let createdAtFilter: Prisma.DateTimeFilter | undefined = undefined;
      if (input?.dateFrom) {
        const start = new Date(
          input.dateFrom.getFullYear(),
          input.dateFrom.getMonth(),
          input.dateFrom.getDate(),
          0,
          0,
          0,
          0,
        );
        const endBase = input.dateTo ?? input.dateFrom;
        const end = new Date(
          endBase.getFullYear(),
          endBase.getMonth(),
          endBase.getDate() + 1,
          0,
          0,
          0,
          0,
        );
        createdAtFilter = { gte: start, lt: end };
      }

      const where: Prisma.FeedbackWhereInput = {
        AND: [
          input?.search
            ? {
                OR: [
                  { name: { contains: input.search, mode: "insensitive" } },
                  { email: { contains: input.search, mode: "insensitive" } },
                  { address: { contains: input.search, mode: "insensitive" } },
                  { contact: { contains: input.search, mode: "insensitive" } },
                  { feedback: { contains: input.search, mode: "insensitive" } },
                ],
              }
            : {},
          input?.stars ? { star: { equals: input.stars } } : {},
          !input?.stars && input?.minStars && input.minStars !== 6
            ? { star: { gte: input.minStars } }
            : {},
          createdAtFilter ? { createdAt: createdAtFilter } : {},
        ].filter(Boolean) as Prisma.FeedbackWhereInput[],
      };

      const rowsDb = await db.feedback.findMany({ where, orderBy: { createdAt: "desc" } });
      const headers = [
        "ID",
        "Name",
        "Email",
        "Address",
        "Contact",
        "Stars",
        "Feedback",
        "Created At",
      ];
      const rows = [
        headers.join(","),
        ...rowsDb.map((f) =>
          [
            f.id,
            `"${(f.name ?? "").replace(/\"/g, '""')}"`,
            `"${(f.email ?? "").replace(/\"/g, '""')}"`,
            `"${(f.address ?? "").replace(/\"/g, '""')}"`,
            `"${(f.contact ?? "").replace(/\"/g, '""')}"`,
            f.star,
            `"${(f.feedback ?? "").replace(/\"/g, '""')}"`,
            f.createdAt.toISOString(),
          ].join(","),
        ),
      ];
      return { csv: rows.join("\n") };
    }),
});
