import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { subDays } from "date-fns";

export const ordersRouter = createTRPCRouter({
  // Create new order (acts as "inquiry" from your site form)
  create: publicProcedure
    .input(
      z.object({
        firstname: z.string().min(1),
        lastname: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().min(11).max(11),
        subject: z.string().optional(),
        message: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      return db.order.create({
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

  // Get all orders with search + pagination (admin Orders page)
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
              { lastname:  { contains: search, mode: "insensitive" } },
              { email:     { contains: search, mode: "insensitive" } },
              { subject:   { contains: search, mode: "insensitive" } },
              { phone:     { contains: search, mode: "insensitive" } },
              { message:   { contains: search, mode: "insensitive" } },
            ],
          }
        : {};

      const [orders, total] = await Promise.all([
        db.order.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        db.order.count({ where }),
      ]);

      return {
        orders,
        total,
        totalPages: Math.ceil(total / limit),
      };
    }),

  // 🔸 Dashboard "Recent Inquiries" (reads from Orders; last 7 days, top 5, plus total)
  getDashboardInquiries: publicProcedure.query(async () => {
    const since = subDays(new Date(), 7);

    const where: Prisma.OrderWhereInput = {
      createdAt: { gte: since },
    };

    const [data, total] = await db.$transaction([
      db.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      db.order.count({ where }),
    ]);

    return { data, total };
  }),

  // Get single order by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.order.findUnique({ where: { id: input.id } });
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
      return db.order.update({
        where: { id: input.id },
        data: {
          firstname: input.firstname,
          lastname: input.lastname,
          email: input.email,
          phone: input.phone,
          subject: input.subject,
          message: input.message,
        },
      });
    }),

  // Toggle order status
  toggleStatus: publicProcedure
    .input(z.object({ id: z.number(), status: z.boolean() }))
    .mutation(async ({ input }) => {
      return db.order.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  // Delete order
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return db.order.delete({ where: { id: input.id } });
    }),
});
