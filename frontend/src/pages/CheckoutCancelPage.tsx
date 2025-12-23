import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { XCircle, ArrowLeft, ShoppingCart, RefreshCw } from 'lucide-react';

const CheckoutCancelPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId');

  console.log('❌ Payment cancelled');
  console.log(`   - Course ID: ${courseId}`);

  return (
    <div className="min-h-screen bg-gray-900 pt-24 pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
          {/* Cancel Header */}
          <div className="bg-gradient-to-r from-orange-600 to-red-600 px-8 py-12 text-center">
            <div className="bg-white bg-opacity-20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="h-16 w-16 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4 pb-2 sm:pb-3 md:pb-4">
              {t('checkout_cancel.payment_cancelled')}
            </h1>
            <p className="text-xl text-red-100">
              {t('checkout_cancel.no_worries_try_again')}
            </p>
          </div>

          <div className="p-8">
            {/* Cancellation Details */}
            <div className="bg-gray-900 rounded-lg p-6 mb-8 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">{t('checkout_cancel.what_happened')}</h2>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="bg-red-500/20 p-2 rounded-full mt-1">
                    <XCircle className="h-4 w-4 text-red-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{t('checkout_cancel.payment_was_cancelled')}</h4>
                    <p className="text-gray-300 text-sm">
                      {t('checkout_cancel.you_cancelled_payment')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-500/20 p-2 rounded-full mt-1">
                    <ShoppingCart className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{t('checkout_cancel.no_charges_were_made')}</h4>
                    <p className="text-gray-300 text-sm">
                      {t('checkout_cancel.payment_method_not_charged')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-green-500/20 p-2 rounded-full mt-1">
                    <RefreshCw className="h-4 w-4 text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{t('checkout_cancel.you_can_try_again')}</h4>
                    <p className="text-gray-300 text-sm">
                      {t('checkout_cancel.click_try_again_button')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-6 mb-8">
              <h3 className="text-2xl font-bold text-white">{t('checkout_cancel.what_would_you_like_to_do')}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                  <div className="flex items-center mb-4">
                    <div className="bg-cyan-500/20 p-3 rounded-full mr-4">
                      <RefreshCw className="h-6 w-6 text-cyan-400" />
                    </div>
                    <h4 className="text-lg font-semibold text-white">{t('checkout_cancel.try_again')}</h4>
                  </div>
                  <p className="text-gray-300 mb-4">
                    {t('checkout_cancel.complete_purchase_access')}
                  </p>
                  <Link
                    to={`/course/${courseId}`}
                    className="inline-flex items-center space-x-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-cyan-500/20"
                  >
                    <span>{t('checkout_cancel.try_again')}</span>
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </div>

                <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                  <div className="flex items-center mb-4">
                    <div className="bg-blue-500/20 p-3 rounded-full mr-4">
                      <ShoppingCart className="h-6 w-6 text-blue-400" />
                    </div>
                    <h4 className="text-lg font-semibold text-white">{t('checkout_cancel.browse_courses')}</h4>
                  </div>
                  <p className="text-gray-300 mb-4">
                    {t('checkout_cancel.explore_full_catalog')}
                  </p>
                  <Link
                    to="/courses"
                    className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-blue-500/20"
                  >
                    <span>{t('checkout_cancel.browse_courses')}</span>
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Common Issues */}
            <div className="bg-yellow-500/20 rounded-lg p-6 mb-8 border border-yellow-500/30">
              <h4 className="text-lg font-semibold text-white mb-4">{t('checkout_cancel.having_trouble')}</h4>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="bg-yellow-500/30 p-2 rounded-full mt-1">
                    <span className="text-yellow-300 text-sm font-bold">!</span>
                  </div>
                  <div>
                    <h5 className="font-semibold text-white">{t('checkout_cancel.payment_method_issues')}</h5>
                    <p className="text-gray-300 text-sm">
                      {t('checkout_cancel.make_sure_card_details')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-yellow-500/30 p-2 rounded-full mt-1">
                    <span className="text-yellow-300 text-sm font-bold">!</span>
                  </div>
                  <div>
                    <h5 className="font-semibold text-white">{t('checkout_cancel.browser_problems')}</h5>
                    <p className="text-gray-300 text-sm">
                      {t('checkout_cancel.try_refreshing_page')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-yellow-500/30 p-2 rounded-full mt-1">
                    <span className="text-yellow-300 text-sm font-bold">!</span>
                  </div>
                  <div>
                    <h5 className="font-semibold text-white">{t('checkout_cancel.still_having_issues')}</h5>
                    <p className="text-gray-300 text-sm">
                      {t('checkout_cancel.support_team_help_purchase')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Support */}
            <div className="text-center bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-6 border border-gray-700">
              <h4 className="text-lg font-semibold text-white mb-2">{t('checkout_cancel.need_help')}</h4>
              <p className="text-gray-300 mb-4">
                {t('checkout_cancel.support_team_help_successfully')}
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Link
                  to="/contact"
                  className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors duration-200 border border-gray-600"
                >
                  {t('checkout_cancel.contact_support')}
                </Link>
                <Link
                  to="/help"
                  className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors duration-200 border border-gray-600"
                >
                  {t('checkout_cancel.help_center')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutCancelPage;