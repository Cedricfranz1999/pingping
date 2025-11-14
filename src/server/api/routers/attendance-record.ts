// ~/server/api/routers/attendance.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { AttendanceStatus } from "@prisma/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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

      const addHeader = (page: any) => {
        page.drawText("PingPing", { x: pageMargin, y: pageHeight - pageMargin - 10, size: 14, font: fontBold });
        page.drawText("Attendance Report", { x: pageMargin, y: pageHeight - pageMargin - 28, size: 12, font });
        const gen = `Generated: ${new Date().toLocaleString()}`;
        const genWidth = font.widthOfTextAtSize(gen, 9);
        page.drawText(gen, { x: pageWidth - pageMargin - genWidth, y: pageHeight - pageMargin - 10, size: 9, font, color: rgb(0.2,0.2,0.2) });
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
      addHeader(page);
      let y = pageHeight - pageMargin - 50;
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
