// ~/server/api/routers/attendance.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { AttendanceStatus } from "@prisma/client";

export const qrCodeRouterRouter = createTRPCRouter({
  // Create new attendance record
  getTodayAttendance: publicProcedure
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ input }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return await db.attendance.findFirst({
        where: {
          employeeId: input.employeeId,
          date: {
            gte: today,
            lt: tomorrow,
          },
        },
      });
    }),

  // Record attendance (time in or time out)
  record: publicProcedure
    .input(
      z.object({
        employeeId: z.number(),
        type: z.enum(["TIME_IN", "TIME_OUT"]),
      }),
    )
    .mutation(async ({ input }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Check if attendance record exists for today
      let attendance = await db.attendance.findFirst({
        where: {
          employeeId: input.employeeId,
          date: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      const now = new Date();

      if (input.type === "TIME_IN") {
        if (attendance) {
          throw new Error("Time in already recorded for today");
        }

        // Create new attendance record with time in
        attendance = await db.attendance.create({
          data: {
            employeeId: input.employeeId,
            date: now,
            timeIn: now,
            status: calculateStatus(now, "TIME_IN"),
          },
          include: {
            employee: {
              select: {
                firstname: true,
                middlename: true,
                lastname: true,
              },
            },
          },
        });

        return { status: "TIMED_IN", attendance };
      } else {
        // TIME_OUT
        if (!attendance) {
          throw new Error("No time in recorded for today");
        }

        if (attendance.timeOut) {
          throw new Error("Time out already recorded for today");
        }

        // Update attendance record with time out
        attendance = await db.attendance.update({
          where: { id: attendance.id },
          data: {
            timeOut: now,
            status: calculateStatus(now, "TIME_OUT", attendance.timeIn),
          },
          include: {
            employee: {
              select: {
                firstname: true,
                middlename: true,
                lastname: true,
              },
            },
          },
        });

        return { status: "TIMED_OUT", attendance };
      }
    }),
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.employee.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          firstname: true,
          middlename: true,
          lastname: true,
          image: true,
        },
      });
    }),

  // Generate QR code data for an employee
  generateQrData: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const employee = await db.employee.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          firstname: true,
          lastname: true,
        },
      });

      if (!employee) {
        throw new Error("Employee not found");
      }

      return `employee:${employee.id}`;
    }),
  getAttendanceHistory: publicProcedure
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ input }) => {
      return await db.attendance.findMany({
        where: {
          employeeId: input.employeeId,
        },
        orderBy: {
          date: "desc",
        },
        take: 30, // Last 30 records
      });
    }),
});

function calculateStatus(
  time: Date,
  type: "TIME_IN" | "TIME_OUT",
  timeIn?: Date | null,
): "OVERTIME" | "UNDERTIME" | "EXACT_TIME" {
  // Shifts:
  // - Day shift: 8:00 AM start, 6:00 PM end
  // - Evening shift: 6:00 PM start, 10:00 PM end

  const makeAt = (base: Date, h: number): number => {
    const d = new Date(base);
    d.setHours(h, 0, 0, 0);
    return d.getTime();
  };

  const t = time.getTime();

  if (type === "TIME_IN") {
    // Choose baseline start by current time (morning vs evening shift)
    const isEvening = time.getHours() >= 12; // 12:00 onwards considered evening shift start (6 PM)
    const start = makeAt(time, isEvening ? 18 : 8);
    if (t === start) return "EXACT_TIME";
    if (t > start) return "UNDERTIME"; // Late after start
    return "OVERTIME"; // Early before start
  } else {
    // TIME_OUT: determine shift end using timeIn if available
    let isEvening: boolean;
    if (timeIn) {
      isEvening = timeIn.getHours() >= 12; // time-in 12:00+ implies evening shift
    } else {
      // Fallback by current time
      isEvening = time.getHours() >= 12;
    }
    const end = makeAt(time, isEvening ? 22 : 18);
    if (t === end) return "EXACT_TIME";
    if (t > end) return "OVERTIME"; // Beyond end is overtime
    return "UNDERTIME"; // Before end is undertime
  }
}
