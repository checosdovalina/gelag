import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

// Input Field
export function TextField({
  label,
  placeholder,
  value,
  onChange,
  required,
  disabled,
  error,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

// Number Field
export function NumberField({
  label,
  placeholder,
  value,
  onChange,
  required,
  disabled,
  error,
}: {
  label: string;
  placeholder?: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Input
        type="number"
        placeholder={placeholder}
        value={value === undefined ? "" : value}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        disabled={disabled}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

// Date Field
export function DateField({
  label,
  value,
  onChange,
  required,
  disabled,
  error,
}: {
  label: string;
  value: Date | undefined;
  onChange: (value: Date | undefined) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "PPP", { locale: es }) : "Seleccionar fecha"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
            initialFocus
            locale={es}
          />
        </PopoverContent>
      </Popover>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

// Select Field
export function SelectField({
  label,
  options,
  value,
  onChange,
  required,
  disabled,
  error,
}: {
  label: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="Seleccionar opción" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

// Checkbox Field
export function CheckboxField({
  label,
  options,
  value,
  onChange,
  required,
  disabled,
  error,
}: {
  label: string;
  options: { label: string; value: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="space-y-2">
        {options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <Checkbox
              id={option.value}
              checked={value.includes(option.value)}
              onCheckedChange={(checked) => {
                if (checked) {
                  onChange([...value, option.value]);
                } else {
                  onChange(value.filter((v) => v !== option.value));
                }
              }}
              disabled={disabled}
            />
            <Label htmlFor={option.value}>{option.label}</Label>
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

// Radio Field
export function RadioField({
  label,
  options,
  value,
  onChange,
  required,
  disabled,
  error,
}: {
  label: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <RadioGroup
        value={value}
        onValueChange={onChange}
        disabled={disabled}
      >
        {options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <RadioGroupItem value={option.value} id={option.value} />
            <Label htmlFor={option.value}>{option.label}</Label>
          </div>
        ))}
      </RadioGroup>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

// Textarea Field
export function TextareaField({
  label,
  placeholder,
  value,
  onChange,
  required,
  disabled,
  error,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <Textarea
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
