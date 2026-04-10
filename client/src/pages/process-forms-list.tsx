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
import { Loader2, Plus, MoreHorizontal, FileEdit, Trash2, Search, X, ChevronLeft, ChevronRight, ClipboardList } from "lucide-react";
import { ProductionFormStatus } from "@shared/schema";

const PAGE_SIZE = 25;

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
  const [currentPage, setCurrentPage] = useState(1);

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
    setCurrentPage(1);
  };

  const hasActiveFilters = folioFilter || dateFromFilter || dateToFilter;

  const totalPages = Math.ceil(filteredForms.length / PAGE_SIZE);
  const paginatedForms = filteredForms.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Estadísticas rápidas
  const statusCounts = useMemo(() => {
    if (!forms) return { draft: 0, inProgress: 0, pendingReview: 0, completed: 0 };
    return {
      draft: forms.filter(f => f.status === ProductionFormStatus.DRAFT).length,
      inProgress: forms.filter(f => f.status === ProductionFormStatus.IN_PROGRESS).length,
      pendingReview: forms.filter(f => f.status === ProductionFormStatus.PENDING_REVIEW).length,
      completed: forms.filter(f => f.status === ProductionFormStatus.COMPLETED).length,
    };
  }, [forms]);

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
        
        <TabsContent value="production" className="space-y-4">
          {/* Tarjetas de estadísticas */}
          {!isLoading && forms && forms.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Total", value: forms.length, color: "text-[#E8195A] bg-pink-50" },
                { label: "En Progreso", value: statusCounts.inProgress, color: "text-amber-600 bg-amber-50" },
                { label: "En Revisión", value: statusCounts.pendingReview, color: "text-violet-600 bg-violet-50" },
                { label: "Completados", value: statusCounts.completed, color: "text-emerald-600 bg-emerald-50" },
              ].map(stat => (
                <div key={stat.label} className={`rounded-lg px-4 py-3 flex items-center gap-3 ${stat.color}`}>
                  <ClipboardList className="h-5 w-5 flex-shrink-0" />
                  <div>
                    <p className="text-xl font-bold">{stat.value.toLocaleString('es-MX')}</p>
                    <p className="text-xs font-medium opacity-80">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle>Formularios de Producción</CardTitle>
                <CardDescription>
                  Gestión de formularios de proceso con seguimiento por secciones y roles.
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
              {/* Filtros */}
              <div className="flex flex-wrap items-end gap-3 mb-4 p-3 bg-muted/40 rounded-lg border border-muted">
                <div className="flex-1 min-w-[180px]">
                  <Label htmlFor="prod-folio-filter" className="text-xs text-muted-foreground mb-1 block">Buscar por Folio</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="prod-folio-filter"
                      placeholder="Ej: A-3010"
                      value={folioFilter}
                      onChange={(e) => { setFolioFilter(e.target.value); setCurrentPage(1); }}
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
                    onChange={(e) => { setDateFromFilter(e.target.value); setCurrentPage(1); }}
                    className="h-9"
                  />
                </div>
                <div className="min-w-[150px]">
                  <Label htmlFor="prod-date-to" className="text-xs text-muted-foreground mb-1 block">Fecha hasta</Label>
                  <Input
                    id="prod-date-to"
                    type="date"
                    value={dateToFilter}
                    onChange={(e) => { setDateToFilter(e.target.value); setCurrentPage(1); }}
                    className="h-9"
                  />
                </div>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-muted-foreground hover:text-foreground">
                    <X className="mr-1 h-4 w-4" />
                    Limpiar filtros
                  </Button>
                )}
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Cargando formularios...</p>
                </div>
              ) : filteredForms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ClipboardList className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="font-medium text-muted-foreground mb-1">
                    {hasActiveFilters ? "Sin resultados" : "No hay formularios"}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {hasActiveFilters
                      ? "No se encontraron formularios con los filtros aplicados."
                      : "Aún no se han creado formularios de producción."}
                  </p>
                  {hasActiveFilters ? (
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      <X className="mr-2 h-4 w-4" />
                      Limpiar filtros
                    </Button>
                  ) : canCreateForms ? (
                    <Button variant="outline" size="sm" onClick={handleCreate}>
                      <Plus className="mr-2 h-4 w-4" />
                      Crear primer formulario
                    </Button>
                  ) : null}
                </div>
              ) : (
                <>
                  {/* Contador */}
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-muted-foreground">
                      {hasActiveFilters
                        ? `${filteredForms.length} resultado${filteredForms.length !== 1 ? 's' : ''} de ${forms?.length || 0} total`
                        : `${forms?.length || 0} formularios en total`}
                    </p>
                    {totalPages > 1 && (
                      <p className="text-sm text-muted-foreground">
                        Página {currentPage} de {totalPages}
                      </p>
                    )}
                  </div>

                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableHead className="font-semibold">Folio</TableHead>
                          <TableHead className="font-semibold">Proceso</TableHead>
                          <TableHead className="font-semibold text-right">Litros</TableHead>
                          <TableHead className="font-semibold">Fecha</TableHead>
                          <TableHead className="font-semibold">Responsable</TableHead>
                          <TableHead className="font-semibold">Estado</TableHead>
                          <TableHead className="text-right font-semibold">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedForms.map((form) => (
                          <TableRow key={form.id} className="hover:bg-muted/20 cursor-pointer" onClick={() => handleEdit(form.id)}>
                            <TableCell className="font-semibold text-primary">{form.folio}</TableCell>
                            <TableCell className="max-w-[180px] truncate" title={form.productId}>{form.productId}</TableCell>
                            <TableCell className="text-right tabular-nums">{form.liters?.toLocaleString('es-MX')}</TableCell>
                            <TableCell className="text-sm">{formatDate(form.date)}</TableCell>
                            <TableCell className="max-w-[140px] truncate" title={form.responsible}>{form.responsible}</TableCell>
                            <TableCell>{getStatusBadge(form.status)}</TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
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

                  {/* Paginación */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredForms.length)} de {filteredForms.length}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Siguiente
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
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
