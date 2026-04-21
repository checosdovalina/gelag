import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Bell, Plus, Pencil, Trash2, Eye, EyeOff, Calendar,
  Info, AlertTriangle, CheckCircle2, XCircle, Megaphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const ROLES = [
  { value: "superadmin", label: "Super Administrador" },
  { value: "admin", label: "Administrador" },
  { value: "produccion", label: "Producción" },
  { value: "calidad", label: "Calidad" },
  { value: "gerente_produccion", label: "Gerente Producción" },
  { value: "gerente_calidad", label: "Gerente Calidad" },
  { value: "viewer", label: "Visor" },
];

const TYPE_LABELS: Record<string, string> = {
  banner: "Banner (barra superior)",
  modal: "Modal (ventana emergente)",
  toast: "Toast (notificación rápida)",
};

const VARIANT_ICONS: Record<string, React.ReactNode> = {
  info: <Info className="h-4 w-4 text-blue-500" />,
  warning: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  success: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  error: <XCircle className="h-4 w-4 text-red-500" />,
};

const VARIANT_COLORS: Record<string, string> = {
  info: "bg-blue-50 border-blue-200 text-blue-800",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
  success: "bg-green-50 border-green-200 text-green-800",
  error: "bg-red-50 border-red-200 text-red-800",
};

const FREQ_LABELS: Record<string, string> = {
  always: "Siempre (cada visita)",
  once_per_session: "Una vez por sesión",
  hourly: "Cada hora",
  daily: "Una vez al día",
};

type AnnouncementForm = {
  title: string;
  message: string;
  type: string;
  variant: string;
  startDate: string;
  endDate: string;
  targetRoles: string[];
  displayFrequency: string;
  isActive: boolean;
};

const EMPTY_FORM: AnnouncementForm = {
  title: "",
  message: "",
  type: "banner",
  variant: "info",
  startDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  endDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
  targetRoles: [],
  displayFrequency: "daily",
  isActive: true,
};

export default function AnnouncementsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<AnnouncementForm>(EMPTY_FORM);

  const { data: announcements = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/announcements"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/announcements", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({ title: "Aviso creado correctamente" });
      setDialogOpen(false);
    },
    onError: () => toast({ title: "Error al crear aviso", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/admin/announcements/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({ title: "Aviso actualizado" });
      setDialogOpen(false);
    },
    onError: () => toast({ title: "Error al actualizar aviso", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/announcements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({ title: "Aviso eliminado" });
      setDeleteId(null);
    },
    onError: () => toast({ title: "Error al eliminar aviso", variant: "destructive" }),
  });

  const toggleActive = (a: any) => {
    updateMutation.mutate({ id: a.id, data: { isActive: !a.isActive } });
  };

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(a: any) {
    setEditId(a.id);
    setForm({
      title: a.title,
      message: a.message,
      type: a.type,
      variant: a.variant,
      startDate: format(new Date(a.startDate), "yyyy-MM-dd'T'HH:mm"),
      endDate: format(new Date(a.endDate), "yyyy-MM-dd'T'HH:mm"),
      targetRoles: a.targetRoles || [],
      displayFrequency: a.displayFrequency,
      isActive: a.isActive ?? true,
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    const payload = {
      ...form,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      targetRoles: form.targetRoles.length > 0 ? form.targetRoles : null,
    };
    if (editId !== null) {
      updateMutation.mutate({ id: editId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function toggleRole(role: string) {
    setForm(f => ({
      ...f,
      targetRoles: f.targetRoles.includes(role)
        ? f.targetRoles.filter(r => r !== role)
        : [...f.targetRoles, role],
    }));
  }

  const now = new Date();
  const activeCount = announcements.filter(a => a.isActive && new Date(a.startDate) <= now && new Date(a.endDate) >= now).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Megaphone className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-800">Avisos del Sistema</h1>
            <p className="text-sm text-neutral-500">
              {activeCount} aviso{activeCount !== 1 ? "s" : ""} activo{activeCount !== 1 ? "s" : ""} ahora
            </p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Aviso
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: announcements.length, color: "text-neutral-700" },
          { label: "Activos ahora", value: activeCount, color: "text-green-600" },
          { label: "Programados", value: announcements.filter(a => a.isActive && new Date(a.startDate) > now).length, color: "text-blue-600" },
          { label: "Inactivos", value: announcements.filter(a => !a.isActive).length, color: "text-neutral-400" },
        ].map(s => (
          <Card key={s.label} className="text-center py-2">
            <CardContent className="pt-4 pb-2">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-neutral-500 mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-neutral-400">Cargando avisos...</div>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <Bell className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-500 font-medium">No hay avisos configurados</p>
            <p className="text-sm text-neutral-400 mt-1">Crea el primero con el botón "Nuevo Aviso"</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => {
            const isExpired = new Date(a.endDate) < now;
            const isPending = new Date(a.startDate) > now;
            const isLive = a.isActive && !isExpired && !isPending;
            return (
              <Card key={a.id} className={`border ${isLive ? "border-primary/30 bg-primary/5" : "border-neutral-200"}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-0.5 flex-shrink-0">{VARIANT_ICONS[a.variant]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold text-neutral-800 truncate">{a.title}</span>
                          {isLive && <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">En vivo</Badge>}
                          {isPending && a.isActive && <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">Programado</Badge>}
                          {isExpired && <Badge variant="outline" className="text-neutral-400 text-xs">Expirado</Badge>}
                          {!a.isActive && <Badge variant="outline" className="text-neutral-400 text-xs">Pausado</Badge>}
                          <Badge variant="outline" className="text-xs capitalize">{TYPE_LABELS[a.type]}</Badge>
                        </div>
                        <p className="text-sm text-neutral-600 line-clamp-2 mb-2">{a.message}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-neutral-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(a.startDate), "d MMM yyyy HH:mm", { locale: es })} — {format(new Date(a.endDate), "d MMM yyyy HH:mm", { locale: es })}
                          </span>
                          <span>· {FREQ_LABELS[a.displayFrequency]}</span>
                          {a.targetRoles && a.targetRoles.length > 0
                            ? <span>· Roles: {a.targetRoles.map((r: string) => ROLES.find(x => x.value === r)?.label || r).join(", ")}</span>
                            : <span>· Todos los usuarios</span>
                          }
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch
                        checked={a.isActive ?? true}
                        onCheckedChange={() => toggleActive(a)}
                        title={a.isActive ? "Pausar aviso" : "Activar aviso"}
                      />
                      <Button size="icon" variant="ghost" onClick={() => openEdit(a)} title="Editar">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => setDeleteId(a.id)} title="Eliminar">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId !== null ? "Editar Aviso" : "Nuevo Aviso"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1">
                <Label>Título *</Label>
                <Input
                  placeholder="Ej: Mantenimiento programado el sábado"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label>Mensaje *</Label>
                <Textarea
                  placeholder="Escribe el contenido del aviso..."
                  rows={3}
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Tipo de visualización</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="banner">Banner (barra superior)</SelectItem>
                    <SelectItem value="modal">Modal (ventana emergente)</SelectItem>
                    <SelectItem value="toast">Toast (notificación rápida)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Estilo / Color</Label>
                <Select value={form.variant} onValueChange={v => setForm(f => ({ ...f, variant: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Informativo (azul)</SelectItem>
                    <SelectItem value="warning">Advertencia (amarillo)</SelectItem>
                    <SelectItem value="success">Éxito (verde)</SelectItem>
                    <SelectItem value="error">Urgente (rojo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Fecha y hora de inicio *</Label>
                <Input
                  type="datetime-local"
                  value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Fecha y hora de fin *</Label>
                <Input
                  type="datetime-local"
                  value={form.endDate}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Frecuencia de aparición</Label>
                <Select value={form.displayFrequency} onValueChange={v => setForm(f => ({ ...f, displayFrequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="always">Siempre (cada visita de página)</SelectItem>
                    <SelectItem value="once_per_session">Una vez por sesión</SelectItem>
                    <SelectItem value="hourly">Cada hora</SelectItem>
                    <SelectItem value="daily">Una vez al día</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))}
                />
                <Label>Aviso activo al guardar</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Destinatarios (vacío = todos los usuarios)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border rounded-lg p-3 bg-neutral-50">
                {ROLES.map(r => (
                  <label key={r.value} className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={form.targetRoles.includes(r.value)}
                      onCheckedChange={() => toggleRole(r.value)}
                    />
                    {r.label}
                  </label>
                ))}
              </div>
              {form.targetRoles.length === 0 && (
                <p className="text-xs text-neutral-500">Se mostrará a todos los usuarios del sistema</p>
              )}
            </div>

            {/* Preview */}
            {form.title && (
              <div className="space-y-1">
                <Label>Vista previa</Label>
                <div className={`border rounded-lg p-3 flex items-start gap-2 text-sm ${VARIANT_COLORS[form.variant]}`}>
                  {VARIANT_ICONS[form.variant]}
                  <div>
                    <p className="font-semibold">{form.title}</p>
                    {form.message && <p className="mt-0.5 opacity-90">{form.message}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.title || !form.message || createMutation.isPending || updateMutation.isPending}
            >
              {editId !== null ? "Guardar cambios" : "Crear aviso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este aviso?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
