import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Redirect } from "wouter";
import { Eye, EyeOff, Lock, User, ClipboardList, ShieldCheck, Users, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import gelagLogoImage from "@/assets/gelag-logo.png";

const loginSchema = z.object({
  username: z.string().min(1, "El nombre de usuario es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

const features = [
  { icon: ClipboardList, title: "Formularios digitales", desc: "Crea y gestiona formularios de producción y calidad" },
  { icon: ShieldCheck, title: "Control de acceso", desc: "Roles diferenciados para cada área de tu empresa" },
  { icon: Users, title: "Trabajo en equipo", desc: "Múltiples usuarios con permisos configurables" },
  { icon: BarChart3, title: "Reportes y PDF", desc: "Exporta tus datos en Excel y PDF en segundos" },
];

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(data);
  };

  if (user) return <Redirect to="/" />;

  return (
    <div className="min-h-screen flex flex-col md:flex-row">

      {/* ── LEFT HERO ── */}
      <div className="relative flex flex-col justify-between md:w-[55%] bg-[#E8195A] overflow-hidden px-8 py-10 md:px-14 md:py-14">

        {/* Decorative blobs */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute top-1/2 -right-20 w-64 h-64 rounded-full bg-[#E8891A]/30 blur-2xl" />
        <div className="absolute -bottom-20 left-10 w-80 h-80 rounded-full bg-white/5 blur-3xl" />

        {/* Logo area */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg">
            <img src={gelagLogoImage} alt="GELAG" className="h-10 w-auto object-contain" />
            <div className="text-white">
              <p className="font-bold text-base leading-tight tracking-wide">GELAG</p>
              <p className="text-[10px] text-white/70 uppercase tracking-widest">S.A. de C.V.</p>
            </div>
          </div>
        </div>

        {/* Main headline */}
        <div className="relative z-10 mt-10 md:mt-0">
          <h1 className="text-white font-bold text-3xl md:text-4xl lg:text-5xl leading-tight mb-4">
            Sistema de<br />
            <span className="text-[#F5C842] drop-shadow-sm">Control GELAG</span>
          </h1>
          <p className="text-white/75 text-base md:text-lg max-w-xs leading-relaxed">
            Gestión de formularios de producción y calidad en un solo lugar.
          </p>
        </div>

        {/* Feature cards */}
        <div className="relative z-10 grid grid-cols-2 gap-3 mt-10 md:mt-0">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/15 hover:bg-white/15 transition-colors"
            >
              <Icon className="h-5 w-5 text-[#F5C842] mb-2" />
              <p className="text-white font-semibold text-sm mb-0.5">{title}</p>
              <p className="text-white/60 text-xs leading-snug">{desc}</p>
            </div>
          ))}
        </div>

        {/* Footer brand */}
        <p className="relative z-10 mt-8 text-[10px] text-white/40 leading-relaxed max-w-xs">
          BLVD. SANTA RITA #842, PARQUE INDUSTRIAL SANTA RITA, GÓMEZ PALACIO, DGO.
        </p>
      </div>

      {/* ── RIGHT FORM ── */}
      <div className="flex flex-col justify-center items-center md:w-[45%] bg-white px-6 py-12 md:px-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="md:hidden flex justify-center mb-8">
            <img src={gelagLogoImage} alt="GELAG" className="h-12 object-contain" />
          </div>

          {/* Greeting */}
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1">Bienvenido</h2>
            <p className="text-gray-500 text-sm">Inicia sesión para continuar</p>
          </div>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              {/* Username */}
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative group">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#E8195A] transition-colors" />
                        <Input
                          placeholder="Nombre de usuario"
                          className="pl-10 h-12 rounded-xl border-gray-200 bg-gray-50 text-sm focus:bg-white focus:border-[#E8195A] focus:ring-1 focus:ring-[#E8195A] transition-all placeholder:text-gray-400"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative group">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#E8195A] transition-colors" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Contraseña"
                          className="pl-10 pr-10 h-12 rounded-xl border-gray-200 bg-gray-50 text-sm focus:bg-white focus:border-[#E8195A] focus:ring-1 focus:ring-[#E8195A] transition-all placeholder:text-gray-400"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#E8195A] transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Error message */}
              {loginMutation.isError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                  Usuario o contraseña incorrectos. Verifica tus credenciales.
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full h-12 rounded-xl text-white font-semibold text-base shadow-md hover:shadow-lg transition-all"
                style={{
                  background: loginMutation.isPending
                    ? "#ccc"
                    : "linear-gradient(135deg, #E8195A 0%, #c21248 100%)",
                }}
              >
                {loginMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Iniciando sesión...
                  </span>
                ) : (
                  "Iniciar Sesión"
                )}
              </Button>
            </form>
          </Form>

          {/* Divider */}
          <div className="mt-10 pt-6 border-t border-gray-100 text-center">
            <p className="text-[11px] text-gray-400">
              © {new Date().getFullYear()} GELAG S.A. de C.V. — Todos los derechos reservados
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
