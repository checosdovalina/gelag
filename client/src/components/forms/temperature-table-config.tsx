import React from 'react';
import { Button } from "@/components/ui/button";
import { v4 as uuidv4 } from 'uuid';

/**
 * Función para generar una configuración de tabla de temperaturas
 * según la estructura mostrada en la imagen
 */
export function generateTemperatureTableConfig() {
  // Generamos IDs únicos para cada columna
  const horaColumnId = uuidv4();
  const tempColumnId = uuidv4();
  
  // Configuración de la tabla
  const config = {
    rows: 8, // 7 horas + 1 para "Fin"
    dynamicRows: false, // Filas fijas para este caso
    sections: [
      {
        title: "Temperatura",
        colspan: 2,
        columns: [
          {
            id: horaColumnId,
            header: "Hora",
            type: "text",
            width: "100px",
            readOnly: true, // Las horas no se pueden editar
          },
          {
            id: tempColumnId,
            header: "°C",
            type: "number",
            width: "80px",
            validation: {
              required: false,
              min: 0,
              max: 200 // Rango razonable para temperaturas en procesos industriales
            }
          }
        ]
      }
    ],
    // Datos iniciales con las horas prefijadas
    initialData: [
      { [horaColumnId]: "Hora 0", [tempColumnId]: "" },
      { [horaColumnId]: "Hora 1", [tempColumnId]: "" },
      { [horaColumnId]: "Hora 2", [tempColumnId]: "" },
      { [horaColumnId]: "Hora 3", [tempColumnId]: "" },
      { [horaColumnId]: "Hora 4", [tempColumnId]: "" },
      { [horaColumnId]: "Hora 5", [tempColumnId]: "" },
      { [horaColumnId]: "Fin", [tempColumnId]: "" }
    ]
  };
  
  return config;
}

/**
 * Componente para añadir una tabla de temperaturas a un formulario
 */
const TemperatureTableConfig: React.FC<{
  onApplyConfig: (config: any) => void
}> = ({ onApplyConfig }) => {
  const handleApplyConfig = () => {
    const config = generateTemperatureTableConfig();
    onApplyConfig(config);
  };
  
  return (
    <Button 
      onClick={handleApplyConfig}
      variant="outline"
      size="sm"
      className="mb-2"
    >
      Aplicar Configuración de Tabla de Temperaturas
    </Button>
  );
};

export default TemperatureTableConfig;