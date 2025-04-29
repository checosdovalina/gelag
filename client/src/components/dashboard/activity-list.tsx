import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronRight, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

export interface Activity {
  id: number;
  user: {
    name: string;
    role: string;
  };
  action: string;
  form: string;
  date: string;
}

interface ActivityListProps {
  activities: Activity[];
  isLoading?: boolean;
}

export default function ActivityList({ activities, isLoading = false }: ActivityListProps) {
  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case "capturó datos":
        return "bg-blue-500";
      case "creó formulario":
        return "bg-green-500";
      case "exportó datos":
        return "bg-amber-500";
      case "actualizó formulario":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Actividad Reciente</CardTitle>
        <Link href="/reports">
          <Button variant="ghost" className="text-primary hover:text-primary-dark text-sm font-medium flex items-center">
            Ver Todo <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%] px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Usuario</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Acción</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Formulario</TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white divide-y divide-neutral-100">
              {isLoading ? (
                Array(4).fill(0).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="px-4 py-3">
                      <div className="animate-pulse h-8 bg-gray-100 rounded"></div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="animate-pulse h-6 w-24 bg-gray-100 rounded-full"></div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="animate-pulse h-6 bg-gray-100 rounded"></div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="animate-pulse h-6 w-32 bg-gray-100 rounded"></div>
                    </TableCell>
                  </TableRow>
                ))
              ) : activities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                    No hay actividad reciente
                  </TableCell>
                </TableRow>
              ) : (
                activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-neutral-800">{activity.user.name}</p>
                          <p className="text-xs text-neutral-500">{activity.user.role}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap">
                      <span className={cn("px-2 py-1 text-xs rounded-full text-white", getActionColor(activity.action))}>
                        {activity.action}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-neutral-800">{activity.form}</TableCell>
                    <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-neutral-500">{activity.date}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
