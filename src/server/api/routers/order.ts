import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const ordersRouter = createTRPCRouter({
  // Create new order
  create: publicProcedure
    .input(
      z.object({
        firstname: z.string().min(1),
        lastname: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().min(11).max(11),
        subject: z.string().optional(),
        message: z.string().min(1), // lowercase
      }),
    )
    .mutation(async ({ input }) => {
      return await db.order.create({
        data: {
          firstname: input.firstname,
          lastname: input.lastname,
          email: input.email,
          subject: input.subject,
          message: input.message, // lowercase
          phone: input.phone,
        },
      });
    }),

  // Get all orders with search and pagination
  getAll: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
      }),
    )
    .query(async ({ input }) => {
      const { search, page, limit } = input;

      const where: Prisma.OrderWhereInput = search
        ? {
            OR: [
              { firstname: { contains: search, mode: "insensitive" } },
              { lastname: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { subject: { contains: search, mode: "insensitive" } },
            ],
          }
        : {};

      const [orders, total] = await Promise.all([
        db.order.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { id: "desc" },
        }),
        db.order.count({ where }),
      ]);

      return {
        orders,
        total,
        totalPages: Math.ceil(total / limit),
      };
    }),

  // Get single order by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.order.findUnique({
        where: { id: input.id },
      });
    }),

  // Update order
  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        firstname: z.string().min(1),
        lastname: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().min(11).max(11),
        subject: z.string().optional(),
        message: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      return await db.order.update({
        where: { id: input.id },
        data: {
          firstname: input.firstname,
          lastname: input.lastname,
          email: input.email,
          subject: input.subject,
          message: input.message,
        },
      });
    }),

  // Delete order
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await db.order.delete({
        where: { id: input.id },
      });
    }),
});
