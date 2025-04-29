import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import FileUploadDropzone, { UploadStatus } from "../file-upload-dropzone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FormField } from "@shared/schema";
import { Loader2, Check, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FormImportProps {
  onImportComplete?: (data: any) => void;
}

export default function FormImport({ onImportComplete }: FormImportProps) {
  const { toast } = useToast();
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewData, setPreviewData] = useState<any>(null);
  
  // Mutación para subir el archivo
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadStatus("uploading");
      setUploadProgress(10);
      
      // Crear FormData para enviar el archivo
      const formData = new FormData();
      formData.append("file", file);
      
      // Simular progreso
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);
      
      // Enviar archivo al servidor
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      clearInterval(progressInterval);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al subir el archivo");
      }
      
      setUploadProgress(100);
      setUploadStatus("success");
      
      return await response.json();
    },
    onSuccess: (data) => {
      console.log("Archivo subido con éxito:", data);
      setPreviewData(data);
      toast({
        title: "Archivo cargado correctamente",
        description: "Se ha procesado el archivo Excel con éxito.",
      });
    },
    onError: (error: Error) => {
      console.error("Error al subir el archivo:", error);
      setUploadStatus("error");
      toast({
        title: "Error al cargar el archivo",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutación para crear la plantilla de formulario
  const createTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!previewData || !previewData.formTemplate) {
        throw new Error("No hay datos de formulario para importar");
      }
      
      const response = await apiRequest(
        "POST", 
        "/api/import-form-template", 
        {
          excelData: previewData.data,
          template: previewData.formTemplate
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al importar la plantilla");
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      console.log("Plantilla importada con éxito:", data);
      
      // Actualizar caché de plantillas
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      
      toast({
        title: "Plantilla importada correctamente",
        description: "La plantilla ha sido guardada y está lista para su uso.",
      });
      
      // Callback al componente padre
      if (onImportComplete) {
        onImportComplete(data.template);
      }
      
      // Limpiar datos
      setPreviewData(null);
      setUploadStatus("idle");
      setUploadProgress(0);
    },
    onError: (error: Error) => {
      console.error("Error al importar la plantilla:", error);
      toast({
        title: "Error al importar la plantilla",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Manejar selección de archivos
  const handleFilesSelected = (files: File[]) => {
    if (files.length > 0) {
      uploadMutation.mutate(files[0]);
    }
  };
  
  // Manejar la importación del formulario
  const handleImportForm = () => {
    createTemplateMutation.mutate();
  };
  
  // Resetear el estado para subir otro archivo
  const handleReset = () => {
    setPreviewData(null);
    setUploadStatus("idle");
    setUploadProgress(0);
  };
  
  // Renderizar un campo de formulario para previsualización
  const renderFormField = (field: FormField) => {
    return (
      <div key={field.id} className="mb-4">
        <div className="font-medium mb-1">{field.label} {field.required && <span className="text-red-500">*</span>}</div>
        <div className="text-muted-foreground text-sm">{field.description}</div>
        
        {field.type === "text" && (
          <div className="h-10 mt-1 px-3 py-2 rounded-md border border-input bg-muted-foreground/10 text-muted-foreground text-sm">
            {field.placeholder || "Entrada de texto"}
          </div>
        )}
        
        {field.type === "textarea" && (
          <div className="h-20 mt-1 px-3 py-2 rounded-md border border-input bg-muted-foreground/10 text-muted-foreground text-sm">
            {field.placeholder || "Texto multilínea"}
          </div>
        )}
        
        {field.type === "select" && (
          <div className="h-10 mt-1 px-3 py-2 rounded-md border border-input bg-muted-foreground/10 text-muted-foreground text-sm">
            {field.options?.length > 0 
              ? `Opciones (${field.options.length}): ${field.options.slice(0, 3).map(o => typeof o === "string" ? o : o.label).join(", ")}...` 
              : "Lista desplegable"}
          </div>
        )}
        
        {field.type === "multiselect" && (
          <div className="h-10 mt-1 px-3 py-2 rounded-md border border-input bg-muted-foreground/10 text-muted-foreground text-sm">
            {field.options?.length > 0 
              ? `Selección múltiple (${field.options.length} opciones)` 
              : "Selección múltiple"}
          </div>
        )}
        
        {field.type === "checkbox" && (
          <div className="h-5 mt-1 flex items-center">
            <div className="h-4 w-4 rounded border border-input bg-muted-foreground/10 mr-2"></div>
            <span className="text-sm text-muted-foreground">Casilla de verificación</span>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Importar Formulario desde Excel</CardTitle>
          <CardDescription>
            Carga un archivo Excel para crear una nueva plantilla de formulario.
            El sistema analizará el archivo e intentará detectar su estructura automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!previewData ? (
            <FileUploadDropzone
              onFilesSelected={handleFilesSelected}
              acceptedFileTypes="excel"
              uploadStatus={uploadStatus}
              uploadProgress={uploadProgress}
              multiple={false}
            />
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                <span>Archivo <strong>{previewData.fileName}</strong> procesado correctamente.</span>
              </div>
              
              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="preview">Vista Previa</TabsTrigger>
                  <TabsTrigger value="data">Datos Detectados</TabsTrigger>
                </TabsList>
                
                <TabsContent value="preview" className="space-y-4">
                  <Alert>
                    <AlertTitle>Previsualización del Formulario</AlertTitle>
                    <AlertDescription>
                      Esta es una vista previa de cómo quedará el formulario. Revisa que los campos estén correctos antes de importarlo.
                    </AlertDescription>
                  </Alert>
                  
                  {previewData.formTemplate ? (
                    <div className="border rounded-lg p-4">
                      <h3 className="text-lg font-bold mb-2">{previewData.formTemplate.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{previewData.formTemplate.description}</p>
                      
                      <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-6">
                          {previewData.formTemplate.structure.fields.map((field: FormField) => (
                            renderFormField(field)
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                      <p>No se pudo generar una vista previa del formulario.</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="data" className="space-y-4">
                  <Alert>
                    <AlertTitle>Metadatos Detectados</AlertTitle>
                    <AlertDescription>
                      Información extraída del archivo Excel que se usará para crear el formulario.
                    </AlertDescription>
                  </Alert>
                  
                  <ScrollArea className="h-[400px] border rounded-lg p-4">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {JSON.stringify(previewData, null, 2)}
                    </pre>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={handleReset}>
                  Cargar Otro Archivo
                </Button>
                
                <Button 
                  onClick={handleImportForm} 
                  disabled={createTemplateMutation.isPending || !previewData.formTemplate}
                >
                  {createTemplateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    "Importar Formulario"
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}