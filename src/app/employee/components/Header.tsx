"use client";
import Link from "next/link";
import Image from "next/image";
import {
  CircleUser,
  LayoutDashboard,
  Menu,
  Users,
  Package,
  MessageSquare,
  FileText,
  UserCheck,
  Clock,
  LogOut,
  Settings,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";
import { DialogTitle } from "~/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useRouter } from "next/navigation";
import { Label } from "~/components/ui/label";
import { motion } from "framer-motion";
import { useAuthStore } from "~/app/store/auth-store";

const Header = () => {
  const router = useRouter();
  
  // Get user data from Zustand store
  const { user, logout, isAuthenticated } = useAuthStore();
  console.log("54321",user)
  
const handleLogout = () => {
  logout();
  if (user?.role === "admin") {
    router.push("/admin-sign-in");
  } else {
    router.push("/employee-login"); 
  }
};


  // Get username from auth store
  const username = user?.username || "User";
  const role = user?.role || "employee";
  const firstName = user?.firstName || "";
  const lastName = user?.lastName || "";

  // Determine display name
  const displayName = firstName && lastName 
    ? `${firstName} ${lastName}` 
    : username;

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b border-[#f8610e]/20 bg-white/80 px-4 shadow-sm backdrop-blur-sm lg:h-[70px] lg:px-6"
    >
      {/* Mobile Menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 border-[#f8610e]/30 bg-transparent text-[#f8610e] hover:bg-[#f8610e] hover:text-white md:hidden"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="flex flex-col bg-orange-50 bg-cover bg-fixed bg-no-repeat"
          style={{ backgroundImage: "url('/background.png')" }}
        >
          <div className="absolute inset-0 bg-[#886549] backdrop-blur-sm" />
          <div className="relative z-10 flex h-full flex-col text-white">
            <VisuallyHidden>
              <DialogTitle>Navigation Menu</DialogTitle>
            </VisuallyHidden>

            {/* Mobile Logo */}
            <div className="mb-6 flex items-center gap-3 border-b border-white/20 pb-4">
              <div className="h-10 w-10 overflow-hidden rounded-full bg-white/10 backdrop-blur-sm">
                <Image
                  alt="Pings Ping Tinapa Logo"
                  src="/logo.png"
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <span className="text-lg font-bold">Pings Ping Tinapa</span>
                <p className="text-xs text-white/80">
                  {role === "admin" ? "Admin Dashboard" : "Employee Portal"}
                </p>
              </div>
            </div>

            <nav className="grid gap-3 text-base font-medium">
              {role === "admin" ? (
                // Admin Navigation
                <>
                  <Link
                    href="/admin/dashboard"
                    className="flex items-center gap-4 rounded-xl px-4 py-3 transition-all hover:bg-white/20 hover:backdrop-blur-sm"
                  >
                    <LayoutDashboard className="h-5 w-5" />
                    Dashboard
                  </Link>

                  <div className="space-y-2">
                    <Link
                      href="/employee"
                      className="flex items-center gap-4 rounded-xl px-4 py-3 transition-all hover:bg-white/20 hover:backdrop-blur-sm"
                    >
                      <Users className="h-5 w-5" />
                      Employee
                    </Link>
                    <div className="ml-8 space-y-1">
                      <Link
                        href="/admin/employee"
                        className="flex items-center gap-4 rounded-lg px-4 py-2 text-sm transition-all hover:bg-white/15 hover:backdrop-blur-sm"
                      >
                        <UserCheck className="h-4 w-4" />
                        Employee Management
                      </Link>
                      <Link
                        href="/admin/attendance"
                        className="flex items-center gap-4 rounded-lg px-4 py-2 text-sm transition-all hover:bg-white/15 hover:backdrop-blur-sm"
                      >
                        <Clock className="h-4 w-4" />
                        Employee Attendance
                      </Link>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-4 rounded-xl px-4 py-3">
                      <Package className="h-5 w-5" />
                      Management
                    </div>
                    <div className="ml-8 space-y-1">
                      <Link
                        href="/admin/product"
                        className="flex items-center gap-4 rounded-lg px-4 py-2 text-sm transition-all hover:bg-white/15 hover:backdrop-blur-sm"
                      >
                        <Package className="h-4 w-4" />
                        Product
                      </Link>
                      <Link
                        href="/admin/category-product"
                        className="flex items-center gap-4 rounded-lg px-4 py-2 text-sm transition-all hover:bg-white/15 hover:backdrop-blur-sm"
                      >
                        <Package className="h-4 w-4" />
                        Product Category
                      </Link>
                    </div>
                  </div>

                  <Link
                    href="/admin/feedback"
                    className="flex items-center gap-4 rounded-xl px-4 py-3 transition-all hover:bg-white/20 hover:backdrop-blur-sm"
                  >
                    <MessageSquare className="h-5 w-5" />
                    User Feedback
                  </Link>

                  <Link
                    href="/admin/reports"
                    className="flex items-center gap-4 rounded-xl px-4 py-3 transition-all hover:bg-white/20 hover:backdrop-blur-sm"
                  >
                    <FileText className="h-5 w-5" />
                    Reports
                  </Link>
                </>
              ) : (
                // Employee Navigation
                <>
                  <Link
                    href="/employee/attendance"
                    className="flex items-center gap-4 rounded-xl px-4 py-3 transition-all hover:bg-white/20 hover:backdrop-blur-sm"
                  >
                    <Clock className="h-5 w-5" />
                    Attendance
                  </Link>
                  <Link
                    href="/employee/profile"
                    className="flex items-center gap-4 rounded-xl px-4 py-3 transition-all hover:bg-white/20 hover:backdrop-blur-sm"
                  >
                    <UserCheck className="h-5 w-5" />
                    My Profile
                  </Link>
                </>
              )}
            </nav>
          </div>
        </SheetContent>
      </Sheet>

      {/* Header Title */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 overflow-hidden rounded-full bg-[#f8610e]/10 backdrop-blur-sm">
          <Image
            alt="Pings Ping Tinapa Logo"
            src="/background1.png"
            width={48}
            height={48}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="hidden sm:block">
          <h1 className="text-xl font-bold text-gray-900">Pings Ping Tinapa</h1>
          <p className="text-sm text-gray-600">
            {role === "admin" ? "Admin Dashboard" : "Employee Portal"}
          </p>
        </div>
      </div>

      <div className="w-full flex-1" />

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              className="relative h-12 w-12 rounded-full border-[#f8610e]/30 bg-white/80 text-[#f8610e] shadow-sm backdrop-blur-sm hover:bg-[#f8610e] hover:text-white"
            >
              <CircleUser className="h-5 w-5" />
              <span className="sr-only">Toggle user menu</span>
            </Button>
          </motion.div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56 rounded-xl border border-[#f8610e]/20 bg-white/95 shadow-lg backdrop-blur-sm"
        >
          <DropdownMenuLabel className="text-[#f8610e]">
            <div className="flex items-center gap-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f8610e]/10">
                <CircleUser className="h-4 w-4 text-[#f8610e]" />
              </div>
              <div>
                <Label className="font-semibold">{displayName}</Label>
                <p className="text-xs font-normal text-gray-600 capitalize">
                  {role}
                </p>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-[#f8610e]/20" />
          <DropdownMenuItem className="mx-1 cursor-pointer rounded-lg text-gray-700 hover:bg-[#f8610e]/10 hover:text-[#f8610e]">
            <Settings className="mr-3 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-[#f8610e]/20" />
          <DropdownMenuItem
            className="mx-1 cursor-pointer rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={handleLogout}
          >
            <LogOut className="mr-3 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.header>
  );
};

export default Header;