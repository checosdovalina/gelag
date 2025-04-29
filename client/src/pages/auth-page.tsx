import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Redirect } from "wouter";
import { FileText, User, Lock, Mail, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Login form schema
const loginSchema = z.object({
  username: z.string().min(1, "El nombre de usuario es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

// Register form schema
const registerSchema = z.object({
  username: z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Ingrese un correo electrónico válido"),
  role: z.nativeEnum(UserRole),
  department: z.string().optional(),
});

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const { user, loginMutation, registerMutation } = useAuth();

  // Login form
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      email: "",
      role: UserRole.VIEWER,
      department: "",
    },
  });

  // Handle login form submission
  const onLoginSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(data);
  };

  // Handle register form submission
  const onRegisterSubmit = (data: z.infer<typeof registerSchema>) => {
    registerMutation.mutate(data);
  };

  // Redirect to home if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <div className="flex flex-col justify-center items-center w-full md:w-1/2 p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[380px]">
          <div className="flex flex-col space-y-2 text-center">
            <div className="flex justify-center mb-2">
              <FileText className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">FormCapture</h1>
            <p className="text-sm text-neutral-500">
              Sistema de Captura de Datos Corporativo
            </p>
          </div>

          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="register">Registrarse</TabsTrigger>
            </TabsList>
            
            {/* Login Form */}
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Iniciar Sesión</CardTitle>
                  <CardDescription>
                    Ingrese sus credenciales para acceder al sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre de Usuario</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
                                <Input
                                  placeholder="usuario"
                                  className="pl-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contraseña</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
                                <Input
                                  type="password"
                                  placeholder="********"
                                  className="pl-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={loginMutation.isPending}
                      >
                        {loginMutation.isPending ? "Iniciando sesión..." : "Iniciar Sesión"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="justify-center text-center">
                  <p className="text-sm text-neutral-500">
                    ¿No tiene una cuenta?{" "}
                    <Button
                      variant="link"
                      className="p-0 text-primary"
                      onClick={() => setActiveTab("register")}
                    >
                      Regístrese aquí
                    </Button>
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* Register Form */}
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Crear Cuenta</CardTitle>
                  <CardDescription>
                    Complete el formulario para registrarse en el sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre Completo</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
                                <Input
                                  placeholder="Juan Pérez"
                                  className="pl-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField
                          control={registerForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nombre de Usuario</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <User className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
                                  <Input
                                    placeholder="usuario"
                                    className="pl-10"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Correo Electrónico</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
                                  <Input
                                    type="email"
                                    placeholder="usuario@ejemplo.com"
                                    className="pl-10"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contraseña</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
                                <Input
                                  type="password"
                                  placeholder="********"
                                  className="pl-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField
                          control={registerForm.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Rol</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccione un rol" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value={UserRole.ADMIN}>Administrador</SelectItem>
                                  <SelectItem value={UserRole.PRODUCTION}>Producción</SelectItem>
                                  <SelectItem value={UserRole.QUALITY}>Calidad</SelectItem>
                                  <SelectItem value={UserRole.VIEWER}>Visualizador</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="department"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Departamento</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Building className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
                                  <Input
                                    placeholder="Departamento"
                                    className="pl-10"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? "Registrando..." : "Registrarse"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="justify-center text-center">
                  <p className="text-sm text-neutral-500">
                    ¿Ya tiene una cuenta?{" "}
                    <Button
                      variant="link"
                      className="p-0 text-primary"
                      onClick={() => setActiveTab("login")}
                    >
                      Inicie sesión aquí
                    </Button>
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Hero section on the right */}
      <div className="hidden md:flex md:w-1/2 bg-primary items-center justify-center p-8">
        <div className="max-w-md text-white">
          <h2 className="text-3xl font-bold mb-6">Sistema de Formularios On-Premise</h2>
          <ul className="space-y-4">
            <li className="flex items-start">
              <div className="bg-white bg-opacity-20 rounded-full p-1 mr-3 mt-0.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-medium mb-1">Gestión completa de formularios</p>
                <p className="text-sm text-white text-opacity-80">Cree, edite y gestione formularios personalizados para su organización.</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="bg-white bg-opacity-20 rounded-full p-1 mr-3 mt-0.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-medium mb-1">Control de acceso por roles</p>
                <p className="text-sm text-white text-opacity-80">Sistema seguro con distintos niveles de acceso según el rol del usuario.</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="bg-white bg-opacity-20 rounded-full p-1 mr-3 mt-0.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-medium mb-1">Almacenamiento local</p>
                <p className="text-sm text-white text-opacity-80">Todos los datos se guardan localmente en su servidor, garantizando privacidad y seguridad.</p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="bg-white bg-opacity-20 rounded-full p-1 mr-3 mt-0.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-medium mb-1">Reportes y exportaciones</p>
                <p className="text-sm text-white text-opacity-80">Genere informes y exporte datos en formatos Excel y PDF para análisis posteriores.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
