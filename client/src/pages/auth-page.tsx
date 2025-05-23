import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Redirect } from "wouter";
import { User, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { useAuth } from "@/hooks/use-auth";
import { GelagLogo, CompanyInfo } from "@/components/logo";

// Login form schema
const loginSchema = z.object({
  username: z.string().min(1, "El nombre de usuario es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export default function AuthPage() {
  const { user, loginMutation } = useAuth();

  // Login form
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Handle login form submission
  const onLoginSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(data);
  };

  // Redirect to home if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-neutral-50">
      {/* Login section (left on desktop, top on mobile) */}
      <div className="flex flex-col justify-center items-center w-full md:w-1/2 px-4 py-6 md:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[380px] max-w-full">
          <div className="flex flex-col space-y-2 text-center">
            <div className="flex justify-center mb-2">
              <GelagLogo className="h-20 w-36 md:h-24 md:w-40" />
            </div>
            <CompanyInfo className="px-4 mt-2" />
          </div>

          <Card className="shadow-lg border-0 md:border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl md:text-2xl text-primary">Iniciar Sesión</CardTitle>
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
                        <FormLabel className="text-base">Nombre de Usuario</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-5 w-5 text-neutral-400" />
                            <Input
                              placeholder="usuario"
                              className="pl-10 h-12 rounded-md text-base"
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
                        <FormLabel className="text-base">Contraseña</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-5 w-5 text-neutral-400" />
                            <Input
                              type="password"
                              placeholder="********"
                              className="pl-10 h-12 rounded-md text-base"
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
                    className="w-full h-12 text-base mt-2"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Iniciando sesión..." : "Iniciar Sesión"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          {/* Mobile-only feature summary */}
          <div className="md:hidden bg-primary rounded-lg p-4 text-white mt-4">
            <h3 className="font-bold text-lg mb-2 text-center">Características Principales</h3>
            <ul className="space-y-2">
              <li className="flex items-center">
                <div className="bg-white bg-opacity-20 rounded-full p-1 mr-2 flex-shrink-0">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm">Gestión completa de formularios</span>
              </li>
              <li className="flex items-center">
                <div className="bg-white bg-opacity-20 rounded-full p-1 mr-2 flex-shrink-0">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm">Control de acceso por roles</span>
              </li>
              <li className="flex items-center">
                <div className="bg-white bg-opacity-20 rounded-full p-1 mr-2 flex-shrink-0">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm">Almacenamiento local seguro</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Hero section (right on desktop, hidden on mobile) */}
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
          <div className="mt-8 flex justify-center">
            <GelagLogo colorMode="dark" className="h-14 w-14" />
          </div>
        </div>
      </div>
    </div>
  );
}