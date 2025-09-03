// ~/server/api/routers/sales.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const salesRouter = createTRPCRouter({
  // Get delivered orders with sales data
  getDeliveredOrders: publicProcedure
    .input(z.object({ 
      search: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional()
    }))
    .query(async ({ input }) => {
      const whereClause: any = {
        status: "CONFIRMED"
      };

      // Add date filter if provided
      if (input.startDate || input.endDate) {
        whereClause.createdAt = {};
        if (input.startDate) {
          whereClause.createdAt.gte = new Date(input.startDate);
        }
        if (input.endDate) {
          whereClause.createdAt.lte = new Date(input.endDate);
        }
      }

      // Add search filter if provided
      if (input.search) {
        whereClause.OR = [
          {
            orderNumber: {
              contains: input.search,
              mode: "insensitive" as const,
            },
          },
          {
            user: {
              OR: [
                {
                  firstName: {
                    contains: input.search,
                    mode: "insensitive" as const,
                  },
                },
                {
                  lastName: {
                    contains: input.search,
                    mode: "insensitive" as const,
                  },
                },
              ],
            },
          },
        ];
      }

      const orders = await db.userOrder.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          orderItems: {
            include: {
              product: {
                select: {
                  name: true,
                  price: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Calculate total sales
      const totalSales = orders.reduce((sum, order) => sum + order.totalPrice, 0);

      return {
        orders,
        totalSales,
        orderCount: orders.length
      };
    }),

  // Get sales summary (daily, weekly, monthly)
  getSalesSummary: publicProcedure
    .query(async () => {
      const now = new Date();
      
      // Today's sales
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todaySales = await db.userOrder.aggregate({
        where: {
          status: "CONFIRMED",
          createdAt: {
            gte: todayStart
          }
        },
        _sum: {
          totalPrice: true
        },
        _count: true
      });

      // This week's sales (Monday to Sunday)
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
      weekStart.setHours(0, 0, 0, 0);
      
      const weekSales = await db.userOrder.aggregate({
        where: {
          status: "CONFIRMED",
          createdAt: {
            gte: weekStart
          }
        },
        _sum: {
          totalPrice: true
        },
        _count: true
      });

      // This month's sales
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthSales = await db.userOrder.aggregate({
        where: {
          status: "CONFIRMED",
          createdAt: {
            gte: monthStart
          }
        },
        _sum: {
          totalPrice: true
        },
        _count: true
      });

      return {
        today: {
          total: todaySales._sum.totalPrice || 0,
          count: todaySales._count || 0
        },
        week: {
          total: weekSales._sum.totalPrice || 0,
          count: weekSales._count || 0
        },
        month: {
          total: monthSales._sum.totalPrice || 0,
          count: monthSales._count || 0
        }
      };
    }),

  // Update order status to delivered
  markAsDelivered: publicProcedure
    .input(z.object({ 
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      return await db.userOrder.update({
        where: { id: input.id },
        data: {
          status: "CONFIRMED",
          updatedAt: new Date(),
        },
      });
    }),
});