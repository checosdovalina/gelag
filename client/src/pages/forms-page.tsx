import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Eye, PenSquare, FileDown, Search, Plus } from "lucide-react";
import MainLayout from "@/layouts/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import FormViewer from "@/components/forms/form-viewer";
import { useToast } from "@/hooks/use-toast";

interface FormTemplate {
  id: number;
  name: string;
  description: string;
  department: string;
  structure: any;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export default function FormsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedForm, setSelectedForm] = useState<FormTemplate | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  const isAdmin = user?.role === UserRole.ADMIN;

  // Fetch forms
  const { data: forms, isLoading, refetch } = useQuery<FormTemplate[]>({
    queryKey: ["/api/form-templates"],
    enabled: !!user,
  });

  // Define columns for data table
  const columns: ColumnDef<FormTemplate>[] = [
    {
      accessorKey: "name",
      header: "Nombre",
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "description",
      header: "Descripción",
      cell: ({ row }) => (
        <div className="max-w-[300px] truncate" title={row.getValue("description")}>
          {row.getValue("description") || "Sin descripción"}
        </div>
      ),
    },
    {
      accessorKey: "department",
      header: "Departamento",
    },
    {
      accessorKey: "updatedAt",
      header: "Actualizado",
      cell: ({ row }) => {
        return new Date(row.getValue("updatedAt")).toLocaleDateString("es-ES", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const form = row.original;
        
        return (
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => handleViewForm(form)}
              title="Ver formulario"
            >
              <Eye className="h-4 w-4" />
            </Button>
            
            {isAdmin && (
              <Link href={`/form-editor?id=${form.id}`}>
                <Button 
                  variant="ghost" 
                  size="icon"
                  title="Editar formulario"
                >
                  <PenSquare className="h-4 w-4" />
                </Button>
              </Link>
            )}
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => handleExportForm(form, "pdf")}
              title="Exportar a PDF"
            >
              <FileDown className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  // Filter forms based on search term
  const filteredForms = forms
    ? forms.filter(
        (form) =>
          form.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          form.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (form.description && form.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : [];

  // Handle view form
  const handleViewForm = (form: FormTemplate) => {
    setSelectedForm(form);
    setPreviewOpen(true);
  };
  
  // Handle export form
  const handleExportForm = (form: FormTemplate, format: "pdf" | "excel") => {
    toast({
      title: `Exportando ${form.name}`,
      description: `El formulario se está exportando a ${format.toUpperCase()}`,
    });
    
    // In a real application, this would make an API call to export the form
    setTimeout(() => {
      toast({
        title: "Exportación completada",
        description: `El formulario ${form.name} ha sido exportado correctamente`,
      });
    }, 1500);
  };

  return (
    <MainLayout title="Formularios">
      <div className="space-y-6">
        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
            <Input
              placeholder="Buscar formularios..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {isAdmin && (
            <Link href="/form-editor">
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Formulario
              </Button>
            </Link>
          )}
        </div>
        
        {/* Forms list */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Formularios</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={filteredForms}
              searchPlaceholder="Filtrar formularios..."
              searchColumn="name"
            />
          </CardContent>
        </Card>
        
        {/* Form preview dialog */}
        {selectedForm && (
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Vista previa: {selectedForm.name}</DialogTitle>
                <DialogDescription>
                  {selectedForm.department && `Departamento: ${selectedForm.department}`}
                </DialogDescription>
              </DialogHeader>
              
              <div className="max-h-[70vh] overflow-y-auto py-4">
                <FormViewer
                  formTemplate={selectedForm.structure}
                  isReadOnly={true}
                  onSubmit={() => {}}
                  onExport={(format) => handleExportForm(selectedForm, format)}
                />
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                  Cerrar
                </Button>
                
                {isAdmin && (
                  <Link href={`/form-editor?id=${selectedForm.id}`}>
                    <Button>
                      <PenSquare className="mr-2 h-4 w-4" />
                      Editar Formulario
                    </Button>
                  </Link>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </MainLayout>
  );
}
