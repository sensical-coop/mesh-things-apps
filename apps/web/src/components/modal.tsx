import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@mtt/ui/components/ui/dialog";
import { type ReactElement, type ReactNode } from "react";

export function Modal({
  open,
  title,
  description,
  onClose,
  wide = false,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  /** For editors that lay fields side by side. */
  wide?: boolean;
  children: ReactNode;
}): ReactElement {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent showCloseButton={false} className={wide ? "max-w-2xl" : undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
