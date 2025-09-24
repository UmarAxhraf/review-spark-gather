import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from "@/components/ui/alert-dialog";

interface SamePlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  planType: string;
}

export const SamePlanDialog = ({ isOpen, onClose, planType }: SamePlanDialogProps) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Already Subscribed</AlertDialogTitle>
          <AlertDialogDescription>
            You already have an active {planType} plan. You cannot purchase the same plan again.
            {planType !== 'enterprise' && " You can upgrade to a higher plan or manage your subscription through your account settings."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>Understood</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};