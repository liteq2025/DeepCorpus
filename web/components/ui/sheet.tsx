"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-sheet bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

/**
 * Side-sheet width tokens. Applied as max-width / max-height on left|right
 * (vertical) and top|bottom (horizontal) variants. The base class chains
 * already give each side a `w-3/4` mobile fallback; these tokens only kick
 * in at `sm` and above.
 *
 *   sm    400px   tight forms                         (≤ phase-0.5 doc §4)
 *   md    560px   default — typical sheet size
 *   lg    720px   roomy — multi-section forms
 *   xl    50vw    half-screen — split-with-canvas reference                       (1/2 屏)
 *   third 33vw    third-screen — companion content alongside main canvas         (1/3 屏)
 *   full  100vw   edge-to-edge — large previews / complex flows
 */
type SheetSize = "sm" | "md" | "lg" | "xl" | "third" | "full"

const SHEET_VERTICAL_SIZE: Record<SheetSize, string> = {
  sm: "data-[side=left]:sm:max-w-[400px] data-[side=right]:sm:max-w-[400px]",
  md: "data-[side=left]:sm:max-w-[560px] data-[side=right]:sm:max-w-[560px]",
  lg: "data-[side=left]:sm:max-w-[720px] data-[side=right]:sm:max-w-[720px]",
  xl: "data-[side=left]:sm:max-w-[50vw] data-[side=right]:sm:max-w-[50vw]",
  third:
    "data-[side=left]:sm:max-w-[33vw] data-[side=right]:sm:max-w-[33vw]",
  full: "data-[side=left]:sm:max-w-none data-[side=left]:sm:w-screen data-[side=right]:sm:max-w-none data-[side=right]:sm:w-screen",
}

const SHEET_HORIZONTAL_SIZE: Record<SheetSize, string> = {
  sm: "data-[side=top]:sm:max-h-[280px] data-[side=bottom]:sm:max-h-[280px]",
  md: "data-[side=top]:sm:max-h-[420px] data-[side=bottom]:sm:max-h-[420px]",
  lg: "data-[side=top]:sm:max-h-[560px] data-[side=bottom]:sm:max-h-[560px]",
  xl: "data-[side=top]:sm:max-h-[50vh] data-[side=bottom]:sm:max-h-[50vh]",
  third:
    "data-[side=top]:sm:max-h-[33vh] data-[side=bottom]:sm:max-h-[33vh]",
  full: "data-[side=top]:sm:max-h-none data-[side=top]:sm:h-screen data-[side=bottom]:sm:max-h-none data-[side=bottom]:sm:h-screen",
}

function SheetContent({
  className,
  children,
  side = "right",
  size = "md",
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
  size?: SheetSize
  showCloseButton?: boolean
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        data-size={size}
        className={cn(
          "fixed z-sheet flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition duration-200 ease-in-out data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-open:animate-in data-open:fade-in-0 data-[side=bottom]:data-open:slide-in-from-bottom-10 data-[side=left]:data-open:slide-in-from-left-10 data-[side=right]:data-open:slide-in-from-right-10 data-[side=top]:data-open:slide-in-from-top-10 data-closed:animate-out data-closed:fade-out-0 data-[side=bottom]:data-closed:slide-out-to-bottom-10 data-[side=left]:data-closed:slide-out-to-left-10 data-[side=right]:data-closed:slide-out-to-right-10 data-[side=top]:data-closed:slide-out-to-top-10",
          SHEET_VERTICAL_SIZE[size],
          SHEET_HORIZONTAL_SIZE[size],
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close data-slot="sheet-close" asChild>
            <Button
              variant="ghost"
              className="absolute top-3 right-3"
              size="icon-sm"
            >
              <XIcon
              />
              <span className="sr-only">Close</span>
            </Button>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-0.5 p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "font-heading text-base font-medium text-foreground",
        className
      )}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
