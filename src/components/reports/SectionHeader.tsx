import { Separator } from "@/components/ui/separator";

interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
}

export function SectionHeader({ title, icon }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 py-3">
      <Separator className="flex-1" />
      <div className="flex items-center gap-2 text-primary font-bold text-base whitespace-nowrap">
        {icon}
        {title}
      </div>
      <Separator className="flex-1" />
    </div>
  );
}
