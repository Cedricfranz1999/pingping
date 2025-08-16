"use client";
import type React from "react";
import { useState, useEffect, useRef } from "react";

import {
  Clock,
  LogOut,
  QrCode,
  User,
  Check,
  Camera,
  ChevronLeft,
  Loader2,
  Eye,
  EyeOff,
  Zap,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { api } from "~/trpc/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import Image from "next/image";
import dynamic from "next/dynamic";

// Dynamically import QrScanner with custom types
const QrScanner = dynamic(
  () => import("react-qr-scanner").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#eac2a2]" />
      </div>
    ),
  },
);

interface Employee {
  id: number;
  image?: string | null;
  firstname: string;
  middlename?: string | null;
  lastname: string;
  username: string;
  address: string;
  gender: string;
  isactive: boolean;
}

interface AttendanceRecord {
  id: number;
  employeeId: number;
  date: string | undefined;
  timeIn?: string | undefined | null;
  timeOut?: string | undefined | null;
  status?: "OVERTIME" | "UNDERTIME" | "EXACT_TIME" | null;
}

export default function AttendancePage() {
  // State management
  const [step, setStep] = useState<
    "login" | "details" | "scanning" | "success" | "camera"
  >("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [todayAttendance, setTodayAttendance] =
    useState<AttendanceRecord | null>(null);
  const [error, setError] = useState("");
  const [scanningDisabled, setScanningDisabled] = useState(false);
  const [actionType, setActionType] = useState<"timeIn" | "timeOut">("timeIn");
  const [qrCodeInput, setQrCodeInput] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loginMutation = api.attendance.login.useMutation({
    onSuccess: (data) => {
      setEmployee(data.employee);
      setTodayAttendance(
        data.todayAttendance
          ? {
              ...data.todayAttendance,
              date:
                data.todayAttendance.date ||
                new Date().toISOString().split("T")[0],
            }
          : null,
      );
      setStep("details");
      setError("");
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const recordMutation = api.attendance.recordAttendance.useMutation({
    onSuccess: (data) => {
      setTodayAttendance({
        ...data.attendance,
        date: data.attendance.date || new Date().toISOString().split("T")[0],
      });
      setScanningDisabled(true);
      setStep("success");
      setError("");
      setCountdown(60);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  // Countdown timer for success screen
  useEffect(() => {
    if (step === "success") {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            handleReturnToLogin();
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step]);

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Please enter username and password");
      return;
    }
    setError("");
    loginMutation.mutate({ username, password });
  };

  const handleQRCodeSubmit = async () => {
    if (!qrCodeInput || !employee) {
      setError("Please enter QR code or upload image");
      return;
    }
    if (qrCodeInput !== employee.id.toString()) {
      setError("QR code does not match your employee ID");
      return;
    }
    setError("");
    recordMutation.mutate({
      employeeId: employee.id,
      action: actionType,
    });
  };

  // Handle file upload for QR code
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        // In a real app, you would use a QR code library to decode the image
        // For this example, we'll simulate it with the employee ID
        const simulatedQRValue = employee?.id.toString() || "";
        setQrCodeInput(simulatedQRValue);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle QR code scan from camera
  const handleScan = (result: { text?: string }) => {
    if (result?.text) {
      setQrCodeInput(result.text);
      setCameraActive(false);
      // Auto-submit if the QR code matches
      if (result.text === employee?.id.toString()) {
        handleQRCodeSubmit();
      }
    }
  };

  const handleScanError = (err: Error) => {
    console.error(err);
    setError("Failed to scan QR code. Please try again.");
  };

  // Return to login
  const handleReturnToLogin = () => {
    setStep("login");
    setUsername("");
    setPassword("");
    setEmployee(null);
    setTodayAttendance(null);
    setError("");
    setQrCodeInput("");
    setScanningDisabled(false);
    setCameraActive(false);
    setCountdown(60);
  };

  // Determine available actions
  const canTimeOut = todayAttendance?.timeIn && !todayAttendance?.timeOut;
  const canTimeIn = !todayAttendance?.timeIn;

  const currentTime = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const currentDate = new Date().toLocaleDateString([], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-[#edc6a9]/30 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-[#eac2a2]/30 blur-3xl"></div>
      </div>

      <Card className="relative w-full max-w-md overflow-hidden border-0 bg-white/80 shadow-2xl backdrop-blur-sm">
        {/* Animated gradient border */}
        <div className="absolute inset-0 rounded-lg bg-[#eac2a2] opacity-75"></div>
        <div className="absolute inset-[1px] rounded-lg bg-white"></div>

        <div className="relative z-10">
          {/* Login Step */}
          {step === "login" && (
            <>
              <CardHeader className="space-y-1 pt-8 pb-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eac2a2] shadow-lg">
                  <Clock className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-3xl font-bold text-transparent">
                  Employee Attendance
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Welcome back! Please sign in to continue
                </CardDescription>
                <div className="mt-2 text-sm text-gray-500">
                  {currentDate} • {currentTime}
                </div>
              </CardHeader>
              <CardContent className="space-y-6 px-8 pb-8">
                <div className="space-y-2">
                  <Label
                    htmlFor="username"
                    className="text-sm font-medium text-gray-700"
                  >
                    Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="h-12 border-gray-200 focus:border-[#eac2a2] focus:ring-[#eac2a2]/20"
                    onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-sm font-medium text-gray-700"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="h-12 border-gray-200 pr-12 focus:border-[#eac2a2] focus:ring-[#eac2a2]/20"
                      onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-1/2 right-2 h-8 w-8 -translate-y-1/2 p-0 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                {error && (
                  <div className="flex items-center space-x-2 rounded-lg border border-red-200 bg-red-50 p-3">
                    <XCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
                    <div className="text-sm text-red-600">{error}</div>
                  </div>
                )}
                <Button
                  onClick={handleLogin}
                  disabled={loginMutation.isPending || !username || !password}
                  className="h-12 w-full transform bg-[#eac2a2] text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:bg-[#edc6a9] hover:shadow-xl"
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Sign In
                    </>
                  )}
                </Button>
              </CardContent>
            </>
          )}

          {/* Employee Details Step */}
          {step === "details" && employee && (
            <>
              <CardHeader className="space-y-1 pt-6 pb-4 text-center">
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Welcome back, {employee.firstname}! 👋
                </CardTitle>
                <CardDescription className="text-gray-600">
                  {currentDate}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 px-6 pb-6">
                <div className="flex justify-center">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="relative">
                      {employee.image ? (
                        <Image
                          src={employee.image || "/placeholder.svg"}
                          alt="Employee"
                          width={80}
                          height={80}
                          className="rounded-full border-4 border-white object-cover shadow-lg"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-gradient-to-r from-[#edc6a9] to-[#eac2a2] shadow-lg">
                          <User className="h-10 w-10 text-white" />
                        </div>
                      )}
                      <div className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-green-500">
                        <div className="h-2 w-2 rounded-full bg-white"></div>
                      </div>
                    </div>
                    <div className="text-center">
                      <h2 className="text-xl font-semibold text-gray-900">
                        {employee.firstname} {employee.middlename}{" "}
                        {employee.lastname}
                      </h2>
                      <p className="font-medium text-[#eac2a2]">
                        @{employee.username}
                      </p>
                      <p className="text-sm text-gray-500">
                        {employee.address}
                      </p>
                    </div>
                  </div>
                </div>

                <Card className="border-0 bg-gradient-to-r from-gray-50 to-[#edc6a9]/20 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
                      <Clock className="mr-2 h-5 w-5 text-[#eac2a2]" />
                      Todays Attendance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`h-3 w-3 rounded-full ${todayAttendance?.timeIn ? "bg-green-500" : "bg-gray-300"}`}
                        ></div>
                        <span className="text-sm font-medium text-gray-700">
                          Time In
                        </span>
                      </div>
                      <span
                        className={`text-sm font-semibold ${todayAttendance?.timeIn ? "text-green-600" : "text-gray-400"}`}
                      >
                        {todayAttendance?.timeIn
                          ? new Date(todayAttendance.timeIn).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              },
                            )
                          : "Not recorded"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`h-3 w-3 rounded-full ${todayAttendance?.timeOut ? "bg-green-500" : "bg-gray-300"}`}
                        ></div>
                        <span className="text-sm font-medium text-gray-700">
                          Time Out
                        </span>
                      </div>
                      <span
                        className={`text-sm font-semibold ${todayAttendance?.timeOut ? "text-green-600" : "text-gray-400"}`}
                      >
                        {todayAttendance?.timeOut
                          ? new Date(
                              todayAttendance.timeOut,
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })
                          : "Not recorded"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">
                    Select Action
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant={actionType === "timeIn" ? "default" : "outline"}
                      onClick={() => setActionType("timeIn")}
                      disabled={!canTimeIn}
                      className={`h-12 transition-all duration-200 ${
                        actionType === "timeIn"
                          ? "bg-gradient-to-r from-[#edc6a9] to-[#eac2a2] text-white shadow-lg"
                          : "border-gray-200 hover:border-[#edc6a9] hover:bg-[#edc6a9]/10"
                      } ${!canTimeIn ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      {canTimeIn ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Time In
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-2 h-4 w-4" />
                          Time In
                        </>
                      )}
                    </Button>
                    <Button
                      variant={actionType === "timeOut" ? "default" : "outline"}
                      onClick={() => setActionType("timeOut")}
                      disabled={!canTimeOut}
                      className={`h-12 transition-all duration-200 ${
                        actionType === "timeOut"
                          ? "bg-gradient-to-r from-[#eac2a2] to-[#d9b08c] text-white shadow-lg"
                          : "border-gray-200 hover:border-[#eac2a2] hover:bg-[#eac2a2]/10"
                      } ${!canTimeOut ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      {canTimeOut ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Time Out
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-2 h-4 w-4" />
                          Time Out
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={() => setStep("scanning")}
                  className="h-12 w-full transform font-medium text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:bg-[#edc6a9] hover:shadow-xl"
                  disabled={!canTimeIn && !canTimeOut}
                >
                  <QrCode className="mr-2 h-5 w-5" />
                  Continue to Verification
                </Button>

                <Button
                  onClick={handleReturnToLogin}
                  variant="outline"
                  className="h-12 w-full border-gray-200 transition-colors duration-200 hover:bg-gray-50"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </CardContent>
            </>
          )}

          {/* QR Verification Step */}
          {step === "scanning" && employee && (
            <>
              <CardHeader className="space-y-1 pt-6 pb-4 text-center">
                <Button
                  onClick={() => setStep("details")}
                  variant="ghost"
                  size="sm"
                  className="absolute top-6 left-4 p-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  {actionType === "timeIn" ? "🌅 Time In" : "🌅 Time Out"}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Verify your identity to record attendance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 px-6 pb-6">
                {/* Method 1: Manual Input */}
                <div className="space-y-3">
                  <Label
                    htmlFor="qrInput"
                    className="flex items-center text-sm font-medium text-gray-700"
                  >
                    <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#eac2a2] text-xs text-white">
                      1
                    </span>
                    Enter Employee ID
                  </Label>
                  <Input
                    id="qrInput"
                    type="text"
                    value={qrCodeInput}
                    onChange={(e) => setQrCodeInput(e.target.value)}
                    placeholder={`Enter your ID (${employee.id})`}
                    disabled={scanningDisabled}
                    className="h-12 border-gray-200 focus:border-[#eac2a2] focus:ring-[#eac2a2]/20"
                  />
                </div>

                {/* Method 2: File Upload */}
                <div className="space-y-3">
                  <Label className="flex items-center text-sm font-medium text-gray-700">
                    <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#eac2a2] text-xs text-white">
                      2
                    </span>
                    Upload QR Code Image
                  </Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={scanningDisabled}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    disabled={scanningDisabled}
                    className="h-12 w-full border-2 border-dashed border-gray-300 transition-all duration-200 hover:border-[#eac2a2] hover:bg-[#eac2a2]/10"
                  >
                    <QrCode className="mr-2 h-5 w-5 text-[#eac2a2]" />
                    Choose QR Code Image
                  </Button>
                </div>

                {/* Method 3: Camera Scan */}
                <div className="space-y-3">
                  <Label className="flex items-center text-sm font-medium text-gray-700">
                    <span className="mr-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#eac2a2] text-xs text-white">
                      3
                    </span>
                    Scan with Camera
                  </Label>
                  <Button
                    onClick={() => {
                      setStep("camera");
                      setCameraActive(true);
                    }}
                    variant="outline"
                    disabled={scanningDisabled}
                    className="h-12 w-full border-2 border-[#edc6a9] transition-all duration-200 hover:border-[#eac2a2] hover:bg-[#eac2a2]/10"
                  >
                    <Camera className="mr-2 h-5 w-5 text-[#eac2a2]" />
                    Open Camera Scanner
                  </Button>
                </div>

                {error && (
                  <div className="flex items-center space-x-2 rounded-lg border border-red-200 bg-red-50 p-4">
                    <XCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
                    <div className="text-sm text-red-600">{error}</div>
                  </div>
                )}

                <Button
                  onClick={handleQRCodeSubmit}
                  disabled={
                    recordMutation.isPending || scanningDisabled || !qrCodeInput
                  }
                  className="h-14 w-full transform bg-gradient-to-r from-[#edc6a9] to-[#eac2a2] font-medium text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:from-[#eac2a2] hover:to-[#d9b08c] hover:shadow-xl"
                >
                  {recordMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Recording{" "}
                      {actionType === "timeIn" ? "Time In" : "Time Out"}...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-5 w-5" />
                      Record {actionType === "timeIn" ? "Time In" : "Time Out"}
                    </>
                  )}
                </Button>
              </CardContent>
            </>
          )}

          {/* Camera Scanning Step */}
          {step === "camera" && (
            <>
              <CardHeader className="space-y-1 pt-6 pb-4 text-center">
                <Button
                  onClick={() => {
                    setCameraActive(false);
                    setStep("scanning");
                  }}
                  variant="ghost"
                  size="sm"
                  className="absolute top-6 left-4 p-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  📱 Scan QR Code
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Position your QR code within the frame
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 px-6 pb-6">
                <div className="relative aspect-square w-full overflow-hidden rounded-xl border-4 border-dashed border-[#eac2a2] bg-gray-50">
                  {cameraActive && (
                    <QrScanner
                      onScan={(data: any) => {
                        if (data) handleScan({ text: data });
                      }}
                      onError={handleScanError}
                      constraints={{
                        facingMode: "environment",
                      }}
                      containerStyle={{ width: "100%" }}
                      videoStyle={{ width: "100%" }}
                    />
                  )}
                  {/* Scanning overlay */}
                  <div className="absolute inset-4 rounded-lg border-2 border-[#eac2a2]"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform">
                    <div className="h-16 w-16 animate-spin rounded-full border-4 border-[#eac2a2] border-t-transparent"></div>
                  </div>
                </div>
                <div className="text-center text-sm text-gray-600">
                  Make sure your QR code is clearly visible and well-lit
                </div>
              </CardContent>
            </>
          )}

          {/* Success Step */}
          {step === "success" && (
            <>
              <CardContent className="space-y-6 px-8 py-8 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-[#edc6a9] to-[#eac2a2] shadow-lg">
                  <Check className="h-10 w-10 animate-pulse text-white" />
                </div>
                <div>
                  <CardTitle className="mb-2 text-3xl font-bold text-gray-900">
                    🎉 Success!
                  </CardTitle>
                  <p className="text-lg text-gray-600">
                    {actionType === "timeIn" ? "Time in" : "Time out"} recorded
                    successfully
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {new Date().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </p>
                </div>

                {todayAttendance && (
                  <Card className="border-0 bg-gradient-to-r from-[#edc6a9]/20 to-[#eac2a2]/20 shadow-lg">
                    <CardContent className="space-y-3 p-6">
                      <div className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm">
                        <div className="flex items-center space-x-3">
                          <div className="h-3 w-3 rounded-full bg-green-500"></div>
                          <span className="text-sm font-medium text-gray-700">
                            Time In
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-green-600">
                          {todayAttendance.timeIn
                            ? new Date(
                                todayAttendance.timeIn,
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              })
                            : "Not recorded"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`h-3 w-3 rounded-full ${todayAttendance.timeOut ? "bg-green-500" : "bg-gray-300"}`}
                          ></div>
                          <span className="text-sm font-medium text-gray-700">
                            Time Out
                          </span>
                        </div>
                        <span
                          className={`text-sm font-semibold ${todayAttendance.timeOut ? "text-green-600" : "text-gray-400"}`}
                        >
                          {todayAttendance.timeOut
                            ? new Date(
                                todayAttendance.timeOut,
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              })
                            : "Not recorded"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eac2a2]/20">
                        <span className="text-xs font-semibold text-[#eac2a2]">
                          {countdown}
                        </span>
                      </div>
                      <span>Auto logout in {countdown} seconds</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleReturnToLogin}
                    className="h-12 w-full transform bg-gradient-to-r from-[#edc6a9] to-[#eac2a2] font-medium text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:from-[#eac2a2] hover:to-[#d9b08c] hover:shadow-xl"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Return to Login
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
