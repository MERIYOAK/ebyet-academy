import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, MessageCircle, Mail, Clock, BookOpen, Shield, CreditCard, Users, Globe, Zap, Star, HelpCircle, Phone, MapPin } from 'lucide-react';
import { config } from '../config/environment';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const HelpCenterPage = () => {
  const { t } = useTranslation();
  const [openFaqs, setOpenFaqs] = useState<number[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const faqData: FAQItem[] = [
    // Getting Started
    {
      question: "How do I create an account?",
      answer: "Creating an account is simple! Click the 'Sign Up' button in the top navigation, fill in your details, and verify your email address. You'll receive a confirmation email with a verification link.",
      category: "getting-started"
    },
    {
      question: "How do I purchase a course?",
      answer: "Browse our course catalog, select the course you want, and click 'Buy Now'. You'll be redirected to our secure Stripe checkout. After successful payment, the course will be immediately available in your dashboard.",
      category: "getting-started"
    },
    {
      question: "Can I access courses on mobile devices?",
      answer: "Yes! Our platform is fully responsive and works on all devices including smartphones, tablets, and desktop computers. You can watch videos, track progress, and access all features from any device.",
      category: "getting-started"
    },
    // Course Access
    {
      question: "How long do I have access to purchased courses?",
      answer: "You retain ongoing access to purchased courses as long as your account remains in good standing. You can rewatch lessons anytime from your dashboard.",
      category: "course-access"
    },
    {
      question: "Can I download course videos?",
      answer: "Currently, we don't support video downloads to ensure content protection. However, you can access all videos online from any device with an internet connection.",
      category: "course-access"
    },
    {
      question: "What happens if I lose internet connection while watching?",
      answer: "Our video player automatically saves your progress. When you reconnect, you can resume from where you left off. Your progress is synced across all devices.",
      category: "course-access"
    },
    // Technical Issues
    {
      question: "Videos are not loading properly. What should I do?",
      answer: "Try refreshing the page, clearing your browser cache, or switching to a different browser. If the issue persists, check your internet connection and contact our support team.",
      category: "technical"
    },
    {
      question: "I can't log into my account. What should I do?",
      answer: "First, try resetting your password using the 'Forgot Password' link. If that doesn't work, check if your email is verified. Contact support if you continue having issues.",
      category: "technical"
    },
    {
      question: "The video player is not working correctly.",
      answer: "Try updating your browser to the latest version, disable browser extensions that might interfere, or switch to a different browser. Most issues are resolved by using Chrome, Firefox, or Safari.",
      category: "technical"
    },
    // Certificates
    {
      question: "How do I get a certificate of completion?",
      answer: "Certificates are automatically generated when you fully complete a course (all lessons completed and required watch time reached). You can download certificates from the 'My Certificates' section in your dashboard.",
      category: "certificates"
    },
    {
      question: "Can I share my certificates on social media?",
      answer: "Absolutely! Your certificates can be shared on LinkedIn, social media, or included in your resume. They include a verification link for employers to confirm authenticity.",
      category: "certificates"
    },
    // Payments & Refunds
    {
      question: "What payment methods do you accept?",
      answer: "We accept major credit and debit cards (Visa, MasterCard, American Express). All payments are processed securely through Stripe.",
      category: "payments"
    },
    {
      question: "Are all purchases final?",
      answer: "Yes, all purchases are final. We encourage you to review course details and preview content before making a purchase to ensure it meets your needs.",
      category: "payments"
    },
    {
      question: "Is my payment information secure?",
      answer: "Yes, we use industry-standard SSL encryption and Stripe for payment processing. We never store your credit card information on our servers.",
      category: "payments"
    }
  ];

  const categories = [
    { id: 'all', name: 'All Questions', icon: BookOpen },
    { id: 'getting-started', name: 'Getting Started', icon: Users },
    { id: 'course-access', name: 'Course Access', icon: Zap },
    { id: 'technical', name: 'Technical Issues', icon: HelpCircle },
    { id: 'certificates', name: 'Certificates', icon: Star },
    { id: 'payments', name: 'Payments & Refunds', icon: CreditCard }
  ];

  const filteredFaqs = selectedCategory === 'all' 
    ? faqData 
    : faqData.filter(faq => faq.category === selectedCategory);

  const toggleFaq = (index: number) => {
    setOpenFaqs(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Help Center</h1>
            <p className="text-xl text-red-100 max-w-3xl mx-auto">
              Find answers to common questions, get technical support, and learn how to make the most of your {config.APP_NAME} experience.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center mb-4">
              <Mail className="h-8 w-8 text-red-500 mr-3" />
              <h3 className="text-lg font-semibold">Email Support</h3>
            </div>
            <p className="text-gray-600 mb-4">Get detailed help from our support team</p>
            <a 
              href={`mailto:${config.SUPPORT_EMAIL}`}
              className="text-red-600 hover:text-red-700 font-medium"
            >
              {config.SUPPORT_EMAIL}
            </a>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center mb-4">
              <MessageCircle className="h-8 w-8 text-red-500 mr-3" />
              <h3 className="text-lg font-semibold">Live Chat</h3>
            </div>
            <p className="text-gray-600 mb-4">Chat with our support team in real-time</p>
            <a
              href={`https://wa.me/${config.SUPPORT_WHATSAPP.replace(/[^\d]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-600 hover:text-red-700 font-medium"
            >
              WhatsApp Chat
            </a>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center mb-4">
              <Clock className="h-8 w-8 text-red-500 mr-3" />
              <h3 className="text-lg font-semibold">Response Time</h3>
            </div>
            <p className="text-gray-600 mb-4">We typically respond within 24 hours</p>
            <span className="text-green-600 font-medium">Business hours support</span>
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                    selectedCategory === category.id
                      ? 'bg-red-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="space-y-4">
          {filteredFaqs.map((faq, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <button
                onClick={() => toggleFaq(index)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
              >
                <h3 className="text-lg font-medium text-gray-900">{faq.question}</h3>
                {openFaqs.includes(index) ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>
              {openFaqs.includes(index) && (
                <div className="px-6 pb-4">
                  <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div className="mt-16 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Still Need Help?</h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Can't find what you're looking for? Our support team is here to help you with any questions or issues you might have.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/contact"
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
              >
                Contact Support
              </Link>
              <a
                href={`mailto:${config.SUPPORT_EMAIL}`}
                className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
              >
                Send Email
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenterPage;
