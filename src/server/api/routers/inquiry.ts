// ~/server/api/routers/inquiry.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { endOfDay } from "date-fns";
import type { Prisma } from "@prisma/client";

// Accept Date or ISO string (or undefined)
const zDate = z.preprocess((v) => {
  if (v == null || v === "") return undefined;
  if (typeof v === "string") return new Date(v);
  return v;
}, z.date());

const listInput = z.object({
  search: z.string().optional(),
  dateFrom: zDate.optional(),
  dateTo: zDate.optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

const exportInput = z.object({
  search: z.string().optional(),
  dateFrom: zDate.optional(),
  dateTo: zDate.optional(),
});

// simple CSV helpers
const csvQuote = (val: unknown) => {
  const s = String(val ?? "");
  // escape double-quotes by doubling them, wrap in quotes if needed
  const escaped = s.replace(/"/g, '""');
  return /[",\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
};
const toCSV = (rows: Record<string, unknown>[], fields: string[]) => {
  const header = fields.join(",");
  const lines = rows.map((r) => fields.map((f) => csvQuote(r[f])).join(","));
  return [header, ...lines].join("\n");
};

export const inquiryRouter = createTRPCRouter({
  // Paginated list for Reports page
  getAll: publicProcedure.input(listInput).query(async ({ input }) => {
    const { search, dateFrom, dateTo, page, limit } = input;

    const where: Prisma.InquiryWhereInput = {
      AND: [
        search
          ? {
              OR: [
                { firstname: { contains: search, mode: "insensitive" } },
                { lastname:  { contains: search, mode: "insensitive" } },
                { email:     { contains: search, mode: "insensitive" } },
                { phone:     { contains: search, mode: "insensitive" } },
                { subject:   { contains: search, mode: "insensitive" } },
                { message:   { contains: search, mode: "insensitive" } },
              ],
            }
          : undefined,
        dateFrom || dateTo
          ? {
              createdAt: {
                gte: dateFrom ?? undefined,
                lte: dateTo ? endOfDay(dateTo) : undefined,
              },
            }
          : undefined,
      ].filter(Boolean) as Prisma.InquiryWhereInput[],
    };

    const [data, total] = await db.$transaction([
      db.inquiry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.inquiry.count({ where }),
    ]);

    return { data, total };
  }),

  // CSV export
  exportCSV: publicProcedure.input(exportInput).mutation(async ({ input }) => {
    const { search, dateFrom, dateTo } = input;

    const where: Prisma.InquiryWhereInput = {
      AND: [
        search
          ? {
              OR: [
                { firstname: { contains: search, mode: "insensitive" } },
                { lastname:  { contains: search, mode: "insensitive" } },
                { email:     { contains: search, mode: "insensitive" } },
                { phone:     { contains: search, mode: "insensitive" } },
                { subject:   { contains: search, mode: "insensitive" } },
                { message:   { contains: search, mode: "insensitive" } },
              ],
            }
          : undefined,
        dateFrom || dateTo
          ? {
              createdAt: {
                gte: dateFrom ?? undefined,
                lte: dateTo ? endOfDay(dateTo) : undefined,
              },
            }
          : undefined,
      ].filter(Boolean) as Prisma.InquiryWhereInput[],
    };

    const rows = await db.inquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const fields = ["ID", "Name", "Email", "Phone", "Subject", "Message", "Status", "CreatedAt"];
    const mapped = rows.map((r) => ({
      ID: r.id,
      Name: `${r.firstname} ${r.lastname}`.trim(),
      Email: r.email ?? "",
      Phone: r.phone ?? "",
      Subject: r.subject ?? "",
      Message: r.message ?? "",
    //   Status: r.status ? "Actioned" : "Pending",
      CreatedAt: r.createdAt.toISOString(),
    }));

    const csv = toCSV(mapped, fields);
    return { csv };
  }),
});
