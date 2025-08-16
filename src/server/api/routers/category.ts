// ~/server/api/routers/categories.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const categoriesRouter = createTRPCRouter({
  // Create new category
  create: publicProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return await db.category.create({
        data: {
          name: input.name,
        },
      });
    }),

  // Get all categories with search
  getAll: publicProcedure
    .input(z.object({ search: z.string().optional() }))
    .query(async ({ input }) => {
      return await db.category.findMany({
        where: {
          name: {
            contains: input.search,
            mode: "insensitive",
          },
        },
        orderBy: {
          name: "asc",
        },
      });
    }),

  // Delete category
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await db.category.delete({
        where: { id: input.id },
      });
    }),
});
