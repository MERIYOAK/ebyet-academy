import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Eye, Lock, Database, Users, Bell, Globe, Mail } from 'lucide-react';
import { config } from '../config/environment';

const PrivacyPolicyPage = () => {
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    const updateLastUpdated = () => {
      const date = new Date();
      setLastUpdated(date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
    };
    updateLastUpdated();
    const interval = setInterval(updateLastUpdated, 1000 * 60 * 60 * 24); // Update daily
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4 pb-2 sm:pb-3 md:pb-4">Privacy Policy</h1>
            <p className="text-xl text-cyan-100 max-w-3xl mx-auto">
              We are committed to protecting your privacy and ensuring the security of your personal information. This policy explains how we collect, use, and safeguard your data.
            </p>
            <p className="text-sm text-cyan-200 mt-4">
              Last updated: {lastUpdated}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Quick Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Navigation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a href="#information-collection" className="flex items-center text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300">
              <Database className="h-4 w-4 mr-2" />
              Information We Collect
            </a>
            <a href="#how-we-use" className="flex items-center text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300">
              <Eye className="h-4 w-4 mr-2" />
              How We Use Information
            </a>
            <a href="#information-sharing" className="flex items-center text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300">
              <Users className="h-4 w-4 mr-2" />
              Information Sharing
            </a>
            <a href="#data-security" className="flex items-center text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300">
              <Lock className="h-4 w-4 mr-2" />
              Data Security
            </a>
            <a href="#your-rights" className="flex items-center text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300">
              <Shield className="h-4 w-4 mr-2" />
              Your Rights
            </a>
            <a href="#cookies" className="flex items-center text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300">
              <Globe className="h-4 w-4 mr-2" />
              Cookies & Tracking
            </a>
          </div>
        </div>

        {/* Policy Content */}
        <div className="space-y-8">
          {/* Introduction */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Introduction</h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                At IBYET Investing ("we," "our," or "us"), we respect your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
              </p>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                By using our platform, you consent to the data practices described in this policy. If you do not agree with our policies and practices, please do not use our services.
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                This policy applies to information we collect on our website, through our mobile applications, and in connection with our services.
              </p>
            </div>
          </section>

          {/* Information Collection */}
          <section id="information-collection" className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Information We Collect</h2>
            <div className="prose prose-gray max-w-none">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Personal Information</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We collect personal information that you voluntarily provide to us when you:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 mb-4">
                <li>Create an account or register for our services</li>
                <li>Purchase courses or subscribe to our platform</li>
                <li>Contact our support team</li>
                <li>Participate in surveys or promotions</li>
                <li>Sign up for our newsletter</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                This information may include:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 mb-4">
                <li>Name, email address, and phone number</li>
                <li>Billing and payment information</li>
                <li>Profile information and preferences</li>
                <li>Communication preferences</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Usage Information</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We automatically collect certain information about your use of our platform, including:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 mb-4">
                <li>Course progress and completion data</li>
                <li>Video viewing history and preferences</li>
                <li>Device information and browser type</li>
                <li>IP address and location data</li>
                <li>Pages visited and time spent on our platform</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Technical Information</h3>
              <p className="text-gray-600 dark:text-gray-300">
                We collect technical information such as your device type, operating system, browser version, and other technical specifications to ensure optimal platform performance and compatibility.
              </p>
            </div>
          </section>

          {/* How We Use Information */}
          <section id="how-we-use" className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">How We Use Your Information</h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We use the information we collect for various purposes, including:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 mb-4">
                <li><strong>Providing Services:</strong> To deliver our educational content and services</li>
                <li><strong>Account Management:</strong> To create and manage your account</li>
                <li><strong>Progress Tracking:</strong> To track your learning progress and provide certificates</li>
                <li><strong>Customer Support:</strong> To respond to your inquiries and provide assistance</li>
                <li><strong>Payment Processing:</strong> To process payments and manage subscriptions</li>
                <li><strong>Platform Improvement:</strong> To analyze usage patterns and improve our services</li>
                <li><strong>Communication:</strong> To send important updates and marketing communications</li>
                <li><strong>Legal Compliance:</strong> To comply with legal obligations and protect our rights</li>
              </ul>
              <p className="text-gray-600 dark:text-gray-300">
                We will only use your personal information for the purposes described in this policy or as otherwise disclosed to you at the time of collection.
              </p>
            </div>
          </section>

          {/* Information Sharing */}
          <section id="information-sharing" className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Information Sharing and Disclosure</h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except in the following circumstances:
              </p>
              
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Service Providers</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We may share your information with trusted third-party service providers who assist us in operating our platform, such as:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 mb-4">
                <li>Payment processors (Stripe)</li>
                <li>Cloud hosting services (AWS)</li>
                <li>Email service providers</li>
                <li>Analytics and tracking services</li>
                <li>Customer support platforms</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Legal Requirements</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We may disclose your information if required by law or in response to valid legal requests, such as subpoenas or court orders.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Business Transfers</h3>
              <p className="text-gray-600 dark:text-gray-300">
                In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the transaction, subject to the same privacy protections.
              </p>
            </div>
          </section>

          {/* Data Security */}
          <section id="data-security" className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Data Security</h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
              </p>
              
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Security Measures</h3>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 mb-4">
                <li>SSL encryption for all data transmission</li>
                <li>Secure data storage with industry-standard encryption</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Access controls and authentication measures</li>
                <li>Employee training on data protection practices</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Data Retention</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this policy, unless a longer retention period is required by law.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Data Breach Response</h3>
              <p className="text-gray-600 dark:text-gray-300">
                In the event of a data breach, we will notify affected users and relevant authorities in accordance with applicable laws and regulations.
              </p>
            </div>
          </section>

          {/* Your Rights */}
          <section id="your-rights" className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Your Rights and Choices</h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Depending on your location, you may have certain rights regarding your personal information:
              </p>
              
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Access and Portability</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                You have the right to access your personal information and request a copy of the data we hold about you in a portable format.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Correction and Updates</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                You can update or correct your personal information through your account settings or by contacting our support team.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Deletion</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                You may request the deletion of your personal information, subject to certain legal and contractual obligations.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Marketing Communications</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                You can opt out of marketing communications at any time by clicking the unsubscribe link in our emails or updating your preferences in your account settings.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Data Processing Restrictions</h3>
              <p className="text-gray-600 dark:text-gray-300">
                You may have the right to restrict or object to certain types of data processing, particularly for marketing purposes.
              </p>
            </div>
          </section>

          {/* Cookies and Tracking */}
          <section id="cookies" className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Cookies & Tracking Technologies</h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We use cookies and similar tracking technologies to enhance your experience on our platform and collect information about how you use our services.
              </p>
              
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Types of Cookies We Use</h3>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-2 mb-4">
                <li><strong>Essential Cookies:</strong> Required for basic platform functionality</li>
                <li><strong>Performance Cookies:</strong> Help us understand how visitors interact with our platform</li>
                <li><strong>Functional Cookies:</strong> Remember your preferences and settings</li>
                <li><strong>Marketing Cookies:</strong> Used for advertising and marketing purposes</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Third-Party Analytics</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We use third-party analytics services, such as Google Analytics, to help us understand how users interact with our platform. These services may collect information about your use of our website.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Cookie Management</h3>
              <p className="text-gray-600 dark:text-gray-300">
                You can control and manage cookies through your browser settings. However, disabling certain cookies may affect the functionality of our platform.
              </p>
            </div>
          </section>

          {/* International Transfers */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">International Data Transfers</h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Your personal information may be transferred to and processed in countries other than your own. We ensure that such transfers comply with applicable data protection laws and implement appropriate safeguards.
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                By using our services, you consent to the transfer of your information to countries outside your residence, including the United States, where our servers are located.
              </p>
            </div>
          </section>

          {/* Children's Privacy */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Children's Privacy</h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Our services are not intended for children under the age of 13. We do not knowingly collect personal information from children under 13.
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately, and we will take steps to remove such information.
              </p>
            </div>
          </section>

          {/* Policy Updates */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Changes to This Privacy Policy</h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                We may update this Privacy Policy from time to time to reflect changes in our practices or applicable laws. We will notify you of any material changes by posting the updated policy on our website and updating the "Last updated" date.
              </p>
            </div>
          </section>

          {/* Contact Information */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Contact Us</h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                If you have any questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-gray-100 dark:bg-gray-900/50 rounded-lg p-4">
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Email:</strong> {config.PRIVACY_EMAIL}<br />
                  <strong>Address:</strong> {config.SUPPORT_ADDRESS}<br />
                  <strong>Phone:</strong> {config.SUPPORT_PHONE}
                </p>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mt-4">
                For data protection inquiries, you may also contact our Data Protection Officer at {config.DPO_EMAIL}.
              </p>
            </div>
          </section>
        </div>

        {/* Footer CTA */}
        <div className="mt-12 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 text-center border border-gray-300 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">If you have any questions about this Privacy Policy or our data practices, please contact us:</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Contact our support team
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/contact"
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
            >
              Contact Us
            </Link>
            <a
              href={`mailto:${config.PRIVACY_EMAIL}`}
              className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
