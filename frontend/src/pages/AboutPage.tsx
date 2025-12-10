import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Award, Users, Target, Heart, Sparkles, TrendingUp, Shield, Zap } from 'lucide-react';

const AboutPage = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const stats = [
    { icon: Users, value: '100+', label: t('about.stats.students_enrolled') },
    { icon: Award, value: '10+', label: t('about.stats.expert_instructors') },
    { icon: Target, value: '95%', label: t('about.stats.success_rate') },
    { icon: Heart, value: '4.9/5', label: t('about.stats.student_rating') }
  ];

  const teamMembers = [
    {
      name: t('about.team_members.sarah.name'),
      role: t('about.team_members.sarah.role'),
      image: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      description: t('about.team_members.sarah.description'),
      social: { linkedin: '#', twitter: '#', youtube: '#' }
    },
    {
      name: t('about.team_members.mike.name'),
      role: t('about.team_members.mike.role'),
      image: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      description: t('about.team_members.mike.description'),
      social: { linkedin: '#', twitter: '#', youtube: '#' }
    },
    {
      name: t('about.team_members.emily.name'),
      role: t('about.team_members.emily.role'),
      image: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      description: t('about.team_members.emily.description'),
      social: { linkedin: '#', twitter: '#', youtube: '#' }
    }
  ];

  const values = [
    {
      icon: Sparkles,
      title: t('about.values.innovation.title'),
      description: t('about.values.innovation.description')
    },
    {
      icon: Shield,
      title: t('about.values.trust.title'),
      description: t('about.values.trust.description')
    },
    {
      icon: TrendingUp,
      title: t('about.values.growth.title'),
      description: t('about.values.growth.description')
    },
    {
      icon: Zap,
      title: t('about.values.excellence.title'),
      description: t('about.values.excellence.description')
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-red-500/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-pink-500/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-red-400/10 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
      </div>

      {/* Fixed Hero Background */}
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&dpr=2')`
          }}
        />
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      {/* Hero Section */}
      <section className="relative text-white pt-24 xxs:pt-28 sm:pt-32 pb-12 xxs:pb-16 sm:pb-20 overflow-hidden z-10">
        <div className="relative max-w-7xl mx-auto px-2 xxs:px-3 sm:px-4 lg:px-8">
          <div className={`text-center transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'}`}>
            <h1 className="text-3xl xxs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 xxs:mb-6 bg-gradient-to-r from-white via-red-100 to-white bg-clip-text text-transparent animate-pulse">
              {t('about.page_title')}
            </h1>
            <p className="text-sm xxs:text-base sm:text-xl md:text-2xl text-red-100 max-w-4xl mx-auto leading-relaxed">
              {t('about.mission_text')}
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 xxs:py-16 sm:py-20 relative bg-white/95 backdrop-blur-sm z-20">
        <div className="max-w-7xl mx-auto px-2 xxs:px-3 sm:px-4 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 xxs:gap-3 sm:gap-4 md:gap-6 lg:gap-8 max-w-6xl mx-auto">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className={`text-center transition-all duration-700 ease-out delay-${index * 100} ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'}`}
              >
                <div className="group bg-white/80 backdrop-blur-sm rounded-lg xxs:rounded-xl sm:rounded-2xl p-3 xxs:p-4 sm:p-6 lg:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 border border-white/20 w-full h-full">
                  <div className="bg-gradient-to-br from-red-500 to-red-600 p-1.5 xxs:p-2 sm:p-3 lg:p-4 rounded-full w-10 h-10 xxs:w-12 xxs:h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 mx-auto mb-2 xxs:mb-3 sm:mb-4 lg:mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <stat.icon className="h-4 w-4 xxs:h-5 xxs:w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-white" />
                  </div>
                  <div className="text-xl xxs:text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-1 xxs:mb-2 lg:mb-3 bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-xs xxs:text-sm sm:text-base lg:text-lg text-gray-600 font-medium leading-tight">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-12 xxs:py-16 sm:py-20 bg-white/95 backdrop-blur-sm relative z-20">
        <div className="max-w-7xl mx-auto px-2 xxs:px-3 sm:px-4 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xxs:gap-8 sm:gap-12 items-center">
            <div className={`transition-all duration-700 ease-out delay-200 ${isVisible ? 'opacity-100 transform translate-x-0' : 'opacity-0 transform -translate-x-8'}`}>
              <h2 className="text-2xl xxs:text-3xl sm:text-4xl md:text-5xl font-bold mb-4 xxs:mb-6 bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent hover:scale-105 transition-transform duration-300">
                {t('about.mission_title')}
              </h2>
              <p className="text-sm xxs:text-base sm:text-lg text-gray-600 mb-4 xxs:mb-6 leading-relaxed">
                {t('about.mission_text')}
              </p>
              <p className="text-sm xxs:text-base sm:text-lg text-gray-600 leading-relaxed">
                {t('about.vision_text')}
              </p>
            </div>
            <div className={`bg-gradient-to-br from-red-500 via-red-600 to-red-700 rounded-2xl xxs:rounded-3xl p-4 xxs:p-6 sm:p-8 text-white shadow-2xl hover:shadow-red-500/25 transition-all duration-300 transform hover:-translate-y-2 ${isVisible ? 'opacity-100 transform translate-x-0' : 'opacity-0 transform translate-x-8'}`}>
              <h3 className="text-xl xxs:text-2xl sm:text-3xl font-bold mb-4 xxs:mb-6">{t('about.why_choose_title')}</h3>
                              <ul className="space-y-3 xxs:space-y-4">
                  <li className="flex items-start group">
                    <span className="w-2 h-2 xxs:w-3 xxs:h-3 bg-white rounded-full mr-2 xxs:mr-4 mt-1 xxs:mt-0 flex-shrink-0 group-hover:scale-125 transition-transform duration-300"></span>
                    <span className="text-sm xxs:text-base group-hover:translate-x-1 transition-transform duration-300">{t('about.why_choose_points.expert_courses')}</span>
                  </li>
                  <li className="flex items-start group">
                    <span className="w-2 h-2 xxs:w-3 xxs:h-3 bg-white rounded-full mr-2 xxs:mr-4 mt-1 xxs:mt-0 flex-shrink-0 group-hover:scale-125 transition-transform duration-300"></span>
                    <span className="text-sm xxs:text-base group-hover:translate-x-1 transition-transform duration-300">{t('about.why_choose_points.up_to_date')}</span>
                  </li>
                  <li className="flex items-start group">
                    <span className="w-2 h-2 xxs:w-3 xxs:h-3 bg-white rounded-full mr-2 xxs:mr-4 mt-1 xxs:mt-0 flex-shrink-0 group-hover:scale-125 transition-transform duration-300"></span>
                    <span className="text-sm xxs:text-base group-hover:translate-x-1 transition-transform duration-300">{t('about.why_choose_points.practical_content')}</span>
                  </li>
                  <li className="flex items-start group">
                    <span className="w-2 h-2 xxs:w-3 xxs:h-3 bg-white rounded-full mr-2 xxs:mr-4 mt-1 xxs:mt-0 flex-shrink-0 group-hover:scale-125 transition-transform duration-300"></span>
                    <span className="text-sm xxs:text-base group-hover:translate-x-1 transition-transform duration-300">{t('about.why_choose_points.ongoing_support')}</span>
                  </li>
                </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-12 xxs:py-16 sm:py-20 bg-white/95 backdrop-blur-sm relative z-20">
        <div className="max-w-7xl mx-auto px-2 xxs:px-3 sm:px-4 lg:px-8">
          <div className="text-center mb-8 xxs:mb-12 sm:mb-16">
            <h2 className="text-2xl xxs:text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 mb-4 xxs:mb-6 bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
              {t('about.values_title')}
            </h2>
            <p className="text-sm xxs:text-base sm:text-xl text-gray-600 max-w-3xl mx-auto">
              {t('about.values_subtitle', { brandName: t('brand.name') })}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 xxs:gap-6 sm:gap-8">
            {values.map((value, index) => (
              <div 
                key={index}
                className={`group bg-white/80 backdrop-blur-sm rounded-xl xxs:rounded-2xl p-4 xxs:p-6 sm:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-3 hover:scale-105 border border-white/20 ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'}`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="bg-gradient-to-br from-red-500 to-red-600 p-2 xxs:p-3 sm:p-4 rounded-full w-12 h-12 xxs:w-14 xxs:h-14 sm:w-16 sm:h-16 mx-auto mb-3 xxs:mb-4 sm:mb-6 flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                  <value.icon className="h-5 w-5 xxs:h-6 xxs:w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <h3 className="text-lg xxs:text-xl font-bold text-gray-800 mb-2 xxs:mb-4 text-center group-hover:text-red-600 transition-colors duration-300">
                  {value.title}
                </h3>
                <p className="text-sm xxs:text-base text-gray-600 text-center leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-12 xxs:py-16 sm:py-20 bg-white/95 backdrop-blur-sm relative z-20">
        <div className="max-w-7xl mx-auto px-2 xxs:px-3 sm:px-4 lg:px-8">
          <div className="text-center mb-8 xxs:mb-12 sm:mb-16">
            <h2 className="text-2xl xxs:text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 mb-4 xxs:mb-6 bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
              {t('about.team_title')}
            </h2>
            <p className="text-sm xxs:text-base sm:text-xl text-gray-600 max-w-3xl mx-auto">
              {t('about.team_description')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 xxs:gap-6 sm:gap-8">
            {teamMembers.map((member, index) => (
              <div 
                key={index}
                className={`group bg-white/80 backdrop-blur-sm rounded-2xl xxs:rounded-3xl p-4 xxs:p-6 sm:p-8 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-4 hover:scale-105 border border-white/20 perspective-1000 ${isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-8'}`}
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                <div className="relative mb-4 xxs:mb-6">
                  <div className="w-24 h-24 xxs:w-28 xxs:h-28 sm:w-32 sm:h-32 mx-auto relative group-hover:rotate-6 transition-transform duration-500">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full rounded-full object-cover shadow-lg group-hover:shadow-2xl transition-all duration-300"
                    />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                </div>
                
                <h3 className="text-lg xxs:text-xl sm:text-2xl font-bold text-gray-800 mb-2 text-center group-hover:text-red-600 transition-colors duration-300">
                  {member.name}
                </h3>
                <p className="text-red-600 font-semibold mb-3 xxs:mb-4 text-center text-sm xxs:text-base">{member.role}</p>
                <p className="text-sm xxs:text-base text-gray-600 text-center leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                  {member.description}
                </p>
                
                {/* Social Links */}
                <div className="flex justify-center space-x-3 xxs:space-x-4 mt-4 xxs:mt-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                  <a href={member.social.linkedin} className="w-8 h-8 xxs:w-10 xxs:h-10 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors duration-300">
                    <span className="text-white font-bold text-xs xxs:text-sm">in</span>
                  </a>
                  <a href={member.social.twitter} className="w-8 h-8 xxs:w-10 xxs:h-10 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors duration-300">
                    <span className="text-white font-bold text-xs xxs:text-sm">X</span>
                  </a>
                  <a href={member.social.youtube} className="w-8 h-8 xxs:w-10 xxs:h-10 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors duration-300">
                    <span className="text-white font-bold text-xs xxs:text-sm">▶</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage; 