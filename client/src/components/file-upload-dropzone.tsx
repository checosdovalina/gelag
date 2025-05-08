import React, { useState, useRef, DragEvent } from "react";
import { UploadCloud, FileText, FileSpreadsheet, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export type FileType = "excel" | "pdf" | "all";
export type UploadStatus = "idle" | "uploading" | "success" | "error";

interface FileUploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  acceptedFileTypes?: FileType;
  maxSizeMB?: number;
  multiple?: boolean;
  className?: string;
  uploadProgress?: number;
  uploadStatus?: UploadStatus;
}

export default function FileUploadDropzone({
  onFilesSelected,
  acceptedFileTypes = "all",
  maxSizeMB = 10,
  multiple = false,
  className,
  uploadProgress = 0,
  uploadStatus = "idle"
}: FileUploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  // Determine accepted MIME types based on fileType
  const acceptedMimeTypes = () => {
    switch (acceptedFileTypes) {
      case "excel":
        return [
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.oasis.opendocument.spreadsheet"
        ];
      case "pdf":
        return ["application/pdf"];
      case "all":
      default:
        return [
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.oasis.opendocument.spreadsheet",
          "application/pdf"
        ];
    }
  };

  const acceptedExtensions = () => {
    switch (acceptedFileTypes) {
      case "excel":
        return [".xlsx", ".xls", ".ods"];
      case "pdf":
        return [".pdf"];
      case "all":
      default:
        return [".xlsx", ".xls", ".ods", ".pdf"];
    }
  };

  const validateFiles = (fileList: FileList): File[] => {
    const validFiles: File[] = [];
    const mimeTypes = acceptedMimeTypes();
    const extensions = acceptedExtensions();
    
    // Convert FileList to array
    Array.from(fileList).forEach(file => {
      // Check file size
      if (file.size > maxSizeBytes) {
        toast({
          title: "Error de archivo",
          description: `El archivo ${file.name} excede el tamaño máximo de ${maxSizeMB}MB.`,
          variant: "destructive"
        });
        return;
      }

      // Check file type by MIME type and extension
      const fileExt = `.${file.name.split(".").pop()?.toLowerCase()}`;
      if (!mimeTypes.includes(file.type) && !extensions.some(ext => fileExt === ext)) {
        toast({
          title: "Tipo de archivo no soportado",
          description: `El archivo ${file.name} no es un tipo de archivo válido.`,
          variant: "destructive"
        });
        return;
      }

      validFiles.push(file);
    });

    return validFiles;
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files.length > 0) {
      const validFiles = validateFiles(e.dataTransfer.files);
      if (validFiles.length > 0) {
        if (!multiple && validFiles.length > 1) {
          onFilesSelected([validFiles[0]]);
          toast({
            title: "Aviso",
            description: "Solo se permite un archivo. Se ha seleccionado el primer archivo válido.",
          });
        } else {
          onFilesSelected(validFiles);
        }
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const validFiles = validateFiles(e.target.files);
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    }
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Determine which icon to display based on acceptedFileTypes
  const renderIcon = () => {
    switch (acceptedFileTypes) {
      case "excel":
        return <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-2" />;
      case "pdf":
        return <FileText className="h-12 w-12 text-muted-foreground mb-2" />;
      case "all":
      default:
        return <UploadCloud className="h-12 w-12 text-muted-foreground mb-2" />;
    }
  };

  // Render status icon based on upload status
  const renderStatusIcon = () => {
    switch (uploadStatus) {
      case "success":
        return <Check className="h-6 w-6 text-green-500" />;
      case "error":
        return <AlertCircle className="h-6 w-6 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Card 
      className={cn(
        "border-2 border-dashed relative",
        isDragging ? "border-primary bg-secondary/20" : "border-muted-foreground/20",
        className
      )}
    >
      <CardContent className="p-6">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="flex flex-col items-center justify-center py-4"
        >
          {uploadStatus === "idle" ? (
            <>
              {renderIcon()}
              <p className="text-sm text-center text-muted-foreground mb-2">
                Arrastra y suelta {acceptedFileTypes === "excel" ? "archivos Excel" : 
                                 acceptedFileTypes === "pdf" ? "archivos PDF" : 
                                 "archivos Excel o PDF"} aquí
              </p>
              <p className="text-xs text-center text-muted-foreground mb-4">
                o
              </p>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleButtonClick}
              >
                Seleccionar archivo{multiple ? "s" : ""}
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                accept={acceptedExtensions().join(",")}
                multiple={multiple}
                className="hidden"
              />
              <div className="mt-4 flex flex-col items-center">
                <p className="text-xs text-center text-muted-foreground">
                  Tamaño máximo: <span className="font-semibold">{maxSizeMB}MB</span>
                </p>
                <p className="text-xs text-center text-muted-foreground mt-1">
                  Formatos aceptados: {acceptedFileTypes === "excel" ? 
                    "XLS, XLSX, XLSM, CSV, ODS" : 
                    acceptedFileTypes === "pdf" ? 
                    "PDF" : 
                    "XLS, XLSX, XLSM, CSV, ODS, PDF"}
                </p>
              </div>
            </>
          ) : (
            <div className="w-full">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {uploadStatus === "uploading" ? "Subiendo..." : 
                   uploadStatus === "success" ? "Subida completada" : 
                   "Error en la subida"}
                </span>
                {renderStatusIcon()}
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}