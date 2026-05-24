import React, { useMemo, useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { useLanguage } from "./LanguageContext";

// Components
import { OnboardingScreen } from "./components/OnboardingScreen";
import { TalkView } from "./components/TalkView";
import { ConversationStartersView } from "./components/ConversationStartersView";
import { ProgressView } from "./components/ProgressView";
import { AdminView } from "./components/AdminView";
import { AccountModal } from "./components/AccountModal";
import { OnboardingModal, hasCompletedOnboarding } from "./components/OnboardingModal";
import { NavButton } from "./components/NavButton";
import { AppIcon, UserIcon, MicIcon, BookIcon, ChartIcon, AdminIcon } from "./components/icons";
import { PrivacyPolicy } from "./components/PrivacyPolicy";

// Utils
import { saveTranscription, endSession } from "./utils/sessionManager";

// --- Root Router ---
// Handles the /privacy route before any auth logic runs.
// No React Router dependency required — just checks window.location.pathname.
export default function SeniorFirstEnglishAssistant() {
  if (window.location.pathname === '/privacy') {
    return <PrivacyPolicy />;
  }
  return <AuthGate />;
}

// --- Auth Gate (extracted so hooks always run consistently) ---
function AuthGate() {
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUserId(session?.user?.id ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="min-h-screen grid place-items-center bg-gray-50 text-gray-900">{t('app.loading')}</div>;
  }

  if (!userId) {
    return <OnboardingScreen onStart={(id) => setUserId(id)} />;
  }

  return <MainApp initialUserId={userId} />;
}

// --- Main App Component (logged in state) ---
function MainApp({ initialUserId }) {
  const [tab, setTab] = useState("talk"); // "talk" | "starters" | "progress" | "admin"
  const [showOnboarding, setShowOnboarding] = useState(() => !hasCompletedOnboarding(initialUserId));
  const [contrast, setContrast] = useState(false);
  const [fontStep, setFontStep] = useState(1); // 0..2 for Small, Medium, Large
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const { t, language, setLanguage } = useLanguage();

  // Font size mappings for different elements based on fontStep
  const fontSizes = useMemo(() => {
    const sizes = [
      { base: "text-base", lg: "text-lg", xl: "text-xl", xxl: "text-2xl", xxxl: "text-3xl" },    // Small (0)
      { base: "text-lg", lg: "text-xl", xl: "text-2xl", xxl: "text-3xl", xxxl: "text-4xl" },     // Medium (1)
      { base: "text-xl", lg: "text-2xl", xl: "text-3xl", xxl: "text-4xl", xxxl: "text-5xl" }      // Large (2)
    ];
    return sizes[fontStep];
  }, [fontStep]);

  const theme = contrast ? "dark bg-black text-white" : "bg-gray-50 text-gray-900";
  const cardTheme = contrast ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200";
  const subtleText = contrast ? "text-gray-400" : "text-gray-500";
  const headerTheme = contrast ? "bg-black/80 backdrop-blur" : "bg-white/80 backdrop-blur";
  const activeNavText = contrast ? "text-white" : "text-green-600";
  const inactiveNavText = contrast ? "text-gray-400" : "text-gray-500";

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error logging out:', error.message);
  };

  // Load user information and avatar
  const loadUserInfo = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (user) {
      setUserInfo({
        email: user.email,
        id: user.id,
        createdAt: new Date(user.created_at).toLocaleDateString()
      });

      // Load profile data including avatar and admin status
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('avatar_url, is_admin')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
      } else if (profile) {
        // Always update avatar URL, even if empty
        setAvatarUrl(profile.avatar_url || '');
        setIsAdmin(profile.is_admin || false);
        console.log('Profile loaded successfully:', { avatar_url: profile.avatar_url, is_admin: profile.is_admin });
      } else {
        console.warn('No profile found for user:', user.id);
      }
    }
  };

  useEffect(() => {
    loadUserInfo();
  }, []);

  // Debug: Log when avatarUrl changes
  useEffect(() => {
    console.log('MainApp avatarUrl state updated:', avatarUrl);
  }, [avatarUrl]);

  useEffect(() => {
    // End session when user closes browser
    window.addEventListener('beforeunload', endSession);

    // Cleanup function
    return () => {
      endSession();
      window.removeEventListener('beforeunload', endSession);
    };
  }, []);

  useEffect(() => {
    // Log tab switches or other significant events
    if (tab) {
      console.log(`User navigated to tab: ${tab}`);
    }
  }, [tab]);

  return (
    <div className={`min-h-screen flex flex-col ${theme} ${fontSizes.base}`}>
      <header className={`sticky top-0 z-10 border-b ${contrast ? 'border-gray-700' : 'border-gray-200'} ${headerTheme}`}>
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setTab("talk")}
            className="flex items-center gap-3 hover:opacity-80 transition"
            aria-label="Go to Talk"
          >
            <AppIcon />
            <div className="leading-tight">
              <div className="font-bold text-lg md:text-xl">{t('app.title')}</div>
            </div>
          </button>
          <div className="flex items-center gap-2">
            <button
              className={`px-3 py-2 rounded-xl border text-sm font-semibold ${cardTheme} hover:opacity-80 transition-opacity`}
              onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
              aria-label="Change language"
            >
              {language === 'es' ? '🇬🇧 EN' : '🇪🇸 ES'}
            </button>
            <button
              className={`px-4 py-2 rounded-xl border text-sm font-semibold ${cardTheme} hover:opacity-80 transition-opacity`}
              onClick={() => setContrast(v => !v)} aria-pressed={contrast}
            >
              {contrast ? t('common.lightMode') : t('common.darkMode')}
            </button>
            <div className={`flex items-center rounded-xl border ${cardTheme}`}>
              <button
                className="px-4 py-2 font-bold text-lg hover:opacity-80 disabled:opacity-30"
                onClick={() => setFontStep(s => Math.max(0, s - 1))}
                aria-label="Decrease text size" disabled={fontStep === 0}
              >A-</button>
              <div className={`w-px h-6 ${contrast ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
              <button
                className="px-4 py-2 font-bold text-lg hover:opacity-80 disabled:opacity-30"
                onClick={() => setFontStep(s => Math.min(2, s + 1))}
                aria-label="Increase text size" disabled={fontStep === 2}
              >A+</button>
            </div>
            <button className={`w-12 h-12 rounded-full grid place-items-center ${cardTheme} border overflow-hidden bg-gray-100 dark:bg-gray-800`} aria-label="Profile" onClick={() => setShowAccountModal(true)}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Failed to load avatar:', avatarUrl);
                    e.target.style.display = 'none';
                  }}
                  onLoad={() => console.log('Avatar loaded successfully:', avatarUrl)}
                />
              ) : (
                <UserIcon />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {tab === "talk" && <TalkView subtleText={subtleText} cardTheme={cardTheme} fontSizes={fontSizes} onSaveTranscription={saveTranscription} selectedTopic={selectedTopic} />}
        {tab === "starters" && <ConversationStartersView cardTheme={cardTheme} subtleText={subtleText} fontSizes={fontSizes} onStartConversation={(topic) => {
          setSelectedTopic(topic);
          setTab("talk");
        }} />}
        {tab === "progress" && <ProgressView cardTheme={cardTheme} subtleText={subtleText} fontSizes={fontSizes} contrast={contrast} />}
        {tab === "admin" && isAdmin && <AdminView cardTheme={cardTheme} subtleText={subtleText} fontSizes={fontSizes} contrast={contrast} />}
      </main>

      {/* Jakob's Law: Bottom tab bar is a familiar navigation pattern for mobile users. */}
      <nav className={`sticky bottom-0 border-t ${contrast ? 'border-gray-700' : 'border-gray-800'} ${headerTheme}`}>
        <div className="mx-auto max-w-5xl px-4">
          <div className={`grid ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'} gap-2 py-2`}>
            <NavButton active={tab === "starters"} onClick={() => setTab("starters")} label={t('nav.starters')} icon={<BookIcon active={tab === 'starters'} />} activeColor={activeNavText} inactiveColor={inactiveNavText} />
            <NavButton active={tab === "talk"} onClick={() => setTab("talk")} label={t('nav.talk')} icon={<MicIcon active={tab === 'talk'} />} activeColor={activeNavText} inactiveColor={inactiveNavText} />
            <NavButton active={tab === "progress"} onClick={() => setTab("progress")} label={t('nav.progress')} icon={<ChartIcon active={tab === 'progress'} />} activeColor={activeNavText} inactiveColor={inactiveNavText} />
            {isAdmin && <NavButton active={tab === "admin"} onClick={() => setTab("admin")} label={t('nav.admin')} icon={<AdminIcon active={tab === 'admin'} />} activeColor={activeNavText} inactiveColor={inactiveNavText} />}
          </div>
        </div>
      </nav>

      {/* Onboarding modal — shown once per user after first login, keyed by Supabase user ID */}
      {showOnboarding && (
        <OnboardingModal userId={initialUserId} onComplete={() => setShowOnboarding(false)} />
      )}

      {/* Account Modal */}
      {showAccountModal && (
        <AccountModal
          userInfo={userInfo}
          onClose={() => setShowAccountModal(false)}
          onLogout={handleLogout}
          onSave={loadUserInfo}
          theme={theme}
          cardTheme={cardTheme}
          subtleText={subtleText}
          currentAvatarUrl={avatarUrl}
        />
      )}
    </div>
  );
}
