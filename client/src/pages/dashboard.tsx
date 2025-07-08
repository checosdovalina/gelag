import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/layouts/main-layout";
import StatCard from "@/components/dashboard/stats-card";
import ActivityList, { Activity } from "@/components/dashboard/activity-list";
import FormsList, { FormItem } from "@/components/dashboard/forms-list";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";

// Mock data for stats
interface DashboardStats {
  formsCreated: number;
  formsCreatedChange: string;
  recordsCreated: number;
  recordsCreatedChange: string;
  activeUsers: number;
  activeUsersChange: string;
  exports: number;
  exportsChange: string;
}

// Helper function to format date strings
const formatDate = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return `Hoy, ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Ayer, ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    formsCreated: 0,
    formsCreatedChange: "0%",
    recordsCreated: 0,
    recordsCreatedChange: "0%",
    activeUsers: 0,
    activeUsersChange: "0",
    exports: 0,
    exportsChange: "0%"
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [recentForms, setRecentForms] = useState<FormItem[]>([]);

  // Fetch dashboard stats
  const { data: statsData, isLoading: isLoadingStats, error: statsError } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    enabled: !!user,
    retry: 3,
    retryDelay: 1000,
  });

  // Fetch activity logs
  const { data: activitiesData, isLoading: isLoadingActivities } = useQuery({
    queryKey: ["/api/activity", { limit: 10 }],
    enabled: !!user,
  });

  // Fetch recent forms
  const { data: formsData, isLoading: isLoadingForms } = useQuery({
    queryKey: ["/api/form-templates"],
    enabled: !!user,
  });

  // Process dashboard data
  useEffect(() => {
    if (statsData) {
      // Set mock change percentages for demonstration
      setStats({
        formsCreated: statsData.templates || 0,
        formsCreatedChange: "+12%",
        recordsCreated: statsData.entries || 0,
        recordsCreatedChange: "+8%",
        activeUsers: statsData.users || 0,
        activeUsersChange: "+3",
        exports: 0,
        exportsChange: "-5%"
      });
    }
  }, [statsData]);

  // Process activity logs - using real production form data
  useEffect(() => {
    if (activitiesData && activitiesData.length > 0) {
      const processedActivities: Activity[] = activitiesData.map((log: any) => {
        // Get action text based on log type
        let actionText = "Realizó acción";
        if (log.action === "created" && log.resourceType === "production_form") {
          actionText = "Creó formulario";
        } else if (log.action === "updated" && log.resourceType === "production_form") {
          actionText = "Actualizó formulario";
        } else if (log.action === "exported") {
          actionText = "Exportó datos";
        }

        return {
          id: log.id,
          user: {
            name: log.details?.username || "Usuario",
            role: log.details?.role || "Usuario"
          },
          action: actionText,
          form: log.details?.formFolio || "Formulario",
          date: formatDate(new Date(log.timestamp))
        };
      });

      setActivities(processedActivities);
    } else {
      // Show empty state when no data is available
      setActivities([]);
    }
  }, [activitiesData]);

  // Process form templates
  useEffect(() => {
    if (formsData && formsData.length > 0) {
      const processedForms: FormItem[] = formsData
        .slice(0, 4)
        .map((form: any) => ({
          id: form.id,
          name: form.name,
          department: form.department || "General",
          lastUpdated: formatDate(new Date(form.updatedAt))
        }));

      setRecentForms(processedForms);
    } else {
      // Default forms when no data is available
      setRecentForms([
        {
          id: 1,
          name: "Control de Calidad 10-A",
          department: "Calidad",
          lastUpdated: "Hoy, 10:25"
        },
        {
          id: 2,
          name: "Registro de Producción B-22",
          department: "Producción",
          lastUpdated: "Hoy, 9:12"
        },
        {
          id: 3,
          name: "Inspección Final QC-85",
          department: "Calidad",
          lastUpdated: "Ayer, 15:40"
        },
        {
          id: 4,
          name: "Registro Diario de Producción",
          department: "Producción",
          lastUpdated: "Ayer, 11:05"
        }
      ]);
    }
  }, [formsData]);

  return (
    <MainLayout title="Dashboard">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Formularios Creados"
          value={stats.formsCreated}
          change={{
            value: stats.formsCreatedChange,
            positive: true
          }}
          variant="forms"
        />
        
        <StatCard
          title="Registros Capturados"
          value={stats.recordsCreated}
          change={{
            value: stats.recordsCreatedChange,
            positive: true
          }}
          variant="records"
        />
        
        <StatCard
          title="Usuarios Activos"
          value={stats.activeUsers}
          change={{
            value: stats.activeUsersChange,
            positive: true
          }}
          variant="users"
        />
        
        <StatCard
          title="Exportaciones"
          value={stats.exports}
          change={{
            value: stats.exportsChange,
            positive: false
          }}
          variant="exports"
        />
      </div>
      
      {/* Recent Activity & Forms Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <ActivityList 
            activities={activities} 
            isLoading={isLoadingActivities}
          />
        </div>
        
        {/* Recent Forms */}
        <div className="lg:col-span-1">
          <FormsList 
            forms={recentForms}
            isLoading={isLoadingForms}
          />
        </div>
      </div>
    </MainLayout>
  );
}
