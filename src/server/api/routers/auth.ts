// ~/server/api/routers/auth.ts
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const authRouter = createTRPCRouter({
  login: publicProcedure
    .input(
      z.object({
        username: z.string().min(1, "Username is required"),
        password: z.string().min(1, "Password is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // First try to find an admin
      const admin = await ctx.db.admin.findFirst({
        where: { username: input.username },
      });

      if (admin) {
        // Support both hashed and legacy plaintext passwords
        const hashedMatch = await bcrypt
          .compare(input.password, (admin as { password?: string; Password?: string }).password ?? (admin as any).Password)
          .catch(() => false);
        const plainMatch = ((admin as { password?: string; Password?: string }).password ?? (admin as any).Password) === input.password;
        const isValid = hashedMatch || plainMatch;
        if (!isValid) {
          throw new Error("Invalid username or password");
        }

        return {
          message: "Login successful",
          userId: admin.id,
          username: admin.username,
          role: "admin",
        };
      }

      // If not an admin, try to find an employee
      const employee = await ctx.db.employee.findFirst({
        where: { 
          username: input.username,
          isactive: true, // Only allow active employees
        },
      });

      if (!employee) {
        throw new Error("Invalid username or password");
      }

      // For employees, we need to compare passwords (assuming they're hashed)
      // Support both hashed and legacy plaintext passwords
      const isValid = (await bcrypt.compare(input.password, employee.password).catch(() => false)) ||
        employee.password === input.password;
      if (!isValid) {
        throw new Error("Invalid username or password");
      }

      return {
        message: "Login successful",
        userId: employee.id,
        username: employee.username,
        role: "employee",
        firstName: employee.firstname,
        lastName: employee.lastname,
      };
    }),

     employeeLogin: publicProcedure
    .input(
      z.object({
        username: z.string().min(1, "Username is required"),
        password: z.string().min(1, "Password is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Find employee with matching username
      const employee = await ctx.db.employee.findFirst({
        where: { 
          username: input.username,
          isactive: true, // Only allow active employees
        },
      });

      if (!employee) {
        throw new Error("Invalid username or password");
      }

      // Compare passwords
      const isValid = await bcrypt.compare(input.password, employee.password);
      if (!isValid) {
        throw new Error("Invalid username or password");
      }

      return {
        message: "Login successful",
        userId: employee.id,
        username: employee.username,
        role: "employee",
        firstName: employee.firstname,
        lastName: employee.lastname,
        canModify: employee.canModify, // Add this line
      };
    }),
      userLogin: publicProcedure
    .input(
      z.object({
        username: z.string().min(1, "Username is required"),
        password: z.string().min(1, "Password is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findFirst({
        where: { 
          username: input.username,
          isActive: true,
        },
      });


      if (!user) {
        throw new Error("Invalid username or password");
      }

      // Support both hashed and legacy plaintext passwords
      const isValid = (await bcrypt.compare(input.password, user.password).catch(() => false)) ||
        user.password === input.password;
      if (!isValid) {
        throw new Error("Invalid username or password");
      }

      const userRole = 'user'; 
      

      return {
        message: "Login successful",
        userId: user.id,
        username: user.username,
        role: userRole,
        firstName: user.firstName,
        lastName: user.lastName,
      };
    }),
});
