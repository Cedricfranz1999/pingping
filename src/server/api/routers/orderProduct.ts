import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const ordersProductRouter = createTRPCRouter({
  addToCart: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        productId: z.number(),
        quantity: z.number().min(1).default(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { userId, productId, quantity } = input;

      let cart = await ctx.db.cart.findUnique({
        where: { userId },
        include: { items: true },
      });

      if (!cart) {
        cart = await ctx.db.cart.create({
          data: {
            userId,
          },
          include: { items: true },
        });
      }

      const existingCartItem = cart.items.find(
        (item) => item.productId === productId,
      );

      if (existingCartItem) {
        return await ctx.db.cartItem.update({
          where: { id: existingCartItem.id },
          data: { quantity: existingCartItem.quantity + quantity },
        });
      } else {
        return await ctx.db.cartItem.create({
          data: {
            cartId: cart.id,
            productId,
            quantity,
          },
        });
      }
    }),

  getCart: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input, ctx }) => {
      const { userId } = input;

      const cart = await ctx.db.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  categories: {
                    include: { category: true },
                  },
                },
              },
            },
          },
        },
      });

      return cart || { items: [] };
    }),

  updateCartItem: publicProcedure
    .input(
      z.object({
        cartItemId: z.number(),
        quantity: z.number().min(0),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { cartItemId, quantity } = input;

      if (quantity === 0) {
        return await ctx.db.cartItem.delete({
          where: { id: cartItemId },
        });
      }

      return await ctx.db.cartItem.update({
        where: { id: cartItemId },
        data: { quantity },
      });
    }),

  removeFromCart: publicProcedure
    .input(
      z.object({
        cartItemId: z.number(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return await ctx.db.cartItem.delete({
        where: { id: input.cartItemId },
      });
    }),
  createOrder: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        items: z.array(
          z.object({
            productId: z.number(),
            quantity: z.number(),
            price: z.number(),
          }),
        ),
        totalPrice: z.number(),
        // Add cartItemIds to know which items to remove from cart
        cartItemIds: z.array(z.number()),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { userId, items, totalPrice, cartItemIds } = input;

      // Generate a unique order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create the order
      const order = await ctx.db.userOrder.create({
        data: {
          orderNumber,
          userId,
          totalPrice,
          status: "PENDING",
          orderItems: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
        },
      });

      // Only delete the cart items that were ordered (selected)
      await ctx.db.cartItem.deleteMany({
        where: {
          id: {
            in: cartItemIds,
          },
        },
      });

      return order;
    }),
  getOrders: publicProcedure
    .input(z.object({ userId: z.number() }).optional())
    .query(async ({ input, ctx }) => {
      const userId = input?.userId; // safe optional access
      // If a userId is provided, filter orders for that user.
      // Otherwise (admin views), return all orders.
      const where = userId !== undefined ? { userId } : {};

      const orders = await ctx.db.userOrder.findMany({
        where,
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return orders;
    }),

  getOrder: publicProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input, ctx }) => {
      const { orderId } = input;

      const order = await ctx.db.userOrder.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
          user: true,
        },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      return order;
    }),

  updateOrderStatus: publicProcedure
    .input(
      z.object({
        orderId: z.number(),
        status: z.enum(["PENDING", "CONFIRMED", "DELIVERED", "CANCELLED"]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { orderId, status } = input;

      return await ctx.db.userOrder.update({
        where: { id: orderId },
        data: { status },
      });
    }),

  deleteOrder: publicProcedure
    .input(
      z.object({
        orderId: z.number(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { orderId } = input;

      // First delete order items
      await ctx.db.orderItem.deleteMany({
        where: { orderId },
      });

      // Then delete the order
      return await ctx.db.userOrder.delete({
        where: { id: orderId },
      });
    }),

  // In your ordersProductRouter, add this procedure
createOrderWithoutUser: publicProcedure
  .input(
    z.object({
      items: z.array(
        z.object({
          productId: z.number(),
          quantity: z.number(),
          price: z.number(),
        }),
      ),
      totalPrice: z.number(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const { items, totalPrice } = input;
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create the order without userId
    const order = await ctx.db.userOrder.create({
      data: {
        orderNumber,
        totalPrice,
        status: "CONFIRMED",
        userId: null,
        orderItems: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    // Reduce stock for each product in the order
    for (const item of items) {
      await ctx.db.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });
    }

    return order;
  }),

});
