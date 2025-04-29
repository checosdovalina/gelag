import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  FileText, 
  PenLine, 
  Users, 
  FileDown
} from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardVariant = "forms" | "records" | "users" | "exports";

interface StatCardProps {
  title: string;
  value: number;
  change?: {
    value: string;
    positive: boolean;
  };
  variant: StatCardVariant;
}

export default function StatCard({ title, value, change, variant }: StatCardProps) {
  // Icon and color based on variant
  const getIconAndColor = () => {
    switch (variant) {
      case "forms":
        return {
          icon: <FileText className="text-primary" />,
          bgColor: "bg-primary bg-opacity-10",
        };
      case "records":
        return {
          icon: <PenLine className="text-blue-500" />,
          bgColor: "bg-blue-500 bg-opacity-10",
        };
      case "users":
        return {
          icon: <Users className="text-green-500" />,
          bgColor: "bg-green-500 bg-opacity-10",
        };
      case "exports":
        return {
          icon: <FileDown className="text-amber-500" />,
          bgColor: "bg-amber-500 bg-opacity-10",
        };
      default:
        return {
          icon: <FileText className="text-primary" />,
          bgColor: "bg-primary bg-opacity-10",
        };
    }
  };

  const { icon, bgColor } = getIconAndColor();

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-neutral-500 text-sm font-medium">{title}</p>
            <h3 className="text-2xl font-medium mt-1">{value}</h3>
          </div>
          <div className={cn("p-2 rounded-full", bgColor)}>
            {icon}
          </div>
        </div>
        
        {change && (
          <p className={cn(
            "text-sm mt-4 flex items-center",
            change.positive ? "text-green-500" : "text-red-500"
          )}>
            {change.positive ? (
              <ArrowUpIcon className="h-4 w-4 mr-1" />
            ) : (
              <ArrowDownIcon className="h-4 w-4 mr-1" />
            )}
            <span>{change.value}</span> desde el mes pasado
          </p>
        )}
      </CardContent>
    </Card>
  );
}
