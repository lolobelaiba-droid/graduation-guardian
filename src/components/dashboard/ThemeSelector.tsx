import { Check, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { useColorTheme, type ThemeConfig } from "@/hooks/useTheme";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export function ThemeSelector() {
  const { colorTheme, changeTheme, themes } = useColorTheme();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Palette className="h-4 w-4" />
          تغيير الثيم
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <div className="text-sm font-medium text-foreground">اختر ثيم الألوان</div>
          <div className="grid grid-cols-2 gap-3">
            {themes.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                isActive={colorTheme === theme.id}
                onClick={() => changeTheme(theme.id)}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface ThemeCardProps {
  theme: ThemeConfig;
  isActive: boolean;
  onClick: () => void;
}

function ThemeCard({ theme, isActive, onClick }: ThemeCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-2 rounded-xl p-3 transition-all duration-200",
        "border-2 hover:scale-105",
        isActive
          ? "border-primary bg-primary/5 shadow-md"
          : "border-transparent bg-muted/50 hover:bg-muted"
      )}
    >
      {/* Color Preview */}
      <div className="flex gap-1">
        <div
          className="h-8 w-8 rounded-full shadow-sm ring-2 ring-white/50"
          style={{ backgroundColor: theme.preview.primary }}
        />
        <div
          className="h-8 w-8 rounded-full shadow-sm ring-2 ring-white/50"
          style={{ backgroundColor: theme.preview.secondary }}
        />
        <div
          className="h-8 w-8 rounded-full shadow-sm ring-2 ring-white/50"
          style={{ backgroundColor: theme.preview.accent }}
        />
      </div>
      
      {/* Theme Name */}
      <span className="text-xs font-medium text-foreground">{theme.name}</span>
      
      {/* Active Indicator */}
      {isActive && (
        <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
          <Check className="h-3 w-3" />
        </div>
      )}
    </button>
  );
}
