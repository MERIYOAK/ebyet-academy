import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Phone, MapPin, Clock, Send, MessageSquare, HelpCircle, Zap, CheckCircle2 } from 'lucide-react';
import { config } from '../config/environment';

const ContactPage = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    
    try {
      const response = await fetch(`${config.API_BASE_URL}/api/contact/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setSubmitStatus('success');
        setFormData({ name: '', email: '', subject: '', message: '' });
        setTimeout(() => setSubmitStatus('idle'), 5000);
      } else {
        setSubmitStatus('error');
        setTimeout(() => setSubmitStatus('idle'), 5000);
      }
    } catch (error) {
      console.error('Contact form submission error:', error);
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const contactInfo = [
    {
      icon: Mail,
      title: t('contact.contact_details.email.title'),
      details: [config.SUPPORT_EMAIL],
      gradient: 'from-cyan-500 to-blue-600',
      action: `mailto:${config.SUPPORT_EMAIL}`
    },
    {
      icon: Phone,
      title: t('contact.contact_details.phone.title'),
      details: [config.SUPPORT_PHONE, config.BUSINESS_HOURS_PHONE],
      gradient: 'from-blue-500 to-purple-600',
      action: `tel:${config.SUPPORT_PHONE.replace(/\s/g, '')}`
    },
    {
      icon: MapPin,
      title: t('contact.contact_details.office.title'),
      details: [config.SUPPORT_ADDRESS.split(', ')[0], config.SUPPORT_ADDRESS.split(', ').slice(1).join(', ')],
      gradient: 'from-purple-500 to-pink-600',
      action: null
    },
    {
      icon: Clock,
      title: t('contact.contact_details.business_hours.title'),
      details: [
        config.BUSINESS_HOURS_WEEKDAY,
        config.BUSINESS_HOURS_SATURDAY,
        config.BUSINESS_HOURS_SUNDAY
      ],
      gradient: 'from-pink-500 to-cyan-600',
      action: null
    }
  ];

  const quickActions = [
    {
      icon: MessageSquare,
      title: t('contact.quick_actions.support', 'Support'),
      description: t('contact.quick_actions.support_desc', 'Get help with your account or courses'),
      gradient: 'from-cyan-500 to-blue-500'
    },
    {
      icon: HelpCircle,
      title: t('contact.quick_actions.faq', 'FAQ'),
      description: t('contact.quick_actions.faq_desc', 'Find answers to common questions'),
      gradient: 'from-blue-500 to-purple-500',
      link: '/help'
    },
    {
      icon: Zap,
      title: t('contact.quick_actions.urgent', 'Urgent'),
      description: t('contact.quick_actions.urgent_desc', 'Need immediate assistance?'),
      gradient: 'from-purple-500 to-pink-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      {/* Hero Section */}
      <section className="relative pt-24 sm:pt-28 md:pt-32 pb-16 sm:pb-20 md:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-blue-900/20 to-purple-900/20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(6,182,212,0.1),transparent_50%)]"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className={`text-center transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'}`}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 sm:mb-8 pb-2 sm:pb-3 md:pb-4 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent leading-tight">
              {t('contact.page_title')}
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              {t('contact.get_in_touch')}
            </p>
          </div>
        </div>
      </section>

      {/* Quick Actions Section */}
      <section className="py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {quickActions.map((action, index) => (
              <a
                key={index}
                href={action.link || '#'}
                className={`group bg-white dark:bg-gradient-to-br dark:from-gray-800/80 dark:to-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50 hover:border-cyan-500/50 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-500/20 ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'}`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className={`bg-gradient-to-br ${action.gradient} p-3 rounded-xl w-12 h-12 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <action.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{action.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{action.description}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Main Contact Section */}
      <section className="py-12 sm:py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
            {/* Contact Info */}
            <div className={`space-y-6 transition-all duration-700 ease-out ${isVisible ? 'opacity-100 transform translate-x-0' : 'opacity-0 transform -translate-x-8'}`}>
              <div className="bg-white dark:bg-gradient-to-br dark:from-gray-800/80 dark:to-gray-900/80 backdrop-blur-sm rounded-3xl p-8 sm:p-10 border border-gray-200 dark:border-gray-700/50 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-12 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-full"></div>
                  <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    {t('contact.contact_info')}
                  </h2>
                </div>
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">
                  {t('contact.contact_description')}
                </p>

                <div className="space-y-4">
                  {contactInfo.map((info, index) => (
                    <a
                      key={index}
                      href={info.action || undefined}
                      onClick={!info.action ? (e) => e.preventDefault() : undefined}
                      className={`group block bg-gray-100 dark:bg-gray-900/50 rounded-2xl p-5 border border-gray-200 dark:border-gray-700/50 hover:border-cyan-500/50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/10 ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'}`}
                      style={{ transitionDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`bg-gradient-to-br ${info.gradient} p-3 rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-lg flex-shrink-0`}>
                          <info.icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors duration-300">
                            {info.title}
                          </h3>
                          {info.details.map((detail, detailIndex) => (
                            <p key={detailIndex} className="text-sm sm:text-base text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">
                              {detail}
                            </p>
                          ))}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className={`transition-all duration-700 ease-out ${isVisible ? 'opacity-100 transform translate-x-0' : 'opacity-0 transform translate-x-8'}`}>
              <div className="bg-white dark:bg-gradient-to-br dark:from-gray-800/80 dark:to-gray-900/80 backdrop-blur-sm rounded-3xl p-8 sm:p-10 border border-gray-200 dark:border-gray-700/50 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-12 bg-gradient-to-b from-blue-400 to-purple-500 rounded-full"></div>
                  <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent pb-2 sm:pb-3">
                {t('contact.contact_form')}
              </h2>
                </div>
                
                {submitStatus === 'success' && (
                  <div className="mb-6 p-4 bg-green-50 dark:bg-green-500/20 border border-green-200 dark:border-green-500/30 rounded-xl flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <p className="text-sm text-green-700 dark:text-green-300">{t('contact.success_message', 'Message sent successfully! We\'ll get back to you soon.')}</p>
                  </div>
                )}

                {submitStatus === 'error' && (
                  <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500/30 rounded-xl">
                    <p className="text-sm text-red-700 dark:text-red-300">{t('contact.error_message', 'Failed to send message. Please try again or contact us directly.')}</p>
                  </div>
                )}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="group">
                      <label htmlFor="name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors duration-300">
                      {t('contact.name')}
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/80 border-2 border-gray-300 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500"
                      placeholder={t('contact.form_placeholders.name')}
                    />
                  </div>
                  
                  <div className="group">
                      <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors duration-300">
                      {t('contact.email')}
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/80 border-2 border-gray-300 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500"
                      placeholder={t('contact.form_placeholders.email')}
                    />
                  </div>
                </div>
                
                <div className="group">
                    <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors duration-300">
                    {t('contact.subject')}
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/80 border-2 border-gray-300 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500"
                    placeholder={t('contact.form_placeholders.subject')}
                  />
                </div>
                
                <div className="group">
                    <label htmlFor="message" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors duration-300">
                    {t('contact.message')}
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/80 border-2 border-gray-300 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 resize-none"
                    placeholder={t('contact.form_placeholders.message')}
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                    className={`w-full group relative overflow-hidden bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl hover:shadow-cyan-500/40 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${isSubmitting ? 'animate-pulse' : ''}`}
                >
                    <Send className={`h-5 w-5 transition-transform duration-300 ${isSubmitting ? 'animate-spin' : 'group-hover:translate-x-1'}`} />
                    <span>{isSubmitting ? t('common.loading') : t('contact.send_message')}</span>
                </button>
              </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage; 