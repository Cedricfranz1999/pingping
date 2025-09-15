"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type React from "react";

import Header from "./components/Header";
import { useAuthStore } from "../store/auth-store";
import { Toaster } from "~/components/ui/toaster";
import Sidebar from "../employee/components/Sidebar";

const UserLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && (!isAuthenticated || user?.role !== "user")) {
      router.push("/user-login");
    }
  }, [hydrated, user, isAuthenticated, router]);

  if (!hydrated) return null;

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

export default UserLayout;
