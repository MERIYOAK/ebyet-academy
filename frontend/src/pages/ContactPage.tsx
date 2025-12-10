import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Phone, MapPin, Clock, Send, MessageCircle, Users, Star } from 'lucide-react';
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

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
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
        // Success - show success message
        alert(t('contact.success_message'));
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        // Error - show error message
        alert(result.message || 'Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Contact form submission error:', error);
      alert('Failed to send message. Please check your connection and try again.');
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
      details: [config.SUPPORT_EMAIL, config.INFO_EMAIL],
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: Phone,
      title: t('contact.contact_details.phone.title'),
      details: [config.SUPPORT_PHONE, config.BUSINESS_HOURS_PHONE],
      color: 'from-green-500 to-green-600'
    },
    {
      icon: MapPin,
      title: t('contact.contact_details.office.title'),
      details: [config.SUPPORT_ADDRESS.split(', ')[0], config.SUPPORT_ADDRESS.split(', ').slice(1).join(', ')],
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: Clock,
      title: t('contact.contact_details.business_hours.title'),
      details: [
        config.BUSINESS_HOURS_WEEKDAY,
        config.BUSINESS_HOURS_SATURDAY,
        config.BUSINESS_HOURS_SUNDAY
      ],
      color: 'from-orange-500 to-orange-600'
    }
  ];

  const faqs = [
    {
      question: t('contact.faq.questions.get_started.question'),
      answer: t('contact.faq.questions.get_started.answer')
    },
    {
      question: t('contact.faq.questions.final_purchases.question'),
      answer: t('contact.faq.questions.final_purchases.answer')
    },
    {
      question: t('contact.faq.questions.mobile.question'),
      answer: t('contact.faq.questions.mobile.answer')
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-red-500/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-blue-500/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-400/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
      </div>

      {/* Fixed Hero Background */}
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&dpr=2')`
          }}
        />
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Hero Section */}
      <section className="relative text-white pt-32 pb-20 overflow-hidden z-10">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'}`}>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-red-100 to-white bg-clip-text text-transparent animate-pulse">
              {t('contact.page_title')}
            </h1>
            <p className="text-xl md:text-2xl text-red-100 max-w-4xl mx-auto leading-relaxed">
              {t('contact.get_in_touch')}
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 relative bg-white/95 backdrop-blur-sm z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Contact Form */}
            <div className={`bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20 transition-all duration-700 ease-out h-fit ${isVisible ? 'opacity-100 transform translate-x-0' : 'opacity-0 transform -translate-x-8'}`}>
              <h2 className="text-3xl font-bold text-gray-800 mb-6 bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                {t('contact.contact_form')}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group">
                    <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-red-600 transition-colors duration-300">
                      {t('contact.name')}
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-4 bg-white/50 backdrop-blur-sm border border-gray-300/50 rounded-xl focus:ring-4 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300 transform focus:scale-105 shadow-lg hover:shadow-xl"
                      placeholder={t('contact.form_placeholders.name')}
                    />
                  </div>
                  
                  <div className="group">
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-red-600 transition-colors duration-300">
                      {t('contact.email')}
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-4 bg-white/50 backdrop-blur-sm border border-gray-300/50 rounded-xl focus:ring-4 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300 transform focus:scale-105 shadow-lg hover:shadow-xl"
                      placeholder={t('contact.form_placeholders.email')}
                    />
                  </div>
                </div>
                
                <div className="group">
                  <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-red-600 transition-colors duration-300">
                    {t('contact.subject')}
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-4 bg-white/50 backdrop-blur-sm border border-gray-300/50 rounded-xl focus:ring-4 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300 transform focus:scale-105 shadow-lg hover:shadow-xl"
                    placeholder={t('contact.form_placeholders.subject')}
                  />
                </div>
                
                <div className="group">
                  <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-red-600 transition-colors duration-300">
                    {t('contact.message')}
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full px-4 py-4 bg-white/50 backdrop-blur-sm border border-gray-300/50 rounded-xl focus:ring-4 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300 transform focus:scale-105 shadow-lg hover:shadow-xl resize-none"
                    placeholder={t('contact.form_placeholders.message')}
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full group relative overflow-hidden bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-lg hover:shadow-2xl flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed ${isSubmitting ? 'animate-pulse' : ''}`}
                >
                  {/* 3D Button Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-red-800 to-red-900 opacity-0 group-active:opacity-100 transition-opacity duration-150"></div>
                  
                  <span className="relative flex items-center space-x-2">
                    <Send className={`h-5 w-5 transition-transform duration-300 ${isSubmitting ? 'animate-spin' : 'group-hover:translate-x-1'}`} />
                    <span>{isSubmitting ? t('common.loading') : t('contact.send_message')}</span>
                  </span>
                </button>
              </form>
            </div>

            {/* Contact Info */}
            <div className={`space-y-8 transition-all duration-700 ease-out delay-200 ${isVisible ? 'opacity-100 transform translate-x-0' : 'opacity-0 transform translate-x-8'}`}>
              <div>
                <h2 className="text-3xl font-bold text-gray-800 mb-6 bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                  {t('contact.contact_info')}
                </h2>
                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                  {t('contact.contact_description')}
                </p>
              </div>

              <div className="space-y-6">
                {contactInfo.map((info, index) => (
                  <div 
                    key={index}
                    className={`group bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 border border-white/20 ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'}`}
                    style={{ transitionDelay: `${index * 100}ms` }}
                  >
                <div className="flex items-start space-x-4">
                      <div className={`bg-gradient-to-br ${info.color} p-4 rounded-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg`}>
                        <info.icon className="h-6 w-6 text-white" />
                  </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-red-600 transition-colors duration-300">
                          {info.title}
                    </h3>
                        {info.details.map((detail, detailIndex) => (
                          <p key={detailIndex} className="text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
                            {detail}
                          </p>
                        ))}
                  </div>
                </div>
                  </div>
                ))}
              </div>

              {/* FAQ Section */}
              <div className={`bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20 transition-all duration-700 ease-out delay-400 ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'}`}>
                <h3 className="text-2xl font-bold text-gray-800 mb-6 bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                  {t('contact.faq.title')}
                </h3>
                <div className="space-y-6">
                  {faqs.map((faq, index) => (
                    <div 
                      key={index}
                      className="group p-4 rounded-xl hover:bg-red-50/50 transition-all duration-300 transform hover:scale-105"
                    >
                      <h4 className="font-bold text-gray-800 mb-2 group-hover:text-red-600 transition-colors duration-300 flex items-center">
                        <Star className="h-4 w-4 mr-2 text-red-500 group-hover:scale-110 transition-transform duration-300" />
                        {faq.question}
                    </h4>
                      <p className="text-gray-600 group-hover:text-gray-700 transition-colors duration-300 pl-6">
                        {faq.answer}
                    </p>
                  </div>
                  ))}
                </div>
              </div>

              {/* Stats Section */}
              <div className={`bg-gradient-to-br from-red-500 to-red-700 rounded-3xl p-8 text-white shadow-2xl hover:shadow-red-500/25 transition-all duration-300 transform hover:-translate-y-2 ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'}`}>
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-4">{t('contact.why_choose_title')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold mb-1">{t('contact.stats.support_24_7')}</div>
                      <div className="text-red-100 text-sm">{t('contact.stats.support')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold mb-1">{t('contact.stats.secure_checkout')}</div>
                      <div className="text-red-100 text-sm">{t('contact.stats.guarantee')}</div>
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage; 