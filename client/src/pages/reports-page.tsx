import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import { DateRange } from "react-day-picker";
import { ColumnDef } from "@tanstack/react-table";
import { Search, Download, Calendar, FileDown } from "lucide-react";
import MainLayout from "@/layouts/main-layout";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Tab, Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

interface FormEntry {
  id: number;
  formTemplateId: number;
  data: any;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  department: string;
  status: string;
  userName?: string;
  formName?: string;
}

interface FormTemplate {
  id: number;
  name: string;
  department: string;
}

interface User {
  id: number;
  name: string;
  department: string;
  role: string;
}

// Colors for charts
const COLORS = ["#1976d2", "#f50057", "#ff9800", "#4caf50", "#9c27b0"];

export default function ReportsPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [formFilter, setFormFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [reportType, setReportType] = useState("submissions");

  // Fetch form entries for reports
  const { data: entriesData, isLoading: isLoadingEntries } = useQuery<FormEntry[]>({
    queryKey: ["/api/form-entries"],
  });

  // Fetch form templates for filter
  const { data: templates, isLoading: isLoadingTemplates } = useQuery<FormTemplate[]>({
    queryKey: ["/api/form-templates"],
  });

  // Fetch users for filter
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Process entries with template and user information
  const [processedEntries, setProcessedEntries] = useState<FormEntry[]>([]);

  useEffect(() => {
    if (entriesData && templates && users) {
      const processed = entriesData.map(entry => {
        const template = templates.find(t => t.id === entry.formTemplateId);
        const user = users.find(u => u.id === entry.createdBy);
        return {
          ...entry,
          formName: template?.name || `Formulario ${entry.formTemplateId}`,
          userName: user?.name || `Usuario ${entry.createdBy}`
        };
      });
      setProcessedEntries(processed);
    }
  }, [entriesData, templates, users]);

  // Apply filters
  const filteredEntries = processedEntries.filter(entry => {
    // Search filter
    const searchMatches = 
      !searchTerm || 
      (entry.formName && entry.formName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (entry.userName && entry.userName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Department filter
    const departmentMatches = !departmentFilter || entry.department === departmentFilter;
    
    // Form filter
    const formMatches = !formFilter || entry.formTemplateId.toString() === formFilter;
    
    // User filter
    const userMatches = !userFilter || entry.createdBy.toString() === userFilter;
    
    // Date range filter
    const dateMatches = !dateRange || !dateRange.from || 
      (new Date(entry.createdAt) >= dateRange.from && 
        (!dateRange.to || new Date(entry.createdAt) <= dateRange.to));
    
    return searchMatches && departmentMatches && formMatches && userMatches && dateMatches;
  });

  // Define columns for data table
  const columns: ColumnDef<FormEntry>[] = [
    {
      accessorKey: "formName",
      header: "Formulario",
    },
    {
      accessorKey: "department",
      header: "Departamento",
    },
    {
      accessorKey: "userName",
      header: "Usuario",
    },
    {
      accessorKey: "createdAt",
      header: "Fecha de creación",
      cell: ({ row }) => {
        return new Date(row.getValue("createdAt")).toLocaleDateString("es-ES", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const entry = row.original;
        
        return (
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => handleExport(entry, "pdf")}
              title="Exportar a PDF"
            >
              <FileDown className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  // Handle export
  const handleExport = (entry: FormEntry, format: "pdf" | "excel") => {
    toast({
      title: `Exportando entrada`,
      description: `La entrada está siendo exportada a ${format.toUpperCase()}`,
    });
    
    // In a real application, this would make an API call to export the entry
    setTimeout(() => {
      toast({
        title: "Exportación completada",
        description: `La entrada ha sido exportada correctamente`,
      });
    }, 1500);
  };

  // Export all results
  const handleExportAll = (format: "pdf" | "excel") => {
    toast({
      title: `Exportando resultados`,
      description: `Se están exportando ${filteredEntries.length} entradas a ${format.toUpperCase()}`,
    });
    
    // In a real application, this would make an API call to export all entries
    setTimeout(() => {
      toast({
        title: "Exportación completada",
        description: `${filteredEntries.length} entradas han sido exportadas correctamente`,
      });
    }, 2000);
  };

  // Prepare chart data
  const departmentData = processedEntries.reduce((acc, entry) => {
    const dept = entry.department || "Sin departamento";
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieChartData = Object.entries(departmentData).map(([name, value]) => ({
    name,
    value
  }));

  // Format a date to YYYY-MM-DD string
  const formatDateString = (date: Date) => {
    return format(date, "yyyy-MM-dd");
  };

  // Submissions by date (last 7 days)
  const getDateRangeData = () => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    
    const dateMap: Record<string, number> = {};
    
    // Initialize all dates in range
    for (let d = new Date(sevenDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
      dateMap[formatDateString(new Date(d))] = 0;
    }
    
    // Count submissions by date
    processedEntries.forEach(entry => {
      const entryDate = formatDateString(new Date(entry.createdAt));
      if (new Date(entryDate) >= sevenDaysAgo && new Date(entryDate) <= now) {
        dateMap[entryDate] = (dateMap[entryDate] || 0) + 1;
      }
    });
    
    return Object.entries(dateMap).map(([date, count]) => ({
      date: format(new Date(date), "dd MMM", { locale: es }),
      count
    }));
  };

  // Forms by usage
  const getFormUsageData = () => {
    const formMap: Record<string, number> = {};
    
    processedEntries.forEach(entry => {
      const formName = entry.formName || `Formulario ${entry.formTemplateId}`;
      formMap[formName] = (formMap[formName] || 0) + 1;
    });
    
    return Object.entries(formMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 forms
  };

  // Submissions by user
  const getUserActivityData = () => {
    const userMap: Record<string, number> = {};
    
    processedEntries.forEach(entry => {
      const userName = entry.userName || `Usuario ${entry.createdBy}`;
      userMap[userName] = (userMap[userName] || 0) + 1;
    });
    
    return Object.entries(userMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 users
  };

  const lineData = getDateRangeData();
  const barData = getFormUsageData();
  const userActivityData = getUserActivityData();

  return (
    <MainLayout title="Reportes">
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Búsqueda</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
                  <Input
                    placeholder="Buscar..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los departamentos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los departamentos</SelectItem>
                    {Array.from(new Set(processedEntries.map(e => e.department))).map(dept => (
                      <SelectItem key={dept} value={dept || ""}>
                        {dept || "Sin departamento"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Formulario</Label>
                <Select value={formFilter} onValueChange={setFormFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los formularios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los formularios</SelectItem>
                    {templates?.map(template => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Usuario</Label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los usuarios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los usuarios</SelectItem>
                    {users?.map(user => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Rango de fechas</Label>
                <div className="grid gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "LLL dd, y", { locale: es })} -{" "}
                              {format(dateRange.to, "LLL dd, y", { locale: es })}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y", { locale: es })
                          )
                        ) : (
                          <span>Seleccionar fechas</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        locale={es}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div className="flex items-end space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setDepartmentFilter("");
                    setFormFilter("");
                    setUserFilter("");
                    setDateRange(undefined);
                  }}
                >
                  Limpiar filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Report Type Tabs */}
        <Tabs value={reportType} onValueChange={setReportType}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="submissions">Entradas de Formularios</TabsTrigger>
            <TabsTrigger value="analytics">Análisis y Gráficos</TabsTrigger>
          </TabsList>
          
          {/* Submissions Tab */}
          <TabsContent value="submissions">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Entradas de Formularios</CardTitle>
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => handleExportAll("excel")}>
                    <Download className="mr-2 h-4 w-4" />
                    Excel
                  </Button>
                  <Button variant="outline" onClick={() => handleExportAll("pdf")}>
                    <Download className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={columns}
                  data={filteredEntries}
                  searchPlaceholder="Filtrar entradas..."
                  searchColumn="formName"
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Submissions by Department */}
              <Card>
                <CardHeader>
                  <CardTitle>Entradas por Departamento</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <div className="w-full max-w-xs h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Submissions by Date */}
              <Card>
                <CardHeader>
                  <CardTitle>Entradas Diarias (Últimos 7 días)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={lineData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="count" 
                          name="Entradas" 
                          stroke="#1976d2" 
                          strokeWidth={2} 
                          activeDot={{ r: 8 }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Top Forms by Usage */}
              <Card>
                <CardHeader>
                  <CardTitle>Formularios Más Utilizados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={barData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={150}
                          tickFormatter={(value) => 
                            value.length > 15 ? `${value.substring(0, 15)}...` : value
                          }
                        />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" name="Entradas" fill="#4caf50" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* User Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Usuarios Más Activos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={userActivityData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={100}
                        />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" name="Entradas" fill="#f50057" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
