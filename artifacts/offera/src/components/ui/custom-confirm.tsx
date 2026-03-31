import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
};

type ConfirmContextType = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmationProvider");
  }
  return context;
};

export const ConfirmationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((confirmOptions: ConfirmOptions) => {
    setOptions(confirmOptions);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(true);
      resolveRef.current = null;
    }
  }, []);

  return (
    <>
      <ConfirmContext.Provider value={confirm}>{children}</ConfirmContext.Provider>

      <AlertDialog open={isOpen} onOpenChange={(open) => {
        if (!open) handleCancel();
      }}>
        <AlertDialogContent className="rounded-[2.5rem] p-8 md:p-10 border-outline-variant/10 shadow-elevated animate-in zoom-in-95 duration-200">
          <AlertDialogHeader className="gap-3">
            <AlertDialogTitle className="text-2xl font-black tracking-tighter text-on-surface">
              {options?.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-on-surface-variant/80 font-medium leading-relaxed">
              {options?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3 sm:gap-4">
            <AlertDialogCancel
              onClick={handleCancel}
              className="h-12 px-6 rounded-2xl border-outline-variant/20 hover:bg-surface-container-low font-bold text-sm transition-all"
            >
              {options?.cancelLabel || "Avbryt"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={cn(
                "h-12 px-8 rounded-2xl font-black text-sm shadow-soft transition-all active:scale-95",
                options?.variant === "destructive"
                  ? "bg-error text-white hover:bg-error/90"
                  : "bg-primary-gradient text-white"
              )}
            >
              {options?.confirmLabel || "Fortsätt"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
