import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import FileUploadDropzone, { UploadStatus, FileType } from "@/components/file-upload-dropzone";
import { AlertCircle, FileSpreadsheet } from "lucide-react";

interface FormImportProps {
  onImportComplete?: (data: any) => void;
}

export default function FormImport({ onImportComplete }: FormImportProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  
  const { toast } = useToast();
  
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadStatus("uploading");
      setUploadProgress(10);
      
      const formData = new FormData();
      formData.append('file', file);
      
      // Use XMLHttpRequest for progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 90) + 10;
            setUploadProgress(percentComplete);
          }
        });
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(xhr.statusText || "Error en la subida"));
          }
        };
        
        xhr.onerror = () => {
          reject(new Error("Error de red"));
        };
        
        xhr.open("POST", "/api/upload");
        xhr.send(formData);
      });
    },
    onSuccess: (data) => {
      setUploadStatus("success");
      setUploadProgress(100);
      toast({
        title: "Archivo procesado",
        description: `El archivo ${data.fileName} ha sido procesado correctamente.`,
      });
      setPreviewData(data);
      setShowPreviewDialog(true);
      
      if (onImportComplete) {
        onImportComplete(data);
      }
    },
    onError: (error: Error) => {
      setUploadStatus("error");
      toast({
        title: "Error al subir el archivo",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const handleFilesSelected = (files: File[]) => {
    if (files.length > 0) {
      setSelectedFile(files[0]);
    }
  };
  
  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    } else {
      toast({
        title: "No hay archivo seleccionado",
        description: "Por favor, selecciona un archivo Excel o PDF para importar.",
        variant: "destructive"
      });
    }
  };
  
  const handleClosePreview = () => {
    setShowPreviewDialog(false);
    // Reset the state for a new upload
    setSelectedFile(null);
    setUploadStatus("idle");
    setUploadProgress(0);
  };
  
  const renderPreviewContent = () => {
    if (!previewData) return null;
    
    // Solo Excel en esta versión
    return (
      <div className="max-h-96 overflow-auto">
        {previewData.data.map((sheet: any, index: number) => (
          <div key={index} className="mb-6">
            <h3 className="font-medium text-md mb-2 flex items-center">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Hoja: {sheet.sheetName}
            </h3>
            {sheet.data.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      {Object.keys(sheet.data[0]).map((key, idx) => (
                        <th key={idx} className="border px-2 py-1 text-left text-xs">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.data.slice(0, 10).map((row: any, rowIdx: number) => (
                      <tr key={rowIdx} className={rowIdx % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                        {Object.values(row).map((cell: any, cellIdx: number) => (
                          <td key={cellIdx} className="border px-2 py-1 text-xs truncate max-w-xs">
                            {String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Esta hoja no contiene datos.
                </AlertDescription>
              </Alert>
            )}
            {sheet.data.length > 10 && (
              <p className="text-xs text-muted-foreground mt-2">
                Mostrando 10 de {sheet.data.length} filas.
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Importar Formulario</CardTitle>
          <CardDescription>
            Sube un archivo Excel para importar datos de formularios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileUploadDropzone 
            onFilesSelected={handleFilesSelected}
            acceptedFileTypes="excel"
            maxSizeMB={10}
            multiple={false}
            uploadProgress={uploadProgress}
            uploadStatus={uploadStatus}
          />
          {selectedFile && uploadStatus === "idle" && (
            <div className="mt-4">
              <p className="text-sm text-center">
                Archivo seleccionado: <span className="font-medium">{selectedFile.name}</span>
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || uploadStatus === "uploading"}
          >
            {uploadStatus === "uploading" ? "Subiendo..." : "Importar Archivo"}
          </Button>
        </CardFooter>
      </Card>
      
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Vista previa de los datos importados</DialogTitle>
            <DialogDescription>
              A continuación se muestra una vista previa de los datos importados del archivo.
            </DialogDescription>
          </DialogHeader>
          
          {renderPreviewContent()}
          
          <DialogFooter>
            <Button onClick={handleClosePreview}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}