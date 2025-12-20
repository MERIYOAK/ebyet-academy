import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Award, Users, Target, Heart, TrendingUp, BookOpen, Shield, Zap, BarChart3, DollarSign, Globe, CheckCircle2 } from 'lucide-react';

const AboutPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const stats = [
    { icon: Users, value: '100+', label: t('about.stats.students_enrolled'), gradient: 'from-cyan-500 to-blue-500' },
    { icon: Award, value: '10+', label: t('about.stats.expert_instructors'), gradient: 'from-blue-500 to-purple-500' },
    { icon: Target, value: '95%', label: t('about.stats.success_rate'), gradient: 'from-purple-500 to-pink-500' },
    { icon: Heart, value: '4.9/5', label: t('about.stats.student_rating'), gradient: 'from-pink-500 to-cyan-500' }
  ];

  const features = [
    { icon: TrendingUp, title: t('about.features.market_analysis', 'Market Analysis'), description: t('about.features.market_analysis_desc', 'Learn to analyze market trends and make informed trading decisions') },
    { icon: BookOpen, title: t('about.features.comprehensive_courses', 'Comprehensive Courses'), description: t('about.features.comprehensive_courses_desc', 'From beginner basics to advanced trading strategies') },
    { icon: Shield, title: t('about.features.risk_management', 'Risk Management'), description: t('about.features.risk_management_desc', 'Master portfolio protection and risk mitigation techniques') },
    { icon: Zap, title: t('about.features.real_time', 'Real-Time Learning'), description: t('about.features.real_time_desc', 'Access live market insights and practical trading scenarios') },
    { icon: BarChart3, title: t('about.features.portfolio', 'Portfolio Building'), description: t('about.features.portfolio_desc', 'Build and manage profitable investment portfolios') },
    { icon: DollarSign, title: t('about.features.investment', 'Investment Strategies'), description: t('about.features.investment_desc', 'Learn proven investment strategies from industry experts') }
  ];

  const benefits = [
    t('about.why_choose_points.expert_courses'),
    t('about.why_choose_points.up_to_date'),
    t('about.why_choose_points.practical_content'),
    t('about.why_choose_points.ongoing_support')
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Hero Section */}
      <section className="relative pt-24 sm:pt-28 md:pt-32 pb-16 sm:pb-20 md:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-blue-900/20 to-purple-900/20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(6,182,212,0.1),transparent_50%)]"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className={`text-center transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full mb-6">
              <Globe className="h-4 w-4 text-cyan-400" />
              <span className="text-sm text-cyan-300 font-medium">{t('about.badge', 'Empowering Traders Worldwide')}</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 sm:mb-8 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent leading-tight">
              {t('about.page_title')}
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed mb-8">
              {t('about.mission_text')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => navigate('/courses')}
                className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40 hover:scale-105 transform"
              >
                {t('about.explore_courses', 'Explore Courses')}
              </button>
              <button
                onClick={() => navigate('/contact')}
                className="px-6 py-3 bg-gray-800/50 border border-gray-700 hover:bg-gray-800 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 transform"
              >
                {t('about.contact_us', 'Contact Us')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 sm:py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className={`group transition-all duration-700 ease-out ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'}`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-gray-700/50 hover:border-cyan-500/50 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-500/20 h-full">
                  <div className={`bg-gradient-to-br ${stat.gradient} p-4 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <stat.icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-bold text-white mb-2 text-center bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-sm sm:text-base text-gray-400 font-medium text-center leading-tight">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Do Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-b from-gray-900 to-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-12 sm:mb-16 transition-all duration-700 ease-out ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'}`}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
              {t('about.what_we_do', 'What We Offer')}
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              {t('about.what_we_do_desc', 'Comprehensive trading and investing education designed for success')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`group bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-gray-700/50 hover:border-cyan-500/50 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-500/20 ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'}`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 p-3 rounded-xl w-14 h-14 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 border border-cyan-500/30">
                  <feature.icon className="h-7 w-7 text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Why Choose Section */}
      <section className="py-12 sm:py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            {/* Mission */}
            <div className={`transition-all duration-700 ease-out ${isVisible ? 'opacity-100 transform translate-x-0' : 'opacity-0 transform -translate-x-8'}`}>
              <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-3xl p-8 sm:p-10 border border-gray-700/50 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-12 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-full"></div>
                  <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    {t('about.mission_title')}
                  </h2>
                </div>
                <p className="text-lg text-gray-300 leading-relaxed">
                  {t('about.mission_text')}
                </p>
              </div>
            </div>

            {/* Why Choose Us */}
            <div className={`transition-all duration-700 ease-out ${isVisible ? 'opacity-100 transform translate-x-0' : 'opacity-0 transform translate-x-8'}`}>
              <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-3xl p-8 sm:p-10 border border-gray-700/50 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-12 bg-gradient-to-b from-blue-400 to-purple-500 rounded-full"></div>
                  <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    {t('about.why_choose_title')}
                  </h2>
                </div>
                <ul className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start group">
                      <div className="mt-1 mr-4 flex-shrink-0">
                        <CheckCircle2 className="h-6 w-6 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <span className="text-base sm:text-lg text-gray-300 group-hover:text-white transition-colors duration-300 leading-relaxed">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-gradient-to-br from-gray-800/50 via-gray-900/50 to-gray-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-3xl p-8 sm:p-12 border border-gray-700/50 shadow-2xl transition-all duration-700 ease-out ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'}`}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
              {t('about.cta_title', 'Ready to Start Your Trading Journey?')}
            </h2>
            <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
              {t('about.cta_desc', 'Join thousands of successful traders and investors. Start learning today and transform your financial future.')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/courses')}
                className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40 hover:scale-105 transform text-lg"
              >
                {t('about.browse_courses', 'Browse Courses')}
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-8 py-4 bg-gray-800/50 border-2 border-gray-700 hover:border-cyan-500/50 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 transform text-lg"
              >
                {t('about.get_started', 'Get Started Free')}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage; 