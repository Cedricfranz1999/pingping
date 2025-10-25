import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

const coerceEmptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const digitsOnly = (v: unknown) =>
  typeof v === "string" ? v.replace(/\D+/g, "") : v;

const orderBodySchema = z.object({
  firstname: z.string().trim().min(1),
  lastname: z.string().trim().min(1),
  email: z.preprocess(coerceEmptyToUndefined, z.string().email().optional()),
  phone: z.preprocess(digitsOnly, z.string().length(11, "Phone must be 11 digits")),
  subject: z.preprocess(coerceEmptyToUndefined, z.string().trim().optional()),
  message: z.string().trim().min(1),
});

export const ordersRouter = createTRPCRouter({
  // Create new order
  create: publicProcedure
    .input(orderBodySchema)
    .mutation(async ({ input }) => {
      return await db.order.create({
        data: {
          firstname: input.firstname,
          lastname: input.lastname,
          email: input.email,
          subject: input.subject,
          message: input.message,
          phone: input.phone,
        },
      });
    }),

  // Get all orders with search and pagination
  getAll: publicProcedure
    .input(
      z
        .object({
          search: z.preprocess(coerceEmptyToUndefined, z.string().optional()),
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(100).default(10),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const search = input?.search;
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 10;

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
    .input(orderBodySchema.extend({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await db.order.update({
        where: { id: input.id },
        data: {
          firstname: input.firstname,
          lastname: input.lastname,
          email: input.email,
          subject: input.subject,
          message: input.message,
          phone: input.phone,
        },
      });
    }),

  // Toggle order status
  toggleStatus: publicProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      return await db.order.update({
        where: { id: input.id },
        data: {
          status: input.status,
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
