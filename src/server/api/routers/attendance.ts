import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const attendanceRouter = createTRPCRouter({
  // Login with username and password
  login: publicProcedure
    .input(
      z.object({
        username: z.string().min(1, " Username is required"),
        password: z.string().min(1, "Password is required"),
      }),
    )
    .mutation(async ({ input }) => {
      const { username, password } = input;

      const employee = await db.employee.findUnique({
        where: { username },
      });

      if (!employee || employee.password !== password) {
        throw new Error("Invalid username or password");
      }

      if (!employee.isactive) {
        throw new Error("Account is inactive");
      }

      //  Get today's attendance for the employee
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayAttendance = await db.attendance.findFirst({
        where: {
          employeeId: employee.id,
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
        orderBy: { createdAt: "desc" },
      });

      //  Return data structure expected by frontend
      return {
        employee: {
          id: employee.id,
          firstname: employee.firstname,
          middlename: employee.middlename,
          lastname: employee.lastname,
          username: employee.username,
          image: employee.image,
          address: employee.address,
          gender: employee.gender,
          isactive: employee.isactive,
        },
        todayAttendance: todayAttendance
          ? {
              id: todayAttendance.id,
              employeeId: todayAttendance.employeeId,
              date: todayAttendance.createdAt.toISOString().split("T")[0],
              timeIn: todayAttendance.timeIn?.toISOString(),
              timeOut: todayAttendance.timeOut?.toISOString(),
              status: todayAttendance.status,
            }
          : null,
      };
    }),

  // Record time in/out via QR code
  recordAttendance: publicProcedure
    .input(
      z.object({
        employeeId: z.number(),
        action: z.enum(["timeIn", "timeOut"]),
      }),
    )
    .mutation(async ({ input }) => {
      const { employeeId, action } = input;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Check if there's already an attendance record for today
      const existingAttendance = await db.attendance.findFirst({
        where: {
          employeeId,
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      let updatedAttendance;

      if (action === "timeIn") {
        if (existingAttendance?.timeIn) {
          throw new Error("Already timed in for today");
        }

        if (existingAttendance) {
          // Update existing record
          updatedAttendance = await db.attendance.update({
            where: { id: existingAttendance.id },
            data: { timeIn: new Date() },
          });
        } else {
          // Create new record
          updatedAttendance = await db.attendance.create({
            data: {
              employeeId,
              timeIn: new Date(),
              date: today,
            },
          });
        }
      } else {
        // timeOut
        if (!existingAttendance?.timeIn) {
          throw new Error("Must time in first before timing out");
        }

        if (existingAttendance.timeOut) {
          throw new Error("Already timed out for today");
        }

        updatedAttendance = await db.attendance.update({
          where: { id: existingAttendance.id },
          data: { timeOut: new Date() },
        });
      }

      //  Return data structure expected by frontend
      return {
        attendance: {
          id: updatedAttendance.id,
          employeeId: updatedAttendance.employeeId,
          date: updatedAttendance.createdAt.toISOString().split("T")[0],
          timeIn: updatedAttendance.timeIn?.toISOString(),
          timeOut: updatedAttendance.timeOut?.toISOString(),
          status: updatedAttendance.status,
        },
      };
    }),
  // Get attendance statistics
  getAttendanceStats: publicProcedure
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ input }) => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const attendanceRecords = await db.attendance.findMany({
        where: {
          employeeId: input.employeeId,
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const totalDays = attendanceRecords.length;
      const completeDays = attendanceRecords.filter(
        (record) => record.timeIn && record.timeOut,
      ).length;
      const incompleteDays = totalDays - completeDays;

      // Calculate total hours worked
      let totalHours = 0;
      attendanceRecords.forEach((record) => {
        if (record.timeIn && record.timeOut) {
          const hours =
            (record.timeOut.getTime() - record.timeIn.getTime()) /
            (1000 * 60 * 60);
          totalHours += hours;
        }
      });

      return {
        totalDays,
        completeDays,
        incompleteDays,
        totalHours: Math.round(totalHours * 100) / 100,
        averageHours:
          completeDays > 0
            ? Math.round((totalHours / completeDays) * 100) / 100
            : 0,
      };
    }),
});
