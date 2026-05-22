import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

function AlertDialog(props: React.ComponentProps<typeof Dialog>) {
  return <Dialog {...props} />
}

function AlertDialogTrigger(props: React.ComponentProps<typeof DialogTrigger>) {
  return <DialogTrigger {...props} />
}

function AlertDialogContent({ className, ...props }: React.ComponentProps<typeof DialogContent> & { className?: string }) {
  return <DialogContent className={className} {...props} />
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<typeof DialogHeader> & { className?: string }) {
  return <DialogHeader className={className} {...props} />
}

function AlertDialogTitle({ className, ...props }: React.ComponentProps<typeof DialogTitle> & { className?: string }) {
  return <DialogTitle className={className} {...props} />
}

function AlertDialogDescription({ className, ...props }: React.ComponentProps<typeof DialogDescription> & { className?: string }) {
  return <DialogDescription className={className} {...props} />
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<typeof DialogFooter> & { className?: string }) {
  return <DialogFooter className={className} {...props} />
}

function AlertDialogCancel({ className, children, ...props }: React.ComponentProps<typeof DialogClose> & { className?: string; children?: React.ReactNode }) {
  return (
    <DialogClose render={<Button variant="outline" className={className} />} {...props}>
      {children || "Cancelar"}
    </DialogClose>
  )
}

function AlertDialogAction({ className, onClick, children, ...props }: React.ComponentProps<typeof DialogClose> & { className?: string; onClick?: React.MouseEventHandler<HTMLButtonElement>; children?: React.ReactNode }) {
  return (
    <DialogClose render={<Button className={className} onClick={onClick} />} {...props}>
      {children || "Confirmar"}
    </DialogClose>
  )
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
}
