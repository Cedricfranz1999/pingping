// ~/server/api/routers/feedback.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import type { Prisma } from "@prisma/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";

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
  remove: publicProcedure
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

  // Fetch all feedback for print/PDF (no pagination)
  getAllForExport: publicProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          // exact star filter 1-5
          stars: z.number().min(1).max(5).optional(),
          dateFrom: z.date().optional(),
          dateTo: z.date().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
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
          createdAtFilter ? { createdAt: createdAtFilter } : {},
        ].filter(Boolean) as Prisma.FeedbackWhereInput[],
      };

      const rowsDb = await db.feedback.findMany({ where, orderBy: { createdAt: "desc" } });
      return rowsDb;
    }),

  // Export feedback as PDF
  exportPDF: publicProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          stars: z.number().min(1).max(5).optional(),
          dateFrom: z.date().optional(),
          dateTo: z.date().optional(),
        })
        .optional(),
    )
    .mutation(async ({ input }) => {
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
          createdAtFilter ? { createdAt: createdAtFilter } : {},
        ].filter(Boolean) as Prisma.FeedbackWhereInput[],
      };

      const rowsDb = await db.feedback.findMany({ where, orderBy: { createdAt: "desc" } });

      const pdf = await PDFDocument.create();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
      const pageMargin = 40;
      const pageWidth = 595.28;
      const pageHeight = 841.89;

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
        // Accent line
        page.drawRectangle({ x: 0, y: pageHeight - 8, width: pageWidth, height: 2, color: rgb(0.973, 0.38, 0.055) });

        // Centered circular logo badge at the very top
        const logo = await embedLogo();
        const diameter = 56;
        const centerX = pageWidth / 2;
        const centerY = pageHeight - 20 - diameter / 2;
        page.drawEllipse({ x: centerX, y: centerY, xScale: diameter / 2 + 2, yScale: diameter / 2 + 2, color: rgb(0.973, 0.38, 0.055) });
        page.drawEllipse({ x: centerX, y: centerY, xScale: diameter / 2, yScale: diameter / 2, color: rgb(1, 1, 1) });
        if (logo) {
          const padding = 6;
          const target = diameter - padding * 2;
          const scale = Math.min(target / logo.width, target / logo.height);
          const w = logo.width * scale;
          const h = logo.height * scale;
          page.drawImage(logo, { x: centerX - w / 2, y: centerY - h / 2, width: w, height: h });
        }

        const businessName = "Ping-Ping's Tinapa";
        const systemTitle = "PING-PINGS TINAPA CONTENT MANAGEMENT SYSTEM WITH QR-CODE";
        let y = centerY - diameter / 2 - 8;
        const nameSize = 13;
        const nameWidth = fontBold.widthOfTextAtSize(businessName, nameSize);
        page.drawText(businessName, { x: (pageWidth - nameWidth) / 2, y: y - nameSize, size: nameSize, font: fontBold, color: rgb(0.08,0.08,0.08) });
        y -= nameSize + 4;
        const sysSize = 10.5;
        const sysWidth = font.widthOfTextAtSize(systemTitle, sysSize);
        page.drawText(systemTitle, { x: (pageWidth - sysWidth) / 2, y: y - sysSize, size: sysSize, font, color: rgb(0.2,0.2,0.2) });
        y -= sysSize + 6;

        const title = "Feedback Report";
        const titleSize = 12;
        const titleWidth = font.widthOfTextAtSize(title, titleSize);
        page.drawText(title, { x: (pageWidth - titleWidth) / 2, y: y - titleSize, size: titleSize, font, color: rgb(0.25,0.25,0.25) });
        y -= titleSize + 4;

        const gen = `Generated: ${new Date().toLocaleString()}`;
        const genSize = 9;
        const genWidth = font.widthOfTextAtSize(gen, genSize);
        page.drawText(gen, { x: (pageWidth - genWidth) / 2, y: y - genSize, size: genSize, font, color: rgb(0.35,0.35,0.35) });
      };

      const addTableHeader = (page: any, y: number) => {
        const headers = ["ID", "Name", "Email", "Stars", "Feedback", "Created"] as const;
        const cols = [30, 120, 120, 40, 180, 80] as const;
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
      let y = pageHeight - 190;
      const cols = addTableHeader(page, y);
      y -= 16;

      const drawRow = (r: any) => {
        const c0=30, c1=120, c2=120, c3=40, c4=180, c5=80;
        const colX = [pageMargin, pageMargin + c0, pageMargin + c0 + c1, pageMargin + c0 + c1 + c2, pageMargin + c0 + c1 + c2 + c3, pageMargin + c0 + c1 + c2 + c3 + c4];
        const name = (r.name ?? "").toString();
        const email = (r.email ?? "").toString();
        const fb = (r.feedback ?? "").toString();
        const trim = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
        page.drawText(String(r.id ?? ""), { x: colX[0], y, size: 9, font });
        page.drawText(trim(name, 18), { x: colX[1], y, size: 9, font });
        page.drawText(trim(email, 20), { x: colX[2], y, size: 9, font });
        page.drawText(String(r.star ?? ""), { x: colX[3], y, size: 9, font });
        page.drawText(trim(fb, 40), { x: colX[4], y, size: 9, font });
        page.drawText(r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "", { x: colX[5], y, size: 9, font });
      };

      for (const r of rowsDb) {
        if (y < pageMargin + 80) {
          page = pdf.addPage([pageWidth, pageHeight]);
          await addHeader(page);
          y = pageHeight - 190;
          addTableHeader(page, y);
          y -= 16;
        }
        drawRow(r);
        y -= 14;
      }

      const pdfBytes = await pdf.save();
      const base64 = Buffer.from(pdfBytes).toString("base64");
      return { pdfBase64: base64, filename: `feedback-${new Date().toISOString().slice(0,10)}.pdf` };
    }),
});
