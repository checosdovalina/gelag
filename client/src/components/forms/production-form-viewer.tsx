import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ProductionFormData {
  id: number;
  folio: string;
  date: string;
  productId: number;
  liters: number;
  responsible: string;
  status: string;
  lotNumber?: string;
  createdBy: number;
  createdAt: string;
  ingredients?: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
  caducidad?: string;
  temperature?: string[];
  pressure?: string[];
  hourTracking?: string[];
  startTime?: string;
  endTime?: string;
  brix?: any;
  qualityTemp?: any;
  texture?: any;
  color?: any;
  viscosity?: any;
  smell?: any;
  taste?: any;
  foreignMaterial?: any;
  statusCheck?: any;
  qualityNotes?: string;
  destinationType?: string;
  destinationKilos?: any;
  destinationProduct?: string;
  destinationEstimation?: any;
  totalKilos?: any;
  liberationFolio?: string;
  finalBrix?: any;
  yield?: any;
  cmConsistometer?: any;
  cP?: any;
  startState?: string;
  endState?: string;
  [key: string]: any; // Para campos adicionales del proceso
}

interface ProductionFormViewerProps {
  formData: ProductionFormData;
  creator?: { name: string };
}

export function ProductionFormViewer({ formData, creator }: ProductionFormViewerProps) {
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Borrador';
      case 'in_progress': return 'En Progreso';
      case 'completed': return 'Completado';
      case 'approved': return 'Aprobado';
      case 'rejected': return 'Rechazado';
      default: return status || 'Desconocido';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'in_progress': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Información principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Formulario de Producción
            <Badge variant={getStatusVariant(formData.status)}>
              {getStatusLabel(formData.status)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Folio</p>
              <p className="text-lg font-semibold">{formData.folio}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fecha</p>
              <p className="text-lg">{format(new Date(formData.date), "dd/MM/yyyy", { locale: es })}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Producto ID</p>
              <p className="text-lg">{formData.productId}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Litros</p>
              <p className="text-lg">{formData.liters}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Responsable</p>
              <p className="text-lg">{formData.responsible}</p>
            </div>
            {formData.lotNumber && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Número de Lote</p>
                <p className="text-lg">{formData.lotNumber}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Creado por</p>
              <p className="text-lg">{creator?.name || `Usuario ID: ${formData.createdBy}`}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fecha de creación</p>
              <p className="text-lg">{format(new Date(formData.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ingredientes */}
      {formData.ingredients && formData.ingredients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ingredientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-2 text-left">Nombre</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Cantidad</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Unidad</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.ingredients.map((ingredient: any, index: number) => (
                    <tr key={index}>
                      <td className="border border-gray-300 px-4 py-2">{ingredient.name}</td>
                      <td className="border border-gray-300 px-4 py-2">{ingredient.quantity}</td>
                      <td className="border border-gray-300 px-4 py-2">{ingredient.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Control de Proceso */}
      {(formData.temperature || formData.pressure || formData.hourTracking) && (
        <Card>
          <CardHeader>
            <CardTitle>Control de Proceso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {formData.startTime && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Hora Inicio</p>
                  <p className="text-lg">{formData.startTime}</p>
                </div>
              )}
              {formData.endTime && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Hora Fin</p>
                  <p className="text-lg">{formData.endTime}</p>
                </div>
              )}
            </div>
            
            {(formData.temperature || formData.pressure || formData.hourTracking) && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-2 text-left">Hora</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Temperatura</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Presión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: Math.max(
                      formData.hourTracking?.length || 0,
                      formData.temperature?.length || 0,
                      formData.pressure?.length || 0
                    ) }).map((_, index) => (
                      <tr key={index}>
                        <td className="border border-gray-300 px-4 py-2">
                          {formData.hourTracking?.[index] || ''}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {formData.temperature?.[index] || ''}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {formData.pressure?.[index] || ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Verificación de Calidad */}
      {(formData.qualityTimes || formData.brix || formData.qualityTemp || formData.texture || formData.color || formData.viscosity || formData.smell || formData.taste || formData.foreignMaterial || formData.statusCheck) && (
        <Card>
          <CardHeader>
            <CardTitle>Verificación de Calidad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium">Hora</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium">Brix</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium">Temp. (°C)</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium">Textura</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium">Color</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium">Viscosidad</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium">Olor</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium">Sabor</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium">Mat. Extraño</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.max(
                    formData.qualityTimes?.length || 0,
                    formData.brix?.length || 0,
                    formData.qualityTemp?.length || 0,
                    formData.texture?.length || 0,
                    formData.color?.length || 0,
                    formData.viscosity?.length || 0,
                    formData.smell?.length || 0,
                    formData.taste?.length || 0,
                    formData.foreignMaterial?.length || 0,
                    formData.statusCheck?.length || 0
                  ) }).map((_, index) => {
                    // Solo mostrar filas que tengan al menos un dato
                    const hasData = (formData.qualityTimes && formData.qualityTimes[index] && formData.qualityTimes[index] !== '') ||
                                   (formData.brix && formData.brix[index] && formData.brix[index] !== '') ||
                                   (formData.qualityTemp && formData.qualityTemp[index] && formData.qualityTemp[index] !== '') ||
                                   (formData.texture && formData.texture[index] && formData.texture[index] !== '') ||
                                   (formData.color && formData.color[index] && formData.color[index] !== '') ||
                                   (formData.viscosity && formData.viscosity[index] && formData.viscosity[index] !== '') ||
                                   (formData.smell && formData.smell[index] && formData.smell[index] !== '') ||
                                   (formData.taste && formData.taste[index] && formData.taste[index] !== '') ||
                                   (formData.foreignMaterial && formData.foreignMaterial[index] && formData.foreignMaterial[index] !== '') ||
                                   (formData.statusCheck && formData.statusCheck[index] && formData.statusCheck[index] !== '');
                    
                    if (!hasData) return null;
                    
                    return (
                      <tr key={index}>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          {formData.qualityTimes?.[index] || ''}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          {formData.brix?.[index] || ''}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          {formData.qualityTemp?.[index] || ''}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          {formData.texture?.[index] || ''}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          {formData.color?.[index] || ''}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          {formData.viscosity?.[index] || ''}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          {formData.smell?.[index] || ''}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          {formData.taste?.[index] || ''}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          {formData.foreignMaterial?.[index] || ''}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          {formData.statusCheck?.[index] || ''}
                        </td>
                      </tr>
                    );
                  }).filter(Boolean)}
                </tbody>
              </table>
            </div>
            
            {/* Notas de calidad */}
            {formData.qualityNotes && (
              <div className="mt-6">
                <p className="text-sm font-medium text-muted-foreground mb-2">Observaciones de Calidad</p>
                <p className="text-sm bg-gray-50 p-3 rounded border">{formData.qualityNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Información de Destino */}
      {(formData.destinationType || formData.destinationKilos || formData.destinationProduct || formData.totalKilos) && (
        <Card>
          <CardHeader>
            <CardTitle>Información de Destino</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.destinationType && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tipo de Destino</p>
                  <p className="text-lg">{formData.destinationType}</p>
                </div>
              )}
              {formData.destinationKilos && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Kilos Destino</p>
                  <p className="text-lg">{formData.destinationKilos}</p>
                </div>
              )}
              {formData.destinationProduct && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Producto Destino</p>
                  <p className="text-lg">{formData.destinationProduct}</p>
                </div>
              )}
              {formData.destinationEstimation && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estimación</p>
                  <p className="text-lg">{formData.destinationEstimation}</p>
                </div>
              )}
              {formData.totalKilos && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Kilos</p>
                  <p className="text-lg">{formData.totalKilos}</p>
                </div>
              )}
              {formData.liberationFolio && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Folio de Liberación</p>
                  <p className="text-lg">{formData.liberationFolio}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información Adicional */}
      {(formData.caducidad || formData.finalBrix || formData.yield || formData.cmConsistometer || formData.cP) && (
        <Card>
          <CardHeader>
            <CardTitle>Información Adicional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {formData.caducidad && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fecha de Caducidad</p>
                  <p className="text-lg">{format(new Date(formData.caducidad), "dd/MM/yyyy", { locale: es })}</p>
                </div>
              )}
              {formData.finalBrix && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Brix Final</p>
                  <p className="text-lg">{formData.finalBrix}</p>
                </div>
              )}
              {formData.yield && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rendimiento</p>
                  <p className="text-lg">{formData.yield}</p>
                </div>
              )}
              {formData.cmConsistometer && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Consistómetro (cm)</p>
                  <p className="text-lg">{formData.cmConsistometer}</p>
                </div>
              )}
              {formData.cP && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Viscosidad (cP)</p>
                  <p className="text-lg">{formData.cP}</p>
                </div>
              )}
              {formData.startState && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estado Inicial</p>
                  <p className="text-lg">{formData.startState}</p>
                </div>
              )}
              {formData.endState && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estado Final</p>
                  <p className="text-lg">{formData.endState}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}