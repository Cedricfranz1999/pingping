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
  // Define standard working hours (9 AM to 5 PM)
  const standardStart = new Date(time);
  standardStart.setHours(9, 0, 0, 0);

  const standardEnd = new Date(time);
  standardEnd.setHours(17, 0, 0, 0);

  if (type === "TIME_IN") {
    // Compare time in with standard start time
    const diffMs = time.getTime() - standardStart.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins > 15) return "UNDERTIME"; // Late arrival
    if (diffMins < -15) return "OVERTIME"; // Early arrival
    return "EXACT_TIME";
  } else {
    // TIME_OUT - need timeIn to calculate proper status
    if (!timeIn) return "EXACT_TIME";

    // Calculate total worked hours
    const workedMs = time.getTime() - timeIn.getTime();
    const standardWorkMs = standardEnd.getTime() - standardStart.getTime();

    // Compare with standard 8 hours
    if (workedMs < standardWorkMs - 15 * 60 * 1000) return "UNDERTIME"; // Worked less
    if (workedMs > standardWorkMs + 15 * 60 * 1000) return "OVERTIME"; // Worked more
    return "EXACT_TIME";
  }
}
