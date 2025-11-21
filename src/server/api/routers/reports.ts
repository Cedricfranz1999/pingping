// productReports.ts (router)
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";

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
          product: { select: { id: true, name: true, image: true } },
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

  exportProductsPDF: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
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
        include: { categories: { include: { category: true } } },
        orderBy: { name: "asc" },
      });

      const pdf = await PDFDocument.create();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
      const pageMargin = 40;
      const pageWidth = 595.28; // A4 width
      const pageHeight = 841.89; // A4 height

      const embedLogo = (() => {
        let cached: any | null = null;
        return async () => {
          if (cached !== null) return cached;
          try {
            const logoPath = path.resolve(process.cwd(), "public", "logo.png");
            const bytes = fs.readFileSync(logoPath);
            cached = await pdf.embedPng(bytes);
          } catch {
            cached = undefined;
          }
          return cached;
        };
      })();

      const addHeader = async (page: any) => {
        const businessName = "Ping-Ping's Tinapa";
        const systemTitle = "PING-PINGS TINAPA CONTENT MANAGEMENT SYSTEM WITH QR-CODE";
        // Thin accent line across the top
        page.drawRectangle({ x: 0, y: pageHeight - 8, width: pageWidth, height: 2, color: rgb(0.973, 0.38, 0.055) });

        // Logo at the very top center inside a circular badge
        const logo = await embedLogo();
        const diameter = 56;
        const centerX = pageWidth / 2;
        // Place circle very near the top
        const centerY = pageHeight - 20 - diameter / 2;
        // Outer ring
        page.drawEllipse({ x: centerX, y: centerY, xScale: diameter / 2 + 2, yScale: diameter / 2 + 2, color: rgb(0.973, 0.38, 0.055) });
        // Inner fill
        page.drawEllipse({ x: centerX, y: centerY, xScale: diameter / 2, yScale: diameter / 2, color: rgb(1, 1, 1) });
        if (logo) {
          const padding = 6;
          const target = diameter - padding * 2;
          const scale = Math.min(target / logo.width, target / logo.height);
          const w = logo.width * scale;
          const h = logo.height * scale;
          page.drawImage(logo, { x: centerX - w / 2, y: centerY - h / 2, width: w, height: h });
        }

        // Business name just below the logo
        let y = centerY - diameter / 2 - 8;
        const nameSize = 13;
        const nameWidth = fontBold.widthOfTextAtSize(businessName, nameSize);
        page.drawText(businessName, { x: (pageWidth - nameWidth) / 2, y: y - nameSize, size: nameSize, font: fontBold, color: rgb(0.08,0.08,0.08) });
        y -= nameSize + 4;

        // System title
        const sysSize = 10.5;
        const sysWidth = font.widthOfTextAtSize(systemTitle, sysSize);
        page.drawText(systemTitle, { x: (pageWidth - sysWidth) / 2, y: y - sysSize, size: sysSize, font, color: rgb(0.2,0.2,0.2) });
        y -= sysSize + 6;

        // Report title and generated
        const reportTitle = "Products Report";
        const reportSize = 12;
        const reportWidth = font.widthOfTextAtSize(reportTitle, reportSize);
        page.drawText(reportTitle, { x: (pageWidth - reportWidth) / 2, y: y - reportSize, size: reportSize, font, color: rgb(0.25,0.25,0.25) });
        y -= reportSize + 4;

        const gen = `Generated: ${new Date().toLocaleString()}`;
        const genSize = 9;
        const genWidth = font.widthOfTextAtSize(gen, genSize);
        page.drawText(gen, { x: (pageWidth - genWidth) / 2, y: y - genSize, size: genSize, font, color: rgb(0.35,0.35,0.35) });
      };

      const addTableHeader = (page: any, y: number) => {
        const headers = ["ID", "Name", "Stock", "Price", "Created"] as const;
        const cols = [40, 260, 60, 70, 120] as const;
        let x = pageMargin;
        for (let i = 0; i < headers.length; i++) {
          const h = headers[i];
          page.drawText(h, { x, y, size: 10, font: fontBold });
          x += cols[i]!;
        }
        return [...cols];
      };

      let page = pdf.addPage([pageWidth, pageHeight]);
      await addHeader(page);
      let y = pageHeight - 190; // extra spacing below header
      const cols = addTableHeader(page, y);
      y -= 16;

      const drawRow = (p: any) => {
        const c0 = 40, c1 = 260, c2 = 60, c3 = 70, c4 = 120;
        const colX = [pageMargin, pageMargin + c0, pageMargin + c0 + c1, pageMargin + c0 + c1 + c2, pageMargin + c0 + c1 + c2 + c3];
        const created = p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "";
        const name = p.name?.toString() ?? "";
        const nameMax = 40;
        const nameTrim = name.length > nameMax ? name.slice(0, nameMax - 1) + "…" : name;
        page.drawText(String(p.id ?? ""), { x: colX[0], y, size: 9, font });
        page.drawText(nameTrim, { x: colX[1], y, size: 9, font });
        page.drawText(String(p.stock ?? ""), { x: colX[2], y, size: 9, font });
        page.drawText(String(p.price ?? ""), { x: colX[3], y, size: 9, font });
        page.drawText(created, { x: colX[4], y, size: 9, font });
      };

      for (const p of products) {
        if (y < pageMargin + 80) {
          page = pdf.addPage([pageWidth, pageHeight]);
          await addHeader(page);
          y = pageHeight - 190;
          addTableHeader(page, y);
          y -= 16;
        }
        drawRow(p);
        y -= 14;
      }

      const pdfBytes = await pdf.save();
      const base64 = Buffer.from(pdfBytes).toString("base64");
      return { pdfBase64: base64, filename: `products-${new Date().toISOString().slice(0,10)}.pdf` };
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
