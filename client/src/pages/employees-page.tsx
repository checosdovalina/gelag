import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, Pencil, Trash2, Search, UserCircle, Users, Briefcase } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { EmployeeType } from "@shared/schema";
import MainLayout from "@/layouts/main-layout";

interface Employee {
  id: number;
  name: string;
  employeeId: string;
  position: string | null;
  employeeType: EmployeeType;
  department: string | null;
  isActive: boolean;
  createdBy: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface EmployeeFormData {
  name: string;
  employeeId: string;
  position: string;
  employeeType: EmployeeType;
  department: string;
}

export default function EmployeesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<EmployeeFormData>({
    name: "",
    employeeId: "",
    position: "",
    employeeType: EmployeeType.OPERATIVE,
    department: ""
  });

  // Check if user is a manager (can't delete employees)
  const isManager = user?.role === 'production_manager' || user?.role === 'quality_manager';
  const canDelete = user?.role === 'admin' || user?.role === 'superadmin';

  // Obtener empleados
  const { data: employees, isLoading, refetch } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/employees");
      return res.json();
    }
  });

  // Crear empleado
  const createMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      const res = await apiRequest("POST", "/api/employees", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Empleado creado",
        description: "El empleado se ha creado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear el empleado",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Actualizar empleado
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EmployeeFormData }) => {
      const res = await apiRequest("PUT", `/api/employees/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setIsUpdateDialogOpen(false);
      resetForm();
      toast({
        title: "Empleado actualizado",
        description: "El empleado se ha actualizado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar el empleado",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Eliminar empleado
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/employees/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({
        title: "Empleado eliminado",
        description: "El empleado se ha eliminado correctamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar el empleado",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      employeeId: "",
      position: "",
      employeeType: EmployeeType.OPERATIVE,
      department: ""
    });
    setSelectedEmployee(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEmployee) {
      updateMutation.mutate({ id: selectedEmployee.id, data: formData });
    }
  };

  const handleEditClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      name: employee.name,
      employeeId: employee.employeeId,
      position: employee.position || "",
      employeeType: employee.employeeType || EmployeeType.OPERATIVE,
      department: employee.department || ""
    });
    setIsUpdateDialogOpen(true);
  };
  
  // Manejar cambio en tipo de empleado
  const handleEmployeeTypeChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      employeeType: value as EmployeeType
    }));
  };

  const handleDeleteClick = (id: number) => {
    deleteMutation.mutate(id);
  };

  // Filtrar empleados según el término de búsqueda
  const filteredEmployees = employees?.filter((employee) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      employee.name.toLowerCase().includes(searchLower) ||
      employee.employeeId.toLowerCase().includes(searchLower) ||
      (employee.position && employee.position.toLowerCase().includes(searchLower)) ||
      (employee.department && employee.department.toLowerCase().includes(searchLower))
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <MainLayout title="Gestión de Empleados">
      <div className="flex justify-between items-center mb-6">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Empleado
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Empleado</DialogTitle>
              <DialogDescription>
                Ingrese los detalles del nuevo empleado.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit}>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre Completo</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employeeId">Número de Empleado</Label>
                    <Input
                      id="employeeId"
                      name="employeeId"
                      value={formData.employeeId}
                      onChange={handleInputChange}
                      required
                      placeholder="Ej. EMP001"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="position">Puesto</Label>
                    <Input
                      id="position"
                      name="position"
                      value={formData.position}
                      onChange={handleInputChange}
                      placeholder="Ej. Operador, Supervisor, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Departamento</Label>
                    <Input
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      placeholder="Ej. Producción, Calidad, etc."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employeeType">Tipo de Empleado</Label>
                  <Select
                    value={formData.employeeType}
                    onValueChange={handleEmployeeTypeChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione el tipo de empleado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={EmployeeType.OPERATIVE}>
                        <div className="flex items-center">
                          <UserCircle className="mr-2 h-4 w-4" />
                          <span>Operativo</span>
                        </div>
                      </SelectItem>
                      {!isManager && (
                        <>
                          <SelectItem value={EmployeeType.QUALITY}>
                            <div className="flex items-center">
                              <Users className="mr-2 h-4 w-4" />
                              <span>Calidad</span>
                            </div>
                          </SelectItem>
                          <SelectItem value={EmployeeType.PRODUCTION}>
                            <div className="flex items-center">
                              <Briefcase className="mr-2 h-4 w-4" />
                              <span>Producción</span>
                            </div>
                          </SelectItem>
                          <SelectItem value={EmployeeType.ADMINISTRATIVE}>
                            <div className="flex items-center">
                              <Users className="mr-2 h-4 w-4" />
                              <span>Administrativo</span>
                            </div>
                          </SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Guardar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar empleado por nombre, número, puesto o departamento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Empleado</DialogTitle>
            <DialogDescription>
              Modifique los detalles del empleado.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nombre Completo</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-employeeId">Número de Empleado</Label>
                  <Input
                    id="edit-employeeId"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-position">Puesto</Label>
                  <Input
                    id="edit-position"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-department">Departamento</Label>
                  <Input
                    id="edit-department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-employeeType">Tipo de Empleado</Label>
                <Select
                  value={formData.employeeType}
                  onValueChange={handleEmployeeTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione el tipo de empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EmployeeType.OPERATIVE}>
                      <div className="flex items-center">
                        <UserCircle className="mr-2 h-4 w-4" />
                        <span>Operativo</span>
                      </div>
                    </SelectItem>
                    {!isManager && (
                      <>
                        <SelectItem value={EmployeeType.QUALITY}>
                          <div className="flex items-center">
                            <Users className="mr-2 h-4 w-4" />
                            <span>Calidad</span>
                          </div>
                        </SelectItem>
                        <SelectItem value={EmployeeType.PRODUCTION}>
                          <div className="flex items-center">
                            <Briefcase className="mr-2 h-4 w-4" />
                            <span>Producción</span>
                          </div>
                        </SelectItem>
                        <SelectItem value={EmployeeType.ADMINISTRATIVE}>
                          <div className="flex items-center">
                            <Users className="mr-2 h-4 w-4" />
                            <span>Administrativo</span>
                          </div>
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Actualizar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº Empleado</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Puesto</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  {searchTerm 
                    ? "No se encontraron empleados que coincidan con la búsqueda." 
                    : "No hay empleados registrados."}
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees?.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>{employee.employeeId}</TableCell>
                  <TableCell>{employee.name}</TableCell>
                  <TableCell>{employee.position || "-"}</TableCell>
                  <TableCell>{employee.department || "-"}</TableCell>
                  <TableCell>
                    <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium 
                      ${employee.employeeType === EmployeeType.OPERATIVE ? 'bg-blue-100 text-blue-800' : 
                      employee.employeeType === EmployeeType.QUALITY ? 'bg-green-100 text-green-800' : 
                      employee.employeeType === EmployeeType.PRODUCTION ? 'bg-amber-100 text-amber-800' : 
                      'bg-purple-100 text-purple-800'}`}>
                      {employee.employeeType === EmployeeType.OPERATIVE ? 'Operativo' : 
                       employee.employeeType === EmployeeType.QUALITY ? 'Calidad' : 
                       employee.employeeType === EmployeeType.PRODUCTION ? 'Producción' : 
                       'Administrativo'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClick(employee)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. ¿Está seguro de eliminar al empleado "{employee.name}"?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteClick(employee.id)}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            {deleteMutation.isPending && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </MainLayout>
  );
}