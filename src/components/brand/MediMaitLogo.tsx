import logoUrl from "../../assets/medimait-internal-logo.png";

interface MediMaitLogoProps {
  className?: string;
}

export function MediMaitLogo({ className = "w-8 h-8" }: MediMaitLogoProps) {
  return (
    <img
      src={logoUrl}
      alt="MediMait"
      className={`${className} rounded-xl object-cover shadow-xs bg-white`}
      draggable={false}
    />
  );
}
