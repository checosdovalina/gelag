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

      {/* Control de Proceso */}
      {(formData.temperature || formData.pressure || formData.hourTracking) && (
        <Card>
          <CardHeader>
            <CardTitle>Control de Proceso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-muted">
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
                  )}).map((_, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 px-4 py-2">
                        {formData.hourTracking?.[index] || '-'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {formData.temperature?.[index] || '-'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {formData.pressure?.[index] || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Control de Calidad */}
      {(formData.qualityTimes || formData.brix || formData.qualityTemp) && (
        <Card>
          <CardHeader>
            <CardTitle>Control de Calidad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-gray-300 px-2 py-2 text-left">Hora</th>
                    <th className="border border-gray-300 px-2 py-2 text-left">Brix</th>
                    <th className="border border-gray-300 px-2 py-2 text-left">Temp</th>
                    <th className="border border-gray-300 px-2 py-2 text-left">Textura</th>
                    <th className="border border-gray-300 px-2 py-2 text-left">Color</th>
                    <th className="border border-gray-300 px-2 py-2 text-left">Viscosidad</th>
                    <th className="border border-gray-300 px-2 py-2 text-left">Olor</th>
                    <th className="border border-gray-300 px-2 py-2 text-left">Sabor</th>
                    <th className="border border-gray-300 px-2 py-2 text-left">Estado</th>
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
                    formData.statusCheck?.length || 0
                  )}).map((_, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 px-2 py-2">
                        {formData.qualityTimes?.[index] || '-'}
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        {formData.brix?.[index] || '-'}
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        {formData.qualityTemp?.[index] || '-'}
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        {formData.texture?.[index] || '-'}
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        {formData.color?.[index] || '-'}
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        {formData.viscosity?.[index] || '-'}
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        {formData.smell?.[index] || '-'}
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        {formData.taste?.[index] || '-'}
                      </td>
                      <td className="border border-gray-300 px-2 py-2">
                        {formData.statusCheck?.[index] || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultados Finales */}
      {(formData.cmConsistometer || formData.finalBrix || formData.yield) && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados Finales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {formData.cmConsistometer && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Consistómetro (cm)</p>
                  <p className="text-lg font-semibold">{formData.cmConsistometer}</p>
                </div>
              )}
              {formData.finalBrix && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Brix Final</p>
                  <p className="text-lg font-semibold">{formData.finalBrix}</p>
                </div>
              )}
              {formData.yield && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rendimiento</p>
                  <p className="text-lg font-semibold">{formData.yield}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Destino del Producto */}
      {(formData.destinationType || formData.destinationKilos || formData.destinationProduct) && (
        <Card>
          <CardHeader>
            <CardTitle>Destino del Producto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-gray-300 px-4 py-2 text-left">Tipo</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Kilos</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Producto</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Estimación</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.max(
                    formData.destinationType?.length || 0,
                    formData.destinationKilos?.length || 0,
                    formData.destinationProduct?.length || 0,
                    formData.destinationEstimation?.length || 0
                  )}).map((_, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 px-4 py-2">
                        {formData.destinationType?.[index] || '-'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {formData.destinationKilos?.[index] || '-'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {formData.destinationProduct?.[index] || '-'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {formData.destinationEstimation?.[index] || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estados del Proceso */}
      {(formData.startState || formData.endState) && (
        <Card>
          <CardHeader>
            <CardTitle>Estado del Proceso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Ingredientes */}
      {formData.ingredients && Array.isArray(formData.ingredients) && formData.ingredients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ingredientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-gray-300 px-4 py-2 text-left">Nombre</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Cantidad</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Unidad</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.ingredients.map((ingredient: any, index: number) => (
                    <tr key={index}>
                      <td className="border border-gray-300 px-4 py-2">
                        {ingredient.name || '-'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {ingredient.quantity || '-'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {ingredient.unit || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}