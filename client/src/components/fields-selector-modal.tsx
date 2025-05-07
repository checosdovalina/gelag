import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { ArrowUpDown, Eye, EyeOff, GripVertical, Search, ChevronRight, ChevronLeft } from "lucide-react";
import { Label } from "@/components/ui/label";
import { FormTemplate } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredOptions, setFilteredOptions] = useState<FieldOption[]>([]);
  
  // Estado para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Inicializar opciones de campos al montar el componente
  useEffect(() => {
    if (template && template.structure && template.structure.fields) {
      // Extraer todos los campos disponibles del template
      const fields = template.structure.fields as any[];
      
      // Crear opciones de campo con selección inicial basada en initialSelectedFields
      const options = fields.map((field, index) => ({
        id: field.id,
        label: field.displayName || field.label,
        selected: initialSelectedFields ? initialSelectedFields.includes(field.id) : true,
        order: field.displayOrder || index
      }));
      
      // Ordenar opciones por el orden de visualización
      options.sort((a: any, b: any) => a.order - b.order);
      
      setFieldOptions(options);
      setFilteredOptions(options);
      
      // Determinar si todos los campos están seleccionados inicialmente
      setSelectAll(
        initialSelectedFields ? 
        options.length === initialSelectedFields.length : 
        true
      );
    }
  }, [template, initialSelectedFields]);
  
  // Filtrar opciones basadas en el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredOptions(fieldOptions);
      setCurrentPage(1);
    } else {
      const filtered = fieldOptions.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOptions(filtered);
      setCurrentPage(1);
    }
  }, [searchTerm, fieldOptions]);

  // Calcular opciones visibles en la página actual
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredOptions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredOptions.length / itemsPerPage);

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
    
    // Solo permitir reordenar dentro de la página actual
    if (result.source.droppableId === "fields-list" && result.destination.droppableId === "fields-list") {
      // Mapeo de los índices locales a los índices globales
      const globalSourceIndex = indexOfFirstItem + result.source.index;
      const globalDestIndex = indexOfFirstItem + result.destination.index;
      
      const newFieldOptions = Array.from(fieldOptions);
      const [reorderedItem] = newFieldOptions.splice(globalSourceIndex, 1);
      newFieldOptions.splice(globalDestIndex, 0, reorderedItem);
      
      // Actualizar el orden
      const updatedOptions = newFieldOptions.map((item, index) => ({
        ...item,
        order: index
      }));
      
      setFieldOptions(updatedOptions);
      
      // Actualizar las opciones filtradas
      if (searchTerm) {
        setFilteredOptions(prevFiltered => {
          const newFiltered = prevFiltered.filter(item => item.id !== reorderedItem.id);
          newFiltered.splice(result.destination.index, 0, reorderedItem);
          return newFiltered;
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
    
    onSave(selectedFields, fieldOrder);
    onOpenChange(false);
  };

  // Cambiar de página
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };
  
  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
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
        
        {/* Campo de búsqueda */}
        <div className="relative mb-4 mt-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar campo..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Lista de campos con paginación */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-[45vh] w-full pr-4">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="fields-list">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2 pb-4"
                  >
                    {currentItems.map((option, index) => (
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
        
        {/* Controles de paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            
            <span className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="gap-1"
            >
              Siguiente <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        <DialogFooter className="mt-4">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {filteredOptions.length} campos en total
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                Guardar configuración
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}