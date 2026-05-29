import { HeartPulse, Pill } from "lucide-react";

interface MediMaitLogoProps {
  className?: string;
}

export function MediMaitLogo({ className = "w-8 h-8" }: MediMaitLogoProps) {
  return (
    <div className={`${className} bg-blue-600 rounded-xl flex items-center justify-center shadow-xs relative overflow-hidden`}>
      <HeartPulse className="w-[58%] h-[58%] text-white stroke-[2.4]" />
      <Pill className="absolute -right-0.5 -bottom-0.5 w-[42%] h-[42%] text-blue-100 stroke-[2.6] rotate-[-18deg]" />
    </div>
  );
}
