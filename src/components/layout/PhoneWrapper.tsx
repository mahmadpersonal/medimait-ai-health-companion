import React from "react";
import { MediMaitLogo } from "../brand/MediMaitLogo";

interface PhoneWrapperProps {
  children: React.ReactNode;
}

export function PhoneWrapper({ children }: PhoneWrapperProps) {
  return (
    <div className="min-h-[100dvh] bg-slate-900 flex justify-center items-center p-0 md:p-6 font-sans select-none antialiased">
      {/* Phone device shell container */}
      <div className="relative w-full max-w-[430px] h-[100dvh] md:h-[860px] md:rounded-[48px] md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] md:border-[10px] overflow-hidden flex flex-col bg-slate-50 border-slate-900">
        
        {/* Physical notch or top styling on desktop */}
        <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-slate-900 rounded-b-2xl z-50">
          <div className="absolute top-[6px] left-1/2 -translate-x-1/2 w-12 h-1 bg-slate-700 rounded-full"></div>
        </div>

        {/* Brand Header Bar */}
        <div className="h-[calc(3.5rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] w-full px-5 flex justify-between items-center z-45 backdrop-blur-md sticky top-0 shrink-0 border-b bg-white/95 border-slate-100/80 text-slate-800">
          <div className="flex items-center gap-2">
            <MediMaitLogo />
            <span className="font-extrabold text-[15px] tracking-tight">MediMait</span>
          </div>
        </div>

        {/* Screen Content Container */}
        <div className="flex-1 flex flex-col overflow-hidden relative pb-[calc(84px+env(safe-area-inset-bottom))] bg-slate-50">
          {children}
        </div>

        {/* Sleek bottom home bar indicator for extra app premium polish */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-300 rounded-full z-45 hidden md:block"></div>
      </div>
    </div>
  );
}
