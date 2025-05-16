import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AdvancedTableEditor } from "./advanced-table-editor";
import { Control } from "react-hook-form";
import { FormField as FormFieldType } from "@shared/schema";

export function AdvancedTableFieldView({
  control,
  index,
  field
}: {
  control: Control<any>;
  index: number;
  field: FormFieldType;
}) {
  return (
    <FormField
      control={control}
      name={`fields.${index}.advancedTableConfig`}
      render={({ field: innerField }) => (
        <FormItem>
          <FormLabel>Configuración de Tabla Avanzada</FormLabel>
          <FormDescription>
            Usa el editor para configurar las secciones y columnas de la tabla
          </FormDescription>
          <FormControl>
            <AdvancedTableEditor
              value={innerField.value || { rows: 3, dynamicRows: true, sections: [] }}
              onChange={(newConfig) => {
                console.log("FormBuilder: recibiendo nueva configuración de tabla", newConfig);
                innerField.onChange(newConfig);
              }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}