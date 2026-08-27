import React from "react";
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
import { Button } from "@/components/ui/button";

export function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Você tem certeza?", 
  description = "Esta ação não pode ser desfeita.",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "default" 
}) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="rounded-2xl bg-[#141414] text-white border border-[#D4AF37]/30 shadow-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading text-xl text-white font-extrabold">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400 text-sm">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 pt-2">
          <AlertDialogCancel asChild>
            <Button variant="ghost" className="rounded-xl text-gray-400 hover:text-white hover:bg-white/10">
              {cancelText}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button 
              onClick={onConfirm}
              className={`rounded-xl font-extrabold transition-all ${
                variant === "destructive" 
                  ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20" 
                  : "bg-gradient-to-r from-[#F4B544] to-[#C88A24] text-black shadow-lg shadow-[#F4B544]/20 hover:scale-105"
              }`}
            >
              {confirmText}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
