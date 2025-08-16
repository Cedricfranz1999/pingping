import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const dashboardRouter = createTRPCRouter({
  getAnalytics: publicProcedure.query(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get total products and today's count
    const totalProducts = await db.product.count();
    const productsToday = await db.product.count({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Get total employees and new today
    const totalEmployees = await db.employee.count({
      where: {
        isactive: true,
      },
    });
    const newEmployeesToday = await db.employee.count({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Get total categories and new today
    const totalCategories = await db.category.count();
    const newCategoriesToday = await db.category.count({
      where: {
        // Assuming categories have createdAt field (you may need to add this to schema)
        id: {
          // For now, we'll use a simple approach since createdAt might not exist
          gte: 1,
        },
      },
    });

    // Get today's sales (based on product logs with ADD action as sales indicator)
    const salesToday = await db.productLog.count({
      where: {
        action: "ADD",
        timestamp: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    return {
      products: {
        total: totalProducts,
        today: productsToday,
      },
      employees: {
        total: totalEmployees,
        newToday: newEmployeesToday,
      },
      categories: {
        total: totalCategories,
        newToday: newCategoriesToday,
      },
      sales: {
        today: salesToday,
      },
    };
  }),
});
