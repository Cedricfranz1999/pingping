import { z } from "zod";
import bcrypt from "bcryptjs";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const authRouter = createTRPCRouter({
  // Login procedure
  login: publicProcedure
    .input(
      z.object({
        username: z.string().min(1, "Username is required"),
        password: z.string().min(1, "Password is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const admin = await ctx.db.admin.findFirst({
        where: { username: input.username },
      });

      if (!admin) {
        throw new Error("Invalid username or password");
      }

      const isValid = await bcrypt.compare(input.password, admin.Password);
      if (!isValid) {
        throw new Error("Invalid username or password");
      }

      // For now, return minimal info (you can add JWT/session logic later)
      return {
        message: "Login successful",
        adminId: admin.id,
        username: admin.username,
      };
    }),

  // Register procedure (optional)
  register: publicProcedure
    .input(
      z.object({
        username: z.string().min(1, "Username is required"),
        password: z.string().min(6, "Password must be at least 6 characters"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if username already exists
      const exists = await ctx.db.admin.findFirst({
        where: { username: input.username },
      });

      if (exists) {
        throw new Error("Username already taken");
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 10);

      const newAdmin = await ctx.db.admin.create({
        data: {
          username: input.username,
          Password: hashedPassword,
        },
      });

      return {
        message: "Admin registered successfully",
        adminId: newAdmin.id,
        username: newAdmin.username,
      };
    }),
});
