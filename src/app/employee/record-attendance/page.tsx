// ~/app/attendance/page.tsx
"use client";
import { useState } from "react";
import { type NextPage } from "next";
import Head from "next/head";
import { Calendar, Clock, QrCode } from "lucide-react";
import { format } from "date-fns";
import { api } from "~/trpc/react";
import { QRCodeCanvas } from "qrcode.react";

// shadcn/ui imports
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { Calendar as CalendarUI } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useAuthStore } from "~/app/store/auth-store";

const AttendancePage: NextPage = () => {
  const { user } = useAuthStore();

  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [employeeId, setEmployeeId] = useState<number | undefined>();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);

  // NEW: QR dialog state
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);

  const [newAttendance, setNewAttendance] = useState({
    employeeId: 0,
    timeIn: new Date(),
    timeOut: undefined as Date | undefined,
    status: undefined as "OVERTIME" | "UNDERTIME" | "EXACT_TIME" | undefined,
  });

  const { data: attendances, refetch } = api.attendanceRecord.getAll.useQuery({
    employeeId: user?.userId,
    date: selectedDate,
    search,
  });

  const createAttendance = api.attendanceRecord.create.useMutation({
    onSuccess: () => {
      void refetch();
      setIsCreateModalOpen(false);
      setNewAttendance({
        employeeId: 0,
        timeIn: new Date(),
        timeOut: undefined,
        status: undefined,
      });
    },
  });

  const checkIn = api.attendanceRecord.checkIn.useMutation({
    onSuccess: () => {
      void refetch();
      setIsCheckInModalOpen(false);
    },
  });

  const checkOut = api.attendanceRecord.checkOut.useMutation({
    onSuccess: () => {
      void refetch();
      setIsCheckOutModalOpen(false);
    },
  });

  const handleCreate = () => {
    if (newAttendance.employeeId) {
      createAttendance.mutate({
        employeeId: newAttendance.employeeId,
        timeIn: newAttendance.timeIn,
        timeOut: newAttendance.timeOut,
        status: newAttendance.status,
      });
    }
  };

  const handleCheckIn = () => {
    if (newAttendance.employeeId) {
      checkIn.mutate({ employeeId: newAttendance.employeeId });
    }
  };

  const handleCheckOut = () => {
    if (newAttendance.employeeId) {
      checkOut.mutate({ employeeId: newAttendance.employeeId });
    }
  };

  return (
    <>
      <Head>
        <title>Attendance Management</title>
        <meta name="description" content="Manage employee attendance" />
      </Head>

      <div className="space-y-6">
        {/* Header + My QR */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-[#f8610e] md:text-3xl">
            Attendance Records
          </h1>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsQrDialogOpen(true)}
              className="border-[#f8610e]/30 hover:bg-[#f8610e]/10"
            >
              <QrCode className="mr-2 h-4 w-4" />
              My QR
            </Button>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* <Input className="w-64" placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)} /> */}
          {/* <Input className="w-64" type="number" placeholder="Filter by Employee ID" value={employeeId || ""} onChange={(e) => setEmployeeId(e.target.value ? Number(e.target.value) : undefined)} /> */}

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-auto justify-start text-left font-normal"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : "Filter by date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarUI
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Table (with horizontal scroll on small screens) */}
        <div className="overflow-x-auto rounded-md border">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[70px]">ID</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead className="w-[140px] text-center">Date</TableHead>
                <TableHead className="w-[110px] text-center">Time In</TableHead>
                <TableHead className="w-[110px] text-center">Time Out</TableHead>
                <TableHead className="w-[120px] text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendances?.map((attendance) => (
                <TableRow key={attendance.id}>
                  <TableCell>{attendance.id}</TableCell>

                  <TableCell>
                    {attendance.employee.firstname}{" "}
                    {attendance.employee.lastname}
                  </TableCell>

                  <TableCell className="text-center whitespace-nowrap">
                    {format(attendance.date, "MMM dd, yyyy")}
                  </TableCell>

                  <TableCell className="text-center font-mono tabular-nums whitespace-nowrap">
                    {attendance.timeIn ? format(attendance.timeIn, "hh:mm a") : "—"}
                  </TableCell>

                  <TableCell className="text-center font-mono tabular-nums whitespace-nowrap">
                    {attendance.timeOut ? format(attendance.timeOut, "hh:mm a") : "—"}
                  </TableCell>

                  <TableCell className="text-center">
                    {attendance.status || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create Attendance Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-[#f8610e]">
              Add Attendance Record
            </DialogTitle>
            <DialogDescription>
              Create a new attendance record
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employee-id">Employee ID</Label>
              <Input
                id="employee-id"
                type="number"
                value={newAttendance.employeeId || ""}
                onChange={(e) =>
                  setNewAttendance({
                    ...newAttendance,
                    employeeId: Number(e.target.value),
                  })
                }
                placeholder="Enter employee ID"
              />
            </div>

            <div className="space-y-2">
              <Label>Time In</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    {newAttendance.timeIn
                      ? format(newAttendance.timeIn, "PPPp")
                      : "Select time"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarUI
                    mode="single"
                    selected={newAttendance.timeIn}
                    onSelect={(date) =>
                      date &&
                      setNewAttendance({ ...newAttendance, timeIn: date })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Time Out</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    {newAttendance.timeOut
                      ? format(newAttendance.timeOut, "PPPp")
                      : "Select time"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarUI
                    mode="single"
                    selected={newAttendance.timeOut}
                    onSelect={(date) =>
                      setNewAttendance({
                        ...newAttendance,
                        timeOut: date || undefined,
                      })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                onValueChange={(value) =>
                  setNewAttendance({
                    ...newAttendance,
                    status: value as "OVERTIME" | "UNDERTIME" | "EXACT_TIME",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OVERTIME">Overtime</SelectItem>
                  <SelectItem value="UNDERTIME">Undertime</SelectItem>
                  <SelectItem value="EXACT_TIME">Exact Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createAttendance.isPending}
                className="bg-[#f8610e] hover:bg-[#f8610e]/90"
              >
                {createAttendance.isPending ? "Saving..." : "Save Record"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Check In Modal */}
      <Dialog open={isCheckInModalOpen} onOpenChange={setIsCheckInModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-green-600">
              Employee Check In
            </DialogTitle>
            <DialogDescription>Record employee check in time</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="checkin-employee-id">Employee ID</Label>
              <Input
                id="checkin-employee-id"
                type="number"
                value={newAttendance.employeeId || ""}
                onChange={(e) =>
                  setNewAttendance({
                    ...newAttendance,
                    employeeId: Number(e.target.value),
                  })
                }
                placeholder="Enter employee ID"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCheckInModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCheckIn}
                disabled={checkIn.isPending}
                className="bg-green-600 hover:bg-green-600/90"
              >
                {checkIn.isPending ? "Processing..." : "Check In"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Check Out Modal */}
      <Dialog open={isCheckOutModalOpen} onOpenChange={setIsCheckOutModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-blue-600">
              Employee Check Out
            </DialogTitle>
            <DialogDescription>
              Record employee check out time
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="checkout-employee-id">Employee ID</Label>
              <Input
                id="checkout-employee-id"
                type="number"
                value={newAttendance.employeeId || ""}
                onChange={(e) =>
                  setNewAttendance({
                    ...newAttendance,
                    employeeId: Number(e.target.value),
                  })
                }
                placeholder="Enter employee ID"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCheckOutModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCheckOut}
                disabled={checkOut.isPending}
                className="bg-blue-600 hover:bg-blue-600/90"
              >
                {checkOut.isPending ? "Processing..." : "Check Out"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* My QR Dialog */}
      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#f8610e]">My QR Code</DialogTitle>
            <DialogDescription>
              This QR encodes your ID for quick attendance scanning.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center space-y-4">
            <div className="rounded-lg border-2 border-[#f8610e]/20 p-4">
              <QRCodeCanvas
                id="attendance-qr-canvas"
                value={(user?.userId ?? "").toString()}
                size={256}
                level="H"
                includeMargin
              />
            </div>

            <div className="text-center">
              <p className="font-semibold">
                {user?.firstName
                  ? `${user.firstName} ${user?.lastName ?? ""}`.trim()
                  : "Current User"}
              </p>
              <p className="text-muted-foreground text-sm">
                ID: {user?.userId ?? "—"}
              </p>
            </div>

            <div className="flex justify-center gap-2">
              <Button
                onClick={() => {
                  const canvas = document.getElementById(
                    "attendance-qr-canvas"
                  ) as HTMLCanvasElement | null;
                  if (!canvas) return;
                  try {
                    const pngUrl = canvas.toDataURL("image/png");
                    const link = document.createElement("a");
                    link.href = pngUrl;
                    link.download = `attendance-qr-${user?.userId ?? "user"}.png`;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="bg-[#f8610e] hover:bg-[#f8610e]/90"
              >
                Download QR (PNG)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AttendancePage;
