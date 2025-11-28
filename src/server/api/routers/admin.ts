import { z } from "zod";
import bcrypt from "bcryptjs";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const adminRouter = createTRPCRouter({
  changePassword: publicProcedure
    .input(
      z.object({
        username: z.string().min(1, "Username is required"),
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.string().min(6, "New password must be at least 6 characters"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const admin = await ctx.db.admin.findFirst({ where: { username: input.username } });
      if (!admin) {
        throw new Error("Admin not found");
      }

      const storedPassword = (admin as { password?: string; Password?: string }).password ?? (admin as any).Password;

      const hashedMatch = await bcrypt.compare(input.currentPassword, storedPassword).catch(() => false);
      const plainMatch = storedPassword === input.currentPassword;
      if (!(hashedMatch || plainMatch)) {
        throw new Error("Current password is incorrect");
      }

      const hash = await bcrypt.hash(input.newPassword, 10);
      await ctx.db.admin.update({ where: { id: admin.id }, data: { Password: hash } });

      return { message: "Password updated" };
    }),
});
