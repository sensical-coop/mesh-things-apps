import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { Button } from "@mtt/ui/components/base/buttons/button"
import { RiCloseLine } from "@remixicon/react"
import { cn } from "cn"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/30",
        "data-open:animate-[oa-dialog-backdrop-in_0.15s_ease-out_both] data-closed:animate-[oa-dialog-backdrop-out_0.15s_ease-out_both]",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className={cn(
            "pointer-events-auto relative grid w-full max-w-md max-h-[min(90dvh,40rem)] gap-4 overflow-y-auto oa-squircle border border-separator-border bg-background-primary-default p-5 text-text-primary shadow-dropdown outline-none",
            "focus-visible:ring-2 focus-visible:ring-border-focus-ring",
            "data-open:animate-[oa-dialog-in_0.42s_cubic-bezier(0.22,1.15,0.32,1)_both] data-closed:animate-[oa-dialog-out_0.28s_cubic-bezier(0.32,0.72,0.4,1)_both]",
            className
          )}
          {...props}
        >
          {children}
          {showCloseButton ? (
            <DialogPrimitive.Close
              data-slot="dialog-close"
              render={
                <Button
                  variant="ghost"
                  size="small"
                  iconOnly
                  leadingIcon={RiCloseLine}
                  aria-label="Close"
                  className="absolute top-3 right-3 rounded-full"
                />
              }
            />
          ) : null}
        </DialogPrimitive.Popup>
      </div>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton ? (
        <DialogPrimitive.Close
          render={<Button variant="secondary" size="small" className="rounded-full" />}
        >
          Close
        </DialogPrimitive.Close>
      ) : null}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-title-3-medium text-text-primary", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-body-regular text-text-secondary", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
