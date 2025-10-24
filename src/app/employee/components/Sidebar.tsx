"use client";
import Link from "next/link";
import Image from "next/image";
import { Label } from "~/components/ui/label";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";

const Sidebar = () => {
  const pathname = usePathname();
  const isActive = (path: string) => pathname.startsWith(path);

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

          {/* Navigation (Attendance only) */}
          <div className="mt-6 flex-1 px-4">
            <nav className="space-y-2">
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
