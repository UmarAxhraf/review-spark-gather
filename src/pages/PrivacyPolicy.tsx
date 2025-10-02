import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PrivacyPolicy = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">
            Privacy Policy
          </CardTitle>
          <p className="text-center text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </CardHeader>
        <CardContent className="prose max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
            <p className="mb-4">
              We collect information you provide directly to us, such as when you create an account, 
              connect social media platforms, or contact us for support.
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Account information (name, email address, company details)</li>
              <li>Social media platform data (Facebook Pages, Google Business profiles, Yelp business information)</li>
              <li>Review and rating data from connected platforms</li>
              <li>Usage data and analytics</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
            <p className="mb-4">We use the information we collect to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Provide, maintain, and improve our review management services</li>
              <li>Aggregate and analyze review data from your connected platforms</li>
              <li>Send you technical notices, updates, and support messages</li>
              <li>Respond to your comments, questions, and customer service requests</li>
              <li>Monitor and analyze trends, usage, and activities</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Information Sharing</h2>
            <p className="mb-4">
              We do not sell, trade, or otherwise transfer your personal information to third parties 
              except as described in this policy:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>With your consent</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and prevent fraud</li>
              <li>With service providers who assist in our operations (under strict confidentiality agreements)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Third-Party Platform Integration</h2>
            <p className="mb-4">
              Our service integrates with third-party platforms including Facebook, Google Business, and Yelp. 
              When you connect these accounts:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>We access only the data necessary to provide our review management services</li>
              <li>We store access tokens securely and use them only for authorized purposes</li>
              <li>You can disconnect these integrations at any time through your account settings</li>
              <li>Each platform's own privacy policy also applies to data they collect</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
            <p className="mb-4">
              We implement appropriate technical and organizational measures to protect your personal 
              information against unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section className="mb-8" id="data-deletion">
            <h2 className="text-2xl font-semibold mb-4">6. Data Deletion and Your Rights</h2>
            <p className="mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data</li>
              <li>Disconnect third-party platform integrations</li>
            </ul>
            
            <div className="bg-blue-50 p-4 rounded-lg mt-4">
              <h3 className="font-semibold mb-2">How to Request Data Deletion:</h3>
              <ol className="list-decimal pl-6">
                <li>Log into your account and go to Settings → Data Management</li>
                <li>Click "Delete Account" to remove all your data</li>
                <li>Or email us at privacy@yourdomain.com with your deletion request</li>
                <li>We will process deletion requests within 30 days</li>
                <li>Some data may be retained for legal compliance purposes</li>
              </ol>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Cookies and Tracking</h2>
            <p className="mb-4">
              We use cookies and similar technologies to enhance your experience, analyze usage, 
              and provide personalized content. You can control cookie preferences through your browser settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Children's Privacy</h2>
            <p className="mb-4">
              Our service is not intended for children under 13. We do not knowingly collect 
              personal information from children under 13.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Changes to This Policy</h2>
            <p className="mb-4">
              We may update this privacy policy from time to time. We will notify you of any 
              material changes by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
            <p className="mb-4">
              If you have any questions about this privacy policy or our data practices, please contact us:
            </p>
            <ul className="list-disc pl-6">
              <li>Email: privacy@yourdomain.com</li>
              <li>Address: [Your Company Address]</li>
              <li>Phone: [Your Phone Number]</li>
            </ul>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacyPolicy;