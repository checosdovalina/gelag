import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import MainLayout from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  Plus, 
  Search, 
  ClipboardList, 
  Clock, 
  CheckCircle2,
  FileCheck
} from "lucide-react";
import { ProcessFormStatus } from "@/components/process-forms/process-form-editor";

// Templates disponibles para formularios de proceso
const PROCESS_TEMPLATES = [
  { id: 5, name: "PR-PR-01-04 - Ficha técnica de Producción", description: "Formulario para registrar el proceso de producción diario con verificación de calidad" },
  { id: 6, name: "CA-RE-01-01 - Buenas Prácticas de Manufactura", description: "Lista de verificación de BPM para el área de producción" }
];

interface ProcessForm {
  id: number;
  templateId: number;
  templateName: string;
  status: ProcessFormStatus;
  createdBy: {
    id: number;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  folioNumber: number;
}

export default function ProcessFormsList() {
  const [_, setLocation] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  // Obtener la lista de formularios de proceso
  const { data: forms, isLoading } = useQuery({
    queryKey: ['/api/process-forms', activeTab, searchQuery, selectedTemplate],
    queryFn: async () => {
      try {
        // Por ahora, simularemos la respuesta ya que no tenemos el endpoint real
        // En un entorno de producción, esto debería apuntar a un endpoint real
        
        // Simulación de datos para demostración
        const mockForms: ProcessForm[] = [
          {
            id: 1,
            templateId: 5,
            templateName: "PR-PR-01-04 - Ficha técnica de Producción",
            status: ProcessFormStatus.DRAFT,
            createdBy: {
              id: 1,
              name: "Super Admin"
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            folioNumber: 1
          },
          {
            id: 2,
            templateId: 5,
            templateName: "PR-PR-01-04 - Ficha técnica de Producción",
            status: ProcessFormStatus.IN_PROGRESS,
            createdBy: {
              id: 1,
              name: "Super Admin"
            },
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Ayer
            updatedAt: new Date().toISOString(),
            folioNumber: 2
          },
          {
            id: 3,
            templateId: 6,
            templateName: "CA-RE-01-01 - Buenas Prácticas de Manufactura",
            status: ProcessFormStatus.PENDING_REVIEW,
            createdBy: {
              id: 2,
              name: "Admin"
            },
            createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // Hace 2 días
            updatedAt: new Date().toISOString(),
            folioNumber: 1
          }
        ];
        
        // Filtrar por estado
        let filtered = [...mockForms];
        if (activeTab !== "all") {
          filtered = filtered.filter(form => form.status === activeTab);
        }
        
        // Filtrar por búsqueda (nombre de plantilla o folio)
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(form => 
            form.templateName.toLowerCase().includes(query) || 
            form.folioNumber.toString().includes(query)
          );
        }
        
        // Filtrar por plantilla seleccionada
        if (selectedTemplate) {
          filtered = filtered.filter(form => form.templateId.toString() === selectedTemplate);
        }
        
        return filtered;
      } catch (error) {
        console.error("Error fetching forms:", error);
        return [];
      }
    }
  });

  // Función para obtener la etiqueta y variante de estado
  const getStatusBadge = (status: ProcessFormStatus) => {
    const statusMap: Record<ProcessFormStatus, { label: string, variant: "default" | "outline" | "secondary" | "destructive" }> = {
      [ProcessFormStatus.DRAFT]: { label: "Borrador", variant: "outline" },
      [ProcessFormStatus.IN_PROGRESS]: { label: "En Progreso", variant: "default" },
      [ProcessFormStatus.PENDING_REVIEW]: { label: "Pendiente de Revisión", variant: "secondary" },
      [ProcessFormStatus.COMPLETED]: { label: "Completado", variant: "outline" }
    };
    
    return statusMap[status] || { label: "Desconocido", variant: "outline" };
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Crear un nuevo formulario de proceso
  const handleCreateForm = (templateId: number) => {
    setLocation(`/process-forms/new/${templateId}`);
  };

  // Editar un formulario existente
  const handleEditForm = (formId: number) => {
    setLocation(`/process-forms/${formId}`);
  };

  return (
    <MainLayout title="Formularios de Proceso">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Formularios de Proceso</h1>
          
          {/* Selector de plantilla para crear nuevo formulario */}
          <div className="flex items-center gap-2">
            <Select 
              value={selectedTemplate} 
              onValueChange={setSelectedTemplate}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Filtrar por plantilla" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas las plantillas</SelectItem>
                {PROCESS_TEMPLATES.map(template => (
                  <SelectItem key={template.id} value={template.id.toString()}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="relative">
              <Select
                onValueChange={(value) => handleCreateForm(parseInt(value))}
              >
                <SelectTrigger className="w-[180px]">
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Nuevo formulario</span>
                </SelectTrigger>
                <SelectContent>
                  {PROCESS_TEMPLATES.map(template => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {/* Búsqueda y filtros */}
        <div className="flex justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por nombre o folio..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {/* Tabs para filtrar por estado */}
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              <span>Todos</span>
            </TabsTrigger>
            <TabsTrigger value={ProcessFormStatus.DRAFT} className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Borradores</span>
            </TabsTrigger>
            <TabsTrigger value={ProcessFormStatus.IN_PROGRESS} className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>En Progreso</span>
            </TabsTrigger>
            <TabsTrigger value={ProcessFormStatus.PENDING_REVIEW} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>Pendientes de Revisión</span>
            </TabsTrigger>
            <TabsTrigger value={ProcessFormStatus.COMPLETED} className="flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              <span>Completados</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Todos los formularios de proceso</CardTitle>
                <CardDescription>
                  Lista de todos los formularios de proceso en el sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Folio</TableHead>
                          <TableHead>Plantilla</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Creado por</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {forms && forms.length > 0 ? (
                          forms.map((form) => {
                            const { label, variant } = getStatusBadge(form.status);
                            return (
                              <TableRow key={form.id}>
                                <TableCell className="font-medium">
                                  {form.folioNumber}
                                </TableCell>
                                <TableCell>{form.templateName}</TableCell>
                                <TableCell>
                                  <Badge variant={variant}>{label}</Badge>
                                </TableCell>
                                <TableCell>{form.createdBy.name}</TableCell>
                                <TableCell>{formatDate(form.createdAt)}</TableCell>
                                <TableCell>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleEditForm(form.id)}
                                  >
                                    Editar
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                              No se encontraron formularios
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Contenido para cada estado (mismo contenido, diferentes filtros) */}
          {[
            ProcessFormStatus.DRAFT,
            ProcessFormStatus.IN_PROGRESS,
            ProcessFormStatus.PENDING_REVIEW,
            ProcessFormStatus.COMPLETED
          ].map(status => {
            const { label } = getStatusBadge(status);
            return (
              <TabsContent key={status} value={status} className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Formularios en estado: {label}</CardTitle>
                    <CardDescription>
                      Formularios de proceso filtrados por estado: {label}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Folio</TableHead>
                              <TableHead>Plantilla</TableHead>
                              <TableHead>Creado por</TableHead>
                              <TableHead>Fecha</TableHead>
                              <TableHead>Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {forms && forms.length > 0 ? (
                              forms.map((form) => (
                                <TableRow key={form.id}>
                                  <TableCell className="font-medium">
                                    {form.folioNumber}
                                  </TableCell>
                                  <TableCell>{form.templateName}</TableCell>
                                  <TableCell>{form.createdBy.name}</TableCell>
                                  <TableCell>{formatDate(form.createdAt)}</TableCell>
                                  <TableCell>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => handleEditForm(form.id)}
                                    >
                                      Editar
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                  No se encontraron formularios en estado: {label}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </MainLayout>
  );
}