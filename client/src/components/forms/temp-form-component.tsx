// Este es un archivo temporal para corregir el campo AdvancedTableEditor
                                          return (
                                            <FormItem>
                                              <FormLabel>Configuración de Tabla Avanzada</FormLabel>
                                              <FormDescription>
                                                Usa el editor para configurar las secciones y columnas de la tabla
                                              </FormDescription>
                                              <AdvancedTableEditor
                                                value={field.value || { rows: 3, dynamicRows: true, sections: [] }}
                                                onChange={(newConfig) => {
                                                  console.log("FormBuilder: recibiendo nueva configuración de tabla", newConfig);
                                                  form.setValue(`fields.${index}.advancedTableConfig`, newConfig);
                                                }}
                                              />
                                              <FormMessage />
                                            </FormItem>
                                          );