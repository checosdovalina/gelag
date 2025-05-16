import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";

export type UserRole = "production_manager" | "quality_manager" | "operator";

export interface SectionPermission {
  sectionId: string;
  sectionName: string;
  allowedRoles: UserRole[];
  order: number;
  editable: boolean;
}

interface SectionPermissionsEditorProps {
  permissions: SectionPermission[];
  onChange: (permissions: SectionPermission[]) => void;
}

const roleLabels: Record<UserRole, string> = {
  production_manager: "Gerente de Producción",
  quality_manager: "Gerente de Calidad",
  operator: "Operador"
};

export function SectionPermissionsEditor({ permissions, onChange }: SectionPermissionsEditorProps) {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const handleAddPermission = () => {
    if (selectedSection && selectedRole) {
      const sectionIndex = permissions.findIndex(p => p.sectionId === selectedSection);
      if (sectionIndex !== -1) {
        const updatedPermissions = [...permissions];
        if (!updatedPermissions[sectionIndex].allowedRoles.includes(selectedRole)) {
          updatedPermissions[sectionIndex].allowedRoles.push(selectedRole);
          onChange(updatedPermissions);
        }
      }
      setSelectedRole(null);
    }
  };

  const handleRemovePermission = (sectionId: string, role: UserRole) => {
    const sectionIndex = permissions.findIndex(p => p.sectionId === sectionId);
    if (sectionIndex !== -1) {
      const updatedPermissions = [...permissions];
      updatedPermissions[sectionIndex].allowedRoles = updatedPermissions[sectionIndex].allowedRoles.filter(
        r => r !== role
      );
      onChange(updatedPermissions);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permisos de Sección</CardTitle>
        <CardDescription>
          Defina qué roles pueden editar cada sección del formulario de proceso
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {permissions.map((permission) => (
            <div key={permission.sectionId} className="p-4 border rounded-md">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">{permission.sectionName}</h3>
                <div className="flex gap-2">
                  {permission.editable ? (
                    <>
                      <Select
                        value={selectedSection === permission.sectionId ? selectedRole || undefined : undefined}
                        onValueChange={(value: UserRole) => {
                          setSelectedSection(permission.sectionId);
                          setSelectedRole(value);
                        }}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Añadir rol" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="production_manager">Gerente de Producción</SelectItem>
                          <SelectItem value="quality_manager">Gerente de Calidad</SelectItem>
                          <SelectItem value="operator">Operador</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleAddPermission}
                        disabled={!(selectedSection === permission.sectionId && selectedRole)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Badge variant="outline">Sección Fija</Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {permission.allowedRoles.map((role) => (
                  <Badge key={role} variant="secondary" className="flex items-center gap-1">
                    {roleLabels[role]}
                    {permission.editable && (
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleRemovePermission(permission.sectionId, role)}
                      />
                    )}
                  </Badge>
                ))}
                {permission.allowedRoles.length === 0 && (
                  <p className="text-sm text-muted-foreground">No hay roles asignados a esta sección.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function SectionPermissionsViewer({ permissions }: { permissions: SectionPermission[] }) {
  return (
    <div className="space-y-2">
      {permissions.map((permission) => (
        <div key={permission.sectionId} className="p-3 border rounded-md">
          <h3 className="text-sm font-medium mb-1">{permission.sectionName}</h3>
          <div className="flex flex-wrap gap-1">
            {permission.allowedRoles.map((role) => (
              <Badge key={role} variant="secondary" className="text-xs">
                {roleLabels[role]}
              </Badge>
            ))}
            {permission.allowedRoles.length === 0 && (
              <p className="text-xs text-muted-foreground">Sin restricciones</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}