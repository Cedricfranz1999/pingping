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
        star: z.number().min(1).max(6),
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
        minStars: z.number().min(1).max(6).optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
      }),
    )
    .query(async ({ input }) => {
      const { search, minStars, page, limit } = input;

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
          minStars !== 6 ? { star: { gte: minStars } } : {},
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
});
