import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const COOKIE_CONSENT_KEY = 'levelup-cookie-consent';
const COOKIE_CONSENT_VALUE = 'accepted';
const COOKIE_DECLINED_VALUE = 'declined';

const CookieConsentWidget: React.FC = () => {
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        try {
            const hasConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
            if (hasConsent !== COOKIE_CONSENT_VALUE) {
                setShowBanner(true);
            }
        } catch {
            setShowBanner(true);
        }
    }, []);

    const handleAccept = () => {
        try {
            localStorage.setItem(COOKIE_CONSENT_KEY, COOKIE_CONSENT_VALUE);
        } catch {
            // no-op
        }
        setShowBanner(false);
    };

    const handleDecline = () => {
        try {
            localStorage.setItem(COOKIE_CONSENT_KEY, COOKIE_DECLINED_VALUE);
        } catch {
            // no-op
        }
        setShowBanner(false);
    };

    if (!showBanner) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50" role="region" aria-label="Cookie consent banner" aria-live="polite">
            <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-xl backdrop-blur-sm">
                <p className="text-sm text-gray-700">
                    We use cookies to improve your experience. By clicking Accept, you agree to our{' '}
                    <Link to="/cookie-policy" className="font-semibold text-purple-700 hover:underline">
                        Cookie Policy
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy-policy" className="font-semibold text-purple-700 hover:underline">
                        Privacy Policy
                    </Link>
                    .
                </p>
                <div className="mt-3 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={handleDecline}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        Decline
                    </button>
                    <button
                        type="button"
                        onClick={handleAccept}
                        className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                    >
                        Accept Cookies
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CookieConsentWidget;
