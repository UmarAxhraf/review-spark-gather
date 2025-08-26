import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { Clock } from "lucide-react";

const SessionTimeoutWarning = () => {
  const { sessionTimeoutWarning, extendSession, signOut } = useAuth();
  const [countdown, setCountdown] = useState(300); // 5 minutes in seconds

  useEffect(() => {
    if (sessionTimeoutWarning) {
      setCountdown(300);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [sessionTimeoutWarning]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handleExtendSession = async () => {
    await extendSession();
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Dialog open={sessionTimeoutWarning}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Session Timeout Warning
          </DialogTitle>
          <DialogDescription>
            Your session will expire in {formatTime(countdown)}. Would you like
            to extend your session?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
          <Button onClick={handleExtendSession}>Extend Session</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SessionTimeoutWarning;
