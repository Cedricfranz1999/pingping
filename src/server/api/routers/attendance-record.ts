// ~/server/api/routers/attendance.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { AttendanceStatus } from "@prisma/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";

export const attendanceRecordRouter = createTRPCRouter({
  // Create new attendance record
  create: publicProcedure
    .input(
      z.object({
        employeeId: z.number(),
        timeIn: z.date().optional(),
        timeOut: z.date().optional(),
        status: z.nativeEnum(AttendanceStatus).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return await db.attendance.create({
        data: {
          employeeId: input.employeeId,
          timeIn: input.timeIn,
          timeOut: input.timeOut,
          status: input.status,
        },
      });
    }),

  // Get all attendance records with filters
  getAll: publicProcedure
    .input(
      z.object({
        employeeId: z.number().optional(),
        date: z.date().optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      return await db.attendance.findMany({
        where: {
          employeeId: input.employeeId,
          date: input.date
            ? {
                gte: new Date(
                  input.date.getFullYear(),
                  input.date.getMonth(),
                  input.date.getDate(),
                ),
                lt: new Date(
                  input.date.getFullYear(),
                  input.date.getMonth(),
                  input.date.getDate() + 1,
                ),
              }
            : undefined,
          employee: input.search
            ? {
                OR: [
                  {
                    firstname: { contains: input.search, mode: "insensitive" },
                  },
                  { lastname: { contains: input.search, mode: "insensitive" } },
                  { username: { contains: input.search, mode: "insensitive" } },
                ],
              }
            : undefined,
        },
        include: {
          employee: {
            select: {
              firstname: true,
              lastname: true,
              username: true,
            },
          },
        },
        orderBy: {
          date: "desc",
        },
      });
    }),

  // Update attendance record
  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        timeIn: z.date().optional(),
        timeOut: z.date().optional(),
        status: z.nativeEnum(AttendanceStatus).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return await db.attendance.update({
        where: { id: input.id },
        data: {
          timeIn: input.timeIn,
          timeOut: input.timeOut,
          status: input.status,
        },
      });
    }),

  // Delete attendance record
  remove: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await db.attendance.delete({
        where: { id: input.id },
      });
    }),

  // Bulk delete attendance records
  removeMany: publicProcedure
    .input(z.object({ ids: z.array(z.number()).min(1) }))
    .mutation(async ({ input }) => {
      const res = await db.attendance.deleteMany({
        where: { id: { in: input.ids } },
      });
      return { count: res.count };
    }),

  // Check in employee
  checkIn: publicProcedure
    .input(z.object({ employeeId: z.number() }))
    .mutation(async ({ input }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if already checked in today
      const existing = await db.attendance.findFirst({
        where: {
          employeeId: input.employeeId,
          date: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      });

      if (existing) {
        throw new Error("Employee already checked in today");
      }

      const now = new Date();
      return await db.attendance.create({
        data: {
          employeeId: input.employeeId,
          timeIn: now,
          status: calculateStatus(now, "TIME_IN"),
        },
      });
    }),

  // Check out employee
  checkOut: publicProcedure
    .input(z.object({ employeeId: z.number() }))
    .mutation(async ({ input }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const attendance = await db.attendance.findFirst({
        where: {
          employeeId: input.employeeId,
          date: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      });

      if (!attendance) {
        throw new Error("Employee hasn't checked in today");
      }

      if (attendance.timeOut) {
        throw new Error("Employee already checked out today");
      }

      const now = new Date();
      return await db.attendance.update({
        where: { id: attendance.id },
        data: {
          timeOut: now,
          status: calculateStatus(now, "TIME_OUT", attendance.timeIn ?? undefined),
        },
      });
    }),

  // Export attendance records as CSV (for legacy frontend usage)
  exportCSV: publicProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          date: z.date().optional(),
        })
        .optional(),
    )
    .mutation(async ({ input }) => {
      const where: any = {};
      if (input?.date) {
        where.date = {
          gte: new Date(input.date.getFullYear(), input.date.getMonth(), input.date.getDate()),
          lt: new Date(input.date.getFullYear(), input.date.getMonth(), input.date.getDate() + 1),
        };
      }
      if (input?.search) {
        where.employee = {
          OR: [
            { firstname: { contains: input.search, mode: "insensitive" } },
            { lastname: { contains: input.search, mode: "insensitive" } },
            { username: { contains: input.search, mode: "insensitive" } },
          ],
        };
      }

      const records = await db.attendance.findMany({
        where,
        include: { employee: { select: { firstname: true, lastname: true, username: true } } },
        orderBy: { date: "desc" },
      });

      const headers = [
        "ID",
        "Employee",
        "Username",
        "Date",
        "Time In",
        "Time Out",
        "Status",
        "Created At",
        "Updated At",
      ];
      const rows = [
        headers.join(","),
        ...records.map((r) =>
          [
            r.id,
            `"${r.employee?.firstname ?? ""} ${r.employee?.lastname ?? ""}"`,
            `"${r.employee?.username ?? ""}"`,
            r.date?.toISOString() ?? "",
            r.timeIn ? r.timeIn.toISOString() : "",
            r.timeOut ? r.timeOut.toISOString() : "",
            r.status ?? "",
            r.createdAt.toISOString(),
            r.updatedAt.toISOString(),
          ].join(","),
        ),
      ];
      return { csv: rows.join("\n") };
    }),

  // Export attendance as PDF
  exportPDF: publicProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          date: z.date().optional(),
        })
        .optional(),
    )
    .mutation(async ({ input }) => {
      const where: any = {};
      if (input?.date) {
        where.date = {
          gte: new Date(input.date.getFullYear(), input.date.getMonth(), input.date.getDate()),
          lt: new Date(input.date.getFullYear(), input.date.getMonth(), input.date.getDate() + 1),
        };
      }
      if (input?.search) {
        where.employee = {
          OR: [
            { firstname: { contains: input.search, mode: "insensitive" } },
            { lastname: { contains: input.search, mode: "insensitive" } },
            { username: { contains: input.search, mode: "insensitive" } },
          ],
        };
      }

      const records = await db.attendance.findMany({
        where,
        include: { employee: { select: { firstname: true, lastname: true, username: true } } },
        orderBy: { date: "desc" },
      });

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
        // Top accent line matching site theme (#f8610e)
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

        // Business and system titles
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

        const title = "Attendance Report";
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
        const headers = ["ID", "Employee", "Username", "Date", "Time In", "Time Out", "Status"] as const;
        const cols = [30, 160, 80, 80, 70, 70, 60] as const;
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
        const c0=30, c1=160, c2=80, c3=80, c4=70, c5=70, c6=60;
        const colX = [pageMargin, pageMargin + c0, pageMargin + c0 + c1, pageMargin + c0 + c1 + c2, pageMargin + c0 + c1 + c2 + c3, pageMargin + c0 + c1 + c2 + c3 + c4, pageMargin + c0 + c1 + c2 + c3 + c4 + c5];
        const emp = `${r.employee?.firstname ?? ""} ${r.employee?.lastname ?? ""}`.trim();
        page.drawText(String(r.id ?? ""), { x: colX[0], y, size: 9, font });
        page.drawText(emp.slice(0, 22) + (emp.length > 22 ? "…" : ""), { x: colX[1], y, size: 9, font });
        page.drawText(String(r.employee?.username ?? ""), { x: colX[2], y, size: 9, font });
        page.drawText(r.date ? new Date(r.date).toLocaleDateString() : "", { x: colX[3], y, size: 9, font });
        page.drawText(r.timeIn ? new Date(r.timeIn).toLocaleTimeString() : "", { x: colX[4], y, size: 9, font });
        page.drawText(r.timeOut ? new Date(r.timeOut).toLocaleTimeString() : "", { x: colX[5], y, size: 9, font });
        page.drawText(String(r.status ?? ""), { x: colX[6], y, size: 9, font });
      };

      for (const r of records) {
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
      return { pdfBase64: base64, filename: `attendance-${new Date().toISOString().slice(0,10)}.pdf` };
    }),
});

function calculateStatus(
  time: Date,
  type: "TIME_IN" | "TIME_OUT",
  timeIn?: Date | null,
): "OVERTIME" | "UNDERTIME" | "EXACT_TIME" {
  // Shifts: Day 8:00-18:00, Evening 18:00-22:00
  const makeAt = (base: Date, h: number): number => {
    const d = new Date(base);
    d.setHours(h, 0, 0, 0);
    return d.getTime();
  };

  const t = time.getTime();

  if (type === "TIME_IN") {
    const isEvening = time.getHours() >= 12;
    const start = makeAt(time, isEvening ? 18 : 8);
    if (t === start) return "EXACT_TIME";
    if (t > start) return "UNDERTIME";
    return "OVERTIME";
  } else {
    let isEvening: boolean;
    if (timeIn) {
      isEvening = timeIn.getHours() >= 12;
    } else {
      isEvening = time.getHours() >= 12;
    }
    const end = makeAt(time, isEvening ? 22 : 18);
    if (t === end) return "EXACT_TIME";
    if (t > end) return "OVERTIME";
    return "UNDERTIME";
  }
}
