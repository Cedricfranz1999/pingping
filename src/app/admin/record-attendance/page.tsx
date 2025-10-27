// ~/app/attendance/page.tsx
"use client";
import { useState } from "react";
import { type NextPage } from "next";
import Head from "next/head";
import { Calendar, Clock, Plus, Search, Trash2, User } from "lucide-react";
import { format } from "date-fns";
import { api } from "~/trpc/react";

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
import { Checkbox } from "~/components/ui/checkbox";

const AttendancePage: NextPage = () => {
  type AttendanceItem = {
    id: number;
    employeeId: number;
    employee: { firstname: string; lastname: string; username?: string };
    date: Date;
    timeIn?: Date | null;
    timeOut?: Date | null;
    status?: "OVERTIME" | "UNDERTIME" | "EXACT_TIME" | null;
  };
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [employeeId, setEmployeeId] = useState<number | undefined>();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState<{
    id: number;
    employee: { firstname: string; lastname: string };
  } | null>(null);

  // Form states
  const [newAttendance, setNewAttendance] = useState({
    employeeId: 0,
    timeIn: new Date(),
    timeOut: undefined as Date | undefined,
    status: undefined as "OVERTIME" | "UNDERTIME" | "EXACT_TIME" | undefined,
  });

  // Normalize selected date to local noon to avoid timezone day-shift in server (UTC) environments
  const selectedDateMidday = selectedDate
    ? new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        12,
        0,
        0,
        0,
      )
    : undefined;

  const { data: attendances, refetch } = api.attendanceRecord.getAll.useQuery({
    employeeId,
    date: selectedDateMidday,
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

  const updateAttendance = api.attendanceRecord.update.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const deleteAttendance = api.attendanceRecord.delete.useMutation({
    onSuccess: () => {
      void refetch();
      setIsDeleteModalOpen(false);
    },
  });

  const deleteManyAttendance = api.attendanceRecord.deleteMany.useMutation({
    onSuccess: () => {
      void refetch();
      setIsBulkDeleteOpen(false);
      setSelectedIds([]);
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

  const handleDelete = () => {
    if (selectedAttendance) {
      deleteAttendance.mutate({ id: selectedAttendance.id });
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const allOnPageSelected = (attendances ?? []).length > 0 &&
    (attendances ?? []).every((a: AttendanceItem) => selectedIds.includes(a.id));

  const toggleSelectAllOnPage = () => {
    if (allOnPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !(attendances ?? []).some((a: AttendanceItem) => a.id === id)));
    } else {
      const pageIds = (attendances ?? []).map((a: AttendanceItem) => a.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-[#f8610e] md:text-3xl">
            Attendance Records
          </h1>
          <div className="flex gap-2">
            {/* Hidden per request: top action buttons (Check In, Check Out, Add Record)
            <Button
              onClick={() => setIsCheckInModalOpen(true)}
              className="bg-green-600 hover:bg-green-600/90"
            >
              <Clock className="mr-2 h-4 w-4" />
              Check In
            </Button>
            <Button
              onClick={() => setIsCheckOutModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-600/90"
            >
              <Clock className="mr-2 h-4 w-4" />
              Check Out
            </Button>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[#f8610e] hover:bg-[#f8610e]/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Record
            </Button>
            */}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
            <Input
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="justify-start text-left font-normal"
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

          <Input
            type="number"
            placeholder="Filter by Employee ID (number)"
            value={employeeId || ""}
            onChange={(e) =>
              setEmployeeId(e.target.value ? Number(e.target.value) : undefined)
            }
          />
        </div>

        {/* Bulk actions bar */}
        <div className="flex items-center justify-between py-2">
          <div className="text-sm text-gray-600">
            Selected: {selectedIds.length}
          </div>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              disabled={selectedIds.length === 0 || deleteManyAttendance.isPending}
              onClick={() => setIsBulkDeleteOpen(true)}
            >
              {deleteManyAttendance.isPending ? "Deleting..." : "Delete Selected"}
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allOnPageSelected}
                    onCheckedChange={toggleSelectAllOnPage}
                    aria-label="Select all on page"
                  />
                </TableHead>
                <TableHead>Attendance ID</TableHead>
                <TableHead>Employee ID</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time In</TableHead>
                <TableHead>Time Out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendances?.map((attendance: AttendanceItem) => (
                <TableRow key={attendance.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(attendance.id)}
                      onCheckedChange={() => toggleSelect(attendance.id)}
                      aria-label={`Select attendance ${attendance.id}`}
                    />
                  </TableCell>
                  <TableCell>{attendance.id}</TableCell>
                  <TableCell>{attendance.employeeId}</TableCell>
                  <TableCell>
                    {attendance.employee.firstname}{" "}
                    {attendance.employee.lastname}
                  </TableCell>
                  <TableCell>
                    {format(attendance.date, "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>
                    {attendance.timeIn
                      ? format(attendance.timeIn, "hh:mm a")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {attendance.timeOut
                      ? format(attendance.timeOut, "hh:mm a")
                      : "-"}
                  </TableCell>
                  <TableCell>{attendance.status || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedAttendance(attendance);
                        setIsDeleteModalOpen(true);
                      }}
                      className="hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
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
                onValueChange={(value: string) =>
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

      {/* Bulk Delete Confirmation Modal */}
      <Dialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Selected Records</DialogTitle>
            <DialogDescription>
              You are about to delete {selectedIds.length} attendance record{selectedIds.length === 1 ? "" : "s"}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-60 overflow-auto rounded border p-3 text-sm">
            {(attendances ?? [])
              .filter((a: AttendanceItem) => selectedIds.includes(a.id))
              .map((a: AttendanceItem) => (
                <div key={a.id} className="flex items-center justify-between py-1">
                  <span>#{a.id} - {a.employee.firstname} {a.employee.lastname}</span>
                  <span className="text-muted-foreground">{a.employeeId}</span>
                </div>
              ))}
            {selectedIds.length === 0 && <div>No records selected.</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={selectedIds.length === 0 || deleteManyAttendance.isPending}
              onClick={() => deleteManyAttendance.mutate({ ids: selectedIds })}
            >
              {deleteManyAttendance.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
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

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete attendance record for{" "}
              <span className="font-semibold">
                {selectedAttendance?.employee.firstname}{" "}
                {selectedAttendance?.employee.lastname}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteAttendance.isPending}
            >
              {deleteAttendance.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AttendancePage;
