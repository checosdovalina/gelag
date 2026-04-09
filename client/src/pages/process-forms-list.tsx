import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useProductionForms } from "@/hooks/use-production-form";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import SidebarLayout from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Loader2, Plus, MoreHorizontal, FileEdit, Trash2, Search, X } from "lucide-react";
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
  
  const [folioFilter, setFolioFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  
  const userRole = user?.role.toLowerCase();

  const canCreateForms = user && userRole && ["superadmin", "admin", "produccion", "gerente_produccion", "gerente_calidad"].includes(userRole);
  const canEditForms = user && userRole && ["superadmin", "admin", "produccion", "calidad", "gerente_produccion", "gerente_calidad"].includes(userRole);
  const canDeleteForms = user && userRole && ["superadmin", "admin", "gerente_produccion", "gerente_calidad"].includes(userRole);
  
  // Normaliza cualquier formato de fecha a YYYY-MM-DD para comparación
  const normalizeDateForFilter = (dateStr: string): string => {
    if (!dateStr) return '';
    // Si es DD/MM/YYYY -> YYYY-MM-DD
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const [d, m, y] = dateStr.split('/');
      return `${y}-${m}-${d}`;
    }
    // Si es timestamp ISO o YYYY-MM-DD, toma los primeros 10 caracteres
    return dateStr.substring(0, 10);
  };

  const filteredForms = useMemo(() => {
    if (!forms) return [];
    return forms.filter((form) => {
      if (folioFilter && !form.folio?.toLowerCase().includes(folioFilter.toLowerCase())) {
        return false;
      }
      // Solo aplica filtro de fecha si el formulario tiene fecha
      const formDate = normalizeDateForFilter(form.date || '');
      if (formDate) {
        if (dateFromFilter && formDate < dateFromFilter) {
          return false;
        }
        if (dateToFilter && formDate > dateToFilter) {
          return false;
        }
      }
      return true;
    });
  }, [forms, folioFilter, dateFromFilter, dateToFilter]);

  const clearFilters = () => {
    setFolioFilter("");
    setDateFromFilter("");
    setDateToFilter("");
  };

  const hasActiveFilters = folioFilter || dateFromFilter || dateToFilter;

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
      <Tabs defaultValue="production" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="production">Formularios de Producción</TabsTrigger>
          <TabsTrigger value="dulces">Ficha Técnica Dulces</TabsTrigger>
        </TabsList>
        
        <TabsContent value="production">
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
              <div className="flex flex-wrap items-end gap-3 mb-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1 min-w-[180px]">
                  <Label htmlFor="prod-folio-filter" className="text-xs text-muted-foreground mb-1 block">Buscar por Folio</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="prod-folio-filter"
                      placeholder="Ej: A-3010"
                      value={folioFilter}
                      onChange={(e) => setFolioFilter(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                </div>
                <div className="min-w-[150px]">
                  <Label htmlFor="prod-date-from" className="text-xs text-muted-foreground mb-1 block">Fecha desde</Label>
                  <Input
                    id="prod-date-from"
                    type="date"
                    value={dateFromFilter}
                    onChange={(e) => setDateFromFilter(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="min-w-[150px]">
                  <Label htmlFor="prod-date-to" className="text-xs text-muted-foreground mb-1 block">Fecha hasta</Label>
                  <Input
                    id="prod-date-to"
                    type="date"
                    value={dateToFilter}
                    onChange={(e) => setDateToFilter(e.target.value)}
                    className="h-9"
                  />
                </div>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
                    <X className="mr-1 h-4 w-4" />
                    Limpiar
                  </Button>
                )}
              </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !filteredForms || filteredForms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="mb-4 text-muted-foreground">
                {hasActiveFilters 
                  ? "No se encontraron formularios con los filtros seleccionados." 
                  : "No hay formularios de producción disponibles."}
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Limpiar filtros
                </Button>
              ) : canCreateForms ? (
                <Button variant="outline" onClick={handleCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear primer formulario
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              {hasActiveFilters && (
                <p className="text-sm text-muted-foreground mb-2">
                  Mostrando {filteredForms.length} de {forms?.length || 0} formularios
                </p>
              )}
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
                    {filteredForms.map((form) => (
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
            </>
          )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="dulces">
          <DulcesFormsList />
        </TabsContent>
      </Tabs>
    </SidebarLayout>
  );
}

function DulcesFormsList() {
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [folioFilter, setFolioFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");

  const userRole = user?.role.toLowerCase();
  const canDeleteEntries = user && userRole && ["superadmin", "admin", "gerente_produccion"].includes(userRole);

  const { data: dulcesTemplate, isLoading } = useQuery({
    queryKey: ['/api/form-templates/19'],
    queryFn: async () => {
      const response = await fetch('/api/form-templates/19');
      if (!response.ok) {
        throw new Error('Error al cargar template');
      }
      return response.json();
    }
  });

  const { data: dulcesEntries = [], isLoading: entriesLoading, refetch } = useQuery({
    queryKey: ['/api/form-entries', 'dulces', 19],
    queryFn: async () => {
      const response = await fetch('/api/form-entries?templateId=19');
      if (!response.ok) {
        throw new Error('Error al cargar entradas');
      }
      const data = await response.json();
      return data.entries || [];
    }
  });

  const filteredEntries = useMemo(() => {
    if (!dulcesEntries) return [];
    return dulcesEntries.filter((entry: any) => {
      const entryFolio = entry.data?.folio || `PR-02-${String(entry.id).padStart(3, '0')}`;
      const rawDate = entry.data?.fecha || (entry.createdAt ? entry.createdAt : '');
      const entryDate = rawDate.substring(0, 10);
      
      if (folioFilter && !entryFolio.toLowerCase().includes(folioFilter.toLowerCase())) {
        return false;
      }
      if (dateFromFilter && entryDate < dateFromFilter) {
        return false;
      }
      if (dateToFilter && entryDate > dateToFilter) {
        return false;
      }
      return true;
    });
  }, [dulcesEntries, folioFilter, dateFromFilter, dateToFilter]);

  const clearFilters = () => {
    setFolioFilter("");
    setDateFromFilter("");
    setDateToFilter("");
  };

  const hasActiveFilters = folioFilter || dateFromFilter || dateToFilter;

  const handleCreateDulces = () => {
    navigate('/form-viewer/new/19');
  };

  const handleEditDulces = (entryId: number) => {
    navigate(`/form-viewer/${entryId}`);
  };

  const handleDeleteEntry = async (entryId: number) => {
    if (window.confirm("¿Está seguro de que desea eliminar este formulario?")) {
      try {
        const response = await fetch(`/api/form-entries/${entryId}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          throw new Error('Error al eliminar formulario');
        }
        
        toast({
          title: "Formulario eliminado",
          description: "El formulario ha sido eliminado correctamente.",
        });
        
        refetch();
      } catch (error) {
        toast({
          title: "Error al eliminar formulario",
          description: error instanceof Error ? error.message : "Error desconocido",
          variant: "destructive",
        });
      }
    }
  };

  if (isLoading || entriesLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>PR-PR-02 Ficha técnica producción de dulces</CardTitle>
          <CardDescription>
            Formulario especializado para el proceso de producción de dulces con secciones por roles.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreateDulces}>
            <Plus className="mr-2 h-4 w-4" />
            Capturar Datos
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-3 mb-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex-1 min-w-[180px]">
            <Label htmlFor="dulces-folio-filter" className="text-xs text-muted-foreground mb-1 block">Buscar por Folio</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="dulces-folio-filter"
                placeholder="Ej: A-3010"
                value={folioFilter}
                onChange={(e) => setFolioFilter(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
          <div className="min-w-[150px]">
            <Label htmlFor="dulces-date-from" className="text-xs text-muted-foreground mb-1 block">Fecha desde</Label>
            <Input
              id="dulces-date-from"
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="min-w-[150px]">
            <Label htmlFor="dulces-date-to" className="text-xs text-muted-foreground mb-1 block">Fecha hasta</Label>
            <Input
              id="dulces-date-to"
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              className="h-9"
            />
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
              <X className="mr-1 h-4 w-4" />
              Limpiar
            </Button>
          )}
        </div>

        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="mb-4 text-muted-foreground">
              {hasActiveFilters
                ? "No se encontraron formularios con los filtros seleccionados."
                : "No hay formularios de dulces disponibles."}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Limpiar filtros
              </Button>
            ) : (
              <Button variant="outline" onClick={handleCreateDulces}>
                <Plus className="mr-2 h-4 w-4" />
                Crear primer formulario
              </Button>
            )}
          </div>
        ) : (
          <>
            {hasActiveFilters && (
              <p className="text-sm text-muted-foreground mb-2">
                Mostrando {filteredEntries.length} de {dulcesEntries.length} formularios
              </p>
            )}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Folio</TableHead>
                    <TableHead>Proceso</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry: any) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {entry.data?.folio || `PR-02-${String(entry.id).padStart(3, '0')}`}
                      </TableCell>
                      <TableCell>{entry.data?.proceso || 'Dulces'}</TableCell>
                      <TableCell>{entry.data?.fecha || new Date(entry.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{entry.data?.responsable || entry.createdBy}</TableCell>
                      <TableCell>
                        <Badge variant={entry.workflowStatus === 'COMPLETED' ? 'default' : 'secondary'}>
                          {entry.workflowStatus || 'DRAFT'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Acciones</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditDulces(entry.id)}>
                              <FileEdit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            {canDeleteEntries && (
                              <DropdownMenuItem 
                                onClick={() => handleDeleteEntry(entry.id)}
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
