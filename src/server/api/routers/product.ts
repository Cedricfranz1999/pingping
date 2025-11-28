import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { ProductType } from "@prisma/client";
import { Prisma } from "@prisma/client";

export const productsRouter = createTRPCRouter({
  // Fetch both Tinapa and Pasalubong in a single query
  getHomeLists: publicProcedure.query(async () => {
    try {
      const rows = await db.product.findMany({
        where: { productType: { in: ["TINAPA", "PASALUBONG"] as any } },
        select: {
          id: true,
          image: true,
          name: true,
          description: true,
          stock: true,
          price: true,
          productType: true,
          size: true,
          createdAt: true,
          updatedAt: true,
          categories: { select: { category: true } },
        },
        orderBy: { name: "asc" },
      });
      const tinapa = rows.filter((r: any) => r.productType === "TINAPA");
      const pasalubong = rows.filter((r: any) => r.productType === "PASALUBONG");
      return { tinapa, pasalubong };
    } catch {
      // Fallback if size column is missing or other minor schema drift
      const rows = await db.product.findMany({
        where: { productType: { in: ["TINAPA", "PASALUBONG"] as any } },
        select: {
          id: true,
          image: true,
          name: true,
          description: true,
          stock: true,
          price: true,
          productType: true,
          createdAt: true,
          updatedAt: true,
          categories: { select: { category: true } },
        },
        orderBy: { name: "asc" },
      });
      const tinapa = rows.filter((r: any) => r.productType === "TINAPA");
      const pasalubong = rows.filter((r: any) => r.productType === "PASALUBONG");
      return { tinapa, pasalubong };
    }
  }),
  // ===============================
  // GET ALL PRODUCTS (with filters)
  // ===============================
  getAll: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        category: z.string().nullish(),
        sortBy: z.enum(["name", "price", "stock"]).default("name"),
        sortOrder: z.enum(["asc", "desc"]).default("asc"),
      }),
    )
    .query(async ({ input }) => {
      try {
        const { page, limit, search, category, sortBy, sortOrder } = input;

        const where: any = {};

        if (search) {
          where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ];
        }

        if (category && category !== "All") {
          where.categories = {
            some: {
              category: { name: category },
            },
          };
        }

        const total = await db.product.count({ where });

        let products;
        try {
          products = await db.product.findMany({
            where,
            select: {
              id: true,
              image: true,
              name: true,
              description: true,
              stock: true,
              price: true,
              productType: true,
              size: true,
              createdAt: true,
              updatedAt: true,
              categories: { select: { category: true } },
            },
            orderBy: {
              [sortBy]: sortOrder,
            },
            skip: (page - 1) * limit,
            take: limit,
          });
        } catch {
          products = await db.product.findMany({
            where,
            select: {
              id: true,
              image: true,
              name: true,
              description: true,
              stock: true,
              price: true,
              productType: true,
              createdAt: true,
              updatedAt: true,
              categories: { select: { category: true } },
            },
            orderBy: {
              [sortBy]: sortOrder,
            },
            skip: (page - 1) * limit,
            take: limit,
          });
        }

        return {
          products,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        };
      } catch (err) {
        console.error("getAll failed; returning empty results", err);
        return {
          products: [],
          pagination: {
            page: input.page,
            limit: input.limit,
            total: 0,
            totalPages: 0,
          },
        };
      }
    }),

  getCategories: publicProcedure.query(async () => {
    try {
      const categories = await db.category.findMany();
      return ["All", ...categories.map((c) => c.name)];
    } catch (err) {
      console.error("getCategories failed; returning fallback", err);
      // Graceful fallback when DB is unreachable
      return ["All"];
    }
  }),

  getAllSimple: publicProcedure.query(async ({ ctx }) => {
    try {
      try {
        const products = await ctx.db.product.findMany({
          select: {
            id: true,
            image: true,
            name: true,
            description: true,
            stock: true,
            price: true,
            productType: true,
            size: true,
            createdAt: true,
            updatedAt: true,
            categories: { select: { category: true } },
          },
          orderBy: {
            name: "asc",
          },
        });
        return products;
      } catch {
        const products = await ctx.db.product.findMany({
          select: {
            id: true,
            image: true,
            name: true,
            description: true,
            stock: true,
            price: true,
            productType: true,
            createdAt: true,
            updatedAt: true,
            categories: { select: { category: true } },
          },
          orderBy: {
            name: "asc",
          },
        });
        return products;
      }
    } catch (err) {
      console.error("getAllSimple failed; returning []", err);
      return [];
    }
  }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        price: z.string(),
        stock: z.number().int().min(0),
        image: z.string().optional(),
        category: z.string().min(1),
        productType: z.nativeEnum(ProductType),
        size: z.enum(["REGULAR","SMALL","MEDIUM","LARGE"]).default("REGULAR"),
      }),
    )
    .mutation(async ({ input }) => {
      // Normalize name to prevent variants by whitespace/case
      const normalizedName = input.name.trim();

      // Duplicate guard: prefer name+productType+size uniqueness (case-insensitive on name, exact on size enum)
      // Fallback to name+productType when `size` column is missing
      try {
        const dupWithSize = await db.product.findFirst({
          where: {
            productType: input.productType,
            name: { equals: normalizedName, mode: 'insensitive' as any },
            size: input.size as any,
          },
          select: { id: true },
        });
        if (dupWithSize) {
          throw new Error("Product with the same name and size already exists.");
        }
      } catch {
        const dupNoSize = await db.product.findFirst({
          where: {
            productType: input.productType,
            name: { equals: normalizedName, mode: 'insensitive' as any },
          },
          select: { id: true },
        });
        if (dupNoSize) {
          throw new Error("Product with the same name already exists.");
        }
      }

      const category = await db.category.upsert({
        where: { name: input.category },
        update: {},
        create: { name: input.category },
      });

      // Create with size when possible; otherwise retry without it
      try {
        const created = await db.product.create({
          data: {
            name: normalizedName,
            description: input.description,
            price: input.price,
            stock: input.stock,
            productType: input.productType,
            size: input.size,
            image:
              input.image ??
              `/placeholder.svg?height=100&width=100&query=${encodeURIComponent(input.name)}`,
            categories: {
              create: {
                categoryId: category.id,
              },
            },
          },
          include: { categories: { include: { category: true } } },
        });
        return created;
      } catch {
        const created = await db.product.create({
          data: {
            name: normalizedName,
            description: input.description,
            price: input.price,
            stock: input.stock,
            productType: input.productType,
            image:
              input.image ??
              `/placeholder.svg?height=100&width=100&query=${encodeURIComponent(input.name)}`,
            categories: { create: { categoryId: category.id } },
          },
          include: { categories: { include: { category: true } } },
        });
        return created;
      }
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1),
        description: z.string().min(1),
        price: z.string(),
        stock: z.number().int().min(0),
        image: z.string().optional(),
        category: z.string().min(1),
        productType: z.nativeEnum(ProductType),
        size: z.enum(["REGULAR","SMALL","MEDIUM","LARGE"]).default("REGULAR"),
      }),
    )
    .mutation(async ({ input }) => {
      const normalizedName = input.name.trim();
      // Duplicate guard: prefer name+productType+size (ignore current id)
      try {
        const dupWithSize = await db.product.findFirst({
          where: {
            productType: input.productType,
            name: { equals: normalizedName, mode: 'insensitive' as any },
            size: input.size as any,
            NOT: { id: input.id },
          },
          select: { id: true },
        });
        if (dupWithSize) {
          throw new Error("Another product with the same name and size already exists.");
        }
      } catch {
        const dupNoSize = await db.product.findFirst({
          where: {
            productType: input.productType,
            name: { equals: normalizedName, mode: 'insensitive' as any },
            NOT: { id: input.id },
          },
          select: { id: true },
        });
        if (dupNoSize) {
          throw new Error("Another product with the same name already exists.");
        }
      }

      const category = await db.category.upsert({
        where: { name: input.category },
        update: {},
        create: { name: input.category },
      });

      // Update with size when possible; otherwise retry without it
      try {
        const updated = await db.product.update({
          where: { id: input.id },
          data: {
            name: normalizedName,
            description: input.description,
            price: input.price,
            stock: input.stock,
            image: input.image,
            productType: input.productType,
            size: input.size,
            categories: { deleteMany: {}, create: { categoryId: category.id } },
          },
          include: { categories: { include: { category: true } } },
        });
        return updated;
      } catch {
        const updated = await db.product.update({
          where: { id: input.id },
          data: {
            name: normalizedName,
            description: input.description,
            price: input.price,
            stock: input.stock,
            image: input.image,
            productType: input.productType,
            categories: { deleteMany: {}, create: { categoryId: category.id } },
          },
          include: { categories: { include: { category: true } } },
        });
        return updated;
      }
    }),

  remove: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const existing = await db.product.findUnique({
        where: { id: input.id },
        include: { categories: true },
      });

      if (!existing) {
        throw new Error("Product not found");
      }

      await db.$transaction([
        db.cartItem.deleteMany({ where: { productId: input.id } }),
        db.orderItem.deleteMany({ where: { productId: input.id } }),
        db.productLog.deleteMany({ where: { productId: input.id } }),
        db.productCategory.deleteMany({ where: { productId: input.id } }),
        db.product.delete({ where: { id: input.id } }),
      ]);

      return existing;
    }),

  getTinapaProducts: publicProcedure.query(async ({ ctx }) => {
    try {
      return await ctx.db.product.findMany({
        where: { productType: "TINAPA" },
        select: {
          id: true,
          image: true,
          name: true,
          description: true,
          stock: true,
          price: true,
          productType: true,
          size: true,
          createdAt: true,
          updatedAt: true,
          categories: { select: { category: true } },
        },
      });
    } catch {
      try {
        // Fallback for databases that don't have the `size` column yet
        return await ctx.db.product.findMany({
          where: { productType: "TINAPA" },
          select: {
            id: true,
            image: true,
            name: true,
            description: true,
            stock: true,
            price: true,
            productType: true,
            createdAt: true,
            updatedAt: true,
            categories: { select: { category: true } },
          },
        });
      } catch (err) {
        console.error("getTinapaProducts failed; returning []", err);
        return [];
      }
    }
  }),

  getPasalubongProducts: publicProcedure.query(async ({ ctx }) => {
    try {
      return await ctx.db.product.findMany({
        where: { productType: "PASALUBONG" },
        select: {
          id: true,
          image: true,
          name: true,
          description: true,
          stock: true,
          price: true,
          productType: true,
          size: true,
          createdAt: true,
          updatedAt: true,
          categories: { select: { category: true } },
        },
      });
    } catch {
      try {
        // Fallback for databases that don't have the `size` column yet
        return await ctx.db.product.findMany({
          where: { productType: "PASALUBONG" },
          select: {
            id: true,
            image: true,
            name: true,
            description: true,
            stock: true,
            price: true,
            productType: true,
            createdAt: true,
            updatedAt: true,
            categories: { select: { category: true } },
          },
        });
      } catch (err) {
        console.error("getPasalubongProducts failed; returning []", err);
        return [];
      }
    }
  }),
  // Decrease stock
  decreaseStock: publicProcedure
    .input(z.object({ id: z.number(), quantity: z.number().min(1) }))
    .mutation(async ({ input }) => {
      return await db.product.update({
        where: { id: input.id },
        data: {
          stock: {
            decrement: input.quantity,
          },
        },
      });
    }),

  // Update stock
  updateStock: publicProcedure
    .input(z.object({ id: z.number(), stock: z.number().min(0) }))
    .mutation(async ({ input }) => {
      return await db.product.update({
        where: { id: input.id },
        data: {
          stock: input.stock,
        },
      });
    }),

  // ===============================
  // PRODUCT RATINGS
  // ===============================
  rateProduct: publicProcedure
    .input(
      z.object({
        productId: z.number(),
        userId: z.number().optional(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const created = await db.productRating.create({
        data: {
          productId: input.productId,
          userId: input.userId ?? null,
          rating: input.rating,
          comment: input.comment ?? null,
        },
      });
      return created;
    }),

  getRatingsByProductIds: publicProcedure
    .input(z.object({ productIds: z.array(z.number()) }).optional())
    .query(async ({ input }) => {
      const ids = input?.productIds ?? [];
      if (ids.length === 0) {
        return {} as Record<number, { average: number; count: number }>;
      }
      let groups: Array<{
        productId: number;
        _avg: { rating: number | null };
        _count: { _all: number | null };
      }> = [];
      try {
        const res = await db.productRating.groupBy({
          by: [Prisma.ProductRatingScalarFieldEnum.productId],
          where: { productId: { in: ids } },
          _avg: { rating: true },
          _count: { _all: true },
        });
        groups = res as Array<{
          productId: number;
          _avg: { rating: number | null };
          _count: { _all: number | null };
        }>;
      } catch {
        return {} as Record<number, { average: number; count: number }>;
      }

      const map: Record<number, { average: number; count: number }> = {};
      for (const g of groups) {
        map[g.productId] = {
          average: Number(g._avg.rating ?? 0),
          count: g._count._all ?? 0,
        };
      }
      return map;
    }),

  // Admin listing of all ratings with product details
  getAllRatings: publicProcedure
    .input(
      z
        .object({
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(100).default(20),
          productId: z.number().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 20;
      const where = input?.productId ? { productId: input.productId } : {};
      try {
        const total = await db.productRating.count({ where });
        const ratings = await db.productRating.findMany({
          where,
          include: {
            product: {
              select: { id: true, name: true, image: true },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        });
        return {
          ratings,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        };
      } catch {
        return {
          ratings: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        };
      }
    }),
});









