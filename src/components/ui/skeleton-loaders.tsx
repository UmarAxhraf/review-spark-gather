import React from "react";
import { Skeleton } from "./skeleton";
import { Card, CardContent, CardHeader } from "./card";

// Card Skeleton
export const CardSkeleton: React.FC = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-20 w-full" />
    </CardContent>
  </Card>
);

// Table Row Skeleton
export const TableRowSkeleton: React.FC = () => (
  <tr>
    <td className="p-4">
      <Skeleton className="h-4 w-full" />
    </td>
    <td className="p-4">
      <Skeleton className="h-4 w-3/4" />
    </td>
    <td className="p-4">
      <Skeleton className="h-4 w-1/2" />
    </td>
    <td className="p-4">
      <Skeleton className="h-8 w-16" />
    </td>
  </tr>
);

// Employee Card Skeleton
export const EmployeeCardSkeleton: React.FC = () => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </CardContent>
  </Card>
);

// Review Card Skeleton
export const ReviewCardSkeleton: React.FC = () => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-start space-x-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Dashboard Stats Skeleton
export const StatsCardSkeleton: React.FC = () => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-12" />
        </div>
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </CardContent>
  </Card>
);

// QR Code Card Skeleton
export const QRCardSkeleton: React.FC = () => (
  <Card>
    <CardContent className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-32 w-full" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Notification Skeleton
export const NotificationSkeleton: React.FC = () => (
  <div className="flex items-start space-x-4 p-4 border-b">
    <Skeleton className="h-8 w-8 rounded" />
    <div className="flex-1 space-y-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  </div>
);