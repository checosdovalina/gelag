import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import MainLayout from "@/layouts/main-layout";
import { useAuth } from "@/hooks/use-auth";
import { 
  Users, FileText, ClipboardCheck, Activity,
  TrendingUp, TrendingDown, Minus, ArrowRight,
  Plus, BarChart3, Clock, CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DashboardStats {
  users: number;
  templates: number;
  entries: number;
  productionForms: number;
  formsTrend: number;
  exports: number;
}

const formatRelativeDate = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) {
    return `Hoy, ${date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Ayer, ${date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  color,
  isLoading,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  color: string;
  isLoading: boolean;
}) {
  const showTrend = trend !== undefined;
  const trendPositive = (trend ?? 0) >= 0;

  return (
    <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            {isLoading ? (
              <Skeleton className="h-9 w-24 mt-1" />
            ) : (
              <p className="text-3xl font-bold text-foreground">{value.toLocaleString('es-MX')}</p>
            )}
            {showTrend && !isLoading && (
              <div className={cn(
                "flex items-center gap-1 mt-2 text-sm font-medium",
                trendPositive ? "text-emerald-600" : "text-red-500"
              )}>
                {trend === 0 ? (
                  <Minus className="h-3.5 w-3.5" />
                ) : trendPositive ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                <span>
                  {trend === 0 ? "Sin cambio" : `${trendPositive ? "+" : ""}${trend}%`}
                  {trendLabel && <span className="text-muted-foreground font-normal ml-1">{trendLabel}</span>}
                </span>
              </div>
            )}
          </div>
          <div className={cn("rounded-xl p-3", color)}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const userRole = user?.role?.toLowerCase() ?? '';
  const isAdmin = ['admin', 'superadmin', 'gerente_produccion', 'gerente_calidad'].includes(userRole);

  const { data: statsData, isLoading: isLoadingStats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    enabled: !!user,
    retry: 2,
  });

  const { data: activitiesData, isLoading: isLoadingActivities } = useQuery<any[]>({
    queryKey: ["/api/activity", { limit: 8 }],
    enabled: !!user,
  });

  const { data: formsData, isLoading: isLoadingForms } = useQuery<any[]>({
    queryKey: ["/api/form-templates"],
    enabled: !!user,
  });

  const stats = statsData ?? { users: 0, templates: 0, entries: 0, productionForms: 0, formsTrend: 0, exports: 0 };

  const statCards = [
    {
      title: "Usuarios Activos",
      value: stats.users,
      icon: Users,
      color: "bg-blue-500",
      show: isAdmin,
    },
    {
      title: "Plantillas de Formularios",
      value: stats.templates,
      icon: FileText,
      color: "bg-violet-500",
      show: true,
    },
    {
      title: "Formularios de Proceso (mes)",
      value: stats.productionForms,
      icon: ClipboardCheck,
      color: "bg-emerald-500",
      trend: stats.formsTrend,
      trendLabel: "vs mes anterior",
      show: true,
    },
    {
      title: "Registros Capturados",
      value: stats.entries,
      icon: Activity,
      color: "bg-amber-500",
      show: true,
    },
  ].filter(c => c.show);

  const getActionLabel = (action: string, resourceType: string) => {
    if (action === 'created' && resourceType === 'production_form') return 'Creó formulario de proceso';
    if (action === 'updated' && resourceType === 'production_form') return 'Actualizó formulario';
    if (action === 'created' && resourceType === 'form_entry') return 'Capturó formulario';
    if (action === 'exported') return 'Exportó datos';
    if (action === 'created' && resourceType === 'user') return 'Creó usuario';
    return 'Realizó acción';
  };

  const recentForms = (formsData ?? []).slice(0, 5);

  return (
    <MainLayout title="Dashboard">
      {/* Bienvenida */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">
          Bienvenido, {user?.name?.split(' ')[0]} 👋
        </h2>
        <p className="text-muted-foreground mt-1">
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            icon={card.icon}
            trend={card.trend}
            trendLabel={card.trendLabel}
            color={card.color}
            isLoading={isLoadingStats}
          />
        ))}
      </div>

      {/* Accesos rápidos */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Accesos rápidos</h3>
        <div className="flex flex-wrap gap-3">
          {['produccion', 'gerente_produccion', 'admin', 'superadmin'].includes(userRole) && (
            <Button onClick={() => navigate('/production-form')} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Formulario de Proceso
            </Button>
          )}
          {['produccion', 'calidad', 'gerente_produccion', 'gerente_calidad', 'admin', 'superadmin'].includes(userRole) && (
            <Button variant="outline" onClick={() => navigate('/form-capture')} className="gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Capturar Formulario
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate('/process-forms')} className="gap-2">
            <FileText className="h-4 w-4" />
            Ver Formularios de Proceso
          </Button>
          {['admin', 'superadmin', 'viewer', 'gerente_produccion', 'gerente_calidad'].includes(userRole) && (
            <Button variant="outline" onClick={() => navigate('/reports')} className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Reportes
            </Button>
          )}
        </div>
      </div>

      {/* Actividad reciente y plantillas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Actividad reciente */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Actividad Reciente</CardTitle>
                <CardDescription>Últimas acciones en el sistema</CardDescription>
              </div>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingActivities ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !activitiesData || activitiesData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Activity className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground text-sm">No hay actividad reciente registrada</p>
              </div>
            ) : (
              <div className="space-y-1">
                {activitiesData.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-3 py-2.5 border-b last:border-0">
                    <div className="bg-primary/10 rounded-full h-8 w-8 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-primary text-xs font-bold">
                        {(log.details?.username || log.details?.name || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        <span className="font-semibold">{log.details?.username || 'Usuario'}</span>
                        {' '}{getActionLabel(log.action, log.resourceType)}
                        {log.details?.formFolio && (
                          <span className="text-muted-foreground font-normal"> · {log.details.formFolio}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatRelativeDate(new Date(log.timestamp))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plantillas de formularios recientes */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Plantillas</CardTitle>
                <CardDescription>Formularios disponibles</CardDescription>
              </div>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingForms ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : recentForms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground text-sm">No hay plantillas disponibles</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentForms.map((form: any) => (
                  <button
                    key={form.id}
                    onClick={() => navigate('/forms')}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                  >
                    <div className="bg-violet-100 rounded-md p-1.5 flex-shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{form.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{form.department || 'General'}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </button>
                ))}
                {(formsData?.length ?? 0) > 5 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full mt-2 text-primary"
                    onClick={() => navigate('/forms')}
                  >
                    Ver todas las plantillas
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
