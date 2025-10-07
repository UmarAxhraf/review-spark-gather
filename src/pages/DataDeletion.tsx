import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const DataDeletion = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Data Deletion Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <p className="text-lg">
              You can request deletion of your personal data in the following
              ways:
            </p>

            {/* <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Method 1: Through Your Account</h3>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Log into your account</li>
                <li>Go to Settings</li>
                <li>Click "Delete Account"</li>
                <li>Confirm your deletion request</li>
              </ol>
            </div> */}

            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Method 1: Email Request</h3>
              <p>
                Send an email to <strong>support@syncreviews.com </strong> with:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Your account email address</li>
                <li>Subject: "Data Deletion Request"</li>
                <li>Confirmation that you want to delete all your data</li>
              </ul>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">What Gets Deleted</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Your account information</li>
                <li>Connected social media platform data</li>
                <li>Review and analytics data</li>
                <li>All personal preferences and settings</li>
              </ul>
            </div>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
              <p className="mb-4">
                If you have any questions about this privacy policy or our data
                practices, please contact us:
              </p>
              <ul className="list-disc pl-6">
                <li>Email: support@syncreviews.com </li>
                <li>URL: https://syncreviews.com </li>
              </ul>
            </section>

            <p className="text-sm text-muted-foreground">
              <strong>Processing Time:</strong> Data deletion requests are
              processed within 30 days. Some information may be retained for
              legal compliance purposes as outlined in our Privacy Policy.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataDeletion;
