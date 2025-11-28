"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type React from "react";

import Sidebar from "../_components/Sidebar";
import Header from "../_components/Header";
import { Toaster } from "~/components/ui/toaster";
import { useAuthStore } from "../store/auth-store";
import { usePathname } from "next/navigation";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);
  const pathname = usePathname();
  const isPreview = pathname?.startsWith("/admin/reports/print");

  // ✅ Wait for Zustand to rehydrate from localStorage
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && (!isAuthenticated || user?.role !== "admin")) {
      router.push("/admin-sign-in");
    }
  }, [hydrated, isAuthenticated, user, router]);

  // ✅ Prevent rendering before hydration
  if (!hydrated) return null;

  // Minimal layout for preview pages (no sidebar/header)
  if (isPreview) {
    return (
      <div className="min-h-screen bg-white">
        <main className="flex flex-1 flex-col p-0">
          {children}
          <Toaster />
        </main>
      </div>
    );
  }

  // Default admin layout
  return (
    <div className="min-h-screen bg-orange-50 bg-cover bg-fixed bg-no-repeat">
      <Sidebar />
      <div className="ml-64 flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 bg-white/40 p-4 backdrop-blur-sm lg:gap-6 lg:p-6">
          {children}
          <Toaster />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
