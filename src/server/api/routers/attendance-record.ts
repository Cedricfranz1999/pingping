// ~/server/api/routers/attendance.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { AttendanceStatus } from "@prisma/client";

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
        date: z.date().optional(),       // single-day filter
        search: z.string().optional(),   // matches firstname/lastname/username
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
                  { firstname: { contains: input.search, mode: "insensitive" } },
                  { lastname:  { contains: input.search, mode: "insensitive" } },
                  { username:  { contains: input.search, mode: "insensitive" } },
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
        orderBy: { date: "desc" },
      });
    }),

  // ✅ Export attendance to CSV (NEW)
  exportCSV: publicProcedure
    .input(
      z.object({
        employeeId: z.number().optional(),
        date: z.date().optional(),       // same single-day filter as getAll
        search: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const rows = await db.attendance.findMany({
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
                  { firstname: { contains: input.search, mode: "insensitive" } },
                  { lastname:  { contains: input.search, mode: "insensitive" } },
                  { username:  { contains: input.search, mode: "insensitive" } },
                ],
              }
            : undefined,
        },
        include: {
          employee: { select: { firstname: true, lastname: true, username: true } },
        },
        orderBy: { date: "desc" },
      });

      const quote = (v: unknown) => {
        const s = String(v ?? "");
        return s.includes(",") || s.includes("\n") || s.includes('"')
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      };

      const header = ["ID","Employee","Username","Date","TimeIn","TimeOut","Status","Hours"];

      const csv = [
        header.join(","),
        ...rows.map((r) => {
          const emp = `${r.employee?.firstname ?? ""} ${r.employee?.lastname ?? ""}`.trim();
          const hours =
            r.timeIn && r.timeOut
              ? ((r.timeOut.getTime() - r.timeIn.getTime()) / 36e5).toFixed(2)
              : "";
          return [
            r.id,
            quote(emp),
            quote(r.employee?.username ?? ""),
            r.date ? new Date(r.date).toISOString() : "",
            r.timeIn ? new Date(r.timeIn).toISOString() : "",
            r.timeOut ? new Date(r.timeOut).toISOString() : "",
            quote(r.status ?? ""),
            hours,
          ].join(",");
        }),
      ].join("\n");

      return { csv };
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
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await db.attendance.delete({
        where: { id: input.id },
      });
    }),

  // Check in employee
  checkIn: publicProcedure
    .input(z.object({ employeeId: z.number() }))
    .mutation(async ({ input }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existing = await db.attendance.findFirst({
        where: {
          employeeId: input.employeeId,
          date: { gte: today, lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
        },
      });

      if (existing) throw new Error("Employee already checked in today");

      return await db.attendance.create({
        data: { employeeId: input.employeeId, timeIn: new Date() },
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
          date: { gte: today, lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
        },
      });

      if (!attendance) throw new Error("Employee hasn't checked in today");
      if (attendance.timeOut) throw new Error("Employee already checked out today");

      return await db.attendance.update({
        where: { id: attendance.id },
        data: { timeOut: new Date() },
      });
    }),
});
