import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Shield, FileText, CheckCircle, XCircle, AlertTriangle, Users, Lock, Globe, Clock, Mail } from 'lucide-react';
import { config } from '../config/environment';

const TermsOfServicePage = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gray-900 pt-16">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
            <p className="text-xl text-cyan-100 max-w-3xl mx-auto">
              Please read these terms carefully before using {config.APP_NAME}. By using our platform, you agree to these terms and conditions.
            </p>
            <p className="text-sm text-cyan-200 mt-4">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Quick Navigation */}
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Navigation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a href="#acceptance" className="flex items-center text-cyan-400 hover:text-cyan-300">
              <Shield className="h-4 w-4 mr-2" />
              Acceptance of Terms
            </a>
            <a href="#services" className="flex items-center text-cyan-400 hover:text-cyan-300">
              <Users className="h-4 w-4 mr-2" />
              Services Description
            </a>
            <a href="#accounts" className="flex items-center text-cyan-400 hover:text-cyan-300">
              <Lock className="h-4 w-4 mr-2" />
              User Accounts
            </a>
            <a href="#payments" className="flex items-center text-cyan-400 hover:text-cyan-300">
              <FileText className="h-4 w-4 mr-2" />
              Payment Terms
            </a>
            <a href="#intellectual-property" className="flex items-center text-cyan-400 hover:text-cyan-300">
              <Shield className="h-4 w-4 mr-2" />
              Intellectual Property
            </a>
            <a href="#privacy" className="flex items-center text-cyan-400 hover:text-cyan-300">
              <Shield className="h-4 w-4 mr-2" />
              Privacy & Data
            </a>
          </div>
        </div>

        {/* Terms Content */}
        <div className="space-y-8">
          {/* Acceptance of Terms */}
          <section id="acceptance" className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-white mb-4">{t('terms_content.acceptance_title')}</h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-300 mb-4">
                {t('terms_content.acceptance_content')}
              </p>
            </div>
          </section>

          {/* Services Description */}
          <section id="services" className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-white mb-4">2. Services Description</h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-300 mb-4">
                {config.APP_NAME} provides online educational content. Our services include:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
                <li>Access to video courses and educational content</li>
                <li>Progress tracking and completion certificates (upon full course completion and required watch time)</li>
                <li>Email and WhatsApp support</li>
              </ul>
              <p className="text-gray-600">
                We reserve the right to modify, suspend, or discontinue any aspect of our services at any time with reasonable notice.
              </p>
            </div>
          </section>

          {/* User Accounts */}
          <section id="accounts" className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-white mb-4">{t('terms_content.user_accounts_title')}</h2>
            <div className="prose prose-gray max-w-none">
              <h3 className="text-lg font-semibold text-white mb-3">Account Creation</h3>
              <p className="text-gray-300 mb-4">
                To access certain features of our platform, you must create an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete.
              </p>
              
              <h3 className="text-lg font-semibold text-white mb-3">Account Security</h3>
              <p className="text-gray-300 mb-4">
                You are responsible for safeguarding the password and for all activities that occur under your account. You agree not to disclose your password to any third party and to take sole responsibility for any activities or actions under your account.
              </p>
              
              <h3 className="text-lg font-semibold text-white mb-3">Account Termination</h3>
              <p className="text-gray-600">
                We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
              </p>
            </div>
          </section>

          {/* Payment Terms */}
          <section id="payments" className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-white mb-4">{t('terms_content.payment_terms_title')}</h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-300 mb-4">
                {t('terms_content.payment_terms_content')}
              </p>
            </div>
          </section>

          {/* Intellectual Property */}
          <section id="intellectual-property" className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-white mb-4">{t('terms_content.intellectual_property_title')}</h2>
            <div className="prose prose-gray max-w-none">
              <h3 className="text-lg font-semibold text-white mb-3">Our Content</h3>
              <p className="text-gray-300 mb-4">
                All content on {config.APP_NAME}, including but not limited to text, graphics, videos, audio, software, and course materials, is owned by {config.APP_NAME} or its licensors and is protected by copyright, trademark, and other intellectual property laws.
              </p>
              
              <h3 className="text-lg font-semibold text-white mb-3">License to Use</h3>
              <p className="text-gray-300 mb-4">
                Upon purchase, we grant you a limited, non-exclusive, non-transferable license to access and view the course content for your personal, non-commercial use only. You may not:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
                <li>Copy, reproduce, or distribute our content</li>
                <li>Modify, adapt, or create derivative works</li>
                <li>Share your account credentials with others</li>
                <li>Use our content for commercial purposes</li>
                <li>Record, download, or capture our video content</li>
              </ul>
              
              <h3 className="text-lg font-semibold text-white mb-3">User Content</h3>
              <p className="text-gray-600">
                You retain ownership of any content you submit to our platform. By submitting content, you grant us a worldwide, non-exclusive license to use, display, and distribute your content in connection with our services.
              </p>
            </div>
          </section>

          {/* Privacy & Data */}
          <section id="privacy" className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-white mb-4">{t('terms_content.privacy_data_title')}</h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-300 mb-4">
                {t('terms_content.privacy_data_content')}
              </p>
            </div>
          </section>

          {/* Prohibited Uses */}
          <section className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-white mb-4">7. Prohibited Uses</h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-300 mb-4">You may not use our platform to:</p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe upon the rights of others</li>
                <li>Transmit harmful, offensive, or inappropriate content</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt our services</li>
                <li>Use automated tools to access our platform</li>
                <li>Share account credentials with others</li>
              </ul>
              <p className="text-gray-600">
                Violation of these prohibitions may result in immediate account termination and legal action.
              </p>
            </div>
          </section>

          {/* Disclaimers */}
          <section className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-white mb-4">8. Disclaimers and Limitations</h2>
            <div className="prose prose-gray max-w-none">
              <h3 className="text-lg font-semibold text-white mb-3">Service Availability</h3>
              <p className="text-gray-300 mb-4">
                We strive to provide reliable service but cannot guarantee uninterrupted access. Our platform may be temporarily unavailable due to maintenance, technical issues, or other factors beyond our control.
              </p>
              
              <h3 className="text-lg font-semibold text-white mb-3">Educational Content</h3>
              <p className="text-gray-300 mb-4">
                While we provide high-quality educational content, we cannot guarantee specific results or outcomes. Success depends on individual effort, market conditions, and other factors beyond our control.
              </p>
              
              <h3 className="text-lg font-semibold text-white mb-3">Limitation of Liability</h3>
              <p className="text-gray-600">
                In no event shall {config.APP_NAME} be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
              </p>
            </div>
          </section>

          {/* Changes to Terms */}
          <section className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-white mb-4">9. Changes to Terms</h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-300 mb-4">
                We reserve the right to modify these Terms at any time. We will notify users of any material changes by posting the new Terms on this page and updating the "Last updated" date.
              </p>
              <p className="text-gray-600">
                Your continued use of our platform after any changes constitutes acceptance of the new Terms. If you do not agree to the new terms, you should discontinue use of our platform.
              </p>
            </div>
          </section>

          {/* Contact Information */}
          <section className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-white mb-4">10. Contact Information</h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-300 mb-4">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-600">
                  <strong>Email:</strong> {config.SUPPORT_EMAIL}<br />
                  <strong>WhatsApp:</strong> <a className="text-red-600 hover:text-red-700" href={`https://wa.me/${config.SUPPORT_WHATSAPP.replace(/[^\\d]/g, '')}`} target="_blank" rel="noopener noreferrer">{config.SUPPORT_WHATSAPP}</a>
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer CTA */}
        <div className="mt-12 bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-8 text-center border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-4">{t('terms_content.contact_questions')}</h2>
          <p className="text-gray-300 mb-6">
            {t('help.contact_support')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/contact"
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
            >
              {t('contact.contact_info')}
            </Link>
            <a
              href={`mailto:${config.SUPPORT_EMAIL}`}
              className="border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
            >
              {t('help.contact_support')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
