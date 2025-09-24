import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageLoading } from '@/components/ui/page-loading';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface PublicRouteProps {
  children: React.ReactNode;
  requiresValidQR?: boolean;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ 
  children, 
  requiresValidQR = false 
}) => {
  const { qrId } = useParams();
  const [isValidAccess, setIsValidAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validateAccess = async () => {
      try {
        if (!requiresValidQR) {
          setIsValidAccess(true);
          setLoading(false);
          return;
        }

        if (!qrId) {
          setError('Invalid access link');
          setLoading(false);
          return;
        }

        // Validate QR code and check if it's active
        const { data: employee, error: employeeError } = await supabase
          .from('employees')
          .select('id, qr_is_active, qr_expires_at, company_id')
          .eq('qr_code_id', qrId)
          .single();

        if (employeeError || !employee) {
          setError('Invalid or expired QR code');
          setLoading(false);
          return;
        }

        // Check if QR is active
        if (!employee.qr_is_active) {
          setError('This QR code has been deactivated');
          setLoading(false);
          return;
        }

        // Check expiration
        if (employee.qr_expires_at && new Date(employee.qr_expires_at) < new Date()) {
          setError('This QR code has expired');
          setLoading(false);
          return;
        }

        // Rate limiting check for this QR code
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data: recentSubmissions, error: submissionError } = await supabase
          .from('reviews')
          .select('id')
          .eq('employee_id', employee.id)
          .gte('created_at', oneHourAgo);

        if (submissionError) {
          console.warn('Could not check submission rate:', submissionError);
        } else if (recentSubmissions && recentSubmissions.length > 10) {
          setError('Too many submissions for this employee. Please try again later.');
          setLoading(false);
          return;
        }

        setIsValidAccess(true);
        setLoading(false);
      } catch (error) {
        console.error('Access validation error:', error);
        setError('Unable to validate access');
        setLoading(false);
      }
    };

    validateAccess();
  }, [qrId, requiresValidQR]);

  if (loading) {
    return <PageLoading text="Validating access..." fullScreen />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-6 p-6">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="space-y-2">
                <p className="font-semibold">Access Denied</p>
                <p className="text-sm">{error}</p>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!isValidAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-6 p-6">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <p className="font-semibold">Invalid Access</p>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default PublicRoute;