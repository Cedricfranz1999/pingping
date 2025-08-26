"use client";
import { Toaster } from "~/components/ui/toaster";
import type React from "react";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../_components/Sidebar";
import Header from "../_components/Header";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();

  //   useEffect(() => {
  //     const adminData = localStorage.getItem("adminData");
  //     if (!adminData) {
  //       router.push("/login");
  //     }
  //   }, [router]);

  return (
    <div
      className="min-h-screen bg-orange-50 bg-cover bg-fixed bg-no-repeat"
      style={{}}
    >
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <Sidebar />
        <div className="flex flex-col">
          <Header />
          <main className="flex flex-1 flex-col gap-4 bg-white/40 p-4 backdrop-blur-sm lg:gap-6 lg:p-6">
            {children}
            <Toaster />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
