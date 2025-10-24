// productReports.ts (router)
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const productReportsRouter = createTRPCRouter({
  getProducts: publicProcedure
    .input(
      z.object({
        skip: z.number().optional(),
        take: z.number().optional(),
        search: z.string().optional(),
        // keep stockFilter in the schema (to avoid FE errors) but ignore it below
        stockFilter: z.enum(["all", "low", "out"]).optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        categoryId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const whereConditions: any = {};

      // Search filter
      if (input.search) {
        whereConditions.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { description: { contains: input.search, mode: "insensitive" } },
        ];
      }

      // ✅ Stock filter is now ignored on purpose
      // if (input.stockFilter === "low") { ... }
      // else if (input.stockFilter === "out") { ... }

      // Date filter
      if (input.dateFrom || input.dateTo) {
        whereConditions.createdAt = {};
        if (input.dateFrom) whereConditions.createdAt.gte = input.dateFrom;
        if (input.dateTo) whereConditions.createdAt.lte = input.dateTo;
      }

      // Category filter
      if (input.categoryId) {
        whereConditions.categories = {
          some: { categoryId: input.categoryId },
        };
      }

      const total = await ctx.db.product.count({ where: whereConditions });

      const data = await ctx.db.product.findMany({
        where: whereConditions,
        skip: input.skip,
        take: input.take,
        include: {
          categories: {
            include: { category: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return { data, total };
    }),

  getActivityLogs: publicProcedure
    .input(
      z.object({
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        action: z.enum(["ADD", "EDIT", "DELETE"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const whereConditions: any = {};

      if (input.dateFrom || input.dateTo) {
        whereConditions.timestamp = {};
        if (input.dateFrom) whereConditions.timestamp.gte = input.dateFrom;
        if (input.dateTo) whereConditions.timestamp.lte = input.dateTo;
      }

      if (input.action) {
        whereConditions.action = input.action;
      }

      return ctx.db.productLog.findMany({
        where: whereConditions,
        include: {
          product: true,
          employee: {
            select: {
              id: true,
              firstname: true,
              middlename: true,
              lastname: true,
              username: true,
            },
          },
        },
        orderBy: { timestamp: "desc" },
      });
    }),

  getChartData: publicProcedure
    .input(
      z.object({
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const whereConditions: any = {};

      if (input.dateFrom || input.dateTo) {
        whereConditions.createdAt = {};
        if (input.dateFrom) whereConditions.createdAt.gte = input.dateFrom;
        if (input.dateTo) whereConditions.createdAt.lte = input.dateTo;
      }

      // Stock chart data - top 10 products by stock
      const products = await ctx.db.product.findMany({
        where: whereConditions,
        select: { id: true, name: true, stock: true },
        orderBy: { stock: "desc" },
        take: 10,
      });

      const stockChart = products.map((product) => ({
        id: product.id,
        name:
          product.name.length > 15
            ? `${product.name.substring(0, 15)}...`
            : product.name,
        stock: product.stock,
      }));

      // Category distribution chart
      const categoryData = await ctx.db.category.findMany({
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              products: { where: whereConditions },
            },
          },
        },
      });

      const categoryChart = categoryData.map((category) => ({
        id: category.id,
        name: category.name,
        count: category._count.products,
      }));

      return { stockChart, categoryChart };
    }),

  getCategories: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }),

  getStockSummary: publicProcedure.query(async ({ ctx }) => {
    const totalProducts = await ctx.db.product.count();
    const lowStockCount = await ctx.db.product.count({
      where: { stock: { lte: 10, gt: 0 } },
    });
    const outOfStockCount = await ctx.db.product.count({
      where: { stock: 0 },
    });
    const recentActivities = await ctx.db.productLog.count({
      where: {
        timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    return {
      totalProducts,
      lowStockCount,
      outOfStockCount,
      recentActivities,
    };
  }),

  exportProductsCSV: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        // keep but ignore stockFilter here too
        stockFilter: z.enum(["all", "low", "out"]).optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        categoryId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const whereConditions: any = {};

      if (input.search) {
        whereConditions.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { description: { contains: input.search, mode: "insensitive" } },
        ];
      }

      // ✅ Stock filter ignored here as well

      if (input.dateFrom || input.dateTo) {
        whereConditions.createdAt = {};
        if (input.dateFrom) whereConditions.createdAt.gte = input.dateFrom;
        if (input.dateTo) whereConditions.createdAt.lte = input.dateTo;
      }

      if (input.categoryId) {
        whereConditions.categories = {
          some: { categoryId: input.categoryId },
        };
      }

      const products = await ctx.db.product.findMany({
        where: whereConditions,
        include: {
          categories: { include: { category: true } },
        },
        orderBy: { name: "asc" },
      });

      const headers = [
        "ID",
        "Name",
        "Description",
        "Stock",
        "Price",
        "Categories",
        "Created At",
        "Updated At",
      ];

      const csvRows = [
        headers.join(","),
        ...products.map((product) =>
          [
            product.id,
            `"${product.name.replace(/"/g, '""')}"`,
            `"${product.description.replace(/"/g, '""')}"`,
            product.stock,
            `"${product.price}"`,
            `"${product.categories.map((c) => c.category.name).join(", ")}"`,
            product.createdAt.toISOString(),
            product.updatedAt.toISOString(),
          ].join(",")
        ),
      ];

      return { csv: csvRows.join("\n") };
    }),

  exportActivityCSV: publicProcedure
    .input(
      z.object({
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        action: z.enum(["ADD", "EDIT", "DELETE"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const whereConditions: any = {};

      if (input.dateFrom || input.dateTo) {
        whereConditions.timestamp = {};
        if (input.dateFrom) whereConditions.timestamp.gte = input.dateFrom;
        if (input.dateTo) whereConditions.timestamp.lte = input.dateTo;
      }

      if (input.action) {
        whereConditions.action = input.action;
      }

      const logs = await ctx.db.productLog.findMany({
        where: whereConditions,
        include: {
          product: { select: { id: true, name: true } },
          employee: { select: { id: true, firstname: true, lastname: true } },
        },
        orderBy: { timestamp: "desc" },
      });

      const headers = [
        "ID",
        "Action",
        "Product ID",
        "Product Name",
        "Employee",
        "Old Stock",
        "New Stock",
        "Old Price",
        "New Price",
        "Timestamp",
      ];

      const csvRows = [
        headers.join(","),
        ...logs.map((log) =>
          [
            log.id,
            log.action,
            log.productId,
            `"${log.product.name.replace(/"/g, '""')}"`,
            `"${log.employee.firstname} ${log.employee.lastname}"`,
            log.oldStock ?? "",
            log.newStock ?? "",
            log.oldPrice ?? "",
            log.newPrice ?? "",
            log.timestamp.toISOString(),
          ].join(",")
        ),
      ];

      return { csv: csvRows.join("\n") };
    }),
});
