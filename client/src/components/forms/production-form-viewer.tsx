import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ProductionFormData {
  id: number;
  folio: string;
  folioInterno?: string;
  folioBajaMP?: string;
  folioBajaME?: string;
  folioPT?: string;
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
  ingredientTimes?: string[];
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
  qualityTimes?: string[];
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
  conoData?: any;
  empaqueData?: any;
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
            {formData.folioInterno && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Folio Interno</p>
                <p className="text-lg">{formData.folioInterno}</p>
              </div>
            )}
            {formData.folioBajaMP && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Folio Baja MP</p>
                <p className="text-lg">{formData.folioBajaMP}</p>
              </div>
            )}
            {formData.folioBajaME && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Folio Baja ME</p>
                <p className="text-lg">{formData.folioBajaME}</p>
              </div>
            )}
            {formData.folioPT && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Folio PT</p>
                <p className="text-lg">{formData.folioPT}</p>
              </div>
            )}
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
                    <th className="border border-gray-300 px-4 py-2 text-left">Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.ingredients
                    .filter((ingredient: any) => ingredient.quantity > 0) // Ocultar ingredientes con cantidad cero
                    .map((ingredient: any, index: number) => (
                    <tr key={index}>
                      <td className="border border-gray-300 px-4 py-2">{ingredient.name}</td>
                      <td className="border border-gray-300 px-4 py-2">{ingredient.quantity}</td>
                      <td className="border border-gray-300 px-4 py-2">{ingredient.unit}</td>
                      <td className="border border-gray-300 px-4 py-2">
                        {formData.ingredientTimes?.[index] || 'No registrada'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Control de Proceso - SIEMPRE MOSTRAR */}
      <Card>
        <CardHeader>
          <CardTitle>Control de Proceso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Hora Inicio</p>
              <p className="text-lg">{formData.startTime || 'No registrado'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Hora Fin</p>
              <p className="text-lg">{formData.endTime || 'No registrado'}</p>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">Hora</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Temperatura (°C)</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Presión (PSI)</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 7 }).map((_, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 px-4 py-2">
                      {formData.hourTracking?.[index] || `Hora ${index + 1}`}
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

      {/* Verificación de Calidad - SIEMPRE MOSTRAR */}
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
                {Array.from({ length: 7 }).map((_, index) => (
                  <tr key={index}>
                    <td className="border border-gray-300 px-3 py-2 text-sm">
                      {formData.qualityTimes?.[index] || '-'}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">
                      {formData.brix?.[index] || '-'}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">
                      {formData.qualityTemp?.[index] || '-'}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">
                      {formData.texture?.[index] || '-'}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">
                      {formData.color?.[index] || '-'}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">
                      {formData.viscosity?.[index] || '-'}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">
                      {formData.smell?.[index] || '-'}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">
                      {formData.taste?.[index] || '-'}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">
                      {formData.foreignMaterial?.[index] || '-'}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">
                      {formData.statusCheck?.[index] || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Notas de calidad */}
          <div className="mt-6">
            <p className="text-sm font-medium text-muted-foreground mb-2">Observaciones de Calidad</p>
            <p className="text-sm bg-gray-50 p-3 rounded border">{formData.qualityNotes || 'Sin observaciones registradas'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Información de Destino - SIEMPRE MOSTRAR */}
      <Card>
        <CardHeader>
          <CardTitle>Información de Destino</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tipo de Destino</p>
              <p className="text-lg">{formData.destinationType || 'No especificado'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Kilos Destino</p>
              <p className="text-lg">{formData.destinationKilos || 'No registrado'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Producto Destino</p>
              <p className="text-lg">{formData.destinationProduct || 'No especificado'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Estimación</p>
              <p className="text-lg">{formData.destinationEstimation || 'No registrada'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Kilos</p>
              <p className="text-lg">{formData.totalKilos || 'No calculado'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Folio de Liberación</p>
              <p className="text-lg">{formData.liberationFolio || 'No asignado'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información Adicional - SIEMPRE MOSTRAR */}
      <Card>
        <CardHeader>
          <CardTitle>Información Adicional</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fecha de Caducidad</p>
              <p className="text-lg">
                {formData.caducidad ? 
                  format(new Date(formData.caducidad), "dd/MM/yyyy", { locale: es }) : 
                  'No establecida'
                }
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Brix Final</p>
              <p className="text-lg">{formData.finalBrix || 'No medido'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Rendimiento</p>
              <p className="text-lg">{formData.yield || 'No calculado'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Consistómetro (cm)</p>
              <p className="text-lg">{formData.cmConsistometer || 'No medido'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Viscosidad (cP)</p>
              <p className="text-lg">{formData.cP || 'No medida'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Estado Inicial</p>
              <p className="text-lg">{formData.startState || 'No registrado'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Estado Final</p>
              <p className="text-lg">{formData.endState || 'No registrado'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información de Empaque si existe */}
      {(formData.conoData || formData.empaqueData) && (
        <Card>
          <CardHeader>
            <CardTitle>Datos de Empaque</CardTitle>
          </CardHeader>
          <CardContent>
            {formData.conoData && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Datos de Cono</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-2 text-left">Campo</th>
                        <th className="border border-gray-300 p-2 text-left">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(formData.conoData).map(([key, value]) => (
                        <tr key={key}>
                          <td className="border border-gray-300 p-2 font-medium">{key}</td>
                          <td className="border border-gray-300 p-2">{value as string}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {formData.empaqueData && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Datos de Empaque</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-2 text-left">Campo</th>
                        <th className="border border-gray-300 p-2 text-left">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(formData.empaqueData).map(([key, value]) => (
                        <tr key={key}>
                          <td className="border border-gray-300 p-2 font-medium">{key}</td>
                          <td className="border border-gray-300 p-2">{value as string}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}