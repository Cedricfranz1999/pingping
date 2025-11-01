import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { ProductType } from "@prisma/client";

export const productsRouter = createTRPCRouter({
  // ===============================
  // GET ALL PRODUCTS (with filters)
  // ===============================
  getAll: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        // Accept undefined or null from clients/batch requests
        category: z.string().nullish(),
        sortBy: z.enum(["name", "price", "stock"]).default("name"),
        sortOrder: z.enum(["asc", "desc"]).default("asc"),
      }),
    )
    .query(async ({ input }) => {
      const { page, limit, search, category, sortBy, sortOrder } = input;

      // Prisma `where` filters
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

      const products = await db.product.findMany({
        where,
        include: {
          categories: {
            include: { category: true },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  getCategories: publicProcedure.query(async () => {
    const categories = await db.category.findMany();
    return ["All", ...categories.map((c) => c.name)];
  }),

  getAllSimple: publicProcedure
  .query(async ({ ctx }) => {
    const products = await ctx.db.product.findMany({
      include: {
        categories: {
          include: {
            category: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return products;
  }),

    create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        price: z.string(), // your schema has `String` for price
        stock: z.number().int().min(0),
        image: z.string().optional(),
        category: z.string().min(1), // single category name
        productType: z.nativeEnum(ProductType), // Add this line
        size: z.string().min(1).default("REGULAR"),
      }),
    )
    .mutation(async ({ input }) => {
      // Prevent duplicate products with same name + size + productType
      const existing = await db.product.findFirst({
        where: {
          name: input.name,
          productType: input.productType,
          size: input.size ?? "REGULAR",
        },
      });
      if (existing) {
        throw new Error(
          "Product with the same name and size already exists.",
        );
      }
      const category = await db.category.upsert({
        where: { name: input.category },
        update: {},
        create: { name: input.category },
      });

      const newProduct = await db.product.create({
        data: {
          name: input.name,
          description: input.description,
          price: input.price,
          stock: input.stock,
          size: input.size ?? "REGULAR",
          productType: input.productType,

          image:
            input.image ??
            `/placeholder.svg?height=100&width=100&query=${encodeURIComponent(input.name)}`,
          categories: {
            create: {
              categoryId: category.id,
            },
          },
        },
        include: {
          categories: { include: { category: true } },
        },
      });

      return newProduct;
    }),

  // ===============================
  // UPDATE PRODUCT
  // ===============================
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
        size: z.string().min(1).default("REGULAR"),
      }),
    )
    .mutation(async ({ input }) => {
      // Block rename to an existing (name, size, productType) owned by another product
      const duplicate = await db.product.findFirst({
        where: {
          name: input.name,
          productType: input.productType,
          size: input.size ?? "REGULAR",
          NOT: { id: input.id },
        },
      });
      if (duplicate) {
        throw new Error(
          "Another product with the same name and size already exists.",
        );
      }
      const category = await db.category.upsert({
        where: { name: input.category },
        update: {},
        create: { name: input.category },
      });

      const updated = await db.product.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description,
          price: input.price,
          stock: input.stock,
          image: input.image,
          size: input.size ?? "REGULAR",
          productType: input.productType,

          categories: {
            deleteMany: {},
            create: {
              categoryId: category.id,
            },
          },
        },
        include: {
          categories: { include: { category: true } },
        },
      });

      return updated;
    }),

  delete: publicProcedure
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
        // Remove dependent records to satisfy FK constraints
        db.cartItem.deleteMany({ where: { productId: input.id } }),
        db.orderItem.deleteMany({ where: { productId: input.id } }),
        db.productLog.deleteMany({ where: { productId: input.id } }),
        db.productCategory.deleteMany({ where: { productId: input.id } }),
        db.product.delete({ where: { id: input.id } }),
      ]);

      // Return the previously found product (client ignores response, but keep shape stable)
      return existing;
    }),
  getTinapaProducts: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.product.findMany({
      where: {
        productType: "TINAPA",
      },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    });
  }),

  getPasalubongProducts: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.product.findMany({
      where: {
        productType: "PASALUBONG",
      },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    // INVENTORY
    
  }),



  // Decrease stock
  decreaseStock: publicProcedure
    .input(z.object({ 
      id: z.number(),
      quantity: z.number().min(1)
    }))
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
    .input(z.object({ 
      id: z.number(),
      stock: z.number().min(0)
    }))
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
    .input(z.object({ productIds: z.array(z.number()).min(1) }))
    .query(async ({ input }) => {
      const groups = await db.productRating.groupBy({
        by: ["productId"],
        where: { productId: { in: input.productIds } },
        _avg: { rating: true },
        _count: { _all: true },
      });

      // Return as a lookup map { [productId]: { avg, count } }
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
      const total = await db.productRating.count({ where });
      const ratings = await db.productRating.findMany({
        where,
        include: { product: true },
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
    }),
});
