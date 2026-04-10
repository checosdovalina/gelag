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
  { icon: ClipboardList, title: "Formularios digitales", desc: "Producción y calidad en un solo lugar" },
  { icon: ShieldCheck, title: "Control de acceso", desc: "Roles diferenciados por área" },
  { icon: Users, title: "Trabajo en equipo", desc: "Múltiples usuarios configurables" },
  { icon: BarChart3, title: "Reportes y PDF", desc: "Exporta en Excel y PDF al instante" },
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
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #E8195A 0%, #c21248 38%, #f5f5f5 38%)" }}>

      {/* Contenedor principal */}
      <div className="flex flex-col items-center justify-start min-h-screen px-4 pt-10 pb-8 md:flex-row md:justify-center md:pt-0 md:px-0 md:gap-0 md:items-stretch">

        {/* ── PANEL IZQUIERDO (solo escritorio) ── */}
        <div className="hidden md:flex md:w-[55%] bg-[#E8195A] relative flex-col justify-between px-14 py-14 overflow-hidden">
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute top-1/2 -right-20 w-64 h-64 rounded-full bg-[#E8891A]/30 blur-2xl" />
          <div className="absolute -bottom-20 left-10 w-80 h-80 rounded-full bg-white/5 blur-3xl" />

          {/* Logo escritorio */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg">
              <img src={gelagLogoImage} alt="GELAG" className="h-10 w-auto object-contain" />
              <div>
                <p className="font-bold text-base text-white leading-tight tracking-wide">GELAG</p>
                <p className="text-[10px] text-white/70 uppercase tracking-widest">S.A. de C.V.</p>
              </div>
            </div>
          </div>

          {/* Titular escritorio */}
          <div className="relative z-10">
            <h1 className="text-white font-bold text-4xl lg:text-5xl leading-tight mb-4">
              Sistema de<br />
              <span className="text-[#F5C842]">Control GELAG</span>
            </h1>
            <p className="text-white/75 text-lg max-w-xs leading-relaxed">
              Gestión de formularios de producción y calidad en un solo lugar.
            </p>
          </div>

          {/* Features escritorio */}
          <div className="relative z-10 grid grid-cols-2 gap-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/15 hover:bg-white/15 transition-colors">
                <Icon className="h-5 w-5 text-[#F5C842] mb-2" />
                <p className="text-white font-semibold text-sm mb-0.5">{title}</p>
                <p className="text-white/60 text-xs leading-snug">{desc}</p>
              </div>
            ))}
          </div>

          <p className="relative z-10 text-[10px] text-white/40 leading-relaxed max-w-xs">
            BLVD. SANTA RITA #842, PARQUE INDUSTRIAL SANTA RITA, GÓMEZ PALACIO, DGO.
          </p>
        </div>

        {/* ── TARJETA DEL FORMULARIO (móvil + escritorio) ── */}
        <div className="w-full max-w-[360px] md:max-w-none md:w-[45%] md:flex md:items-center md:justify-center md:bg-white">
          <div className="bg-white rounded-3xl shadow-2xl px-7 py-8 w-full md:max-w-sm md:rounded-none md:shadow-none md:px-12 md:py-14">

            {/* Logo móvil */}
            <div className="flex items-center gap-3 mb-6 md:hidden">
              <img src={gelagLogoImage} alt="GELAG" className="h-9 w-auto object-contain" />
              <div>
                <p className="font-bold text-gray-800 leading-tight">GELAG</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">S.A. de C.V.</p>
              </div>
            </div>

            {/* Encabezado */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-1">Bienvenido</h2>
              <p className="text-gray-500 text-sm">Inicia sesión para continuar</p>
            </div>

            {/* Formulario */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

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

                {loginMutation.isError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-4 py-3">
                    Usuario o contraseña incorrectos.
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="w-full h-12 rounded-xl text-white font-semibold text-base shadow-md hover:shadow-lg transition-all border-0"
                  style={{
                    background: loginMutation.isPending ? "#ccc" : "linear-gradient(135deg, #E8195A 0%, #c21248 100%)",
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
                  ) : "Iniciar Sesión"}
                </Button>
              </form>
            </Form>

            <div className="mt-8 pt-5 border-t border-gray-100 text-center">
              <p className="text-[11px] text-gray-400">
                © {new Date().getFullYear()} GELAG S.A. de C.V.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
