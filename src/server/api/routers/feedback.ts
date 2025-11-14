// ~/server/api/routers/feedback.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import type { Prisma } from "@prisma/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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

      const addHeader = (page: any) => {
        page.drawText("PingPing", { x: pageMargin, y: pageHeight - pageMargin - 10, size: 14, font: fontBold });
        page.drawText("Feedback Report", { x: pageMargin, y: pageHeight - pageMargin - 28, size: 12, font });
        const gen = `Generated: ${new Date().toLocaleString()}`;
        const genWidth = font.widthOfTextAtSize(gen, 9);
        page.drawText(gen, { x: pageWidth - pageMargin - genWidth, y: pageHeight - pageMargin - 10, size: 9, font, color: rgb(0.2,0.2,0.2) });
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
      addHeader(page);
      let y = pageHeight - pageMargin - 50;
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
        if (y < pageMargin + 40) {
          page = pdf.addPage([pageWidth, pageHeight]);
          addHeader(page);
          y = pageHeight - pageMargin - 50;
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
