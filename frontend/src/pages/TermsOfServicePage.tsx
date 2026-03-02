import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, FileText, CheckCircle, XCircle, AlertTriangle, Users, Lock, Globe, Clock, Mail } from 'lucide-react';
import { config } from '../config/environment';

const TermsOfServicePage = () => {
  const [activeSection, setActiveSection] = useState('general');

  const sections = [
    { id: 'general', title: 'General Terms', icon: FileText },
    { id: 'privacy', title: 'Privacy Policy', icon: Shield },
    { id: 'cookies', title: 'Cookies Policy', icon: Globe },
    { id: 'refund', title: 'Refund Policy', icon: AlertTriangle },
    { id: 'contact', title: 'Contact Us', icon: Mail }
  ];

  const generalTerms = [
    {
      title: 'Acceptance of Terms',
      content: 'By accessing and using EBYET ACADEMY, you accept and agree to be bound by the terms and provision of this agreement.'
    },
    {
      title: 'Use License',
      content: 'Permission is granted to temporarily download one copy of the materials on EBYET ACADEMY for personal, non-commercial transitory viewing only.'
    },
    {
      title: 'Disclaimer',
      content: 'The materials on EBYET ACADEMY are provided on an "as is" basis. EBYET ACADEMY makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties.'
    },
    {
      title: 'Limitations',
      content: 'In no event shall EBYET ACADEMY or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on EBYET ACADEMY.'
    }
  ];

  const privacyPolicy = [
    {
      title: 'Information We Collect',
      content: 'We collect information you provide directly to us, such as when you create an account, purchase a course, or contact us for support.'
    },
    {
      title: 'How We Use Your Information',
      content: 'We use the information we collect to provide, maintain, and improve our services, process transactions, and communicate with you.'
    },
    {
      title: 'Information Sharing',
      content: 'We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.'
    },
    {
      title: 'Data Security',
      content: 'We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.'
    }
  ];

  const cookiesPolicy = [
    {
      title: 'What Are Cookies',
      content: 'Cookies are small text files that are stored on your device when you visit our website. They help us provide you with a better experience.'
    },
    {
      title: 'How We Use Cookies',
      content: 'We use cookies to understand how you use our website, remember your preferences, and provide personalized content and advertisements.'
    },
    {
      title: 'Managing Cookies',
      content: 'You can control and/or delete cookies as you wish. You can delete all cookies that are already on your computer and you can set most browsers to prevent them from being placed.'
    }
  ];

  const refundPolicy = [
    {
      title: '30-Day Money Back Guarantee',
      content: 'We offer a 30-day money-back guarantee for all courses. If you are not satisfied with your purchase, you can request a full refund within 30 days of purchase.'
    },
    {
      title: 'How to Request a Refund',
      content: 'To request a refund, please contact our support team with your order details and reason for the refund request.'
    },
    {
      title: 'Refund Processing',
      content: 'Refunds are typically processed within 5-7 business days. The refund will be credited to your original payment method.'
    },
    {
      title: 'Exceptions',
      content: 'Refunds may not be available for courses that have been completed more than 50% or for promotional items unless otherwise specified.'
    }
  ];

  const getSectionContent = (sectionId) => {
    switch (sectionId) {
      case 'general':
        return generalTerms;
      case 'privacy':
        return privacyPolicy;
      case 'cookies':
        return cookiesPolicy;
      case 'refund':
        return refundPolicy;
      case 'contact':
        return [
          {
            title: 'Get in Touch',
            content: `If you have any questions about these Terms of Service, please contact us at ${config.SUPPORT_EMAIL}`
          }
        ];
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Terms of Service
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg mb-8 p-6">
          <div className="flex flex-wrap gap-4 justify-center">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
                    activeSection === section.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{section.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {sections.find(s => s.id === activeSection)?.title}
            </h2>
            
            <div className="space-y-6">
              {getSectionContent(activeSection).map((item, index) => (
                <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-b-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {item.content}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Need Help?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Our support team is here to assist you with any questions.
                </p>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors duration-200"
                >
                  <Mail className="w-4 h-4" />
                  Contact Support
                </Link>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Secure Platform
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Your data and privacy are protected with industry-standard security.
                </p>
                <Link
                  to="/privacy"
                  className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors duration-200"
                >
                  <Shield className="w-4 h-4" />
                  Privacy Policy
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            © {new Date().getFullYear()} EBYET ACADEMY. All rights reserved.
          </p>
          <div className="mt-4 flex justify-center gap-6">
            <Link
              to="/privacy"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Terms of Service
            </Link>
            <Link
              to="/contact"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
