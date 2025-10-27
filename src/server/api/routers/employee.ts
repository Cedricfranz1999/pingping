import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { hash as bcryptHash } from "bcryptjs";
import { db } from "~/server/db";

export const employeeRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
      }),
    )
    .query(async ({ input }) => {
      const { search, page, limit } = input;
      const skip = (page - 1) * limit;

      // Include both active and inactive employees so admins can re-activate accounts
      const where = search
        ? {
            OR: [
              { firstname: { contains: search, mode: "insensitive" as const } },
              { lastname: { contains: search, mode: "insensitive" as const } },
              { username: { contains: search, mode: "insensitive" as const } },
              { address: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {};

      const [employees, total] = await Promise.all([
        db.employee.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        db.employee.count({ where }),
      ]);

      return {
        employees,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      };
    }),

  // Get single employee by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.employee.findUnique({
        where: { id: input.id },
      });
    }),

  // Create new employee
  create: publicProcedure
    .input(
      z.object({
        image: z.string().optional(),
        firstname: z.string().min(1, "First name is required"),
        middlename: z.string().optional(),
        lastname: z.string().min(1, "Last name is required"),
        username: z.string().min(3, "Username must be at least 3 characters"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        address: z.string().min(1, "Address is required"),
        gender: z.enum(["Male", "Female", "Other"]),
        isactive: z.boolean().default(true),
        canModify: z.boolean().default(false),
      }),
    )
    .mutation(async ({ input }) => {
      const { password, ...rest } = input;
      const passwordHash = await bcryptHash(password, 10);
      return await db.employee.create({
        data: { ...rest, password: passwordHash },
      });
    }),

  // Update employee
  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        image: z.string().optional(),
        firstname: z.string().min(1, "First name is required"),
        middlename: z.string().optional(),
        lastname: z.string().min(1, "Last name is required"),
        username: z.string().min(3, "Username must be at least 3 characters"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        address: z.string().min(1, "Address is required"),
        gender: z.enum(["Male", "Female", "Other"]),
        isactive: z.boolean(),
        canModify: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, password, ...rest } = input;
      const passwordHash = await bcryptHash(password, 10);
      return await db.employee.update({
        where: { id },
        data: { ...rest, password: passwordHash },
      });
    }),

  // Delete employee (soft delete to avoid FK violations)
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await db.employee.update({
        where: { id: input.id },
        data: { isactive: false, canModify: false },
      });
    }),

  // Toggle active status
  toggleActive: publicProcedure
    .input(z.object({ id: z.number(), isactive: z.boolean() }))
    .mutation(async ({ input }) => {
      return await db.employee.update({
        where: { id: input.id },
        data: { isactive: input.isactive },
      });
    }),

  // Toggle modify permission
  toggleModify: publicProcedure
    .input(z.object({ id: z.number(), canModify: z.boolean() }))
    .mutation(async ({ input }) => {
      return await db.employee.update({
        where: { id: input.id },
        data: { canModify: input.canModify },
      });
    }),
});
