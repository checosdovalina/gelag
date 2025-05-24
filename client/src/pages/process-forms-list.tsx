import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useProductionForms } from "@/hooks/use-production-form";
import SidebarLayout from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Plus, MoreHorizontal, FileEdit, Trash2 } from "lucide-react";
import { ProductionFormStatus } from "@shared/schema";

interface ProcessForm {
  id: number;
  productId: string;
  liters: number;
  date: string;
  status: ProductionFormStatus;
  createdBy: number;
  createdAt: string;
  folio: string;
  responsible: string;
}

export default function ProcessFormsList() {
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const { forms, isLoading, deleteFormMutation } = useProductionForms();
  
  // Normalizamos el rol a minúsculas para evitar problemas de coincidencia
  const userRole = user?.role.toLowerCase();

  // Incluimos los gerentes en las reglas de permisos
  const canCreateForms = user && ["superadmin", "admin", "produccion", "gerente_produccion"].includes(userRole);
  const canEditForms = user && ["superadmin", "admin", "produccion", "calidad", "gerente_produccion", "gerente_calidad"].includes(userRole);
  const canDeleteForms = user && ["superadmin"].includes(userRole);
  
  const handleCreate = () => {
    navigate("/production-form");
  };
  
  const handleEdit = (id: number) => {
    navigate(`/production-form/${id}`);
  };
  
  const handleDelete = async (id: number) => {
    if (window.confirm("¿Está seguro de que desea eliminar este formulario?")) {
      try {
        await deleteFormMutation.mutateAsync(id);
      } catch (error) {
        console.error("Error al eliminar formulario:", error);
      }
    }
  };
  
  // Función para mostrar badges de estado
  const getStatusBadge = (status: ProductionFormStatus) => {
    switch (status) {
      case ProductionFormStatus.DRAFT:
        return <Badge variant="outline">Borrador</Badge>;
      case ProductionFormStatus.IN_PROGRESS:
        return <Badge variant="default">En Progreso</Badge>;
      case ProductionFormStatus.PENDING_REVIEW:
        return <Badge variant="secondary">Pendiente de Revisión</Badge>;
      case ProductionFormStatus.COMPLETED:
        return <Badge variant="success">Completado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Función para formatear fechas
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };
  
  return (
    <SidebarLayout title="Formularios de Proceso">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Formularios de Producción</CardTitle>
            <CardDescription>
              Gestione formularios de producción con diferentes secciones para cada rol de usuario.
            </CardDescription>
          </div>
          {canCreateForms && (
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Formulario
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !forms || forms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="mb-4 text-muted-foreground">
                No hay formularios de producción disponibles.
              </p>
              {canCreateForms && (
                <Button variant="outline" onClick={handleCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear primer formulario
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Folio</TableHead>
                    <TableHead>Proceso</TableHead>
                    <TableHead>Litros</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forms.map((form) => (
                    <TableRow key={form.id}>
                      <TableCell className="font-medium">{form.folio}</TableCell>
                      <TableCell>{form.productId}</TableCell>
                      <TableCell>{form.liters}</TableCell>
                      <TableCell>{formatDate(form.date)}</TableCell>
                      <TableCell>{form.responsible}</TableCell>
                      <TableCell>{getStatusBadge(form.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Acciones</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canEditForms && (
                              <DropdownMenuItem onClick={() => handleEdit(form.id)}>
                                <FileEdit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            {canDeleteForms && (
                              <DropdownMenuItem 
                                onClick={() => handleDelete(form.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </SidebarLayout>
  );
}