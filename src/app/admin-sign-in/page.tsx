// ~/app/login/page.tsx
"use client";

import { useState, type SetStateAction } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, User, Lock, ArrowRight } from "lucide-react";
import Image from "next/image";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { useAuthStore } from "../store/auth-store";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");

  const router = useRouter();
  const { login } = useAuthStore(); // Get the login function from Zustand store

  const loginMutation = api.auth.login.useMutation({
    onSuccess: (data: { userId: number; username: string; role: string }) => {
      // Use Zustand store instead of localStorage
      login({
        userId: data.userId,
        username: data.username,
        role: data.role === "employee" ? "employee" : "admin",
      });
      if (data.role === "admin") {
        router.push("/admin/dashboard");
      } else if (data.role === "employee") {
        router.push("/employee/dashboard");
      }
    },
    onError: (error: { message: SetStateAction<string> }) => {
      setError(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!formData.username || !formData.password) {
      setError("Please fill in all fields");
      return;
    }
    loginMutation.mutate(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError("");
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: "easeOut" },
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-orange-50 bg-fixed bg-no-repeat"
      style={{
        backgroundImage: "url('/background1.png')",
        backgroundPosition: "center",
        backgroundSize: "110%",
      }}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/20" />

      <motion.div
        initial="initial"
        animate="animate"
        variants={fadeInUp}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur-sm">
          <CardContent className="p-8">
            {/* Logo and Header */}
            <motion.div variants={fadeInUp} className="mb-8 text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#f8610e]/10">
                  <Image
                    alt="Pings Ping Tinapa Logo"
                    src="/logo.png"
                    width={60}
                    height={60}
                    className="rounded-full"
                  />
                </div>
              </div>
              <h1 className="mb-2 text-2xl font-bold text-gray-900">
                Welcome Back
              </h1>
              <p className="text-gray-600">
                Sign in to{" "}
                <span className="font-semibold text-[#f8610e]">
                  Pings Ping Tinapa
                </span>
              </p>
            </motion.div>

            {/* Login Form */}
            <motion.form
              variants={fadeInUp}
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-lg border border-red-200 bg-red-50 p-4"
                >
                  <p className="text-sm font-medium text-red-600">{error}</p>
                </motion.div>
              )}

              {/* Username Field */}
              <div className="space-y-2">
                <label
                  htmlFor=" username"
                  className="block text-sm font-medium text-gray-700"
                >
                  Username
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-300 py-3 pr-4 pl-10 transition-colors outline-none focus:border-[#f8610e] focus:ring-2 focus:ring-[#f8610e]/20"
                    placeholder="Enter your username"
                    disabled={loginMutation.isPending}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-300 py-3 pr-12 pl-10 transition-colors outline-none focus:border-[#f8610e] focus:ring-2 focus:ring-[#f8610e]/20"
                    placeholder="Enter your password"
                    disabled={loginMutation.isPending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    disabled={loginMutation.isPending}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="group flex w-full items-center justify-center space-x-2 rounded-lg bg-[#f8610e] px-4 py-3 font-semibold text-white transition-all duration-200 hover:bg-[#f8610e]/90"
              >
                {loginMutation.isPending ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </motion.form>

            {/* Footer
            <motion.div variants={fadeInUp} className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Dont have an account?{" "}
                <a
                  href="/register"
                  className="font-medium text-[#f8610e] hover:text-[#f8610e]/80"
                >
                  Contact Administrator
                </a>
              </p>
            </motion.div> */}

            {/* Decorative Elements */}
            <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-[#f8610e]/10 blur-xl" />
            <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-[#f8610e]/5 blur-xl" />
          </CardContent>
        </Card>

        {/* Back to Home Link */}
        <motion.div variants={fadeInUp} className="mt-6 text-center">
          <a
            href="/"
            className="group flex items-center justify-center space-x-2 text-sm font-medium text-white/80 hover:text-white"
          >
            <span>← Back to Home</span>
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
}
