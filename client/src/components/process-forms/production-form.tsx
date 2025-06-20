import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useProducts } from "@/hooks/use-products";
import { useUsers } from "@/hooks/use-users";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Info, AlertTriangle, Clock, Edit2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Definiciones de tipos
export type UserRole = "production_manager" | "operator" | "quality_manager" | null;

export interface ProductRecipe {
  id: string;
  name: string;
  ingredients: {
    name: string;
    quantity: number;
    unit: string;
    factor: number; // Factor para calcular cantidad basada en litros
  }[];
}

export enum ProductionFormStatus {
  DRAFT = "DRAFT",
  IN_PROGRESS = "IN_PROGRESS",
  PENDING_REVIEW = "PENDING_REVIEW",
  COMPLETED = "COMPLETED"
}

interface ProductionFormSection {
  id: string;
  title: string;
  allowedRoles: UserRole[];
  editable: boolean;
}

interface ProductionFormProps {
  initialData?: any;
  onSave: (data: any) => void;
  readOnly?: boolean;
}

// Datos de productos disponibles
const PRODUCTS: ProductRecipe[] = [
  {
    id: "conito",
    name: "Conito",
    ingredients: [
      { name: "Leche de Vaca", quantity: 250, unit: "kg", factor: 0.5 }, // 0.5 kg por litro
      { name: "Leche de Cabra", quantity: 250, unit: "kg", factor: 0.5 }, // 0.5 kg por litro
      { name: "Azúcar", quantity: 100, unit: "kg", factor: 0.2 }, // 0.2 kg por litro
      { name: "Glucosa", quantity: 100, unit: "kg", factor: 0.2 }, // 0.2 kg por litro
      { name: "Malto", quantity: 25, unit: "kg", factor: 0.05 }, // 0.05 kg por litro
      { name: "Bicarbonato", quantity: 0.5, unit: "kg", factor: 0.001 }, // 0.001 kg por litro
      { name: "Sorbato", quantity: 0, unit: "kg", factor: 0 },
      { name: "Lecitina", quantity: 0.3, unit: "kg", factor: 0.0006 }, // 0.0006 kg por litro
      { name: "Carragenina", quantity: 0.125, unit: "kg", factor: 0.00025 }, // 0.00025 kg por litro
      { name: "Grasa", quantity: 0, unit: "kg", factor: 0 },
      { name: "Pasta", quantity: 0, unit: "kg", factor: 0 },
      { name: "Antiespumante", quantity: 0, unit: "kg", factor: 0 },
      { name: "Nuez", quantity: 0, unit: "kg", factor: 0 }
    ]
  },
  {
    id: "mielmex",
    name: "Mielmex 65° Brix",
    ingredients: [
      { name: "Leche de Vaca", quantity: 300, unit: "kg", factor: 0.6 },
      { name: "Leche de Cabra", quantity: 200, unit: "kg", factor: 0.4 },
      { name: "Azúcar", quantity: 150, unit: "kg", factor: 0.3 },
      { name: "Glucosa", quantity: 80, unit: "kg", factor: 0.16 },
      { name: "Malto", quantity: 20, unit: "kg", factor: 0.04 },
      { name: "Bicarbonato", quantity: 0.75, unit: "kg", factor: 0.0015 },
      { name: "Sorbato", quantity: 0.25, unit: "kg", factor: 0.0005 },
      { name: "Lecitina", quantity: 0.2, unit: "kg", factor: 0.0004 },
      { name: "Carragenina", quantity: 0.1, unit: "kg", factor: 0.0002 },
      { name: "Grasa", quantity: 0, unit: "kg", factor: 0 },
      { name: "Pasta", quantity: 0, unit: "kg", factor: 0 },
      { name: "Antiespumante", quantity: 0, unit: "kg", factor: 0 },
      { name: "Nuez", quantity: 0, unit: "kg", factor: 0 }
    ]
  }
];

// Mapeo de roles de usuario a roles de aplicación
const mapUserRoleToAppRole = (userRole: string): UserRole => {
  // Normalizar el rol a minúsculas para evitar problemas con mayúsculas/minúsculas
  const normalizedRole = userRole.toLowerCase();
  
  if (normalizedRole === "superadmin" || normalizedRole === "admin" || normalizedRole === "gerente_produccion") {
    return "production_manager";
  }
  
  if (normalizedRole === "produccion") {
    return "operator";
  }
  
  if (normalizedRole === "calidad" || normalizedRole === "gerente_calidad") {
    return "quality_manager";
  }
  
  // Por defecto, asignamos un rol de operator para evitar errores
  // Esto permite al menos ver el formulario
  return "operator";
};

// Definición de secciones del formulario
const PRODUCTION_FORM_SECTIONS: ProductionFormSection[] = [
  {
    id: "general-info",
    title: "Información General",
    allowedRoles: ["production_manager"],
    editable: true
  },
  {
    id: "raw-materials",
    title: "Materias Primas",
    allowedRoles: ["production_manager"],
    editable: true
  },
  {
    id: "process-tracking",
    title: "Seguimiento de Proceso",
    allowedRoles: ["operator", "production_manager"],
    editable: true
  },
  {
    id: "quality-verification",
    title: "Verificación de Calidad",
    allowedRoles: ["operator", "production_manager"],
    editable: true
  },
  {
    id: "product-destination",
    title: "Destino de Producto",
    allowedRoles: ["operator", "production_manager"],
    editable: true
  },
  {
    id: "final-strainer",
    title: "Colador Final",
    allowedRoles: ["production_manager", "quality_manager"],
    editable: true
  },
  {
    id: "liberation-data",
    title: "Datos de Liberación",
    allowedRoles: ["quality_manager"],
    editable: true
  }
];

// Componente principal
export default function ProductionForm({ 
  initialData = {}, 
  onSave,
  readOnly = false
}: ProductionFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general-info");
  const [formData, setFormData] = useState<any>({
    // Inicializar campos base
    ...initialData,
    // Asegurar que los campos de tiempo existan
    startTime: initialData.startTime || "",
    endTime: initialData.endTime || "",
    hourTracking: initialData.hourTracking || Array(7).fill(""),
    temperature: initialData.temperature || Array(7).fill(""),
    pressure: initialData.pressure || Array(7).fill(""),
  });
  const [status, setStatus] = useState<ProductionFormStatus>(
    initialData.status || ProductionFormStatus.DRAFT
  );
  const [autoCalculatedIngredients, setAutoCalculatedIngredients] = useState<any[]>([]);
  
  // Función para cargar ingredientes automáticamente basados en producto y litros
  const loadProductRecipe = async (productId: string, liters: number) => {
    if (!productId || !liters || liters <= 0) {
      setAutoCalculatedIngredients([]);
      return;
    }
    
    try {
      const response = await fetch(`/api/products/${productId}/recipe?liters=${liters}`);
      if (response.ok) {
        const recipeData = await response.json();
        setAutoCalculatedIngredients(recipeData.ingredients || []);
        
        // Actualizar automáticamente los campos de materiales en el formulario
        const materialsUpdate: any = {};
        recipeData.ingredients?.forEach((ingredient: any, index: number) => {
          materialsUpdate[`material_${index}`] = ingredient.name;
          materialsUpdate[`quantity_${index}`] = ingredient.quantity;
          materialsUpdate[`unit_${index}`] = ingredient.unit;
        });
        
        // También actualizar la lista de ingredientes para la tabla de materias primas
        const formattedIngredients = recipeData.ingredients?.map((ingredient: any) => ({
          name: ingredient.name,
          quantity: parseFloat(ingredient.quantity),
          unit: ingredient.unit
        })) || [];
        
        setFormData((prev: any) => ({
          ...prev,
          ...materialsUpdate,
          ingredients: formattedIngredients
        }));
        
        toast({
          title: "Materiales actualizados",
          description: `Se cargaron ${recipeData.ingredients?.length || 0} ingredientes para ${recipeData.recipeName}`,
        });
      }
    } catch (error) {
      console.error("Error cargando receta:", error);
    }
  };

  // Efecto para auto-cargar receta cuando cambie producto o litros
  useEffect(() => {
    if (formData.productType && formData.liters && formData.liters > 0) {
      loadProductRecipe(formData.productType, formData.liters);
    }
  }, [formData.productType, formData.liters]);
  
  // Cambiar de pestaña sin auto-guardado
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
  };
  
  // Determinar rol del usuario actual
  // Siempre tendremos un rol válido ahora que hemos cambiado la función de mapeo
  const currentUserRole = user ? mapUserRoleToAppRole(user.role) : "operator";
  
  // Verificar si el usuario puede editar una sección
  const canEditSection = (sectionId: string): boolean => {
    if (readOnly) return false;
    if (!user) return false;
    
    const section = PRODUCTION_FORM_SECTIONS.find(s => s.id === sectionId);
    if (!section) return false;
    
    // SuperAdmin/superadmin puede editar cualquier sección
    if (user.role.toLowerCase() === "superadmin") return true;
    
    // Si el usuario no tiene un rol asignado, no puede editar
    if (!currentUserRole) return false;
    
    return section.allowedRoles.includes(currentUserRole);
  };
  
  // Actualizar materias primas al cambiar producto o litros
  useEffect(() => {
    if (formData.productId && formData.liters) {
      const selectedProduct = PRODUCTS.find(p => p.id === formData.productId);
      if (selectedProduct) {
        const updatedIngredients = selectedProduct.ingredients.map(ingredient => ({
          name: ingredient.name,
          quantity: ingredient.factor * formData.liters,
          unit: ingredient.unit
        }));
        
        setFormData((prev: any) => ({
          ...prev,
          ingredients: updatedIngredients
        }));
      }
    }
  }, [formData.productId, formData.liters]);
  
  // Manejar cambios en los campos
  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }));
    
    // Auto-cambio de estado basado en el workflow
    autoUpdateStatus(field, value);
    
    // Si se cambió el producto o los litros, cargar receta automáticamente
    if (field === "productId" || field === "liters") {
      const updatedData = { ...formData, [field]: value };
      if (updatedData.productId && updatedData.liters && updatedData.liters > 0) {
        // Usar setTimeout para asegurar que el estado se actualice antes de cargar la receta
        setTimeout(() => {
          loadProductRecipe(updatedData.productId, updatedData.liters);
        }, 100);
      }
    }
  };
  
  // Función para auto-actualizar estado según el workflow
  const autoUpdateStatus = (field: string, value: any) => {
    if (!user) return;
    
    const userRole = mapUserRoleToAppRole(user.role);
    
    // Gerente de Producción: Al llenar información general -> IN_PROGRESS
    if (userRole === "production_manager" && 
        (field === "responsible" || field === "lotNumber") && 
        value && status === ProductionFormStatus.DRAFT) {
      setStatus(ProductionFormStatus.IN_PROGRESS);
    }
    
    // Operador: Al completar seguimiento de proceso -> PENDING_REVIEW
    if (userRole === "operator" && 
        (field === "startTime" || field === "endTime" || field === "temperature" || field === "pressure") && 
        value && status === ProductionFormStatus.IN_PROGRESS) {
      setStatus(ProductionFormStatus.PENDING_REVIEW);
    }
    
    // Gerente de Calidad: Al completar verificación -> COMPLETED
    if (userRole === "quality_manager" && 
        (field === "finalBrix" || field === "yield" || field === "cP") && 
        value && status === ProductionFormStatus.PENDING_REVIEW) {
      setStatus(ProductionFormStatus.COMPLETED);
    }
  };
  
  // Manejar guardado del formulario con cambio automático de estado
  const handleSave = () => {
    // Debug: verificar rol actual
    console.log("Rol actual del usuario:", currentUserRole);
    console.log("Estado actual:", status);
    console.log("Datos de seguimiento:", {
      startTime: formData.startTime,
      hasTemperature: formData.temperature?.some((t: string) => t),
      hasPressure: formData.pressure?.some((p: string) => p)
    });
    
    // Determinar el nuevo estado basado en el rol y datos completados
    let newStatus = status;
    
    if (currentUserRole === "production_manager") {
      // Gerente de Producción: si completa información general → EN PROCESO
      if (formData.responsible && formData.lotNumber && status === ProductionFormStatus.DRAFT) {
        newStatus = ProductionFormStatus.IN_PROGRESS;
      }
    } else if (currentUserRole === "operator") {
      // Operador: si completa seguimiento → PENDIENTE DE REVISIÓN
      if ((formData.startTime || formData.temperature?.some((t: string) => t) || 
           formData.pressure?.some((p: string) => p)) && 
          (status === ProductionFormStatus.IN_PROGRESS || status === ProductionFormStatus.DRAFT)) {
        newStatus = ProductionFormStatus.PENDING_REVIEW;
        console.log("¡Cambiando estado a PENDING_REVIEW!");
      }
    } else if (currentUserRole === "quality_manager") {
      // Gerente de Calidad: si completa verificación → COMPLETADO
      if ((formData.finalBrix || formData.c_p || formData.yield)) {
        newStatus = ProductionFormStatus.COMPLETED;
        console.log("¡Cambiando estado a COMPLETED por Gerente de Calidad!");
      }
    }
    
    onSave({
      ...formData,
      status: newStatus,
    });
    
    // Mostrar mensaje apropiado
    let message = "Los cambios han sido guardados correctamente";
    if (newStatus !== status) {
      const statusNames = {
        [ProductionFormStatus.DRAFT]: "Borrador",
        [ProductionFormStatus.IN_PROGRESS]: "En Proceso",
        [ProductionFormStatus.PENDING_REVIEW]: "Pendiente de Revisión", 
        [ProductionFormStatus.COMPLETED]: "Completado"
      };
      message = `Estado actualizado automáticamente a: ${statusNames[newStatus]}`;
      setStatus(newStatus);
    }
    
    toast({
      title: "Formulario guardado",
      description: message
    });
  };
  
  // Manejar cambio de estado
  const handleStatusChange = (newStatus: ProductionFormStatus) => {
    setStatus(newStatus);
    
    // También guardamos el formulario con el nuevo estado
    onSave({
      ...formData,
      status: newStatus,
      lastUpdatedBy: user?.id,
      lastUpdatedAt: new Date().toISOString()
    });
    
    toast({
      title: "Estado actualizado",
      description: `El formulario ahora está en estado: ${newStatus}`
    });
  };
  
  return (
    <div className="space-y-6">
      {/* Header con información de estado y acciones */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Reporte de Producción</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={status === ProductionFormStatus.DRAFT ? "outline" : 
                           status === ProductionFormStatus.IN_PROGRESS ? "default" :
                           status === ProductionFormStatus.PENDING_REVIEW ? "secondary" : 
                           "outline"}>
              {status === ProductionFormStatus.DRAFT ? "Borrador" :
               status === ProductionFormStatus.IN_PROGRESS ? "En Progreso" :
               status === ProductionFormStatus.PENDING_REVIEW ? "Pendiente de Revisión" :
               "Completado"}
            </Badge>
            {formData.folio && (
              <span className="text-sm text-muted-foreground">Folio: {formData.folio}</span>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={readOnly}>
            Guardar
          </Button>
          
          {/* Botones de cambio de estado según el rol del usuario */}
          {status === ProductionFormStatus.DRAFT && currentUserRole === "production_manager" && (
            <Button variant="outline" onClick={() => handleStatusChange(ProductionFormStatus.IN_PROGRESS)}>
              Iniciar Proceso
            </Button>
          )}
          
          {status === ProductionFormStatus.IN_PROGRESS && 
           (currentUserRole === "operator" || currentUserRole === "production_manager") && (
            <Button variant="outline" onClick={() => handleStatusChange(ProductionFormStatus.PENDING_REVIEW)}>
              Enviar a Revisión
            </Button>
          )}
          
          {status === ProductionFormStatus.PENDING_REVIEW && currentUserRole === "quality_manager" && (
            <>
              <Button variant="outline" onClick={() => handleStatusChange(ProductionFormStatus.IN_PROGRESS)}>
                Devolver a Producción
              </Button>
              <Button variant="default" onClick={() => handleStatusChange(ProductionFormStatus.COMPLETED)}>
                Aprobar y Completar
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Mensaje de acceso para el usuario */}
      {!currentUserRole ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No tienes un rol asignado para este formulario.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Estás trabajando como: {" "}
            <strong>
              {currentUserRole === "production_manager" ? "Gerente de Producción" :
               currentUserRole === "operator" ? "Operador" : "Gerente de Calidad"}
            </strong>
            . Solo puedes editar las secciones asignadas a tu rol.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Navegación por pestañas para las secciones */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-7">
          {PRODUCTION_FORM_SECTIONS.map(section => (
            <TabsTrigger 
              key={section.id} 
              value={section.id}
              disabled={!canEditSection(section.id) && !readOnly}
              className="flex items-center gap-1"
            >
              {section.title}
              {!canEditSection(section.id) && <Lock className="h-3 w-3" />}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {/* Sección de Información General */}
        <TabsContent value="general-info">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>Información General</span>
                {!canEditSection("general-info") && (
                  <Badge variant="outline">Solo Lectura</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="process">Proceso</Label>
                    <Select
                      value={formData.productId || ""}
                      onValueChange={(value) => handleChange("productId", value)}
                      disabled={!canEditSection("general-info") || readOnly}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un proceso" />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          // Usar el hook de productos para obtener la lista de productos por categoría
                          const { products, isLoading, error } = useProducts();
                          
                          // Filtrar productos por categoría "Tipo de Cajeta"
                          const cajetaProducts = products?.filter(product => 
                            product.category === "Tipo de Cajeta") || [];
                          
                          if (isLoading) {
                            return (
                              <div className="flex items-center justify-center p-4">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                <span className="ml-2">Cargando productos...</span>
                              </div>
                            );
                          }
                          
                          if (error) {
                            return (
                              <div className="flex items-center justify-center p-4 text-red-500">
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                <span>Error al cargar productos</span>
                              </div>
                            );
                          }
                          
                          if (cajetaProducts.length === 0) {
                            return (
                              <div className="flex items-center justify-center p-4 text-gray-500">
                                <Info className="h-4 w-4 mr-2" />
                                <span>No hay productos de cajeta disponibles</span>
                              </div>
                            );
                          }
                          
                          // Mostrar productos de categoría "Tipo de Cajeta"
                          return cajetaProducts.map(product => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name}
                            </SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="liters">Litros a producción</Label>
                    <Input
                      id="liters"
                      type="number"
                      value={formData.liters || ""}
                      onChange={(e) => handleChange("liters", parseFloat(e.target.value))}
                      placeholder="Ej: 500"
                      disabled={!canEditSection("general-info") || readOnly}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="date">Fecha</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date || ""}
                      onChange={(e) => handleChange("date", e.target.value)}
                      disabled={!canEditSection("general-info") || readOnly}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="responsible">Responsable</Label>
                    <Input
                      id="responsible"
                      value={formData.responsible || ""}
                      onChange={(e) => handleChange("responsible", e.target.value)}
                      placeholder="Nombre del responsable"
                      disabled={!canEditSection("general-info") || readOnly}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="caducidad">Fecha de caducidad</Label>
                    <Input
                      id="caducidad"
                      type="date"
                      value={formData.caducidad || ""}
                      onChange={(e) => handleChange("caducidad", e.target.value)}
                      disabled={!canEditSection("general-info") || readOnly}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="marmita">Marmita</Label>
                    <Input
                      id="marmita"
                      value={formData.marmita || ""}
                      onChange={(e) => handleChange("marmita", e.target.value)}
                      placeholder="Número de marmita"
                      disabled={!canEditSection("general-info") || readOnly}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="folio">Folio</Label>
                    <Input
                      id="folio"
                      value={formData.folio || ""}
                      onChange={(e) => handleChange("folio", e.target.value)}
                      placeholder="Ingrese el folio"
                      disabled={!canEditSection("general-info") || readOnly}
                      className="font-semibold"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lotNumber" className="text-yellow-600 font-medium">Número de Lote</Label>
                    <Input
                      id="lotNumber"
                      value={formData.lotNumber || ""}
                      onChange={(e) => handleChange("lotNumber", e.target.value)}
                      placeholder="Ingrese el número de lote"
                      disabled={!canEditSection("general-info") || readOnly}
                      className="font-medium"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Sección de Materias Primas */}
        <TabsContent value="raw-materials">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>Materias Primas</span>
                {!canEditSection("raw-materials") && (
                  <Badge variant="outline">Solo Lectura</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Materia Prima</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kilos</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.ingredients ? (
                      formData.ingredients.map((ingredient: any, index: number) => (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-3">{ingredient.name}</td>
                          <td className="px-4 py-3">{ingredient.quantity.toFixed(3)}</td>
                          <td className="px-4 py-3">
                            <Input
                              type="time"
                              value={(formData.ingredientTimes && formData.ingredientTimes[index]) || ""}
                              onChange={(e) => {
                                const times = [...(formData.ingredientTimes || Array(formData.ingredients?.length || 0).fill(""))];
                                times[index] = e.target.value;
                                handleChange("ingredientTimes", times);
                              }}
                              disabled={!canEditSection("raw-materials") || readOnly}
                              className="h-8 w-24"
                            />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-center text-muted-foreground">
                          Seleccione un proceso y litros para ver las materias primas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Sección de Seguimiento de Proceso */}
        <TabsContent value="process-tracking">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>Seguimiento de Proceso</span>
                {!canEditSection("process-tracking") && (
                  <Badge variant="outline">Solo Lectura</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label>Hora Inicio</Label>
                  <Input
                    type="time"
                    value={formData.startTime || ""}
                    onChange={(e) => handleChange("startTime", e.target.value)}
                    disabled={!canEditSection("process-tracking") || readOnly}
                  />
                </div>
                
                <div className="space-y-4">
                  <Label>Hora Término</Label>
                  <Input
                    type="time"
                    value={formData.endTime || ""}
                    onChange={(e) => handleChange("endTime", e.target.value)}
                    disabled={!canEditSection("process-tracking") || readOnly}
                  />
                </div>
              </div>
              
              <Separator className="my-6" />
              
              <div className="grid grid-cols-2 gap-6">
                {/* Tabla de Temperatura */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">Temperatura</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium">Hora</th>
                          <th className="px-3 py-2 text-right text-xs font-medium">°C</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 7 }).map((_, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-2 text-sm">
                              {i < 6 ? `Hora ${i}` : "Fin"}
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                value={(formData.temperature && formData.temperature[i]) || ""}
                                onChange={(e) => {
                                  const temps = [...(formData.temperature || Array(7).fill(""))];
                                  temps[i] = e.target.value;
                                  handleChange("temperature", temps);
                                }}
                                placeholder="°C"
                                disabled={!canEditSection("process-tracking") || readOnly}
                                className="h-8 text-right"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
                
                {/* Tabla de Manómetro */}
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">Manómetro</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium">Hora</th>
                          <th className="px-3 py-2 text-right text-xs font-medium">PSI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 7 }).map((_, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-2 text-sm">
                              {i < 6 ? `Hora ${i}` : "Fin"}
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                type="number"
                                value={(formData.pressure && formData.pressure[i]) || ""}
                                onChange={(e) => {
                                  const pressures = [...(formData.pressure || Array(7).fill(""))];
                                  pressures[i] = e.target.value;
                                  handleChange("pressure", pressures);
                                }}
                                placeholder="PSI"
                                disabled={!canEditSection("process-tracking") || readOnly}
                                className="h-8 text-right"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Sección de Verificación de Calidad */}
        <TabsContent value="quality-verification">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>Verificación de Calidad</span>
                {!canEditSection("quality-verification") && (
                  <Badge variant="outline">Solo Lectura</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium">Hora</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">Grados Brix</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">Temperatura</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">Textura</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">Color</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">Viscosidad</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">Olor</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">Sabor</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">Material Extraño</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">Status</th>
                      </tr>
                      <tr>
                        <th className="px-3 py-2 text-left text-xs">Hora</th>
                        <th className="px-3 py-2 text-left text-xs">65° Brix</th>
                        <th className="px-3 py-2 text-left text-xs">70°C a 95°C</th>
                        <th className="px-3 py-2 text-left text-xs"></th>
                        <th className="px-3 py-2 text-left text-xs"></th>
                        <th className="px-3 py-2 text-left text-xs"></th>
                        <th className="px-3 py-2 text-left text-xs"></th>
                        <th className="px-3 py-2 text-left text-xs"></th>
                        <th className="px-3 py-2 text-left text-xs">N/A</th>
                        <th className="px-3 py-2 text-left text-xs"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2">
                            <Input
                              type="time"
                              value={(formData.qualityTimes && formData.qualityTimes[i]) || ""}
                              onChange={(e) => {
                                const times = [...(formData.qualityTimes || Array(8).fill(""))];
                                times[i] = e.target.value;
                                handleChange("qualityTimes", times);
                              }}
                              disabled={!canEditSection("quality-verification") || readOnly}
                              className="h-8 w-24"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="text"
                              value={(formData.brix && formData.brix[i]) || ""}
                              onChange={(e) => {
                                const values = [...(formData.brix || Array(8).fill(""))];
                                values[i] = e.target.value;
                                handleChange("brix", values);
                              }}
                              disabled={!canEditSection("quality-verification") || readOnly}
                              className="h-8 w-24"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="text"
                              value={(formData.qualityTemp && formData.qualityTemp[i]) || ""}
                              onChange={(e) => {
                                const values = [...(formData.qualityTemp || Array(8).fill(""))];
                                values[i] = e.target.value;
                                handleChange("qualityTemp", values);
                              }}
                              disabled={!canEditSection("quality-verification") || readOnly}
                              className="h-8 w-24"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="text"
                              value={(formData.texture && formData.texture[i]) || ""}
                              onChange={(e) => {
                                const values = [...(formData.texture || Array(8).fill(""))];
                                values[i] = e.target.value;
                                handleChange("texture", values);
                              }}
                              disabled={!canEditSection("quality-verification") || readOnly}
                              className="h-8 w-24"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="text"
                              value={(formData.color && formData.color[i]) || ""}
                              onChange={(e) => {
                                const values = [...(formData.color || Array(8).fill(""))];
                                values[i] = e.target.value;
                                handleChange("color", values);
                              }}
                              disabled={!canEditSection("quality-verification") || readOnly}
                              className="h-8 w-24"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="text"
                              value={(formData.viscosity && formData.viscosity[i]) || ""}
                              onChange={(e) => {
                                const values = [...(formData.viscosity || Array(8).fill(""))];
                                values[i] = e.target.value;
                                handleChange("viscosity", values);
                              }}
                              disabled={!canEditSection("quality-verification") || readOnly}
                              className="h-8 w-24"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="text"
                              value={(formData.smell && formData.smell[i]) || ""}
                              onChange={(e) => {
                                const values = [...(formData.smell || Array(8).fill(""))];
                                values[i] = e.target.value;
                                handleChange("smell", values);
                              }}
                              disabled={!canEditSection("quality-verification") || readOnly}
                              className="h-8 w-24"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="text"
                              value={(formData.taste && formData.taste[i]) || ""}
                              onChange={(e) => {
                                const values = [...(formData.taste || Array(8).fill(""))];
                                values[i] = e.target.value;
                                handleChange("taste", values);
                              }}
                              disabled={!canEditSection("quality-verification") || readOnly}
                              className="h-8 w-24"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="text"
                              value={(formData.foreignMaterial && formData.foreignMaterial[i]) || ""}
                              onChange={(e) => {
                                const values = [...(formData.foreignMaterial || Array(8).fill(""))];
                                values[i] = e.target.value;
                                handleChange("foreignMaterial", values);
                              }}
                              disabled={!canEditSection("quality-verification") || readOnly}
                              className="h-8 w-24"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="text"
                              value={(formData.statusCheck && formData.statusCheck[i]) || ""}
                              onChange={(e) => {
                                const values = [...(formData.statusCheck || Array(8).fill(""))];
                                values[i] = e.target.value;
                                handleChange("statusCheck", values);
                              }}
                              disabled={!canEditSection("quality-verification") || readOnly}
                              className="h-8 w-24"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
              
              <Separator className="my-6" />
              
              {/* Sección de Notas */}
              <div className="space-y-4">
                <Label htmlFor="qualityNotes" className="text-base font-medium">Notas de Verificación de Calidad</Label>
                <Textarea
                  id="qualityNotes"
                  value={formData.qualityNotes || ""}
                  onChange={(e) => handleChange("qualityNotes", e.target.value)}
                  placeholder="Ingrese observaciones, comentarios o notas adicionales sobre la verificación de calidad..."
                  disabled={!canEditSection("quality-verification") || readOnly}
                  className="min-h-[100px] resize-y"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Sección de Destino de Producto */}
        <TabsContent value="product-destination">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>Destino de Producto</span>
                {!canEditSection("product-destination") && (
                  <Badge variant="outline">Solo Lectura</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo de Cajeta</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Kilos</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Producto</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estimación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-4 py-3">
                          <Input
                            type="text"
                            value={(formData.destinationType && formData.destinationType[i]) || ""}
                            onChange={(e) => {
                              const values = [...(formData.destinationType || Array(4).fill(""))];
                              values[i] = e.target.value;
                              handleChange("destinationType", values);
                            }}
                            disabled={!canEditSection("product-destination") || readOnly}
                            className="h-9"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            value={(formData.destinationKilos && formData.destinationKilos[i]) || ""}
                            onChange={(e) => {
                              const values = [...(formData.destinationKilos || Array(4).fill(""))];
                              values[i] = e.target.value;
                              handleChange("destinationKilos", values);
                            }}
                            disabled={!canEditSection("product-destination") || readOnly}
                            className="h-9"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="text"
                            value={(formData.destinationProduct && formData.destinationProduct[i]) || ""}
                            onChange={(e) => {
                              const values = [...(formData.destinationProduct || Array(4).fill(""))];
                              values[i] = e.target.value;
                              handleChange("destinationProduct", values);
                            }}
                            disabled={!canEditSection("product-destination") || readOnly}
                            className="h-9"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="text"
                            value={(formData.destinationEstimation && formData.destinationEstimation[i]) || ""}
                            onChange={(e) => {
                              const values = [...(formData.destinationEstimation || Array(4).fill(""))];
                              values[i] = e.target.value;
                              handleChange("destinationEstimation", values);
                            }}
                            disabled={!canEditSection("product-destination") || readOnly}
                            className="h-9"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Sección de Colador Final */}
        <TabsContent value="final-strainer">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>Colador Final</span>
                {!canEditSection("final-strainer") && (
                  <Badge variant="outline">Solo Lectura</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Campos Total Kilos y Rendimiento */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="totalKilos" className="text-base font-medium">Total Kilos</Label>
                    <Input
                      id="totalKilos"
                      type="number"
                      value={formData.totalKilos || ""}
                      onChange={(e) => handleChange("totalKilos", e.target.value)}
                      disabled={!canEditSection("final-strainer") || readOnly}
                      className="mt-2"
                      placeholder="Ingrese el total de kilos"
                    />
                  </div>
                  <div>
                    <Label htmlFor="yield" className="text-base font-medium">Rendimiento</Label>
                    <Input
                      id="yield"
                      type="text"
                      value={formData.yield || ""}
                      onChange={(e) => handleChange("yield", e.target.value)}
                      disabled={!canEditSection("final-strainer") || readOnly}
                      className="mt-2"
                      placeholder="Ingrese el rendimiento"
                    />
                  </div>
                </div>
                
                <Separator className="my-6" />
                
                {/* Tabla de Estado del Colador */}
                <div>
                  <Label className="text-base font-medium mb-4 block">Estado del Colador</Label>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground"></th>
                          <th className="px-4 py-3 text-center font-medium text-muted-foreground">Bueno</th>
                          <th className="px-4 py-3 text-center font-medium text-muted-foreground">Malo</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t">
                          <td className="px-4 py-3 font-medium">Estado de inicio</td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="radio"
                              name="startState"
                              value="good"
                              checked={formData.startState === "good"}
                              onChange={() => handleChange("startState", "good")}
                              disabled={!canEditSection("final-strainer") || readOnly}
                              className="h-4 w-4"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="radio"
                              name="startState"
                              value="bad"
                              checked={formData.startState === "bad"}
                              onChange={() => handleChange("startState", "bad")}
                              disabled={!canEditSection("final-strainer") || readOnly}
                              className="h-4 w-4"
                            />
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td className="px-4 py-3 font-medium">Estado al final</td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="radio"
                              name="endState"
                              value="good"
                              checked={formData.endState === "good"}
                              onChange={() => handleChange("endState", "good")}
                              disabled={!canEditSection("final-strainer") || readOnly}
                              className="h-4 w-4"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="radio"
                              name="endState"
                              value="bad"
                              checked={formData.endState === "bad"}
                              onChange={() => handleChange("endState", "bad")}
                              disabled={!canEditSection("final-strainer") || readOnly}
                              className="h-4 w-4"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Sección de Datos de Liberación */}
        <TabsContent value="liberation-data">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>Datos de Liberación</span>
                {!canEditSection("liberation-data") && (
                  <Badge variant="outline">Solo Lectura</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">Datos de liberación</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label>Folio de liberación</Label>
                        <Input
                          type="text"
                          value={formData.liberationFolio || ""}
                          onChange={(e) => handleChange("liberationFolio", e.target.value)}
                          disabled={!canEditSection("liberation-data") || readOnly}
                          className="mt-2"
                          placeholder="Ingrese el folio de liberación"
                        />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>cP</Label>
                          <Input
                            type="text"
                            value={formData.cP || ""}
                            onChange={(e) => handleChange("cP", e.target.value)}
                            disabled={!canEditSection("liberation-data") || readOnly}
                            className="mt-2"
                          />
                        </div>
                        
                        <div>
                          <Label>Cm en consistómetro</Label>
                          <Input
                            type="text"
                            value={formData.cmConsistometer || ""}
                            onChange={(e) => handleChange("cmConsistometer", e.target.value)}
                            disabled={!canEditSection("liberation-data") || readOnly}
                            className="mt-2"
                          />
                        </div>
                        
                        <div>
                          <Label>Grados Brix</Label>
                          <Input
                            type="text"
                            value={formData.finalBrix || ""}
                            onChange={(e) => handleChange("finalBrix", e.target.value)}
                            disabled={!canEditSection("liberation-data") || readOnly}
                            className="mt-2"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base">Firma Responsable</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-center">
                      <div className="w-64">
                        <div className="border rounded-md mt-2 h-20 flex items-center justify-center">
                          {formData.signatureUrl ? (
                            <img 
                              src={formData.signatureUrl} 
                              alt="Firma" 
                              className="max-h-full max-w-full object-contain"
                            />
                          ) : (
                            <Button 
                              variant="outline" 
                              disabled={!canEditSection("liberation-data") || readOnly}
                              className="h-12"
                            >
                              <Edit2 className="mr-2 h-4 w-4" />
                              Capturar Firma
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Componente Lock (icono de candado)
function Lock({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}