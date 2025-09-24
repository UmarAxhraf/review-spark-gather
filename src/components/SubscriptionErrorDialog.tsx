import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { AlertTriangle } from "lucide-react";

export function SubscriptionErrorDialog() {
  const { subscriptionError, clearError } = useSubscription();

  if (!subscriptionError?.showDialog) {
    return null;
  }

  return (
    <AlertDialog open={true} onOpenChange={() => clearError()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <AlertDialogTitle>Subscription Purchase Failed</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left">
            {subscriptionError.message}
            {subscriptionError.currentPlan && (
              <div className="mt-2 p-3 bg-blue-50 rounded-md">
                <strong>Current Plan:</strong> {subscriptionError.currentPlan}
              </div>
            )}
            <div className="mt-3 text-sm text-gray-600">
              <strong>Note:</strong> You can still upgrade or downgrade your plan through your account settings.
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={clearError}>
            Understood
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}