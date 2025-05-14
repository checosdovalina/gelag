import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Search, Plus, Pencil } from "lucide-react";
import MainLayout from "@/layouts/main-layout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserRole } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  createdAt: string;
}

// Form validation schema
const userFormSchema = z.object({
  username: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres"),
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Correo electrónico inválido"),
  role: z.nativeEnum(UserRole),
  department: z.string().optional(),
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .optional(),
});

export default function UsersPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Fetch users
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Define the form
  const form = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      name: "",
      email: "",
      role: UserRole.VIEWER,
      department: "",
      password: "",
    },
  });

  // Reset form when dialog opens/closes
  const resetForm = (user?: User) => {
    if (user) {
      form.reset({
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department || "",
        password: "", // Don't set password when editing
      });
    } else {
      form.reset({
        username: "",
        name: "",
        email: "",
        role: UserRole.VIEWER,
        department: "",
        password: "",
      });
    }
  };

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/users", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Usuario creado",
        description: "El usuario ha sido creado exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear el usuario",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/users/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Usuario actualizado",
        description: "El usuario ha sido actualizado exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar el usuario",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Open dialog for creating/editing user
  const openUserDialog = (user?: User) => {
    if (user) {
      setSelectedUser(user);
    } else {
      setSelectedUser(null);
    }
    resetForm(user);
    setIsDialogOpen(true);
  };

  // Handle form submission
  const onSubmit = (data: z.infer<typeof userFormSchema>) => {
    // If no password is provided and we're editing, remove it from the payload
    if (selectedUser && !data.password) {
      const { password, ...dataWithoutPassword } = data;
      updateUserMutation.mutate({ id: selectedUser.id, data: dataWithoutPassword });
    } else if (selectedUser) {
      updateUserMutation.mutate({ id: selectedUser.id, data });
    } else {
      createUserMutation.mutate(data);
    }
  };

  // Define columns for data table
  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "name",
      header: "Nombre",
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "username",
      header: "Usuario",
    },
    {
      accessorKey: "email",
      header: "Correo electrónico",
    },
    {
      accessorKey: "role",
      header: "Rol",
      cell: ({ row }) => {
        const role = row.getValue("role") as UserRole;
        let variant: "default" | "destructive" | "outline" | "secondary" | null = null;
        
        switch (role) {
          case UserRole.ADMIN:
            variant = "destructive";
            break;
          case UserRole.PRODUCTION:
            variant = "default";
            break;
          case UserRole.QUALITY:
            variant = "secondary";
            break;
          case UserRole.PRODUCTION_MANAGER:
            variant = "default";
            break;
          case UserRole.QUALITY_MANAGER:
            variant = "secondary";
            break;
          case UserRole.VIEWER:
            variant = "outline";
            break;
        }
        
        return <Badge variant={variant}>{role}</Badge>;
      },
    },
    {
      accessorKey: "department",
      header: "Departamento",
      cell: ({ row }) => row.getValue("department") || "—",
    },
    {
      id: "actions",
      cell: ({ row }) => {
        return (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openUserDialog(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        );
      },
    },
  ];

  // Filter users based on search term
  const filteredUsers = users
    ? users.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.department &&
            user.department.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : [];

  return (
    <MainLayout title="Gestión de Usuarios">
      <div className="space-y-6">
        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
            <Input
              placeholder="Buscar usuarios..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Button className="w-full sm:w-auto" onClick={() => openUserDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Usuario
          </Button>
        </div>
        
        {/* Users list */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={filteredUsers}
              searchPlaceholder="Filtrar usuarios..."
              searchColumn="name"
            />
          </CardContent>
        </Card>
        
        {/* User dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedUser ? "Editar Usuario" : "Crear Usuario"}
              </DialogTitle>
              <DialogDescription>
                {selectedUser
                  ? "Modifique los datos del usuario a continuación."
                  : "Complete los datos para crear un nuevo usuario."}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Juan Pérez" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre de Usuario</FormLabel>
                        <FormControl>
                          <Input placeholder="usuario" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correo Electrónico</FormLabel>
                        <FormControl>
                          <Input placeholder="usuario@empresa.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {selectedUser
                          ? "Contraseña (dejar en blanco para mantener)"
                          : "Contraseña"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={selectedUser ? "••••••" : "Contraseña"}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rol</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione un rol" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={UserRole.ADMIN}>Administrador</SelectItem>
                            <SelectItem value={UserRole.PRODUCTION}>Producción</SelectItem>
                            <SelectItem value={UserRole.QUALITY}>Calidad</SelectItem>
                            <SelectItem value={UserRole.PRODUCTION_MANAGER}>Gerente Producción</SelectItem>
                            <SelectItem value={UserRole.QUALITY_MANAGER}>Gerente Calidad</SelectItem>
                            <SelectItem value={UserRole.VIEWER}>Visualizador</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Departamento</FormLabel>
                        <FormControl>
                          <Input placeholder="Departamento" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      createUserMutation.isPending || updateUserMutation.isPending
                    }
                  >
                    {createUserMutation.isPending || updateUserMutation.isPending
                      ? "Guardando..."
                      : selectedUser
                      ? "Actualizar"
                      : "Crear"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
