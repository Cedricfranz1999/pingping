"use client";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  Package,
  MessageSquare,
  FileText,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Clock,
  ListOrdered,
  Codesandbox,
} from "lucide-react";
import { Label } from "~/components/ui/label";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "~/app/store/auth-store";

const Sidebar = () => {
  const { user, logout, isAuthenticated } = useAuthStore();
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>(
    {},
  );
  const userCanModify = user?.canModify;
  const isActive = (path: string) => pathname.startsWith(path);

  const toggleMenu = (menu: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menu]: !prev[menu],
    }));
  };

  return (
    <div
      className="fixed top-0 left-0 hidden h-screen w-64 bg-[#702600] bg-fixed bg-no-repeat md:block"
      style={{ backgroundImage: "url('/background.png')" }}
    >
      <div className="h-full overflow-y-auto bg-[#a85e38]">
        <div className="flex h-full max-h-screen flex-col gap-2">
          {/* Logo Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex h-20 items-center border-b border-white/20 px-4 lg:px-6"
          >
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 overflow-hidden rounded-full bg-white/10 backdrop-blur-sm">
                <Image
                  alt="Pings Ping Tinapa Logo"
                  src="/logo.png"
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <Label className="text-lg font-bold text-white">
                  Pings Ping Tinapa
                </Label>
                <p className="text-xs text-white/80">Employee Dashboard</p>
              </div>
            </div>
          </motion.div>

          {/* Navigation */}
          <div className="mt-6 flex-1 px-4">
            <nav className="space-y-2">
              {/* Attendance Tab (Always shown) */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <Link
                  href="/employee/record-attendance"
                  className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    isActive("/employee/record-attendance")
                      ? "bg-white/90 text-[#f8610e] shadow-lg backdrop-blur-sm"
                      : "text-white hover:bg-white/20 hover:shadow-md hover:backdrop-blur-sm"
                  }`}
                >
                  <Clock
                    className={`h-5 w-5 transition-transform group-hover:scale-110 ${
                      isActive("/employee/record-attendance")
                        ? "text-[#f8610e]"
                        : "text-white"
                    }`}
                  />
                  Attendance
                </Link>
              </motion.div>

              {/* Show all other tabs only if user can modify */}
              {!userCanModify && (
                <>
                  {/* Dashboard */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  >
                    <Link
                      href="/employee/dashboard"
                      className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                        isActive("/employee/dashboard")
                          ? "bg-white/90 text-[#f8610e] shadow-lg backdrop-blur-sm"
                          : "text-white hover:bg-white/20 hover:shadow-md hover:backdrop-blur-sm"
                      }`}
                    >
                      <LayoutDashboard
                        className={`h-5 w-5 transition-transform group-hover:scale-110 ${
                          isActive("/employee/dashboard")
                            ? "text-[#f8610e]"
                            : "text-white"
                        }`}
                      />
                      Dashboard
                    </Link>
                  </motion.div>

                  {/* Track Orders - with expandable children */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                    className="space-y-1"
                  >
                    <div className="flex items-center">
                      <div
                        className={`group flex flex-1 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white transition-all duration-200 ${
                          expandedMenus["/track-orders"]
                            ? "bg-white/20 backdrop-blur-sm"
                            : "hover:bg-white/20 hover:backdrop-blur-sm"
                        }`}
                      >
                        <Codesandbox className="h-5 w-5" />
                        Track Orders
                      </div>
                      <motion.button
                        onClick={() => toggleMenu("/track-orders")}
                        className="ml-2 rounded-lg p-2 text-white transition-all hover:bg-white/20 hover:backdrop-blur-sm"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <AnimatePresence mode="wait">
                          {expandedMenus["/track-orders"] ? (
                            <motion.div
                              key="up"
                              initial={{ rotate: 180 }}
                              animate={{ rotate: 0 }}
                              exit={{ rotate: 180 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </motion.div>
                          ) : (
                            <motion.div
                              key="down"
                              initial={{ rotate: 0 }}
                              animate={{ rotate: 0 }}
                              exit={{ rotate: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    </div>
                    <AnimatePresence>
                      {expandedMenus["/track-orders"] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="ml-6 space-y-1 overflow-hidden"
                        >
                          <Link
                            href="/employee/inquiry"
                            className={`group flex items-center gap-3 rounded-lg px-4 py-2 text-xs font-medium transition-all duration-200 ${
                              isActive("/employee/inquiry")
                                ? "bg-white/80 text-[#f8610e] shadow-md backdrop-blur-sm"
                                : "text-white/90 hover:bg-white/15 hover:backdrop-blur-sm"
                            }`}
                          >
                            <ListOrdered
                              className={`h-4 w-4 ${
                                isActive("/employee/inquiry")
                                  ? "text-[#f8610e]"
                                  : "text-white/90"
                              }`}
                            />
                            Inquiry
                          </Link>
                          <Link
                            href="/employee/walk-in"
                            className={`group flex items-center gap-3 rounded-lg px-4 py-2 text-xs font-medium transition-all duration-200 ${
                              isActive("/employee/walk-in")
                                ? "bg-white/80 text-[#f8610e] shadow-md backdrop-blur-sm"
                                : "text-white/90 hover:bg-white/15 hover:backdrop-blur-sm"
                            }`}
                          >
                            <ListOrdered
                              className={`h-4 w-4 ${
                                isActive("/employee/walk-in")
                                  ? "text-[#f8610e]"
                                  : "text-white/90"
                              }`}
                            />
                            Order
                          </Link>
                          <Link
                            href="/employee/sales"
                            className={`group flex items-center gap-3 rounded-lg px-4 py-2 text-xs font-medium transition-all duration-200 ${
                              isActive("/employee/sales")
                                ? "bg-white/80 text-[#f8610e] shadow-md backdrop-blur-sm"
                                : "text-white/90 hover:bg-white/15 hover:backdrop-blur-sm"
                            }`}
                          >
                            <FileText
                              className={`h-4 w-4 ${
                                isActive("/employee/sales")
                                  ? "text-[#f8610e]"
                                  : "text-white/90"
                              }`}
                            />
                            Sales
                          </Link>
                          <Link
                            href="/employee/inventory"
                            className={`group flex items-center gap-3 rounded-lg px-4 py-2 text-xs font-medium transition-all duration-200 ${
                              isActive("/employee/inventory")
                                ? "bg-white/80 text-[#f8610e] shadow-md backdrop-blur-sm"
                                : "text-white/90 hover:bg-white/15 hover:backdrop-blur-sm"
                            }`}
                          >
                            <Package
                              className={`h-4 w-4 ${
                                isActive("/employee/inventory")
                                  ? "text-[#f8610e]"
                                  : "text-white/90"
                              }`}
                            />
                            Inventory
                          </Link>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Products - with expandable children */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                    className="space-y-1"
                  >
                    <div className="flex items-center">
                      <div
                        className={`group flex flex-1 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white transition-all duration-200 ${
                          expandedMenus["/products"]
                            ? "bg-white/20 backdrop-blur-sm"
                            : "hover:bg-white/20 hover:backdrop-blur-sm"
                        }`}
                      >
                        <Package className="h-5 w-5" />
                        Management
                      </div>
                      <motion.button
                        onClick={() => toggleMenu("/products")}
                        className="ml-2 rounded-lg p-2 text-white transition-all hover:bg-white/20 hover:backdrop-blur-sm"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <AnimatePresence mode="wait">
                          {expandedMenus["/products"] ? (
                            <motion.div
                              key="up"
                              initial={{ rotate: 180 }}
                              animate={{ rotate: 0 }}
                              exit={{ rotate: 180 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </motion.div>
                          ) : (
                            <motion.div
                              key="down"
                              initial={{ rotate: 0 }}
                              animate={{ rotate: 0 }}
                              exit={{ rotate: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    </div>
                    <AnimatePresence>
                      {expandedMenus["/products"] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="ml-6 space-y-1 overflow-hidden"
                        >
                          <Link
                            href="/employee/product"
                            className={`group flex items-center gap-3 rounded-lg px-4 py-2 text-xs font-medium transition-all duration-200 ${
                              isActive("/employee/product")
                                ? "bg-white/80 text-[#f8610e] shadow-md backdrop-blur-sm"
                                : "text-white/90 hover:bg-white/15 hover:backdrop-blur-sm"
                            }`}
                          >
                            <Package
                              className={`h-4 w-4 ${
                                isActive("/employee/product")
                                  ? "text-[#f8610e]"
                                  : "text-white/90"
                              }`}
                            />
                            Product
                          </Link>
                          <Link
                            href="/employee/category-product"
                            className={`group flex items-center gap-3 rounded-lg px-4 py-2 text-xs font-medium transition-all duration-200 ${
                              isActive("/employee/category-product")
                                ? "bg-white/80 text-[#f8610e] shadow-md backdrop-blur-sm"
                                : "text-white/90 hover:bg-white/15 hover:backdrop-blur-sm"
                            }`}
                          >
                            <Package
                              className={`h-4 w-4 ${
                                isActive("/employee/category-product")
                                  ? "text-[#f8610e]"
                                  : "text-white/90"
                              }`}
                            />
                            Product Category
                          </Link>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Reports */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 }}
                  >
                    <Link
                      href="/employee/reports"
                      className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                        isActive("/employee/reports")
                          ? "bg-white/90 text-[#f8610e] shadow-lg backdrop-blur-sm"
                          : "text-white hover:bg-white/20 hover:shadow-md hover:backdrop-blur-sm"
                      }`}
                    >
                      <FileText
                        className={`h-5 w-5 transition-transform group-hover:scale-110 ${
                          isActive("/employee/reports")
                            ? "text-[#f8610e]"
                            : "text-white"
                        }`}
                      />
                      Reports
                    </Link>
                  </motion.div>
                </>
              )}
            </nav>
          </div>

          {/* Bottom Decorative Element */}
          <div className="mt-auto p-4">
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-center text-xs text-white/80">
                Pings Ping Tinapa
              </p>
              <p className="text-center text-xs text-white/60">
                Employee Panel v1.0
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
