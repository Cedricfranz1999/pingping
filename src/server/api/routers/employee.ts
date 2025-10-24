import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import bcrypt from "bcryptjs"; // <-- added

const GENDER_VALUES = ["Male", "Female", "Other"] as const;
type GenderUnion = (typeof GENDER_VALUES)[number];

const coerceGender = (g: string): GenderUnion =>
  (GENDER_VALUES.includes(g as GenderUnion) ? g : "Male") as GenderUnion;

export const employeeRouter = createTRPCRouter({
  // List (paginated + search) — default: ONLY active (inactive hidden)
  getAll: publicProcedure
    .input(
      z.object({
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        includeInactive: z.boolean().optional().default(false), // default hidden
      })
    )
    .query(async ({ input }) => {
      const { search, page, limit, includeInactive } = input;
      const skip = (page - 1) * limit;

      const baseWhere: any = includeInactive ? {} : { isactive: true };

      const searchWhere = search
        ? {
            OR: [
              { firstname: { contains: search, mode: "insensitive" as const } },
              { lastname:  { contains: search, mode: "insensitive" as const } },
              { username:  { contains: search, mode: "insensitive" as const } },
              { address:   { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {};

      const where = { AND: [baseWhere, searchWhere] };

      const [employeesRaw, total] = await Promise.all([
        db.employee.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        db.employee.count({ where }),
      ]);

      const employees = employeesRaw.map((e) => ({
        ...e,
        gender: coerceGender((e as any).gender as string),
        ...(Object.prototype.hasOwnProperty.call(e, "canModify")
          ? { canModify: (e as any).canModify ?? false }
          : {}),
      }));

      return {
        employees,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      };
    }),

  // Read
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const e = await db.employee.findUnique({ where: { id: input.id } });
      if (!e) return null;
      return {
        ...e,
        gender: coerceGender((e as any).gender as string),
        ...(Object.prototype.hasOwnProperty.call(e, "canModify")
          ? { canModify: (e as any).canModify ?? false }
          : {}),
      };
    }),

  // Create
  create: publicProcedure
    .input(
      z.object({
        image: z.string().optional(),
        firstname: z.string().min(1),
        middlename: z.string().optional(),
        lastname: z.string().min(1),
        username: z.string().min(3),
        password: z.string().min(6),
        address: z.string().min(1),
        gender: z.enum(GENDER_VALUES),
        isactive: z.boolean().default(true),
        canModify: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ input }) => {
      // hash password before saving (no other changes)
      const { password, ...rest } = input;
      const hashed = await bcrypt.hash(password, 12);
      return db.employee.create({
        data: {
          ...rest,
          password: hashed,
        },
      });
    }),

  // Update
  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        image: z.string().optional(),
        firstname: z.string().min(1),
        middlename: z.string().optional(),
        lastname: z.string().min(1),
        username: z.string().min(3),
        password: z.string().min(6),
        address: z.string().min(1),
        gender: z.enum(GENDER_VALUES),
        isactive: z.boolean(),
        canModify: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ input }) => {
      // hash new password before updating (no other changes)
      const { id, password, ...data } = input;
      const hashed = await bcrypt.hash(password, 12);
      return db.employee.update({
        where: { id },
        data: {
          ...data,
          password: hashed,
        },
      });
    }),

  // Soft delete → mark inactive (hidden by default due to includeInactive=false)
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const existing = await db.employee.findUnique({ where: { id: input.id } });
      const tombstoneUsername =
        existing?.username ? `deleted_${existing.username}_${existing?.id}` : undefined;

      await db.employee.update({
        where: { id: input.id },
        data: {
          isactive: false,
          ...(tombstoneUsername ? { username: tombstoneUsername } : {}),
        },
      });

      return { ok: true };
    }),

  // Toggle active (restore/reactivate)
  toggleActive: publicProcedure
    .input(z.object({ id: z.number(), isactive: z.boolean() }))
    .mutation(async ({ input }) => {
      return db.employee.update({
        where: { id: input.id },
        data: { isactive: input.isactive },
      });
    }),

  // Optional: toggle modify permission
  toggleModify: publicProcedure
    .input(z.object({ id: z.number(), canModify: z.boolean() }))
    .mutation(async ({ input }) => {
      return db.employee.update({
        where: { id: input.id },
        data: { canModify: input.canModify },
      });
    }),
});
