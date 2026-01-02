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
      question: t('help_center_faq.create_account_question'),
      answer: t('help_center_faq.create_account_answer'),
      category: "getting-started"
    },
    {
      question: t('help_center_faq.purchase_course_question'),
      answer: t('help_center_faq.purchase_course_answer'),
      category: "getting-started"
    },
    {
      question: t('help_center_faq.mobile_access_question'),
      answer: t('help_center_faq.mobile_access_answer'),
      category: "getting-started"
    },
    // Course Access
    {
      question: t('help_center_faq.course_access_duration_question'),
      answer: t('help_center_faq.course_access_duration_answer'),
      category: "course-access"
    },
    {
      question: t('help_center_faq.download_videos_question'),
      answer: t('help_center_faq.download_videos_answer'),
      category: "course-access"
    },
    {
      question: t('help_center_faq.internet_connection_question'),
      answer: t('help_center_faq.internet_connection_answer'),
      category: "course-access"
    },
    // Technical Issues
    {
      question: t('help_center_faq.videos_not_loading_question'),
      answer: t('help_center_faq.videos_not_loading_answer'),
      category: "technical"
    },
    {
      question: t('help_center_faq.login_issues_question'),
      answer: t('help_center_faq.login_issues_answer'),
      category: "technical"
    },
    {
      question: t('help_center_faq.video_player_issues_question'),
      answer: t('help_center_faq.video_player_issues_answer'),
      category: "technical"
    },
    // Certificates
    {
      question: t('help_center_faq.certificate_question'),
      answer: t('help_center_faq.certificate_answer'),
      category: "certificates"
    },
    {
      question: t('help_center_faq.share_certificate_question'),
      answer: t('help_center_faq.share_certificate_answer'),
      category: "certificates"
    },
    // Payments & Refunds
    {
      question: t('help_center_faq.payment_methods_question'),
      answer: t('help_center_faq.payment_methods_answer'),
      category: "payments"
    },
    {
      question: t('help_center_faq.purchases_final_question'),
      answer: t('help_center_faq.purchases_final_answer'),
      category: "payments"
    },
    {
      question: t('help_center_faq.payment_security_question'),
      answer: t('help_center_faq.payment_security_answer'),
      category: "payments"
    }
  ];

  const categories = [
    { id: 'all', name: t('help.popular_topics'), icon: BookOpen },
    { id: 'getting-started', name: t('help.getting_started'), icon: Users },
    { id: 'course-access', name: t('help.course_access'), icon: Zap },
    { id: 'technical', name: t('help.technical_support'), icon: HelpCircle },
    { id: 'certificates', name: t('help.certificates'), icon: Star },
    { id: 'payments', name: t('help.payment_help'), icon: CreditCard }
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4 pb-2 sm:pb-3 md:pb-4">{t('help.page_title')}</h1>
            <p className="text-xl text-cyan-100 max-w-3xl mx-auto">
              {t('help.hero_subtitle', { appName: config.APP_NAME })}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center mb-4">
              <Mail className="h-8 w-8 text-cyan-600 dark:text-cyan-400 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('help.contact_support')}</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{t('help.get_help')}</p>
            <a 
              href={`mailto:${config.SUPPORT_EMAIL}`}
              className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 font-medium"
            >
              {config.SUPPORT_EMAIL}
            </a>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center mb-4">
              <MessageCircle className="h-8 w-8 text-cyan-600 dark:text-cyan-400 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('help.live_chat')}</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{t('help.live_chat_desc')}</p>
            <a
              href={`https://wa.me/${config.SUPPORT_WHATSAPP.replace(/[^\d]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 font-medium"
            >
              {t('help.whatsapp_chat')}
            </a>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center mb-4">
              <Clock className="h-8 w-8 text-cyan-600 dark:text-cyan-400 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('contact.working_hours')}</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{t('contact.monday_friday')}</p>
            <span className="text-green-600 dark:text-green-400 font-medium">{t('contact.stats.support_24_7')}</span>
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('help.frequently_asked')}</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                    selectedCategory === category.id
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700'
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
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => toggleFaq(index)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">{faq.question}</h3>
                {openFaqs.includes(index) ? (
                  <ChevronUp className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                )}
              </button>
              {openFaqs.includes(index) && (
                <div className="px-6 pb-4">
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact Section */}
        <div className="mt-16 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 border border-gray-300 dark:border-gray-700">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('help.get_help')}</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
              {t('help.contact_support')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/contact"
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-cyan-500/20"
              >
                {t('help.contact_support')}
              </Link>
              <a
                href={`mailto:${config.SUPPORT_EMAIL}`}
                className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
              >
                {t('contact.send_message')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenterPage;
