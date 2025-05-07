import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { ArrowUpDown, Eye, EyeOff, GripVertical, ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { FormTemplate } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

interface FieldOption {
  id: string;
  label: string;
  selected: boolean;
  order: number;
}

interface FieldsSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: FormTemplate;
  initialSelectedFields?: string[];
  onSave: (selectedFields: string[], fieldOrder: Record<string, number>) => void;
}

export function FieldsSelectorModal({
  open,
  onOpenChange,
  template,
  initialSelectedFields,
  onSave,
}: FieldsSelectorModalProps) {
  const [fieldOptions, setFieldOptions] = useState<FieldOption[]>([]);
  const [selectAll, setSelectAll] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Inicializar opciones de campos al montar el componente
  useEffect(() => {
    if (template && template.structure && template.structure.fields) {
      // Extraer todos los campos disponibles del template
      const fields = template.structure.fields;
      
      // Crear opciones de campo con selección inicial basada en initialSelectedFields
      const options = fields.map((field, index) => ({
        id: field.id,
        label: field.displayName || field.label,
        selected: initialSelectedFields ? initialSelectedFields.includes(field.id) : true,
        order: field.displayOrder || index
      }));
      
      // Ordenar opciones por el orden de visualización
      options.sort((a, b) => a.order - b.order);
      
      setFieldOptions(options);
      
      // Determinar si todos los campos están seleccionados inicialmente
      setSelectAll(
        initialSelectedFields ? 
        options.length === initialSelectedFields.length : 
        true
      );
    }
  }, [template, initialSelectedFields]);

  // Manejar cambio de selección en un campo
  const handleToggleField = (fieldId: string) => {
    setFieldOptions(prevOptions => {
      const newOptions = prevOptions.map(option => {
        if (option.id === fieldId) {
          return { ...option, selected: !option.selected };
        }
        return option;
      });
      
      // Actualizar el estado selectAll basado en si todos los campos están seleccionados
      const allSelected = newOptions.every(option => option.selected);
      setSelectAll(allSelected);
      
      return newOptions;
    });
  };

  // Manejar seleccionar/deseleccionar todos
  const handleToggleAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    
    setFieldOptions(prevOptions => 
      prevOptions.map(option => ({
        ...option,
        selected: newSelectAll
      }))
    );
  };

  // Manejar reordenamiento de campos
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(fieldOptions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Actualizar orden de los campos
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index
    }));
    
    setFieldOptions(updatedItems);
  };

  // Función para desplazarse hacia abajo
  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      // Agarrar el elemento scroll dentro del ScrollArea
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        // Scroll hacia abajo
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  };
  
  // Guardar configuración
  const handleSave = () => {
    // Asegurarnos de que al menos un campo esté seleccionado
    const selectedOptions = fieldOptions.filter(option => option.selected);
    
    if (selectedOptions.length === 0) {
      // Evitar guardar si no hay campos seleccionados
      alert("Por favor, selecciona al menos un campo para continuar.");
      return;
    }
    
    const selectedFields = selectedOptions.map(option => option.id);
    
    // Crear un mapa de id de campo a su orden
    const fieldOrder: Record<string, number> = {};
    fieldOptions.forEach(option => {
      fieldOrder[option.id] = option.order;
    });
    
    // Log para depuración
    console.log("Campos seleccionados:", selectedFields);
    console.log("Orden de campos:", fieldOrder);
    
    onSave(selectedFields, fieldOrder);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Configurar campos visibles</DialogTitle>
          <DialogDescription>
            Selecciona y ordena los campos que deseas ver en la exportación.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center py-2 space-x-2">
          <Switch 
            id="select-all" 
            checked={selectAll}
            onCheckedChange={handleToggleAll}
          />
          <Label htmlFor="select-all" className="text-sm font-medium">
            {selectAll ? "Deseleccionar todos" : "Seleccionar todos"}
          </Label>
          
          <div className="flex-1" />
          
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Arrastra para reordenar
            </span>
          </div>
        </div>
        
        <Separator />
        
        {/* Botón para desplazarse hacia abajo */}
        <div className="flex justify-end mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={scrollToBottom}
            className="gap-1"
          >
            Ver campos al final <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Aquí está el cambio clave: establecer una altura fija y asegurar que tiene overflow */}
        <div className="flex-1 overflow-hidden" style={{ height: "55vh" }} ref={scrollAreaRef}>
          <ScrollArea className="h-full w-full pr-4">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="fields-list">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2 pb-4"
                  >
                    {fieldOptions.map((option, index) => (
                      <Draggable
                        key={option.id}
                        draggableId={option.id}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center space-x-3 border rounded-md p-3 ${
                              option.selected ? "bg-white" : "bg-gray-50"
                            }`}
                          >
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="h-5 w-5 text-muted-foreground" />
                            </div>
                            
                            <Checkbox
                              id={`field-${option.id}`}
                              checked={option.selected}
                              onCheckedChange={() => handleToggleField(option.id)}
                            />
                            
                            <label
                              htmlFor={`field-${option.id}`}
                              className="flex-1 text-sm font-medium cursor-pointer"
                            >
                              {option.label}
                            </label>
                            
                            {option.selected ? (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </ScrollArea>
        </div>
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Guardar configuración
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}