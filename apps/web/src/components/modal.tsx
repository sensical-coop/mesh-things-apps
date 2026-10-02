import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@mtt/ui/components/ui/dialog";
import { type ReactElement, type ReactNode } from "react";

export type ModalSize = "default" | "wide" | "large";

const SIZE_CLASS: Record<ModalSize, string | undefined> = {
  default: undefined,
  wide: "max-w-2xl",
  large: "max-w-4xl max-h-[90dvh]",
};

export function Modal({
  open,
  title,
  description,
  onClose,
  size = "default",
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  /** `wide` for editors that lay fields side by side; `large` for long reference content. */
  size?: ModalSize;
  children: ReactNode;
}): ReactElement {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent showCloseButton={false} className={SIZE_CLASS[size]}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
