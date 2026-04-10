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

function LoginForm() {
  const { loginMutation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(data);
  };

  return (
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
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
            Usuario o contraseña incorrectos. Verifica tus credenciales.
          </div>
        )}

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
  );
}

export default function AuthPage() {
  const { user } = useAuth();
  if (user) return <Redirect to="/" />;

  return (
    <div className="min-h-screen flex flex-col md:flex-row">

      {/* ══ MÓVIL: banner compacto arriba ══ */}
      <div className="md:hidden relative bg-[#E8195A] px-6 pt-10 pb-8 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-[#E8891A]/25 blur-xl" />
        <div className="relative z-10 flex items-center gap-3 mb-4">
          <div className="bg-white rounded-xl p-2 shadow-md">
            <img src={gelagLogoImage} alt="GELAG" className="h-8 w-auto object-contain" />
          </div>
          <div>
            <p className="text-white font-bold text-lg tracking-wide leading-tight">GELAG</p>
            <p className="text-white/60 text-[10px] uppercase tracking-widest">S.A. de C.V.</p>
          </div>
        </div>
        <h1 className="relative z-10 text-white font-bold text-2xl leading-tight">
          Sistema de <span className="text-[#F5C842]">Control</span>
        </h1>
        <p className="relative z-10 text-white/70 text-sm mt-1">
          Formularios de producción y calidad
        </p>
      </div>

      {/* ══ ESCRITORIO: hero lateral ══ */}
      <div className="hidden md:flex relative flex-col justify-between md:w-[55%] bg-[#E8195A] overflow-hidden px-14 py-14">
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute top-1/2 -right-20 w-64 h-64 rounded-full bg-[#E8891A]/30 blur-2xl" />
        <div className="absolute -bottom-20 left-10 w-80 h-80 rounded-full bg-white/5 blur-3xl" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg">
            <img src={gelagLogoImage} alt="GELAG" className="h-10 w-auto object-contain" />
            <div className="text-white">
              <p className="font-bold text-base leading-tight tracking-wide">GELAG</p>
              <p className="text-[10px] text-white/70 uppercase tracking-widest">S.A. de C.V.</p>
            </div>
          </div>
        </div>

        {/* Headline */}
        <div className="relative z-10">
          <h1 className="text-white font-bold text-4xl lg:text-5xl leading-tight mb-4">
            Sistema de<br />
            <span className="text-[#F5C842] drop-shadow-sm">Control GELAG</span>
          </h1>
          <p className="text-white/75 text-lg max-w-xs leading-relaxed">
            Gestión de formularios de producción y calidad en un solo lugar.
          </p>
        </div>

        {/* Features */}
        <div className="relative z-10 grid grid-cols-2 gap-3">
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

        <p className="relative z-10 text-[10px] text-white/40 leading-relaxed max-w-xs">
          BLVD. SANTA RITA #842, PARQUE INDUSTRIAL SANTA RITA, GÓMEZ PALACIO, DGO.
        </p>
      </div>

      {/* ══ FORMULARIO (móvil y escritorio) ══ */}
      <div className="flex flex-col justify-center items-center flex-1 md:w-[45%] bg-white px-6 py-8 md:px-12 md:py-14">
        <div className="w-full max-w-sm">
          <div className="mb-7">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1">Bienvenido</h2>
            <p className="text-gray-500 text-sm">Inicia sesión para continuar</p>
          </div>

          <LoginForm />

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-[11px] text-gray-400">
              © {new Date().getFullYear()} GELAG S.A. de C.V. — Todos los derechos reservados
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
