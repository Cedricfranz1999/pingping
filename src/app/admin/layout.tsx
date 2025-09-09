"use client";
import { Toaster } from "~/components/ui/toaster";
import type React from "react";

import { useRouter } from "next/navigation";
import Sidebar from "../_components/Sidebar";
import Header from "../_components/Header";
import { useAuthStore } from "../store/auth-store";
import { useEffect } from "react";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      router.push("/admin-sign-in");
    }
  }, [user, isAuthenticated, router]);

  // Optional: prevent flashing content before redirect
  if (!isAuthenticated || user?.role !== "admin") {
  }

  return (
    <div className="min-h-screen bg-orange-50 bg-cover bg-fixed bg-no-repeat">
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main content shifted to the right */}
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
