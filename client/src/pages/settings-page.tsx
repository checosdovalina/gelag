import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import MainLayout from "@/layouts/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Save, Download, Database, Server, Lock } from "lucide-react";

// System settings schema
const systemSettingsSchema = z.object({
  appName: z.string().min(1, "El nombre de la aplicación es requerido"),
  dataDirectory: z.string().min(1, "El directorio de datos es requerido"),
  enableNotifications: z.boolean().default(true),
  autoBackup: z.boolean().default(true),
  backupDirectory: z.string().optional(),
});

// Security settings schema
const securitySettingsSchema = z.object({
  sessionTimeout: z.number().min(5, "El tiempo mínimo es 5 minutos"),
  maxLoginAttempts: z.number().min(1, "El valor mínimo es 1 intento"),
  passwordExpiration: z.number().min(0, "El valor mínimo es 0 días (sin expiración)"),
  requirePasswordComplexity: z.boolean().default(true),
});

// Database settings schema
const databaseSettingsSchema = z.object({
  dbHost: z.string().min(1, "El host es requerido"),
  dbPort: z.string().min(1, "El puerto es requerido"),
  dbName: z.string().min(1, "El nombre de la base de datos es requerido"),
  dbUser: z.string().min(1, "El usuario es requerido"),
  dbPassword: z.string().optional(),
});

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("system");

  // System settings form
  const systemForm = useForm<z.infer<typeof systemSettingsSchema>>({
    resolver: zodResolver(systemSettingsSchema),
    defaultValues: {
      appName: "FormCapture",
      dataDirectory: "/data/forms",
      enableNotifications: true,
      autoBackup: true,
      backupDirectory: "/data/backups",
    },
  });

  // Security settings form
  const securityForm = useForm<z.infer<typeof securitySettingsSchema>>({
    resolver: zodResolver(securitySettingsSchema),
    defaultValues: {
      sessionTimeout: 30,
      maxLoginAttempts: 5,
      passwordExpiration: 90,
      requirePasswordComplexity: true,
    },
  });

  // Database settings form
  const databaseForm = useForm<z.infer<typeof databaseSettingsSchema>>({
    resolver: zodResolver(databaseSettingsSchema),
    defaultValues: {
      dbHost: "localhost",
      dbPort: "5432",
      dbName: "formcapture",
      dbUser: "postgres",
      dbPassword: "",
    },
  });

  // Handle form submissions
  const onSystemSubmit = (data: z.infer<typeof systemSettingsSchema>) => {
    toast({
      title: "Configuración del sistema guardada",
      description: "La configuración del sistema ha sido actualizada correctamente",
    });
    console.log(data);
  };

  const onSecuritySubmit = (data: z.infer<typeof securitySettingsSchema>) => {
    toast({
      title: "Configuración de seguridad guardada",
      description: "La configuración de seguridad ha sido actualizada correctamente",
    });
    console.log(data);
  };

  const onDatabaseSubmit = (data: z.infer<typeof databaseSettingsSchema>) => {
    toast({
      title: "Configuración de base de datos guardada",
      description: "La configuración de base de datos ha sido actualizada correctamente",
    });
    console.log(data);
  };

  // Handle backup
  const handleBackup = () => {
    toast({
      title: "Respaldo iniciado",
      description: "El respaldo de la base de datos ha comenzado. Recibirá una notificación cuando se complete.",
    });
    
    // Simulate backup completion
    setTimeout(() => {
      toast({
        title: "Respaldo completado",
        description: "El respaldo de la base de datos se ha completado correctamente.",
      });
    }, 3000);
  };

  return (
    <MainLayout title="Configuración">
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="system">Sistema</TabsTrigger>
            <TabsTrigger value="security">Seguridad</TabsTrigger>
            <TabsTrigger value="database">Base de Datos</TabsTrigger>
          </TabsList>
          
          {/* System Settings */}
          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>Configuración del Sistema</CardTitle>
                <CardDescription>
                  Configure los ajustes generales de la aplicación
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...systemForm}>
                  <form onSubmit={systemForm.handleSubmit(onSystemSubmit)} className="space-y-6">
                    <FormField
                      control={systemForm.control}
                      name="appName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre de la Aplicación</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            Este nombre se mostrará en el encabezado y el título de la página
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={systemForm.control}
                      name="dataDirectory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Directorio de Datos</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            Ubicación donde se almacenarán los archivos de la aplicación
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Separator className="my-4" />
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Opciones Adicionales</h3>
                      
                      <FormField
                        control={systemForm.control}
                        name="enableNotifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Notificaciones</FormLabel>
                              <FormDescription>
                                Habilitar notificaciones en la aplicación
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={systemForm.control}
                        name="autoBackup"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Respaldo Automático</FormLabel>
                              <FormDescription>
                                Realizar respaldos automáticos de la base de datos
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      {systemForm.watch("autoBackup") && (
                        <FormField
                          control={systemForm.control}
                          name="backupDirectory"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Directorio de Respaldos</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormDescription>
                                Ubicación donde se guardarán los respaldos
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                    
                    <div className="flex justify-end">
                      <Button type="submit">
                        <Save className="mr-2 h-4 w-4" />
                        Guardar Configuración
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Security Settings */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Seguridad</CardTitle>
                <CardDescription>
                  Configure los ajustes de seguridad de la aplicación
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...securityForm}>
                  <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <FormField
                        control={securityForm.control}
                        name="sessionTimeout"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tiempo de Sesión (min)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              Tiempo de inactividad antes de cerrar sesión
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={securityForm.control}
                        name="maxLoginAttempts"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Intentos Máximos de Login</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>
                              Número de intentos antes de bloquear la cuenta
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={securityForm.control}
                      name="passwordExpiration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expiración de Contraseña (días)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Días hasta que se solicite cambiar la contraseña (0 = sin expiración)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={securityForm.control}
                      name="requirePasswordComplexity"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Requerir Contraseñas Complejas</FormLabel>
                            <FormDescription>
                              Exigir contraseñas con mayúsculas, números y símbolos
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end">
                      <Button type="submit">
                        <Lock className="mr-2 h-4 w-4" />
                        Guardar Configuración
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Database Settings */}
          <TabsContent value="database">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Base de Datos</CardTitle>
                <CardDescription>
                  Configure la conexión a la base de datos y opciones relacionadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...databaseForm}>
                  <form onSubmit={databaseForm.handleSubmit(onDatabaseSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <FormField
                        control={databaseForm.control}
                        name="dbHost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Host</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={databaseForm.control}
                        name="dbPort"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Puerto</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={databaseForm.control}
                      name="dbName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre de la Base de Datos</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <FormField
                        control={databaseForm.control}
                        name="dbUser"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Usuario</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={databaseForm.control}
                        name="dbPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contraseña</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormDescription>
                              Dejar en blanco para mantener la contraseña actual
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Mantenimiento</h3>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <Button type="button" variant="outline" onClick={handleBackup}>
                          <Download className="mr-2 h-4 w-4" />
                          Crear Respaldo Ahora
                        </Button>
                        <Button type="button" variant="secondary">
                          <Database className="mr-2 h-4 w-4" />
                          Comprobar Conexión
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button type="submit">
                        <Server className="mr-2 h-4 w-4" />
                        Guardar Configuración
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
