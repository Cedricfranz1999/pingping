import { postRouter } from "~/server/api/routers/post";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { authRouter } from "./routers/auth";
import { dashboardRouter } from "./routers/dashboard";
import { employeeRouter } from "./routers/employee";
import { attendanceRouter } from "./routers/attendance";
import { productsRouter } from "./routers/product";
import { categoriesRouter } from "./routers/category";
import { feedbackRouter } from "./routers/feedback";
import { productReportsRouter } from "./routers/reports";
import { attendanceRecordRouter } from "./routers/attendance-record";
import { ordersRouter } from "./routers/order";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  auth: authRouter,
  dashbooard: dashboardRouter,
  employee: employeeRouter,
  attendance: attendanceRouter,
  product: productsRouter,
  categories: categoriesRouter,
  feedback: feedbackRouter,
  reports: productReportsRouter,
  attendanceRecord: attendanceRecordRouter,
  orders: ordersRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
