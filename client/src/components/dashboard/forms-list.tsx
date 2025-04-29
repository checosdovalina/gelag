import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, FileText, Clock } from "lucide-react";
import { Link } from "wouter";

export interface FormItem {
  id: number;
  name: string;
  department: string;
  lastUpdated: string;
}

interface FormsListProps {
  forms: FormItem[];
  isLoading?: boolean;
}

export default function FormsList({ forms, isLoading = false }: FormsListProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Formularios Recientes</CardTitle>
        <Link href="/forms">
          <Button variant="ghost" className="text-primary hover:text-primary-dark text-sm font-medium flex items-center">
            Ver Todo <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {isLoading ? (
            Array(4).fill(0).map((_, idx) => (
              <div key={idx} className="p-3 border border-neutral-200 rounded-md">
                <div className="flex justify-between items-start">
                  <div className="w-full">
                    <div className="animate-pulse h-5 w-3/4 bg-gray-100 rounded mb-2"></div>
                    <div className="animate-pulse h-4 w-1/2 bg-gray-100 rounded"></div>
                  </div>
                  <FileText className="text-gray-300" />
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-neutral-100">
                  <div className="animate-pulse h-4 w-24 bg-gray-100 rounded"></div>
                  <div className="animate-pulse h-6 w-12 bg-gray-100 rounded"></div>
                </div>
              </div>
            ))
          ) : forms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-12 w-12 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No hay formularios recientes</p>
            </div>
          ) : (
            forms.map((form) => (
              <div key={form.id} className="p-3 border border-neutral-200 rounded-md hover:shadow-sm transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-neutral-800">{form.name}</h3>
                    <p className="text-sm text-neutral-500">Departamento: {form.department}</p>
                  </div>
                  <FileText className="text-neutral-400" />
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-neutral-100">
                  <div className="text-xs text-neutral-500 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>Actualizado: {form.lastUpdated}</span>
                  </div>
                  <Link href={`/forms/${form.id}`}>
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary-dark text-sm font-medium h-7 px-2 py-0">
                      Abrir
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
