"use client";
import { useState, useEffect, useRef } from "react";
import {
  Scanner,
  useDevices,
  outline,
  boundingBox,
  centerText,
} from "@yudiel/react-qr-scanner";
import {
  Camera,
  Scan,
  Clock,
  UserCheck,
  UserX,
  QrCode,
  RotateCcw,
  VideoOff,
  Calendar,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { api } from "~/trpc/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

const AttendancePage = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<string | null>(null);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<{
    type: string;
    time: Date;
  } | null>(null);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<number | null>(
    null,
  );
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [tracker, setTracker] = useState<string>("centerText");
  const [pause, setPause] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const scanCountRef = useRef(0); // Track number of scans to prevent multiple processing

  const devices = useDevices();

  // Initialize state after component mounts
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // TRPC mutations and queries
  const recordAttendance = api.QrCode.record.useMutation();
  const getEmployee = api.QrCode.getById.useQuery(
    { id: currentEmployeeId! },
    {
      enabled: false, // Disable automatic query, we'll trigger it manually
      retry: false,
    },
  );
  const getTodayAttendance = api.QrCode.getTodayAttendance.useQuery(
    { employeeId: currentEmployeeId! },
    {
      enabled: false, // Disable automatic query
      retry: false,
    },
  );
  const getAttendanceHistory = api.QrCode.getAttendanceHistory.useQuery(
    { employeeId: currentEmployeeId! },
    {
      enabled: false, // Disable automatic query
      retry: false,
    },
  );

  function getTracker() {
    switch (tracker) {
      case "outline":
        return outline;
      case "boundingBox":
        return boundingBox;
      case "centerText":
        return centerText;
      default:
        return undefined;
    }
  }

  // Process scanned QR code data
  const processScannedData = async (data: string) => {
    if (processing || !isInitialized) return; // Prevent multiple processing or processing before initialization

    setProcessing(true);
    scanCountRef.current += 1;
    const currentScanCount = scanCountRef.current;

    try {
      // Parse the employee ID directly from the data
      const employeeId = parseInt(data, 10);

      if (isNaN(employeeId)) {
        setAttendanceStatus(
          "Invalid QR code format. Please scan a valid employee QR code.",
        );
        return;
      }

      setCurrentEmployeeId(employeeId);

      // Wait a brief moment to allow state to update
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check if this is still the current scan (not overridden by another scan)
      if (currentScanCount !== scanCountRef.current) {
        return;
      }

      // Fetch employee data manually
      try {
        const employeeResponse = await getEmployee.refetch();

        if (employeeResponse.data) {
          setEmployeeData(employeeResponse.data);

          // Check today's attendance
          const todayAttendanceResponse = await getTodayAttendance.refetch();
          const todayAttendance = todayAttendanceResponse.data;

          // Check if attendance is already completed for today
          if (todayAttendance?.timeIn && todayAttendance.timeOut) {
            setAttendanceStatus("Attendance already completed for today!");
            return;
          }

          let actionType: "TIME_IN" | "TIME_OUT" = "TIME_IN";

          if (todayAttendance?.timeIn && !todayAttendance.timeOut) {
            actionType = "TIME_OUT";
          }

          // Execute the mutation
          const result = await recordAttendance.mutateAsync({
            employeeId,
            type: actionType,
          });

          // Update state based on mutation result
          setAttendanceStatus(
            actionType === "TIME_IN"
              ? "Time In recorded successfully!"
              : "Time Out recorded successfully!",
          );

          setLastAction({
            type: actionType === "TIME_IN" ? "Time In" : "Time Out",
            time: new Date(),
          });

          // Refetch data to update the UI
          await getTodayAttendance.refetch();
          await getAttendanceHistory.refetch();
        } else {
          setAttendanceStatus("Employee not found!");
        }
      } catch (err) {
        console.error("Query error:", err);
        setAttendanceStatus("Error fetching data. Please try again.");
      }
    } catch (err) {
      console.error("Error processing scan:", err);
      setAttendanceStatus(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleScan = async (detectedCodes: any[]) => {
    if (detectedCodes.length > 0 && !pause && !processing && isInitialized) {
      const data = detectedCodes[0].rawValue;
      console.log(`QR Code scanned: ${data}`);
      setScanResult(data);
      setPause(true);

      try {
        await processScannedData(data);
      } catch (error) {
        console.error("Scan processing error:", error);
        setAttendanceStatus("Error processing scan. Please try again.");
      } finally {
        // Re-enable scanning after a delay
        setTimeout(() => {
          setPause(false);
        }, 3000);
      }
    }
  };

  const startScanner = () => {
    setError(null);
    setIsScanning(true);
  };

  const stopScanner = () => {
    setIsScanning(false);
  };

  const resetScanner = () => {
    stopScanner();
    setEmployeeData(null);
    setScanResult(null);
    setAttendanceStatus(null);
    setError(null);
    setCurrentEmployeeId(null);
    setPause(false);
    setProcessing(false);
    scanCountRef.current = 0;
  };

  // Format time for display
  const formatTime = (date: Date | null) => {
    if (!date) return "Not recorded";
    return new Date(date).toLocaleTimeString();
  };

  // Format date for display
  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  // Get status badge variant
  const getStatusVariant = (status: string | undefined) => {
    switch (status) {
      case "EXACT_TIME":
        return "default";
      case "OVERTIME":
        return "secondary";
      case "UNDERTIME":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="container mx-auto max-w-6xl p-6">
        <div className="flex h-64 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#f8610e]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center gap-2">
        <QrCode className="h-8 w-8 text-[#f8610e]" />
        <h1 className="text-3xl font-bold text-[#f8610e]">
          Pingping's employee QR Attendance System
        </h1>
      </div>

      {!isScanning ? (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-6 w-6" />
              Scan QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <p className="text-muted-foreground">
              Click the button below to open the camera and scan an employee QR
              code.
            </p>
            <Button
              onClick={startScanner}
              className="bg-[#f8610e] hover:bg-[#f8610e]/90"
              disabled={recordAttendance.isPending}
            >
              <Camera className="mr-2 h-4 w-4" />
              Start Scanning
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-6 w-6" />
                Scanner Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex gap-2">
                <select
                  className="rounded-md border p-2"
                  onChange={(e) => setDeviceId(e.target.value)}
                >
                  <option value={undefined}>Select a device</option>
                  {devices.map((device, index) => (
                    <option key={index} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))}
                </select>
                {/* <select
                  className="rounded-md border p-2"
                  onChange={(e) => setTracker(e.target.value)}
                >
                  <option value="centerText">Center Text</option>
                  <option value="outline">Outline</option>
                  <option value="boundingBox">Bounding Box</option>
                  <option value={undefined}>No Tracker</option>
                </select> */}
              </div>

              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>Camera Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">
                      Point your camera at a QR code to scan
                    </p>
                    {recordAttendance.isPending && (
                      <p className="text-blue-500">Processing attendance...</p>
                    )}
                  </div>

                  {/* QR Scanner */}
                  <div className="mx-auto flex w-full max-w-md items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                    <Scanner
                      formats={["qr_code"]}
                      constraints={{
                        deviceId: deviceId,
                      }}
                      onScan={handleScan}
                      onError={(error) => {
                        console.log(`Scanner error: ${error}`);
                        setError(`Scanner error: ${error}`);
                      }}
                      styles={{ container: { height: "300px", width: "100%" } }}
                      components={{
                        onOff: false,
                        torch: true,
                        zoom: true,
                        finder: true,
                        tracker: getTracker(),
                      }}
                      allowMultiple={false}
                      scanDelay={500}
                      paused={pause || recordAttendance.isPending || processing}
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 flex justify-center gap-2">
                <Button
                  onClick={stopScanner}
                  variant="outline"
                  disabled={recordAttendance.isPending || processing}
                >
                  <VideoOff className="mr-2 h-4 w-4" />
                  Stop Scanning
                </Button>
                {employeeData && (
                  <Button
                    onClick={resetScanner}
                    disabled={recordAttendance.isPending || processing}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Scan Another
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {employeeData && (
        <>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-6 w-6 text-[#f8610e]" />
                Employee Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <img
                  src={employeeData.image || "/api/placeholder/64/64"}
                  alt={`${employeeData.firstname} ${employeeData.lastname}`}
                  className="h-16 w-16 rounded-full object-cover"
                />
                <div>
                  <h3 className="text-xl font-semibold">
                    {employeeData.firstname}{" "}
                    {employeeData.middlename && `${employeeData.middlename} `}
                    {employeeData.lastname}
                  </h3>
                  <p className="text-muted-foreground">ID: {employeeData.id}</p>
                </div>
              </div>

              {attendanceStatus && (
                <Alert
                  className={`mt-4 ${attendanceStatus.includes("Error") || attendanceStatus.includes("already") ? "bg-yellow-100" : "bg-green-100"}`}
                >
                  <AlertTitle>
                    {attendanceStatus.includes("Error") ||
                    attendanceStatus.includes("already")
                      ? "Notice"
                      : "Success"}
                  </AlertTitle>
                  <AlertDescription>{attendanceStatus}</AlertDescription>
                </Alert>
              )}

              {getTodayAttendance.data && (
                <div className="mt-4 space-y-2">
                  <h4 className="font-semibold">Today's Attendance Record</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-sm">
                        Time In
                      </span>
                      <span className="font-medium">
                        {formatTime(getTodayAttendance.data.timeIn)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-sm">
                        Time Out
                      </span>
                      <span className="font-medium">
                        {formatTime(getTodayAttendance.data.timeOut)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-sm">
                      Status
                    </span>
                    <div className="mt-1">
                      <Badge
                        variant={getStatusVariant(
                          getTodayAttendance.data.status || undefined,
                        )}
                      >
                        {getTodayAttendance.data.status || "PENDING"}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              {lastAction && (
                <div className="bg-muted mt-4 rounded-md p-3">
                  <p className="text-muted-foreground text-sm">Last action</p>
                  <p className="font-medium">
                    {lastAction.type} at {lastAction.time.toLocaleTimeString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendance History Table */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-6 w-6 text-[#f8610e]" />
                Attendance History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getAttendanceHistory.data &&
              getAttendanceHistory.data.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Time In</TableHead>
                        <TableHead>Time Out</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Total Hours</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getAttendanceHistory.data.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            {formatDate(record.date)}
                          </TableCell>
                          <TableCell>{formatTime(record.timeIn)}</TableCell>
                          <TableCell>{formatTime(record.timeOut)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={getStatusVariant(
                                record.status || undefined,
                              )}
                            >
                              {record.status || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {record.timeIn && record.timeOut
                              ? calculateTotalHours(
                                  record.timeIn,
                                  record.timeOut,
                                )
                              : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground py-4 text-center">
                  No attendance records found for this employee.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

// Helper function to calculate total hours worked
function calculateTotalHours(timeIn: Date, timeOut: Date): string {
  const diffMs = timeOut.getTime() - timeIn.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

export default AttendancePage;
