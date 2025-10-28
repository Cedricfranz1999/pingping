"use client";

import type React from "react";
import { useState } from "react";
import Image from "next/image";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react"; // Change this import
import { QRCodeCanvas } from "qrcode.react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
// Safely stringify values for display without triggering base-to-string on objects
const toText = (v: unknown): string => {
  const t = typeof v;
  if (t === "string" || t === "number" || t === "boolean" || t === "bigint") {
    return String(v);
  }
  return "";
};
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
// import { Switch } from "~/components/ui/switch";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
//   AlertDialogTrigger,
// } from "~/components/ui/alert-dialog";
import {
  Plus,
  Edit,
  UserCheck,
  UserX,
  Settings,
  Users,
  Upload,
  X,
  QrCode,
  Loader2,
} from "lucide-react";
import { api } from "~/trpc/react";
import { useToast } from "~/components/ui/use-toast";

interface Employee {
  id: number;
  image?: string | null;
  firstname: string;
  middlename?: string | null;
  lastname: string;
  username: string;
  password: string;
  address: string;
  gender: string;
  isactive: boolean | null;
  canModify: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeePage = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [selectedEmployeeForQr, setSelectedEmployeeForQr] = useState<Employee | null>(null);
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive">("active");

  const {
    data: employeeData,
    refetch,
    isLoading,
  } = api.employee.getAll.useQuery({
    search: searchTerm || undefined,
    page: currentPage,
    limit: 10,
    status: statusFilter,
  });

  const createMutation = api.employee.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Employee created successfully",
        variant: "default",
      });
      refetch();
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: { message: any; }) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = api.employee.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Employee updated successfully",
        variant: "default",
      });
      refetch();
      setIsEditDialogOpen(false);
      resetForm();
    },
    onError: (error: { message: any; }) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete disabled per request (use deactivate/activate only)

  const toggleActiveMutation = api.employee.toggleActive.useMutation({
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Employee status updated",
        variant: "default",
      });
      refetch();
    },
    onError: (error: { message: any; }) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleModifyMutation = api.employee.toggleModify.useMutation({
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Employee permissions updated",
        variant: "default",
      });
      refetch();
    },
    onError: (error: { message: any; }) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const [formData, setFormData] = useState<{
    image: string;
    firstname: string;
    middlename: string;
    lastname: string;
    username: string;
    password: string;
    address: string;
    gender: string;
    isactive: boolean;
    canModify: boolean;
  }>({
    image: "",
    firstname: "",
    middlename: "",
    lastname: "",
    username: "",
    password: "",
    address: "",
    gender: "Male",
    isactive: true,
    canModify: false,
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target?.result as string;
      setFormData({ ...formData, image: base64String });
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setFormData({ ...formData, image: "" });
  };

  const resetForm = () => {
    setFormData({
      image: "",
      firstname: "",
      middlename: "",
      lastname: "",
      username: "",
      password: "",
      address: "",
      gender: "Male",
      isactive: true,
      canModify: false,
    });
    setEditingEmployee(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      image: (formData.image || "").trim() || undefined,
      firstname: formData.firstname.trim(),
      middlename: formData.middlename.trim() || undefined,
      lastname: formData.lastname.trim(),
      username: formData.username.trim(),
      address: formData.address.trim(),
      // Ensure gender matches API enum
      gender: formData.gender as "Male" | "Female" | "Other",
      // Force new employees to be active as requested
      isactive: true,
    };

    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, ...submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      image: employee.image || "",
      firstname: employee.firstname,
      middlename: employee.middlename || "",
      lastname: employee.lastname,
      username: employee.username,
      password: employee.password,
      address: employee.address,
      gender: employee.gender,
      isactive: employee.isactive ?? true,
      canModify: employee.canModify,
    });
    setIsEditDialogOpen(true);
  };

  // const handleDelete = (id?: unknown) => {};

  const handleToggleActive = (id: number, isactive: boolean) => {
    toggleActiveMutation.mutate({ id, isactive: !isactive });
  };

  const handleToggleModify = (id: number, canModify: boolean) => {
    toggleModifyMutation.mutate({ id, canModify: !canModify });
  };

  const employees = employeeData?.employees || [];
  const totalEmployees = employeeData?.overallTotal || 0;
  const activeEmployeesTotal = employeeData?.activeTotal || 0;
  const inactiveEmployeesTotal = employeeData?.inactiveTotal || 0;
  const handleGenerateQr = (employee: Employee) => {
    setSelectedEmployeeForQr(employee);
    setIsQrDialogOpen(true);
  };

  const ImagePreview = ({
    imageData,
    onRemove,
  }: {
    imageData: string;
    onRemove: () => void;
  }) => (
    <div className="relative inline-block">
      <Image
        src={imageData || "/placeholder.svg"}
        alt="Preview"
        width={80}
        height={80}
        className="rounded-lg border-2 border-[#f8610e]/20 object-cover"
        unoptimized
      />
      <Button
        type="button"
        size="sm"
        variant="destructive"
        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#f8610e]" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold text-[#f8610e] md:text-2xl">
          Employee Management
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
        <Card className="border-[#f8610e]/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#f8610e]">
              Total Employees
            </CardTitle>
            <Users className="h-4 w-4 text-[#f8610e]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#f8610e]">
              {totalEmployees}
            </div>
            {/* <p className="text-muted-foreground text-xs">
              {activeEmployees} active
            </p> */}
          </CardContent>
        </Card>
        <Card className="border-[#f8610e]/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#f8610e]">
              Active Employees
            </CardTitle>
            <UserCheck className="h-4 w-4 text-[#f8610e]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#f8610e]">
              {activeEmployeesTotal}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#f8610e]/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[#f8610e]">
              Inactive Employees
            </CardTitle>
            <UserX className="h-4 w-4 text-[#f8610e]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#f8610e]">
              {inactiveEmployeesTotal}
            </div>
          </CardContent>
        </Card>

        {/* Search Results card removed per request */}
      </div>

      <div className="grid gap-4 md:gap-8">
        {/* Search and Actions */}
        <Card className="border-[#f8610e]/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#f8610e]">Search & Actions</CardTitle>
              <Dialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2 bg-[#f8610e] hover:bg-[#f8610e]/90">
                    <Plus className="h-4 w-4" />
                    Add Employee
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-[#f8610e]">
                      Create New Employee
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="image">Profile Image</Label>
                      <div className="space-y-2">
                        {formData.image ? (
                          <ImagePreview
                            imageData={formData.image}
                            onRemove={removeImage}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <Input
                              id="image"
                              type="file"
                              accept="image/*"
                              onChange={handleFileUpload}
                              className="file:mr-4 file:rounded-full file:border-0 file:bg-[#f8610e] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#f8610e]/90"
                            />
                            <Upload className="h-4 w-4 text-[#f8610e]" />
                          </div>
                        )}
                        <p className="text-muted-foreground text-xs">
                          Max file size: 5MB. Supported formats: JPG, PNG, GIF
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstname">First Name *</Label>
                        <Input
                          id="firstname"
                          value={formData.firstname}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              firstname: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastname">Last Name *</Label>
                        <Input
                          id="lastname"
                          value={formData.lastname}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              lastname: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="middlename">Middle Name</Label>
                      <Input
                        id="middlename"
                        value={formData.middlename}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            middlename: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="username">Username *</Label>
                        <Input
                          id="username"
                          value={formData.username}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              username: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="password">Password *</Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              password: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="address">Address *</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) =>
                          setFormData({ ...formData, address: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="gender">Gender</Label>
                      <Select
                        value={formData.gender}
                        onValueChange={(value: string) =>
                          setFormData({ ...formData, gender: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Hidden: Active/Can Modify switches in create dialog per request */}
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="bg-[#f8610e] hover:bg-[#f8610e]/90"
                        disabled={createMutation.isPending}
                      >
                        {createMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Create Employee
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by name, username, or address..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="max-w-md"
                />
              </div>
              <div className="w-full lg:w-auto">
                <div className="inline-flex rounded-md shadow-sm" role="group">
                  <Button
                    type="button"
                    variant={statusFilter === "active" ? "default" : "outline"}
                    className={statusFilter === "active" ? "bg-[#f8610e] hover:bg-[#f8610e]/90" : ""}
                    onClick={() => {
                      setStatusFilter("active");
                      setCurrentPage(1);
                    }}
                  >
                    Active
                  </Button>
                  <Button
                    type="button"
                    variant={statusFilter === "inactive" ? "default" : "outline"}
                    className={statusFilter === "inactive" ? "bg-[#f8610e] hover:bg-[#f8610e]/90" : ""}
                    onClick={() => {
                      setStatusFilter("inactive");
                      setCurrentPage(1);
                    }}
                  >
                    Deactivated
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Table */}
        <Card className="border-[#f8610e]/20">
          <CardHeader>
            <CardTitle className="text-[#f8610e]">Employee List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto">
              <Table className="min-w-[1000px]">
                <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee: Employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {employee.image && (
                          <Image
                            src={employee.image || "/placeholder.svg"}
                            alt={`${toText(employee.firstname)} ${toText(employee.lastname)}`}
                            width={32}
                            height={32}
                            className="rounded-full object-cover"
                            unoptimized
                          />
                        )}
                        <div>
                          <div className="font-medium">
                            {toText(employee.firstname)} {toText(employee.middlename)} {toText(employee.lastname)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{employee.username}</TableCell>
                    <TableCell>{employee.address}</TableCell>
                    <TableCell>{employee.gender}</TableCell>
                    <TableCell>
                      <Badge
                        variant={employee.isactive ? "default" : "secondary"}
                        className={employee.isactive ? "bg-[#f8610e] hover:bg-[#f8610e]/90" : ""}
                      >
                        {employee.isactive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                         <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerateQr(employee as any)}
                        className="border-[#f8610e]/20 hover:bg-[#f8610e]/10"
                      >
                        <QrCode className="h-4 w-4" />
                        <span className="ml-1">QR Code</span>
                      </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(employee as any)}
                          className="border-[#f8610e]/20 hover:bg-[#f8610e]/10"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="ml-1">Edit</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleToggleActive(
                              employee.id,
                              employee.isactive ?? true,
                            )
                          }
                          className="border-[#f8610e]/20 hover:bg-[#f8610e]/10"
                          disabled={toggleActiveMutation.isPending}
                        >
                          {toggleActiveMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : employee.isactive ? (
                            <UserX className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                          {!toggleActiveMutation.isPending && (
                            <span className="ml-1">
                              {employee.isactive ? "Deactivate" : "Activate"}
                            </span>
                          )}
                        </Button>
                        {/* Delete hidden per request */}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#f8610e]">Edit Employee</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ... existing form fields ... */}
            <div>
              <Label htmlFor="edit-image">Profile Image</Label>
              <div className="space-y-2">
                {formData.image ? (
                  <ImagePreview
                    imageData={formData.image}
                    onRemove={removeImage}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      id="edit-image"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="file:mr-4 file:rounded-full file:border-0 file:bg-[#f8610e] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#f8610e]/90"
                    />
                    <Upload className="h-4 w-4 text-[#f8610e]" />
                  </div>
                )}
                <p className="text-muted-foreground text-xs">
                  Max file size: 5MB. Supported formats: JPG, PNG, GIF
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-firstname">First Name *</Label>
                <Input
                  id="edit-firstname"
                  value={formData.firstname}
                  onChange={(e) =>
                    setFormData({ ...formData, firstname: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-lastname">Last Name *</Label>
                <Input
                  id="edit-lastname"
                  value={formData.lastname}
                  onChange={(e) =>
                    setFormData({ ...formData, lastname: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-middlename">Middle Name</Label>
              <Input
                id="edit-middlename"
                value={formData.middlename}
                onChange={(e) =>
                  setFormData({ ...formData, middlename: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-username">Username *</Label>
                <Input
                  id="edit-username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-password">Password *</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-address">Address *</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-gender">Gender</Label>
              <Select
                value={formData.gender}
                onValueChange={(value: string) =>
                  setFormData({ ...formData, gender: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Hidden: Active/Can Modify switches in edit dialog per request */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#f8610e] hover:bg-[#f8610e]/90"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Update Employee
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
         <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#f8610e]">
              Employee QR Code
            </DialogTitle>
          </DialogHeader>
{selectedEmployeeForQr && (
  <div className="flex flex-col items-center space-y-4">
    <div className="rounded-lg border-2 border-[#f8610e]/20 p-4">
      <QRCodeCanvas
        value={selectedEmployeeForQr.id.toString()}
        size={256}
        level="H"
        includeMargin
        id="qrcode-canvas"
      />
    </div>
    <div className="text-center">
      <p className="font-semibold">
        {selectedEmployeeForQr.firstname} {selectedEmployeeForQr.lastname}
      </p>
      <p className="text-muted-foreground text-sm">
        ID: {selectedEmployeeForQr.id}
      </p>
      <p className="text-muted-foreground text-sm">
        Username: {selectedEmployeeForQr.username}
      </p>
    </div>
    <div className="flex justify-center gap-2">
      <Button
        onClick={() => {
          const canvas = document.getElementById("qrcode-canvas") as HTMLCanvasElement;
          if (!canvas) return;

          try {
            const pngUrl = canvas.toDataURL("image/png");
            const downloadLink = document.createElement("a");
            downloadLink.href = pngUrl;
            downloadLink.download = `employee-${selectedEmployeeForQr.id}-qrcode.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
          } catch (error) {
            console.error("Error downloading QR code:", error);
            toast({
              title: "Error",
              description: "Failed to download QR code",
              variant: "destructive",
            });
          }
        }}
        className="bg-[#f8610e] hover:bg-[#f8610e]/90"
      >
        Download QR Code (PNG)
      </Button>
    </div>
  </div>
)}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeePage;
