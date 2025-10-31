import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabaseClient";

  const API_BASE_URL = process.env.REACT_APP_FLASK_API_URL || 'http://127.0.0.1:5000';

  // Tier limits for voice conversations
  const TIER_LIMITS = {
    free: {
      monthlyMinutes: 5,  // 5 minutes per month for testing (change to 30 for production)
      name: 'Free'
    },
    starter: {
      monthlyMinutes: 150,  // 150 minutes per month = ~$9 cost
      name: 'Starter'
    },
    premium: {
      monthlyMinutes: 300,  // 300 minutes per month = ~$18 cost
      name: 'Premium'
    },
    enterprise: {
      monthlyMinutes: -1,  // unlimited
      name: 'Enterprise'
    }
  };

  // This is a self-contained React component demonstrating a senior-first UI,
  // deeply integrating principles from "Laws of UX" and "Designing User Interfaces".
  // It uses Tailwind CSS for styling.

  // --- Main App Component ---
  export default function SeniorFirstEnglishAssistant() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const { data: authListener } = supabase.auth.onAuthStateChange(
        (event, session) => {
          setIsLoggedIn(!!session);
          setLoading(false);
        }
      );

      // Check initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setIsLoggedIn(!!session);
        setLoading(false);
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }, []);

    if (loading) {
      return <div className="min-h-screen grid place-items-center bg-gray-50 text-gray-900">Loading...</div>; // Simple loading state
    }

    if (!isLoggedIn) {
      return <OnboardingScreen onStart={() => setIsLoggedIn(true)} />;
    }
    
    return <MainApp />;
  }


  // --- Helper to save transcription to Supabase ---
  async function saveTranscription(text, correctedText = null) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      console.warn("User not logged in, cannot save transcription.");
      return;
    }

    if (!sessionLogId) {
      console.warn("No active session, cannot save transcription.");
      return;
    }

    console.log('Saving transcription:', { text, session_id: sessionLogId });

    const { data, error } = await supabase
      .from('transcriptions')
      .insert([
        {
          user_id: user.id,
          text,
          corrected_text: correctedText,
          session_id: sessionLogId // Link to current session
        }
      ]);

    if (error) {
      console.error('Error saving transcription:', error.message, error);
    } else {
      console.log('Transcription saved successfully!', data);
    }
  }

  // --- Helper for app usage logging ---
  let sessionStartTime = null;
  let sessionLogId = null;

  async function startSession(topic = null) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      console.warn('No user logged in, cannot start session');
      return;
    }

    sessionStartTime = new Date();

    console.log('Starting session with topic:', topic?.title || 'No topic');

    // Create a conversation session entry with optional topic
    const { data: logData, error } = await supabase
      .from('conversation_sessions')
      .insert([{
        user_id: user.id,
        started_at: sessionStartTime.toISOString(),
        topic: topic ? topic.title : null
      }])
      .select();

    if (error) {
      console.error('Error starting session:', error.message, error);
    } else if (logData && logData.length > 0) {
      sessionLogId = logData[0].id;
      console.log('Session started successfully! Session ID:', sessionLogId);
    } else {
      console.error('Failed to retrieve sessionLogId from insert operation, logData is empty or null.');
    }
  }

  async function endSession() {
    if (!sessionLogId || !sessionStartTime) return;

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const endTime = new Date();
    const durationMinutes = Math.round((endTime.getTime() - sessionStartTime.getTime()) / (1000 * 60));

    // Update conversation session
    const { data, error } = await supabase
      .from('conversation_sessions')
      .update({
        ended_at: endTime.toISOString(),
        duration_minutes: durationMinutes
      })
      .eq('id', sessionLogId);

    if (error) {
      console.error('Error ending session:', error.message);
    } else {
      console.log('Session ended. Duration:', durationMinutes, 'minutes');

      // Log usage for cost tracking
      const costUsd = durationMinutes * 0.06; // $0.06 per minute for OpenAI Realtime API

      await supabase
        .from('usage_logs')
        .insert([{
          user_id: user.id,
          action_type: 'voice_conversation',
          duration_minutes: durationMinutes,
          cost_usd: costUsd,
          metadata: { session_id: sessionLogId }
        }]);

      // Update user's monthly total
      const { data: profile } = await supabase
        .from('profiles')
        .select('monthly_voice_minutes_used')
        .eq('id', user.id)
        .single();

      const currentUsage = profile?.monthly_voice_minutes_used || 0;
      const newTotal = currentUsage + durationMinutes;

      await supabase
        .from('profiles')
        .update({ monthly_voice_minutes_used: newTotal })
        .eq('id', user.id);

      console.log(`Monthly usage: ${currentUsage} + ${durationMinutes} = ${newTotal} minutes`);
    }

    sessionLogId = null;
    sessionStartTime = null;
  }


  function MainApp() {
    const [tab, setTab] = useState("talk"); // "talk" | "starters" | "progress" | "admin"
    const [contrast, setContrast] = useState(false);
    const [fontStep, setFontStep] = useState(1); // 0..2 for Small, Medium, Large
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [userInfo, setUserInfo] = useState(null);
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);

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
      const { data: { user } } = await supabase.auth.getUser();
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
      // This is a simplified example; a real implementation might log start/end of each tab view
      if (tab) {
        console.log(`User navigated to tab: ${tab}`);
        // You could add more detailed logging here, e.g.,
        // supabase.from('app_usage_logs').insert([{ user_id: currentUserId, event_type: 'tab_switch', details: { tab_name: tab } }]);
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
                <div className="font-bold text-lg md:text-xl">Bernardo's English Helper</div>
              </div>
            </button>
            <div className="flex items-center gap-2">
              <button
                className={`px-4 py-2 rounded-xl border text-sm font-semibold ${cardTheme} hover:opacity-80 transition-opacity`}
                onClick={() => setContrast(v => !v)} aria-pressed={contrast}
              >
                {contrast ? "Light Mode" : "Dark Mode"}
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
              <NavButton active={tab === "starters"} onClick={() => setTab("starters")} label="Starters" icon={<BookIcon active={tab === 'starters'} />} activeColor={activeNavText} inactiveColor={inactiveNavText}
  />
              <NavButton active={tab === "talk"} onClick={() => setTab("talk")} label="Talk" icon={<MicIcon active={tab === 'talk'} />} activeColor={activeNavText} inactiveColor={inactiveNavText} />
              <NavButton active={tab === "progress"} onClick={() => setTab("progress")} label="Progress" icon={<ChartIcon active={tab === 'progress'} />} activeColor={activeNavText}
  inactiveColor={inactiveNavText} />
              {isAdmin && <NavButton active={tab === "admin"} onClick={() => setTab("admin")} label="Admin" icon={<AdminIcon active={tab === 'admin'} />} activeColor={activeNavText} inactiveColor={inactiveNavText} />}
            </div>
          </div>
        </nav>

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

  // --- Account Modal Component ---
  function AccountModal({ userInfo, onClose, onLogout, onSave, theme, cardTheme, subtleText, currentAvatarUrl }) {
    const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'learning' | 'security'
    const [isEditingPassword, setIsEditingPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState('');
    const [saveMessage, setSaveMessage] = useState('');

    // Personal Info
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [age, setAge] = useState('');
    const [nativeLanguage, setNativeLanguage] = useState('');
    const [country, setCountry] = useState('');
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl || '');
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    // Learning Profile
    const [englishLevel, setEnglishLevel] = useState('A2');
    const [learningGoals, setLearningGoals] = useState([]);
    const [preferredSkills, setPreferredSkills] = useState([]);
    const [interests, setInterests] = useState([]);
    const [preferredAccent, setPreferredAccent] = useState('American');
    const [studyFrequency, setStudyFrequency] = useState('Daily');

    // Usage stats
    const [usageStats, setUsageStats] = useState({ used: 0, limit: 30, tier: 'free' });

    // Load profile data on mount
    useEffect(() => {
      loadProfile();
    }, []);

    // Sync avatar URL when parent updates
    useEffect(() => {
      if (currentAvatarUrl && currentAvatarUrl !== avatarUrl) {
        setAvatarUrl(currentAvatarUrl);
      }
    }, [currentAvatarUrl]);

    const loadProfile = async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setName(data.name || '');
        setSurname(data.surname || '');
        setAge(data.age || '');
        setNativeLanguage(data.native_language || '');
        setCountry(data.country || '');
        setEnglishLevel(data.english_level || 'A2');
        setLearningGoals(data.learning_goals || []);
        setPreferredSkills(data.preferred_skills || []);
        setInterests(data.interests || []);
        setPreferredAccent(data.preferred_accent || 'American');
        setStudyFrequency(data.study_frequency || 'Daily');
        setAvatarUrl(data.avatar_url || '');

        // Load usage stats
        const tier = data.tier || 'free';
        const limit = TIER_LIMITS[tier].monthlyMinutes;
        setUsageStats({
          used: data.monthly_voice_minutes_used || 0,
          limit: limit,
          tier: tier
        });
      }
    };

    const handleSaveProfile = async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name,
          surname,
          age: age ? parseInt(age) : null,
          native_language: nativeLanguage,
          country,
          english_level: englishLevel,
          learning_goals: learningGoals,
          preferred_skills: preferredSkills,
          interests,
          preferred_accent: preferredAccent,
          study_frequency: studyFrequency,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        });

      if (error) {
        setSaveMessage('Error saving profile: ' + error.message);
        console.error('Error saving profile:', error);
      } else {
        setSaveMessage('Profile saved successfully!');
        setIsEditingProfile(false);
        setTimeout(() => setSaveMessage(''), 3000);

        // Refresh avatar in parent component
        if (onSave) {
          onSave();
        }
      }
    };

    const handlePasswordChange = async () => {
      if (newPassword !== confirmPassword) {
        setPasswordMessage('Passwords do not match');
        return;
      }
      if (newPassword.length < 6) {
        setPasswordMessage('Password must be at least 6 characters');
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordMessage('Error: ' + error.message);
      } else {
        setPasswordMessage('Password updated successfully!');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setIsEditingPassword(false);
          setPasswordMessage('');
        }, 2000);
      }
    };

    const handlePhotoUpload = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setSaveMessage('Photo must be less than 2MB');
        return;
      }

      setUploadingPhoto(true);
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      try {
        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        setAvatarUrl(publicUrl);

        // Immediately save to database so it shows in header
        const user = (await supabase.auth.getUser()).data.user;
        await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', user.id);

        // Refresh parent component
        if (onSave) {
          onSave();
        }

        setSaveMessage('Photo uploaded and saved successfully!');
        setTimeout(() => setSaveMessage(''), 3000);
      } catch (error) {
        console.error('Error uploading photo:', error);
        setSaveMessage('Error uploading photo: ' + error.message);
      } finally {
        setUploadingPhoto(false);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div className={`${cardTheme} rounded-3xl border p-8 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Account Settings</h2>
            <button onClick={onClose} className="text-3xl hover:opacity-70" aria-label="Close">×</button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('personal')}
              className={`px-4 py-2 font-semibold transition ${activeTab === 'personal' ? 'border-b-2 border-green-600 text-green-600' : subtleText}`}
            >
              Personal
            </button>
            <button
              onClick={() => setActiveTab('learning')}
              className={`px-4 py-2 font-semibold transition ${activeTab === 'learning' ? 'border-b-2 border-green-600 text-green-600' : subtleText}`}
            >
              Learning
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-4 py-2 font-semibold transition ${activeTab === 'security' ? 'border-b-2 border-green-600 text-green-600' : subtleText}`}
            >
              Security
            </button>
          </div>

          {userInfo ? (
            <div className="space-y-4">
              {saveMessage && (
                <div className={`p-3 rounded-xl ${saveMessage.includes('success') ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100'}`}>
                  {saveMessage}
                </div>
              )}

              {/* Personal Tab */}
              {activeTab === 'personal' && (
                <div className="space-y-4">
                  {/* Photo Upload Section with Logout */}
                  <div className="flex items-center justify-between pb-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                      <div className="relative group">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700" />
                        ) : (
                          <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                        {isEditingProfile && (
                          <label className="absolute bottom-0 right-0 bg-green-600 hover:bg-green-700 text-white rounded-full p-2.5 cursor-pointer shadow-lg transition-transform hover:scale-110">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoUpload}
                              className="hidden"
                              disabled={uploadingPhoto}
                            />
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </label>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-xl">{name || surname ? `${name} ${surname}` : 'Your Profile'}</h3>
                        <p className={`text-sm ${subtleText}`}>{userInfo.email}</p>
                        {uploadingPhoto && <p className="text-sm text-green-600">Uploading photo...</p>}
                        {isEditingProfile && !avatarUrl && (
                          <p className="text-xs text-green-600 mt-1">Click the camera icon to upload a photo</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={onLogout}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition font-semibold"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>Name</label>
                      {isEditingProfile ? (
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="First name"
                          className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                        />
                      ) : (
                        <p className="text-lg py-2">{name || 'Not set'}</p>
                      )}
                    </div>
                    <div>
                      <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>Surname</label>
                      {isEditingProfile ? (
                        <input
                          type="text"
                          value={surname}
                          onChange={(e) => setSurname(e.target.value)}
                          placeholder="Last name"
                          className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                        />
                      ) : (
                        <p className="text-lg py-2">{surname || 'Not set'}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>Age</label>
                    {isEditingProfile ? (
                      <input
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="Your age"
                        className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                      />
                    ) : (
                      <p className="text-lg py-2">{age || 'Not set'}</p>
                    )}
                  </div>

                  <div>
                    <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>Native Language</label>
                    {isEditingProfile ? (
                      <select
                        value={nativeLanguage}
                        onChange={(e) => setNativeLanguage(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                      >
                        <option value="">Select language...</option>
                        <option value="Spanish">Spanish</option>
                        <option value="Portuguese">Portuguese</option>
                        <option value="French">French</option>
                        <option value="German">German</option>
                        <option value="Italian">Italian</option>
                        <option value="Mandarin">Mandarin</option>
                        <option value="Japanese">Japanese</option>
                        <option value="Korean">Korean</option>
                        <option value="Arabic">Arabic</option>
                        <option value="Russian">Russian</option>
                        <option value="Hindi">Hindi</option>
                        <option value="Other">Other</option>
                      </select>
                    ) : (
                      <p className="text-lg py-2">{nativeLanguage || 'Not set'}</p>
                    )}
                  </div>

                  <div>
                    <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>Country</label>
                    {isEditingProfile ? (
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                      >
                        <option value="">Select country...</option>
                        <option value="United States">United States</option>
                        <option value="Canada">Canada</option>
                        <option value="Mexico">Mexico</option>
                        <option value="Spain">Spain</option>
                        <option value="Argentina">Argentina</option>
                        <option value="Chile">Chile</option>
                        <option value="Colombia">Colombia</option>
                        <option value="Brazil">Brazil</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="France">France</option>
                        <option value="Germany">Germany</option>
                        <option value="Italy">Italy</option>
                        <option value="Portugal">Portugal</option>
                        <option value="China">China</option>
                        <option value="Japan">Japan</option>
                        <option value="South Korea">South Korea</option>
                        <option value="India">India</option>
                        <option value="Other">Other</option>
                      </select>
                    ) : (
                      <p className="text-lg py-2">{country || 'Not set'}</p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className={`text-sm font-semibold ${subtleText} mb-1`}>Email</p>
                    <p className="text-lg mb-3">{userInfo.email}</p>

                    <p className={`text-sm font-semibold ${subtleText} mb-1`}>Account Created</p>
                    <p className="text-lg">{userInfo.createdAt}</p>
                  </div>

                  {/* Usage Stats Section */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className={`text-sm font-semibold ${subtleText} mb-2`}>Current Plan</p>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        usageStats.tier === 'premium' || usageStats.tier === 'enterprise'
                          ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100'
                          : usageStats.tier === 'starter'
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100'
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}>
                        {TIER_LIMITS[usageStats.tier].name} Tier
                      </span>
                    </div>

                    <p className={`text-sm font-semibold ${subtleText} mb-2`}>Voice Minutes This Month</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Used</span>
                        <span className="font-semibold">
                          {usageStats.used} / {usageStats.limit === -1 ? '∞' : usageStats.limit} minutes
                        </span>
                      </div>
                      {usageStats.limit !== -1 && (
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all ${
                              (usageStats.used / usageStats.limit) > 0.9
                                ? 'bg-red-600'
                                : (usageStats.used / usageStats.limit) > 0.7
                                ? 'bg-orange-500'
                                : 'bg-green-600'
                            }`}
                            style={{ width: `${Math.min(100, (usageStats.used / usageStats.limit) * 100)}%` }}
                          />
                        </div>
                      )}
                      {usageStats.limit === -1 && (
                        <p className="text-xs text-green-600 dark:text-green-400">✨ Unlimited voice conversations</p>
                      )}
                      {usageStats.limit !== -1 && usageStats.used >= usageStats.limit && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                          Limit reached. Resets on {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString()}
                        </p>
                      )}
                      {usageStats.limit !== -1 && usageStats.used < usageStats.limit && (
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {usageStats.limit - usageStats.used} minutes remaining
                        </p>
                      )}
                    </div>
                  </div>

                  {isEditingProfile ? (
                    <div className="flex gap-2 pt-4">
                      <button
                        onClick={() => {
                          setIsEditingProfile(false);
                          loadProfile(); // Reload original values
                        }}
                        className={`flex-1 ${cardTheme} border font-bold py-3 px-4 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition`}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl transition"
                      >
                        Save Changes
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl transition mt-4"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              )}

              {/* Learning Tab */}
              {activeTab === 'learning' && (
                <div className="space-y-4">
                  <div>
                    <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>Current English Level</label>
                    <select
                      value={englishLevel}
                      onChange={(e) => setEnglishLevel(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                    >
                      <option value="A1">A1 - Beginner</option>
                      <option value="A2">A2 - Elementary</option>
                      <option value="B1">B1 - Intermediate</option>
                      <option value="B2">B2 - Upper Intermediate</option>
                      <option value="C1">C1 - Advanced</option>
                      <option value="C2">C2 - Proficient</option>
                    </select>
                  </div>

                  <div>
                    <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>Preferred Accent</label>
                    <select
                      value={preferredAccent}
                      onChange={(e) => setPreferredAccent(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                    >
                      <option value="American">American</option>
                      <option value="British">British</option>
                      <option value="Australian">Australian</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>Study Frequency</label>
                    <select
                      value={studyFrequency}
                      onChange={(e) => setStudyFrequency(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                    >
                      <option value="Daily">Daily</option>
                      <option value="3x per week">3x per week</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Occasionally">Occasionally</option>
                    </select>
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl transition mt-4"
                  >
                    Save Learning Preferences
                  </button>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-lg">Change Password</h3>
                  <div className="space-y-3">
                    <input
                      type="password"
                      placeholder="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border ${cardTheme}`}
                    />
                    <input
                      type="password"
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border ${cardTheme}`}
                    />
                    {passwordMessage && (
                      <p className={`text-sm ${passwordMessage.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>
                        {passwordMessage}
                      </p>
                    )}
                    <button
                      onClick={handlePasswordChange}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl transition"
                    >
                      Update Password
                    </button>
                  </div>

                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={onLogout}
                      className={`w-full ${cardTheme} border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold py-3 px-6 rounded-2xl transition`}
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p>Loading account information...</p>
          )}
        </div>
      </div>
    );
  }

  // --- Onboarding Screen ---
  // A friendly, low-friction entry point before requiring login.
  function OnboardingScreen({ onStart }) {
      const [email, setEmail] = useState('');
      const [password, setPassword] = useState('');
      const [loading, setLoading] = useState(false);
      const [isSignUp, setIsSignUp] = useState(false);
      const [message, setMessage] = useState('');
      const [invitationCode, setInvitationCode] = useState('');
      const [validatingCode, setValidatingCode] = useState(false);
      const [showConfirmation, setShowConfirmation] = useState(false);
      const [premiumDays, setPremiumDays] = useState(0);

      // Profile fields for signup
      const [name, setName] = useState('');
      const [surname, setSurname] = useState('');
      const [age, setAge] = useState('');
      const [nativeLanguage, setNativeLanguage] = useState('');
      const [country, setCountry] = useState('');
      const [englishLevel, setEnglishLevel] = useState('A2');

      const handleAuth = async (event) => {
          event.preventDefault();
          setLoading(true);
          setMessage('');

          if (isSignUp) {
              // Validate invitation code first
              if (!invitationCode.trim()) {
                  setMessage('Please enter an invitation code to sign up.');
                  setLoading(false);
                  return;
              }

              setValidatingCode(true);

              // Call the validation function
              const { data: validationData, error: validationError } = await supabase.rpc(
                'validate_invitation_code',
                { code_input: invitationCode.trim() }
              );

              setValidatingCode(false);

              if (validationError) {
                  setMessage('Error validating invitation code: ' + validationError.message);
                  setLoading(false);
                  return;
              }

              if (!validationData.valid) {
                  setMessage(validationData.error || 'Invalid invitation code. Please check and try again.');
                  setLoading(false);
                  return;
              }

              // Code is valid, proceed with signup
              const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });

              if (authError) {
                  setMessage(authError.message);
                  setLoading(false);
                  return;
              }

              // Create profile and use invitation code
              if (authData.user) {
                  // Use the invitation code
                  const { data: useCodeData, error: useCodeError } = await supabase.rpc(
                    'use_invitation_code',
                    {
                      code_input: invitationCode.trim(),
                      user_id_input: authData.user.id
                    }
                  );

                  if (useCodeError) {
                      console.error('Error using invitation code:', useCodeError);
                      setMessage('Account created but failed to apply invitation code. Please contact support.');
                      setLoading(false);
                      return;
                  }

                  if (!useCodeData.success) {
                      console.error('Failed to use code:', useCodeData.error);
                      setMessage('Account created but invitation code could not be applied: ' + useCodeData.error);
                      setLoading(false);
                      return;
                  }

                  // Use UPSERT to handle race condition with trigger
                  // The trigger creates an empty profile, but we need to ensure it exists
                  // before updating, so we use upsert (insert with onConflict update)
                  const { error: profileError } = await supabase
                      .from('profiles')
                      .upsert({
                          id: authData.user.id,
                          name,
                          surname,
                          age: age ? parseInt(age) : null,
                          native_language: nativeLanguage,
                          country,
                          english_level: englishLevel,
                          updated_at: new Date().toISOString()
                      }, {
                          onConflict: 'id'
                      });

                  if (profileError) {
                      console.error('Error updating profile:', profileError);
                  }

                  // Show confirmation page
                  setPremiumDays(useCodeData.grants_premium ? useCodeData.premium_duration_days : 0);
                  setShowConfirmation(true);
                  setLoading(false);
                  return;
              }
          } else {
              // Login
              const { error } = await supabase.auth.signInWithPassword({ email, password });
              if (error) {
                  setMessage(error.message);
              } else {
                  setMessage('Logged in successfully!');
              }
          }

          setLoading(false);
      };

      // Show confirmation page after successful signup
      if (showConfirmation) {
          return (
              <div className="bg-gradient-to-br from-green-50 to-blue-50 text-gray-900 min-h-screen flex flex-col justify-center items-center text-center p-8">
                  <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-12">
                      <div className="mx-auto w-32 h-32 mb-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-6xl">📧</span>
                      </div>
                      <h1 className="text-5xl font-extrabold mb-6 text-green-700">Check Your Email!</h1>
                      <p className="text-2xl text-gray-700 mb-8 leading-relaxed">
                          We've sent a confirmation link to <strong className="text-green-600">{email}</strong>
                      </p>

                      <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-6 mb-8">
                          <p className="text-lg text-gray-800 font-semibold mb-4">📬 Next Steps:</p>
                          <ol className="text-left text-lg text-gray-700 space-y-3 ml-4">
                              <li>1️⃣ Open your email inbox</li>
                              <li>2️⃣ Look for an email from Bernardo's English Helper</li>
                              <li>3️⃣ Click the confirmation link</li>
                              <li>4️⃣ Come back here and log in!</li>
                          </ol>
                      </div>

                      {premiumDays > 0 && (
                          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl p-6 mb-8">
                              <p className="text-xl font-bold text-yellow-800">
                                  🎉 You have <span className="text-2xl text-yellow-600">{premiumDays} days</span> of premium access!
                              </p>
                          </div>
                      )}

                      <p className="text-gray-500 text-sm mb-6">
                          Didn't receive the email? Check your spam folder or contact support.
                      </p>

                      <button
                          onClick={() => setShowConfirmation(false)}
                          className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white text-xl font-bold rounded-xl shadow-lg transition"
                      >
                          Back to Login
                      </button>
                  </div>
              </div>
          );
      }

      return (
          <div className="bg-gray-50 text-gray-900 min-h-screen flex flex-col justify-center items-center text-center p-8">
              <div className="max-w-md w-full">
                  <div className="mx-auto w-24 h-24 mb-6 bg-green-100 rounded-3xl flex items-center justify-center">
                     <AppIcon />
                  </div>
                  <h1 className="text-4xl font-bold mb-4">Welcome to Bernardo's English Helper</h1>
                  <p className="text-xl text-gray-600 mb-8">A safe and friendly space to practice speaking English at your own pace.</p>

                  <form onSubmit={handleAuth} className="flex flex-col gap-4 text-left">
                      <input
                          type="email"
                          placeholder="Your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-5 py-3 rounded-xl border border-gray-300 focus:ring-green-500 focus:border-green-500 text-lg"
                          required
                      />
                      <input
                          type="password"
                          placeholder="Your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-5 py-3 rounded-xl border border-gray-300 focus:ring-green-500 focus:border-green-500 text-lg"
                          required
                      />

                      {isSignUp && (
                          <>
                              <input
                                  type="text"
                                  placeholder="Invitation Code (required)"
                                  value={invitationCode}
                                  onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                                  className="w-full px-5 py-3 rounded-xl border border-gray-300 focus:ring-green-500 focus:border-green-500 text-lg font-mono tracking-wider"
                                  required
                              />
                              <p className="text-sm text-gray-600 -mt-2">
                                Don't have a code? <a href="mailto:bernardomorales@example.com?subject=Invitation%20Code%20Request" className="text-green-600 hover:underline font-semibold">Request one here</a>
                              </p>
                              <div className="grid grid-cols-2 gap-3">
                                  <input
                                      type="text"
                                      placeholder="First name"
                                      value={name}
                                      onChange={(e) => setName(e.target.value)}
                                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-green-500 focus:border-green-500"
                                      required
                                  />
                                  <input
                                      type="text"
                                      placeholder="Last name"
                                      value={surname}
                                      onChange={(e) => setSurname(e.target.value)}
                                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-green-500 focus:border-green-500"
                                      required
                                  />
                              </div>
                              <input
                                  type="number"
                                  placeholder="Age"
                                  value={age}
                                  onChange={(e) => setAge(e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-green-500 focus:border-green-500"
                              />
                              <select
                                  value={nativeLanguage}
                                  onChange={(e) => setNativeLanguage(e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-green-500 focus:border-green-500"
                                  required
                              >
                                  <option value="">Select your native language...</option>
                                  <option value="Spanish">Spanish</option>
                                  <option value="Portuguese">Portuguese</option>
                                  <option value="French">French</option>
                                  <option value="German">German</option>
                                  <option value="Italian">Italian</option>
                                  <option value="Mandarin">Mandarin</option>
                                  <option value="Japanese">Japanese</option>
                                  <option value="Korean">Korean</option>
                                  <option value="Arabic">Arabic</option>
                                  <option value="Russian">Russian</option>
                                  <option value="Hindi">Hindi</option>
                                  <option value="Other">Other</option>
                              </select>
                              <select
                                  value={country}
                                  onChange={(e) => setCountry(e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-green-500 focus:border-green-500"
                                  required
                              >
                                  <option value="">Select your country...</option>
                                  <option value="United States">United States</option>
                                  <option value="Canada">Canada</option>
                                  <option value="Mexico">Mexico</option>
                                  <option value="Spain">Spain</option>
                                  <option value="Argentina">Argentina</option>
                                  <option value="Chile">Chile</option>
                                  <option value="Colombia">Colombia</option>
                                  <option value="Brazil">Brazil</option>
                                  <option value="United Kingdom">United Kingdom</option>
                                  <option value="France">France</option>
                                  <option value="Germany">Germany</option>
                                  <option value="Italy">Italy</option>
                                  <option value="Portugal">Portugal</option>
                                  <option value="China">China</option>
                                  <option value="Japan">Japan</option>
                                  <option value="South Korea">South Korea</option>
                                  <option value="India">India</option>
                                  <option value="Other">Other</option>
                              </select>
                              <select
                                  value={englishLevel}
                                  onChange={(e) => setEnglishLevel(e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-green-500 focus:border-green-500"
                              >
                                  <option value="A1">A1 - Beginner</option>
                                  <option value="A2">A2 - Elementary</option>
                                  <option value="B1">B1 - Intermediate</option>
                                  <option value="B2">B2 - Upper Intermediate</option>
                                  <option value="C1">C1 - Advanced</option>
                                  <option value="C2">C2 - Proficient</option>
                              </select>
                          </>
                      )}

                      <button
                          type="submit"
                          className="w-full text-xl font-semibold bg-green-600 text-white py-5 px-8 rounded-2xl shadow-lg hover:bg-green-700 transition"
                          disabled={loading}
                      >
                          {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Log In')}
                      </button>
                      <button
                          type="button"
                          onClick={() => setIsSignUp(prev => !prev)}
                          className="w-full text-lg font-semibold text-green-600 py-3"
                      >
                          {isSignUp ? 'Already have an account? Log In' : 'Need an account? Sign Up'}
                      </button>
                  </form>
                  {message && <p className="mt-4 text-red-500 text-lg">{message}</p>}
              </div>
          </div>
      );
  }


  // --- Navigation Button Component ---
  // Fitts's Law: Large clickable area.
  function NavButton({ active, onClick, label, icon, activeColor, inactiveColor }) {
    return (
      <button onClick={onClick} className="flex flex-col items-center justify-center gap-1 rounded-2xl py-2 transition-colors duration-200" aria-current={active ? "page" : undefined}>
        {React.cloneElement(icon, { color: active ? 'currentColor' : inactiveColor, className: active ? activeColor : inactiveColor })}
        <span className={`text-sm font-semibold ${active ? activeColor : inactiveColor}`}>{label}</span>
      </button>
    );
  }

  // --- View Components ---

  // TalkView: Redesigned with a 3-state flow (Ready, Listening, Review) for clarity.
  function TalkView({ subtleText, cardTheme, fontSizes, onSaveTranscription, selectedTopic }) {
    const [speaking, setSpeaking] = useState(false);
    const [userTier, setUserTier] = useState('free');
    const [usageRemaining, setUsageRemaining] = useState(5);
    const [limitReached, setLimitReached] = useState(false);
    const [loadingUsage, setLoadingUsage] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const conversationStartTimeRef = useRef(null);
    const [connectingToBackend, setConnectingToBackend] = useState(false);

    // Initialize conversation with topic-specific greeting if a topic is selected
    const getInitialMessage = () => {
      if (selectedTopic) {
        return `Great choice! Let's talk about "${selectedTopic.title}". ${selectedTopic.description}. I'll start us off - are you ready?`;
      }
      return "Hello! When you're ready, tap the big green button to start talking.";
    };

    const [conversation, setConversation] = useState([
      { role: "bot", text: getInitialMessage() },
    ]);
    // Use refs for WebSocket resources to avoid re-render loops
    const mediaStreamRef = useRef(null);
    const webSocketRef = useRef(null);
    const audioContextRef = useRef(null);
    const scriptProcessorRef = useRef(null);
    const audioQueueRef = useRef([]); // Queue for bot audio playback
    const isPlayingRef = useRef(false); // Track if audio is currently playing
    const currentResponseTextRef = useRef(''); // Accumulate bot response text
    const [liveTranscript, setLiveTranscript] = useState("Assistant's response will appear here...");
    const hasAutoStartedRef = useRef(false); // Track if we've auto-started for this topic
    const nextPlayTimeRef = useRef(0); // Track when to play next audio chunk for seamless playback
    const autoStartRequestedRef = useRef(false); // Track if auto-start was requested
    const audioChunkCountRef = useRef(0); // Count chunks for buffering strategy

    // Load usage info on mount
    useEffect(() => {
      loadUsageInfo();
    }, []);

    const loadUsageInfo = async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('tier, monthly_voice_minutes_used, premium_until, is_admin')
        .eq('id', user.id)
        .single();

      if (!profile) {
        setLoadingUsage(false);
        return;
      }

      // Admins have unlimited access
      if (profile.is_admin) {
        setIsAdmin(true);
        setUserTier('enterprise');
        setUsageRemaining(-1);
        setLimitReached(false);
        setLoadingUsage(false);
        return;
      }

      // Check if premium expired
      let currentTier = profile.tier || 'free';
      if (currentTier === 'premium' && profile.premium_until) {
        if (new Date(profile.premium_until) < new Date()) {
          // Premium expired, downgrade to free
          currentTier = 'free';
          await supabase
            .from('profiles')
            .update({ tier: 'free' })
            .eq('id', user.id);
        }
      }

      setUserTier(currentTier);

      const used = profile.monthly_voice_minutes_used || 0;
      const limit = TIER_LIMITS[currentTier].monthlyMinutes;

      if (limit === -1) {
        setUsageRemaining(-1); // unlimited
        setLimitReached(false);
      } else {
        const remaining = Math.max(0, limit - used);
        setUsageRemaining(remaining);
        setLimitReached(remaining === 0);
      }

      setLoadingUsage(false);
    };

    // Function to play bot audio responses
    const playAudioChunk = useCallback((base64Audio) => {
      if (!audioContextRef.current) return;

      try {
        // Decode base64 to binary
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Convert bytes to Int16Array (PCM16 format)
        const int16Array = new Int16Array(bytes.buffer);

        // Create AudioBuffer
        const audioBuffer = audioContextRef.current.createBuffer(
          1, // mono
          int16Array.length,
          24000 // 24kHz sample rate
        );

        // Convert int16 to float32 for Web Audio API
        const channelData = audioBuffer.getChannelData(0);
        for (let i = 0; i < int16Array.length; i++) {
          channelData[i] = int16Array[i] / 32768.0; // Normalize to -1.0 to 1.0
        }

        // Queue the audio chunk
        audioQueueRef.current.push(audioBuffer);
        audioChunkCountRef.current++;

        // Buffer strategy: 2 chunks for smooth playback
        // Prevents choppy audio from network jitter
        const MIN_BUFFER_CHUNKS = 2;

        // Start playback if not already playing AND we have enough chunks buffered
        if (!isPlayingRef.current && audioQueueRef.current.length >= MIN_BUFFER_CHUNKS) {
          console.log(`Starting playback with ${audioQueueRef.current.length} chunks buffered`);
          playNextChunk();
        } else if (!isPlayingRef.current) {
          console.log(`Buffering... (${audioQueueRef.current.length}/${MIN_BUFFER_CHUNKS} chunks)`);
        }
      } catch (error) {
        console.error('Error decoding audio:', error);
      }
    }, []);

    // Function to play queued audio chunks with seamless scheduling
    const playNextChunk = useCallback(() => {
      if (audioQueueRef.current.length === 0) {
        isPlayingRef.current = false;
        return;
      }

      if (!audioContextRef.current) return;

      isPlayingRef.current = true;
      const audioBuffer = audioQueueRef.current.shift();

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);

      // Get current time from audio context
      const currentTime = audioContextRef.current.currentTime;

      // Schedule this chunk to play at the next scheduled time
      // If nextPlayTime is in the past, reset to current time to avoid drift
      let startTime;
      if (nextPlayTimeRef.current <= currentTime) {
        // Previous playback finished or this is first chunk - start now
        startTime = currentTime;
      } else {
        // Schedule seamlessly after previous chunk
        startTime = nextPlayTimeRef.current;
      }

      // Update next play time to be right after this chunk finishes
      nextPlayTimeRef.current = startTime + audioBuffer.duration;

      // Debug: Log if queue is backing up
      if (audioQueueRef.current.length > 5) {
        console.warn(`Audio queue backing up: ${audioQueueRef.current.length} chunks waiting`);
      }

      source.onended = () => {
        playNextChunk(); // Play next chunk when this one finishes
      };

      // Start the audio at the scheduled time for seamless playback
      source.start(startTime);
    }, []);

    const startListening = async () => {
      // Check if user has reached their limit
      if (limitReached) {
        alert(`You've reached your monthly limit of ${TIER_LIMITS[userTier].monthlyMinutes} minutes. Please upgrade to continue using voice conversations.`);
        return;
      }

      try {
        // Start timer
        conversationStartTimeRef.current = Date.now();
        setElapsedSeconds(0);

        // Reset audio playback timing and buffering for seamless playback
        nextPlayTimeRef.current = 0;
        audioChunkCountRef.current = 0;

        // Start a new session with the topic
        await startSession(selectedTopic);

        // 1. Request Microphone Permissions
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        // 2. Call Flask's /webrtc_session Endpoint
        // Show connecting message (may take up to 60s on free tier cold start)
        setConnectingToBackend(true);
        console.log('Connecting to backend (this may take up to 60s on first use)...');
        console.log('Fetch URL:', `${API_BASE_URL}/webrtc_session`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

        let sessionResponse, session_id, websocket_url, ephemeral_token;
        try {
          sessionResponse = await fetch(`${API_BASE_URL}/webrtc_session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: selectedTopic }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);
          setConnectingToBackend(false);
          console.log('Backend response received:', sessionResponse.status);

          if (!sessionResponse.ok) {
            const errorText = await sessionResponse.text();
            console.error('Backend error response:', errorText);
            throw new Error(`Failed to get WebRTC session: ${sessionResponse.status} - ${errorText}`);
          }

          const responseData = await sessionResponse.json();
          console.log('Session data received:', { session_id: responseData.session_id, websocket_url: responseData.websocket_url });

          session_id = responseData.session_id;
          websocket_url = responseData.websocket_url;
          ephemeral_token = responseData.ephemeral_token;
        } catch (fetchError) {
          clearTimeout(timeoutId);
          setConnectingToBackend(false);
          if (fetchError.name === 'AbortError') {
            throw new Error('Backend request timed out after 2 minutes. Please try again.');
          }
          throw fetchError;
        }

        // 3. Connect to OpenAI's Realtime API via WebSocket with authentication
        // Browser WebSocket API doesn't support custom headers, so we use protocols
        // to pass the ephemeral token (as per OpenAI Realtime API documentation)
        const ws = new WebSocket(
          websocket_url,
          [
            "realtime",
            `openai-insecure-api-key.${ephemeral_token}`,
            "openai-beta.realtime-v1"
          ]
        );
        webSocketRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket opened.');

          // Session is already configured by backend's ephemeral token
          // Just start streaming audio - no session.update needed

          // 4. Stream Audio Data
          // OpenAI Realtime API requires 24kHz sample rate for PCM16
          const context = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
          audioContextRef.current = context;
          console.log(`AudioContext created with sample rate: ${context.sampleRate}Hz`);

          const source = context.createMediaStreamSource(stream);
          // Reduced buffer size from 4096 to 2048 for lower latency
          const processor = context.createScriptProcessor(2048, 1, 1); // Buffer size, input channels, output channels
          scriptProcessorRef.current = processor;

          source.connect(processor);
          processor.connect(context.destination);

          processor.onaudioprocess = (event) => {
            const left = event.inputBuffer.getChannelData(0);
            // Convert float32 to int16 (PCM16 format for OpenAI)
            const int16Array = new Int16Array(left.length);
            for (let i = 0; i < left.length; i++) {
              int16Array[i] = Math.max(-1, Math.min(1, left[i])) * 0x7FFF;
            }

            if (ws.readyState === WebSocket.OPEN) {
              // OpenAI Realtime API requires base64-encoded audio in JSON message
              const audioBytes = new Uint8Array(int16Array.buffer);
              const base64Audio = btoa(String.fromCharCode(...audioBytes));

              const audioMessage = JSON.stringify({
                type: 'input_audio_buffer.append',
                audio: base64Audio
              });

              ws.send(audioMessage);
            }
          };
        };

        ws.onmessage = async (event) => {
          const data = JSON.parse(event.data);

          // Log all message types for debugging
          console.log("WebSocket message type:", data.type);

          // Handle different OpenAI Realtime API event types
          if (data.type === 'conversation.item.input_audio_transcription.completed') {
            // User's speech has been transcribed
            const transcript = data.transcript;
            console.log("User transcript received:", transcript);

            // Don't change live transcript - keep previous assistant response visible
            // Just add user's words to conversation history
            setConversation(prev => [...prev, { role: "user", text: transcript }]);

            console.log("Calling onSaveTranscription with:", transcript);
            onSaveTranscription(transcript);

            // Save user message to conversation_messages table
            if (sessionLogId && transcript) {
              const user = (await supabase.auth.getUser()).data.user;
              if (user) {
                const { error: insertError } = await supabase.from('conversation_messages').insert([{
                  session_id: sessionLogId,
                  user_id: user.id,
                  role: 'user',
                  content: transcript
                }]);
                if (insertError) {
                  console.error('Error saving user message:', insertError);
                } else {
                  console.log('User message saved to database');
                }
              }
            }

            // Previous response stays visible until new response starts streaming

          } else if (data.type === 'response.audio.delta') {
            // Bot's audio response (play it)
            if (data.delta) {
              playAudioChunk(data.delta);
            }

          } else if (data.type === 'response.audio_transcript.delta') {
            // Bot's response text (streaming)
            currentResponseTextRef.current += data.delta;
            // Show only assistant's words (no prefix needed - it's obvious)
            setLiveTranscript(currentResponseTextRef.current);

          } else if (data.type === 'response.created') {
            // New response is starting - clear previous text accumulator
            console.log("Response starting");
            currentResponseTextRef.current = '';
            audioChunkCountRef.current = 0; // Reset chunk count for new response
            // Don't change live transcript yet - wait for first delta to show new text

          } else if (data.type === 'response.audio_transcript.done') {
            // Bot's response text is complete
            console.log("Bot transcript complete:", data.transcript);
            setConversation(prev => [...prev, { role: "bot", text: data.transcript }]);

            // Save bot's response to database with "Bot:" prefix
            if (data.transcript) {
              console.log("Saving bot response to database");
              onSaveTranscription(`Bot: ${data.transcript}`);

              // Save assistant message to conversation_messages table
              if (sessionLogId && data.transcript) {
                const user = (await supabase.auth.getUser()).data.user;
                if (user) {
                  const { error: insertError } = await supabase.from('conversation_messages').insert([{
                    session_id: sessionLogId,
                    user_id: user.id,
                    role: 'assistant',
                    content: data.transcript
                  }]);
                  if (insertError) {
                    console.error('Error saving assistant message:', insertError);
                  } else {
                    console.log('Assistant message saved to database');
                  }
                }
              }
            }

            // Keep the response visible on screen - don't clear it
            // It will naturally be replaced when the next response starts
            currentResponseTextRef.current = ''; // Reset accumulator for next response

          } else if (data.type === 'response.done') {
            // Full response completed
            console.log("Response complete");
            currentResponseTextRef.current = ''; // Reset accumulator

          } else if (data.type === 'error') {
            // Log any error messages from the server
            console.error("OpenAI Realtime API error:", data.error);
            setLiveTranscript("Error occurred. Please try again.");

          } else if (data.type === 'input_audio_buffer.speech_started') {
            // User started speaking - interrupt AI only if it's actually playing
            console.log("User started speaking");
            // Only clear audio if there's something to interrupt
            if (audioQueueRef.current.length > 0 || isPlayingRef.current) {
              console.log("Interrupting AI audio playback");
              audioQueueRef.current = [];
              isPlayingRef.current = false;
              nextPlayTimeRef.current = 0; // Reset playback timing
            }
            // Show we're listening to user
            setLiveTranscript("Listening...");

          } else if (data.type === 'input_audio_buffer.speech_stopped') {
            // User stopped speaking
            console.log("User stopped speaking");
            setLiveTranscript("Processing...");

          } else if (data.type === 'response.cancelled') {
            // Response was cancelled (due to interruption)
            console.log("Response cancelled (interrupted)");
            // Clear any partial response text (audio already cleared by speech_started)
            currentResponseTextRef.current = '';

          } else if (data.type === 'conversation.item.truncated') {
            // Conversation item was truncated due to interruption
            console.log("Conversation item truncated");

          } else if (data.type === 'session.created' || data.type === 'session.updated') {
            // Session initialization events
            console.log("Session event:", data.type, data.session);

            // If a topic was selected, trigger AI to speak first
            if (data.type === 'session.created' && selectedTopic) {
              console.log("Topic selected, requesting AI to start conversation");
              // Create a response request to make the AI speak first
              const responseRequest = {
                type: 'response.create',
                response: {
                  modalities: ['audio', 'text'],
                  instructions: `Following ALL your existing system instructions (especially: respond ONLY in English, never in Spanish, French or any other language), start the conversation about "${selectedTopic.title}" by greeting the user and introducing the topic in a friendly, engaging way. Ask an opening question to get them talking.`
                }
              };
              ws.send(JSON.stringify(responseRequest));
            }

          } else {
            // Log other message types for debugging
            console.log("Received message type:", data.type, data);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setLiveTranscript("Error during listening. Please try again.");
          stopListening();
        };

        ws.onclose = (event) => {
          console.log(`WebSocket closed. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}, Clean: ${event.wasClean}`);
          // Keepalive cleanup is handled by stopListening() via the keepaliveInterval state
          setLiveTranscript("Assistant's response will appear here...");
        };

      } catch (error) {
        console.error('Error starting listening:', error);
        alert(`Microphone access failed: ${error.message}. Please ensure microphone permissions are granted.`);
        setSpeaking(false);
      }
    };

    const stopListening = useCallback(() => {
      // End the session
      endSession();

      // Clear audio queue and reset playback state
      audioQueueRef.current = [];
      isPlayingRef.current = false;
      currentResponseTextRef.current = '';

      if (webSocketRef.current) {
        console.log('Closing WebSocket.');
        webSocketRef.current.close();
        webSocketRef.current = null;
      }
      if (mediaStreamRef.current) {
        console.log('Stopping media stream.');
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current) {
        console.log('Closing audio context.');
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      // Note: We keep the live transcript visible even when stopping
      // so the user can still see the last response
    }, []); // Empty dependency array - refs don't trigger re-renders

    useEffect(() => {
      return () => {
        // Cleanup on unmount (e.g., when switching tabs)
        if (speaking) {
          console.log('TalkView unmounting - stopping active conversation');
          stopListening();
          setSpeaking(false);
        }
      };
    }, [stopListening, speaking]);

    // Real-time timer that updates every second and enforces limits
    useEffect(() => {
      if (!speaking || isAdmin) return; // Admins have unlimited time

      const timerInterval = setInterval(() => {
        const secondsElapsed = Math.floor((Date.now() - conversationStartTimeRef.current) / 1000);
        setElapsedSeconds(secondsElapsed);

        const minutesElapsed = Math.ceil(secondsElapsed / 60);
        const remainingMinutes = usageRemaining - minutesElapsed;

        // Auto-stop when time runs out
        if (remainingMinutes <= 0) {
          console.log('Time limit reached! Stopping conversation.');
          alert('Your time is up! The conversation will now end.');
          stopListening();
          setSpeaking(false);
          setLimitReached(true);
        }
        // Warning when 30 seconds left
        else if (remainingMinutes === 0 && secondsElapsed % 60 >= 30) {
          console.log('Warning: Less than 1 minute remaining');
        }
      }, 1000);

      return () => clearInterval(timerInterval);
    }, [speaking, isAdmin, usageRemaining, stopListening]);

    const handleToggleSpeaking = () => {
      const newState = !speaking;
      setSpeaking(newState);

      if (newState) {
        startListening();
      } else {
        stopListening();
      }
    };

    // Auto-start conversation when a topic is selected
    useEffect(() => {
      if (selectedTopic && !hasAutoStartedRef.current && !speaking) {
        hasAutoStartedRef.current = true;
        autoStartRequestedRef.current = true;
        // Small delay to let the UI update
        setTimeout(() => {
          if (autoStartRequestedRef.current) {
            handleToggleSpeaking();
            autoStartRequestedRef.current = false;
          }
        }, 800);
      }
    }, [selectedTopic, speaking]);

    // Existing text chat integration (now replaced by real-time speech)
    // const handleToggleSpeaking = async () => {
    //   const wasSpeaking = speaking;
    //   setSpeaking(!wasSpeaking);
    //   if (wasSpeaking) {
    //     // Simulate finishing a turn
    //     const userUtterance = "Yesterday, I go to the park."; // Simulated user input

    //     try {
    //       const response = await fetch(`${API_BASE_URL}/chat_text`, {
    //         method: 'POST',
    //         headers: {
    //           'Content-Type': 'application/json',
    //         },
    //         body: JSON.stringify({ text: userUtterance }),
    //       });

    //       if (!response.ok) {
    //         throw new Error(`HTTP error! status: ${response.status}`);
    //       }

    //       const data = await response.json();
    //       const botResponse = data.response_text;

    //       onSaveTranscription(userUtterance, botResponse);

    //       setConversation(prev => [...prev, { role: "user", text: userUtterance }]);
    //       setTimeout(() => {
    //          setConversation(prev => [...prev, { role: "bot", text: botResponse }]);
    //       }, 1000);

    //     } catch (error) {
    //       console.error('Error communicating with Flask backend:', error);
    //       setConversation(prev => [...prev, { role: "bot", text: "Sorry, I couldn't get a response from the server." }]);
    //     }
    //   }
    // };

    if (speaking) {
        // Calculate remaining time in real-time
        const minutesElapsed = Math.ceil(elapsedSeconds / 60);
        const currentRemaining = isAdmin ? -1 : Math.max(0, usageRemaining - minutesElapsed);

        return <ListeningView onStop={handleToggleSpeaking} cardTheme={cardTheme} subtleText={subtleText} fontSizes={fontSizes} liveTranscript={liveTranscript} usageRemaining={currentRemaining} userTier={userTier} isAdmin={isAdmin} elapsedSeconds={elapsedSeconds} />;
    }

    return (
      <section aria-label="Voice chat" className="flex flex-col gap-6 h-full">
        {/* Usage Warning/Info Banner */}
        {!loadingUsage && limitReached && (
          <div className="bg-orange-100 dark:bg-orange-900 border border-orange-300 dark:border-orange-700 rounded-xl p-4">
            <h3 className="font-bold text-orange-800 dark:text-orange-100 mb-1">Monthly Limit Reached</h3>
            <p className="text-sm text-orange-700 dark:text-orange-200">
              You've used all {TIER_LIMITS[userTier].monthlyMinutes} minutes this month ({TIER_LIMITS[userTier].name} tier).
              Your usage will reset on {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString()}.
            </p>
          </div>
        )}

        {!loadingUsage && !limitReached && usageRemaining !== -1 && (
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-200">
                  {usageRemaining} of {TIER_LIMITS[userTier].monthlyMinutes} minutes remaining
                </span>
                <span className="text-xs text-blue-600 dark:text-blue-300 ml-2">
                  ({TIER_LIMITS[userTier].name} tier)
                </span>
              </div>
              <div className="flex-1 max-w-xs ml-4">
                <div className="bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                  <div
                    className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all"
                    style={{ width: `${(usageRemaining / TIER_LIMITS[userTier].monthlyMinutes) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {!loadingUsage && usageRemaining === -1 && (
          <div className="bg-green-50 dark:bg-green-900/30 border-2 border-green-600 dark:border-green-700 rounded-xl p-3 shadow-md">
            <span className="text-base font-extrabold text-gray-900 dark:text-green-100">
              ✨ Unlimited voice conversations {isAdmin ? '(Admin)' : `(${TIER_LIMITS[userTier].name} tier)`}
            </span>
          </div>
        )}

        {/* Ready State */}
        <div className={`flex-1 flex flex-col justify-center items-center text-center rounded-3xl border p-8 ${cardTheme}`}>
          {connectingToBackend ? (
            <>
              <h2 className={`${fontSizes.xxxl} font-bold mb-2`}>Connecting...</h2>
              <p className={`${subtleText} ${fontSizes.lg} mb-8`}>
                Waking up the server (first use may take up to 60 seconds)
              </p>
              <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            </>
          ) : (
            <>
              <h2 className={`${fontSizes.xxxl} font-bold mb-2`}>Ready to Talk?</h2>
              <p className={`${subtleText} ${fontSizes.lg} mb-8`}>Tap the large button to start speaking.</p>
              {/* Fitts's Law: An unmissable primary action button. */}
              <button
                  onClick={handleToggleSpeaking}
                  className="w-48 h-48 bg-green-600 text-white rounded-full flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform"
                  aria-label="Start speaking"
              >
                  <MicIcon active={true} size={72} />
              </button>
            </>
          )}
        </div>
        
        {/* Conversation History */}
        <div className={`rounded-3xl border p-5 ${cardTheme}`}>
          <h3 className={`font-bold ${fontSizes.xl} mb-4`}>Today's Conversation</h3>
          <ul className="space-y-4">
            {conversation.map((msg, i) => (
              <ChatBubble key={i} role={msg.role} text={msg.text} fontSizes={fontSizes} />
            ))}
          </ul>
        </div>
      </section>
    );
  }

  function ListeningView({ onStop, cardTheme, subtleText, fontSizes, liveTranscript, usageRemaining, userTier, isAdmin, elapsedSeconds }) {
      // Format elapsed time as MM:SS
      const formatElapsedTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      };

      return (
          <section aria-label="Listening to your speech" className="flex flex-col gap-6 h-full">
              {/* Usage reminder banner while listening */}
              {isAdmin ? (
                <div className="bg-green-50 dark:bg-green-900/30 border-2 border-green-600 dark:border-green-700 rounded-xl p-2 shadow-md">
                  <p className="text-sm text-center font-extrabold text-gray-900 dark:text-green-100">
                    ✨ Unlimited (Admin) • Time: {formatElapsedTime(elapsedSeconds)}
                  </p>
                </div>
              ) : usageRemaining !== -1 && usageRemaining <= 2 ? (
                <div className="bg-orange-100 dark:bg-orange-900 border border-orange-300 dark:border-orange-700 rounded-xl p-3">
                  <p className="text-sm font-semibold text-orange-800 dark:text-orange-100">
                    ⚠️ Only {usageRemaining} {usageRemaining === 1 ? 'minute' : 'minutes'} remaining • Elapsed: {formatElapsedTime(elapsedSeconds)}
                  </p>
                </div>
              ) : usageRemaining !== -1 && usageRemaining > 2 ? (
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-2">
                  <p className="text-xs text-center text-blue-700 dark:text-blue-200">
                    {usageRemaining} min remaining ({TIER_LIMITS[userTier].name}) • Elapsed: {formatElapsedTime(elapsedSeconds)}
                  </p>
                </div>
              ) : null}

              <div className={`flex-1 flex flex-col justify-center items-center text-center rounded-3xl border p-8 ${cardTheme}`}>
                  <h2 className={`${fontSizes.xxxl} font-bold mb-2`}>I'm listening...</h2>
                  <p className={`${subtleText} ${fontSizes.lg} mb-8`}>Your words will appear below.</p>
                  <button
                      onClick={onStop}
                      className="w-48 h-48 bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl"
                      aria-label="Stop speaking"
                  >
                      <StopIcon />
                  </button>
              </div>
              <div className={`rounded-3xl border p-5 ${cardTheme}`} aria-live="polite">
                  <div className={`${subtleText} mb-2 ${fontSizes.base} font-semibold`}>Live Transcript</div>
                  <p className={`leading-relaxed ${fontSizes.xxl} min-h-[3em]`}>{liveTranscript}</p>
              </div>
          </section>
      );
  }

  // ConversationStartersView: Topic-based conversation starters
  function ConversationStartersView({ cardTheme, subtleText, fontSizes, onStartConversation }) {
    const topics = [
      { title: "Ordering Coffee", description: "Practice ordering at a cafe", icon: "☕️" },
      { title: "Talking About Hobbies", description: "Discuss your favorite activities", icon: "🎨" },
      { title: "Daily Routine", description: "Describe your typical day", icon: "⏰" },
      { title: "Travel Plans", description: "Talk about trips and destinations", icon: "✈️" },
      { title: "Food & Cooking", description: "Discuss recipes and meals", icon: "🍳" },
      { title: "Weekend Activities", description: "Share what you do for fun", icon: "🎉" },
    ];

    const handleStartTopic = (topic) => {
      // Trigger the assistant to start a conversation on this topic
      if (onStartConversation) {
        onStartConversation(topic);
      }
    };

    return (
      <section aria-label="Conversation starters" className="flex flex-col gap-6">
         <div>
           <h2 className={`${fontSizes.xxxl} font-bold`}>Conversation Starters</h2>
           <p className={`${subtleText} ${fontSizes.lg} mt-1`}>Choose a topic and start talking with the assistant.</p>
         </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topics.map((topic, idx) => (
            <article key={idx} className={`rounded-2xl border p-6 flex flex-col justify-between ${cardTheme} hover:shadow-lg transition`}>
              <div>
                <div className="text-4xl mb-3">{topic.icon}</div>
                <div className={`font-bold ${fontSizes.xl} mb-2`}>{topic.title}</div>
                <div className={`${subtleText} ${fontSizes.base}`}>{topic.description}</div>
              </div>
              <button
                onClick={() => handleStartTopic(topic)}
                className={`mt-4 rounded-xl px-5 py-3 ${fontSizes.lg} font-semibold bg-green-600 text-white hover:bg-green-700 transition`}>
                Start Conversation
              </button>
            </article>
          ))}
        </div>
      </section>
    );
  }

  // ProgressView: Your learning progress dashboard with time tracking and conversation history
  function ProgressView({ cardTheme, subtleText, fontSizes, contrast }) {
    const [conversationSearch, setConversationSearch] = useState('');
    const [timeStats, setTimeStats] = useState({
      totalMinutes: 0,
      dailyAverageMinutes: 0,
      todayMinutes: 0
    });
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState([]);
    const [showConversations, setShowConversations] = useState(false);

    // Load time statistics from Supabase
    useEffect(() => {
      loadTimeStats();
      loadTranscriptions();
    }, []);

    const loadTimeStats = async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      // Fetch all conversation sessions for this user
      const { data: sessions, error } = await supabase
        .from('conversation_sessions')
        .select('duration_minutes, started_at')
        .eq('user_id', user.id)
        .not('duration_minutes', 'is', null);

      if (error) {
        console.error('Error loading time stats:', error);
        setLoading(false);
        return;
      }

      if (sessions && sessions.length > 0) {
        // Calculate total minutes
        const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

        // Calculate today's minutes
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayMinutes = sessions
          .filter(s => new Date(s.started_at) >= today)
          .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

        // Calculate daily average (total minutes / number of days since first session)
        const firstSessionDate = new Date(Math.min(...sessions.map(s => new Date(s.started_at))));
        const daysSinceStart = Math.max(1, Math.ceil((Date.now() - firstSessionDate) / (1000 * 60 * 60 * 24)));
        const dailyAverageMinutes = Math.round(totalMinutes / daysSinceStart);

        setTimeStats({
          totalMinutes,
          dailyAverageMinutes,
          todayMinutes
        });
      }

      setLoading(false);
    };

    const formatTime = (minutes) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      if (hours > 0) {
        return `${hours}h ${mins}m`;
      }
      return `${mins} min`;
    };

    const loadTranscriptions = async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      // Load conversation sessions with their topics AND transcriptions for search
      const { data: sessionsData, error } = await supabase
        .from('conversation_sessions')
        .select('id, started_at, ended_at, duration_minutes, topic, transcriptions(text)')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error loading sessions:', error);
        return;
      }

      // Format sessions with titles
      const formattedSessions = (sessionsData || []).map(session => ({
        ...session,
        title: session.topic || `Conversation on ${new Date(session.started_at).toLocaleDateString()}`,
        date: new Date(session.started_at),
        expanded: false,
        transcripts: [], // Will be loaded on demand for display
        allText: session.transcriptions?.map(t => t.text).join(' ') || '' // For search
      }));

      setSessions(formattedSessions);
    };

    const filteredSessions = sessions.filter(s => {
      const searchLower = conversationSearch.toLowerCase();
      return (
        s.title?.toLowerCase().includes(searchLower) ||
        s.allText?.toLowerCase().includes(searchLower)
      );
    });

    const handleConversationClick = async (sessionId) => {
      // Toggle expansion
      const updatedSessions = sessions.map(s => {
        if (s.id === sessionId) {
          if (s.expanded) {
            // Collapse
            return { ...s, expanded: false };
          } else {
            // Expand and load transcripts if not already loaded
            if (s.transcripts.length === 0) {
              loadSessionTranscripts(sessionId);
            }
            return { ...s, expanded: true };
          }
        }
        return s;
      });
      setSessions(updatedSessions);
    };

    const loadSessionTranscripts = async (sessionId) => {
      const { data, error } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading session transcripts:', error);
        return;
      }

      // Update the session with its transcripts
      const updatedSessions = sessions.map(s => {
        if (s.id === sessionId) {
          return { ...s, transcripts: data || [] };
        }
        return s;
      });
      setSessions(updatedSessions);
    };

    return (
      <section aria-label="Progress dashboard" className="flex flex-col gap-6">
        <div>
           <h2 className={`${fontSizes.xxxl} font-bold`}>Your Progress Report</h2>
           <p className={`${subtleText} ${fontSizes.lg} mt-1`}>Updated: October 29, 2025</p>
         </div>

         {/* Time Statistics */}
         <div className={`rounded-2xl border p-6 ${cardTheme}`}>
          <h3 className={`font-bold ${fontSizes.xl} mb-4`}>Practice Time</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className={`${subtleText} ${fontSizes.base}`}>Total Time</div>
              <div className={`${fontSizes.xxl} font-bold mt-1 text-green-600 dark:text-green-400`}>
                {formatTime(timeStats.totalMinutes)}
              </div>
            </div>
            <div className="text-center">
              <div className={`${subtleText} ${fontSizes.base}`}>Daily Average</div>
              <div className={`${fontSizes.xxl} font-bold mt-1 text-blue-600 dark:text-blue-400`}>
                {formatTime(timeStats.dailyAverageMinutes)}
              </div>
            </div>
            <div className="text-center">
              <div className={`${subtleText} ${fontSizes.base}`}>Today</div>
              <div className={`${fontSizes.xxl} font-bold mt-1 text-purple-600 dark:text-purple-400`}>
                {formatTime(timeStats.todayMinutes)}
              </div>
            </div>
          </div>
        </div>

        {/* Can-Do Checklist */}
        <div className={`rounded-2xl border p-6 ${cardTheme}`}>
          <h3 className={`font-bold ${fontSizes.xl} mb-3`}>Your "Can-Do" Checklist</h3>
          <ul className={`space-y-3 ${fontSizes.lg}`}>
            <li className="flex items-center gap-3"><CheckIcon /> You can describe past activities and experiences.</li>
            <li className="flex items-center gap-3"><CheckIcon /> You can handle short social conversations.</li>
            <li className="flex items-center gap-3"><NextStepIcon /> Let's practice giving detailed explanations.</li>
          </ul>
        </div>

        {/* Conversations */}
        <div className={`rounded-2xl border p-6 ${cardTheme}`}>
          <h3 className={`font-bold ${fontSizes.xl} mb-3`}>My Conversations</h3>

          {/* Search Field */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search conversations..."
              value={conversationSearch}
              onChange={(e) => setConversationSearch(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border ${cardTheme} focus:outline-none focus:ring-2 focus:ring-green-500 ${fontSizes.lg}`}
            />
          </div>

          {showConversations ? (
            <>
              {filteredSessions.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredSessions.map((session, idx) => (
                    <div key={session.id || idx} className={`rounded-xl border ${cardTheme} overflow-hidden transition`}>
                      <button
                        onClick={() => handleConversationClick(session.id)}
                        className="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-left"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className={`font-bold ${fontSizes.lg} mb-1`}>{session.title}</h4>
                            <div className="flex items-center gap-4 text-sm">
                              {session.duration_minutes && (
                                <span className={`${subtleText} flex items-center gap-1`}>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {session.duration_minutes} min
                                </span>
                              )}
                              <span className={`${subtleText}`}>
                                {session.date.toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <svg
                            className={`w-5 h-5 ${subtleText} transition-transform ${session.expanded ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>

                      {/* Expanded transcripts */}
                      {session.expanded && (
                        <div className={`px-4 pb-4 pt-3 border-t ${contrast ? 'border-gray-700' : 'border-gray-200'}`}>
                          {session.transcripts.length > 0 ? (
                            <div className="space-y-3">
                              {session.transcripts.map((t, tIdx) => {
                                // Parse the text to identify speaker
                                const isBot = t.text.toLowerCase().startsWith('bot:') || t.text.toLowerCase().startsWith('assistant:');
                                const isUser = t.text.toLowerCase().startsWith('user:') || t.text.toLowerCase().startsWith('you:');

                                // Remove speaker prefix if present
                                let displayText = t.text;
                                if (isBot) {
                                  displayText = t.text.replace(/^(bot:|assistant:)\s*/i, '');
                                } else if (isUser) {
                                  displayText = t.text.replace(/^(user:|you:)\s*/i, '');
                                }

                                // Assume user if no prefix (since most transcripts are user speech)
                                const messageRole = isBot ? 'bot' : 'user';

                                return (
                                  <div key={t.id || tIdx} className={`flex gap-3 ${messageRole === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-10 h-10 rounded-full flex-shrink-0 grid place-items-center ${messageRole === 'bot' ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                      {messageRole === 'bot' ? '🤖' : '🙂'}
                                    </div>
                                    <div className={`flex-1 rounded-2xl px-4 py-3 border max-w-[80%] ${messageRole === 'bot' ? 'bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-gray-100' : 'bg-green-50 dark:bg-green-900/50 border-green-200 dark:border-green-800 text-gray-900 dark:text-gray-100'}`}>
                                      <p className={`${fontSizes.base} leading-relaxed`}>{displayText}</p>
                                      {t.corrected_text && (
                                        <p className={`${fontSizes.base} ${subtleText} italic mt-2 pt-2 border-t ${contrast ? 'border-gray-600' : 'border-gray-200'}`}>
                                          Corrected: {t.corrected_text}
                                        </p>
                                      )}
                                      <p className={`text-xs ${subtleText} mt-2`}>
                                        {new Date(t.created_at).toLocaleTimeString()}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className={`text-center py-4 ${subtleText} text-sm`}>
                              No transcripts saved for this conversation.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-center py-8 ${subtleText}`}>
                  {conversationSearch ? 'No conversations match your search.' : 'No conversations yet. Start talking!'}
                </p>
              )}
              <button
                onClick={() => setShowConversations(false)}
                className={`w-full text-center py-3 mt-4 rounded-xl border font-semibold ${cardTheme} hover:bg-gray-100 dark:hover:bg-gray-800 transition ${fontSizes.base}`}
              >
                Hide Conversations
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowConversations(true)}
              className={`w-full text-center py-4 rounded-xl border font-semibold ${cardTheme} hover:bg-gray-100 dark:hover:bg-gray-800 transition ${fontSizes.lg}`}
            >
              View My Conversations ({sessions.length})
            </button>
          )}
        </div>
      </section>
    );
  }

  // --- Helper & Icon Components ---
  function ChatBubble({ role, text, fontSizes }) {
    const isBot = role === "bot";
    // Use default sizes if fontSizes not provided (for backwards compatibility)
    const textSize = fontSizes?.lg || "text-lg";
    return (
      <li className={`flex gap-3 max-w-[85%] ${isBot ? "" : "self-end flex-row-reverse"}`}>
        <div className={`w-10 h-10 rounded-full flex-shrink-0 grid place-items-center ${isBot ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-200 dark:bg-gray-700'}`}>
          {isBot ? '🤖' : '🙂'}
        </div>
        <div className={`rounded-2xl px-4 py-3 border ${isBot ? "bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-gray-100" : "bg-green-50 dark:bg-green-900/50 border-green-200 dark:border-green-800 text-gray-900 dark:text-gray-100"}`}>
          <p className={`${textSize} leading-relaxed`}>{text}</p>
        </div>
      </li>
    );
  }

  // AdminView: Admin dashboard for managing invitation codes and viewing conversations
  function AdminView({ cardTheme, subtleText, fontSizes, contrast }) {
    const [codes, setCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [message, setMessage] = useState('');
    const [activeTab, setActiveTab] = useState('codes'); // 'codes', 'conversations', or 'users'

    // Form fields for generating codes
    const [newCodePrefix, setNewCodePrefix] = useState('BETA');
    const [newCodeMaxUses, setNewCodeMaxUses] = useState(1);
    const [newCodeGrantsPremium, setNewCodeGrantsPremium] = useState(false);
    const [newCodePremiumDays, setNewCodePremiumDays] = useState(30);
    const [newCodeDescription, setNewCodeDescription] = useState('');
    const [newCodeTag, setNewCodeTag] = useState('BETA');

    // Conversation viewer state
    const [users, setUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [userSessions, setUserSessions] = useState([]);
    const [selectedSessionId, setSelectedSessionId] = useState(null);
    const [sessionMessages, setSessionMessages] = useState([]);
    const [loadingConversations, setLoadingConversations] = useState(false);
    const [exportStartDate, setExportStartDate] = useState('');
    const [exportEndDate, setExportEndDate] = useState('');
    const [exporting, setExporting] = useState(false);

    // User management state
    const [allUsers, setAllUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newUserSurname, setNewUserSurname] = useState('');
    const [newUserTier, setNewUserTier] = useState('free');
    const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);

    useEffect(() => {
      if (activeTab === 'codes') {
        loadCodes();
      } else if (activeTab === 'conversations') {
        loadUsers();
      } else if (activeTab === 'users') {
        loadAllUsers();
      }
    }, [activeTab]);

    const loadCodes = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('invitation_codes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading codes:', error);
        setMessage('Error loading codes: ' + error.message);
      } else {
        setCodes(data || []);
      }
      setLoading(false);
    };

    const generateCode = async () => {
      setGenerating(true);
      setMessage('');

      // Generate a random code with prefix
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      const code = `${newCodePrefix}${randomPart}`;

      const { data, error } = await supabase
        .from('invitation_codes')
        .insert([{
          code,
          max_uses: newCodeMaxUses,
          grants_premium: newCodeGrantsPremium,
          premium_duration_days: newCodeGrantsPremium ? newCodePremiumDays : null,
          description: newCodeDescription,
          tag: newCodeTag,
          is_active: true
        }])
        .select();

      if (error) {
        setMessage('Error generating code: ' + error.message);
      } else {
        setMessage(`Code generated successfully: ${code}`);
        loadCodes(); // Reload the list

        // Reset form
        setNewCodeDescription('');
      }
      setGenerating(false);
    };

    const toggleCodeStatus = async (codeId, currentStatus) => {
      const { error} = await supabase
        .from('invitation_codes')
        .update({ is_active: !currentStatus })
        .eq('id', codeId);

      if (error) {
        setMessage('Error updating code: ' + error.message);
      } else {
        setMessage('Code status updated');
        loadCodes();
      }
    };

    // Conversation management functions
    const loadUsers = async () => {
      setLoadingConversations(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, surname, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading users:', error);
        setMessage('Error loading users: ' + error.message);
      } else {
        setUsers(data || []);
      }
      setLoadingConversations(false);
    };

    const loadUserSessions = async (userId) => {
      setSelectedUserId(userId);
      setLoadingConversations(true);
      const { data, error } = await supabase
        .from('conversation_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });

      if (error) {
        console.error('Error loading sessions:', error);
        setMessage('Error loading sessions: ' + error.message);
      } else {
        setUserSessions(data || []);
      }
      setLoadingConversations(false);
    };

    // User management functions
    const loadAllUsers = async () => {
      setLoadingUsers(true);
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

      if (authError) {
        console.error('Error loading auth users:', authError);
        setMessage('Error loading users: ' + authError.message);
        setLoadingUsers(false);
        return;
      }

      // Get profiles for all users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
        setMessage('Error loading profiles: ' + profilesError.message);
        setLoadingUsers(false);
        return;
      }

      // Merge auth and profile data
      const mergedUsers = authUsers.users.map(authUser => {
        const profile = profiles.find(p => p.id === authUser.id);
        return {
          id: authUser.id,
          email: authUser.email,
          created_at: authUser.created_at,
          email_confirmed_at: authUser.email_confirmed_at,
          ...profile
        };
      });

      setAllUsers(mergedUsers);
      setLoadingUsers(false);
    };

    const createUser = async () => {
      if (!newUserEmail || !newUserPassword) {
        setMessage('Error: Email and password are required');
        return;
      }

      setGenerating(true);
      setMessage('');

      try {
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: newUserEmail,
          password: newUserPassword,
          email_confirm: true
        });

        if (authError) throw authError;

        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: authData.user.id,
            name: newUserName || '',
            surname: newUserSurname || '',
            tier: newUserTier,
            is_admin: newUserIsAdmin
          }]);

        if (profileError) throw profileError;

        setMessage(`User created successfully: ${newUserEmail}`);

        // Reset form
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserName('');
        setNewUserSurname('');
        setNewUserTier('free');
        setNewUserIsAdmin(false);
        setShowCreateUser(false);

        // Reload users
        loadAllUsers();
      } catch (error) {
        console.error('Error creating user:', error);
        setMessage('Error creating user: ' + error.message);
      }

      setGenerating(false);
    };

    const deleteUser = async (userId, userEmail) => {
      if (!window.confirm(`Are you sure you want to delete user ${userEmail}? This cannot be undone.`)) {
        return;
      }

      setMessage('');

      try {
        // Delete auth user (this will cascade delete profile due to FK constraint)
        const { error: authError } = await supabase.auth.admin.deleteUser(userId);

        if (authError) throw authError;

        setMessage(`User ${userEmail} deleted successfully`);

        // Reload users
        loadAllUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        setMessage('Error deleting user: ' + error.message);
      }
    };

    const resetPassword = async (userId, userEmail) => {
      const newPassword = window.prompt(`Enter new password for ${userEmail}:`);

      if (!newPassword) {
        return;
      }

      if (newPassword.length < 6) {
        setMessage('Error: Password must be at least 6 characters');
        return;
      }

      setMessage('');

      try {
        const { error } = await supabase.auth.admin.updateUserById(userId, {
          password: newPassword
        });

        if (error) throw error;

        setMessage(`Password reset successfully for ${userEmail}`);
      } catch (error) {
        console.error('Error resetting password:', error);
        setMessage('Error resetting password: ' + error.message);
      }
    };

    const loadSessionMessages = async (sessionId) => {
      setSelectedSessionId(sessionId);
      setLoadingConversations(true);
      const { data, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        setMessage('Error loading messages: ' + error.message);
      } else {
        setSessionMessages(data || []);
      }
      setLoadingConversations(false);
    };

    const exportConversations = async () => {
      if (!exportStartDate || !exportEndDate) {
        setMessage('Please select both start and end dates');
        return;
      }

      setExporting(true);
      setMessage('');

      try {
        // Fetch all sessions in date range
        const { data: sessions, error: sessionsError } = await supabase
          .from('conversation_sessions')
          .select('*')
          .gte('started_at', exportStartDate)
          .lte('started_at', exportEndDate + 'T23:59:59')
          .order('started_at', { ascending: true });

        if (sessionsError) {
          console.error('Sessions error:', sessionsError);
          throw sessionsError;
        }

        if (!sessions || sessions.length === 0) {
          setMessage('No conversations found in this date range');
          setExporting(false);
          return;
        }

        console.log(`Found ${sessions.length} sessions to export`);

        // Fetch user profiles for all sessions (FULL profile data)
        const userIds = [...new Set(sessions.map(s => s.user_id))];
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, surname, age, native_language, country, english_level, tier, created_at, is_admin')
          .in('id', userIds);

        if (profilesError) {
          console.error('Profiles error:', profilesError);
          throw profilesError;
        }

        // Create a map of user profiles
        const profileMap = {};
        profiles?.forEach(p => {
          profileMap[p.id] = p;
        });

        // Fetch all messages for these sessions
        const sessionIds = sessions.map(s => s.id);
        const { data: messages, error: messagesError } = await supabase
          .from('conversation_messages')
          .select('*')
          .in('session_id', sessionIds)
          .order('created_at', { ascending: true });

        if (messagesError) {
          console.error('Messages error:', messagesError);
          throw messagesError;
        }

        console.log(`Found ${messages?.length || 0} messages to export`);

        // Create export data with FULL user profiles
        const exportData = sessions.map(session => {
          const sessionMessages = messages?.filter(m => m.session_id === session.id) || [];
          const userProfile = profileMap[session.user_id];
          return {
            session_id: session.id,
            session_info: {
              started_at: session.started_at,
              ended_at: session.ended_at,
              duration_minutes: session.duration_minutes,
              topic: session.topic
            },
            user_profile: {
              user_id: session.user_id,
              name: userProfile?.name || '',
              surname: userProfile?.surname || '',
              age: userProfile?.age || null,
              native_language: userProfile?.native_language || '',
              country: userProfile?.country || '',
              english_level: userProfile?.english_level || '',
              tier: userProfile?.tier || '',
              is_admin: userProfile?.is_admin || false,
              account_created: userProfile?.created_at || ''
            },
            conversation: sessionMessages.map(m => ({
              role: m.role,
              content: m.content,
              timestamp: m.created_at
            }))
          };
        });

        // Convert to JSON and download
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `conversations_${exportStartDate}_to_${exportEndDate}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setMessage(`Exported ${sessions.length} conversations successfully`);
      } catch (error) {
        console.error('Export error:', error);
        setMessage('Error exporting: ' + error.message);
      }

      setExporting(false);
    };

    return (
      <section aria-label="Admin dashboard" className="flex flex-col gap-6">
        <div>
          <h2 className={`${fontSizes.xxxl} font-bold`}>Admin Dashboard</h2>
          <p className={`${subtleText} ${fontSizes.lg} mt-1`}>Manage invitation codes and view conversations</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('codes')}
            className={`px-6 py-3 font-semibold ${fontSizes.lg} transition ${
              activeTab === 'codes'
                ? 'border-b-2 border-green-600 text-green-600'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Invitation Codes
          </button>
          <button
            onClick={() => setActiveTab('conversations')}
            className={`px-6 py-3 font-semibold ${fontSizes.lg} transition ${
              activeTab === 'conversations'
                ? 'border-b-2 border-green-600 text-green-600'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            User Conversations
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-semibold ${fontSizes.lg} transition ${
              activeTab === 'users'
                ? 'border-b-2 border-green-600 text-green-600'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Users
          </button>
        </div>

        {message && (
          <div className={`p-4 rounded-xl ${message.includes('Error') ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100' : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100'}`}>
            {message}
          </div>
        )}

        {activeTab === 'codes' && (
          <>
        {/* Generate New Code */}
        <div className={`rounded-2xl border p-6 ${cardTheme}`}>
          <h3 className={`font-bold ${fontSizes.xl} mb-4`}>Generate New Invitation Code</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>Code Prefix</label>
                <input
                  type="text"
                  value={newCodePrefix}
                  onChange={(e) => setNewCodePrefix(e.target.value.toUpperCase())}
                  className={`w-full px-3 py-2 rounded-lg border ${cardTheme} font-mono`}
                  placeholder="BETA"
                />
              </div>
              <div>
                <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>Tag</label>
                <select
                  value={newCodeTag}
                  onChange={(e) => setNewCodeTag(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                >
                  <option value="BETA">Beta Tester</option>
                  <option value="FOUNDER">Founding Member</option>
                  <option value="SCHOOL">School Access</option>
                  <option value="PERSONAL">Personal Invite</option>
                  <option value="PROMO">Promotion</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>Max Uses (-1 = unlimited)</label>
                <input
                  type="number"
                  value={newCodeMaxUses}
                  onChange={(e) => setNewCodeMaxUses(parseInt(e.target.value))}
                  className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                />
              </div>
              <div>
                <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>
                  <input
                    type="checkbox"
                    checked={newCodeGrantsPremium}
                    onChange={(e) => setNewCodeGrantsPremium(e.target.checked)}
                    className="mr-2"
                  />
                  Grants Premium Access
                </label>
                {newCodeGrantsPremium && (
                  <input
                    type="number"
                    value={newCodePremiumDays}
                    onChange={(e) => setNewCodePremiumDays(parseInt(e.target.value))}
                    className={`w-full px-3 py-2 rounded-lg border ${cardTheme} mt-2`}
                    placeholder="Days of premium"
                  />
                )}
              </div>
            </div>

            <div>
              <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>Description</label>
              <input
                type="text"
                value={newCodeDescription}
                onChange={(e) => setNewCodeDescription(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                placeholder="e.g., Beta testers batch 1"
              />
            </div>

            <button
              onClick={generateCode}
              disabled={generating}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl transition disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Generate Code'}
            </button>
          </div>
        </div>

        {/* Existing Codes */}
        <div className={`rounded-2xl border p-6 ${cardTheme}`}>
          <h3 className={`font-bold ${fontSizes.xl} mb-4`}>Existing Invitation Codes</h3>
          {loading ? (
            <p className={`text-center py-8 ${subtleText}`}>Loading codes...</p>
          ) : codes.length === 0 ? (
            <p className={`text-center py-8 ${subtleText}`}>No codes generated yet</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {codes.map((code) => (
                <div key={code.id} className={`rounded-xl border p-4 ${cardTheme} ${!code.is_active ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <code className={`font-mono font-bold ${fontSizes.lg} px-2 py-1 rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100`}>
                          {code.code}
                        </code>
                        <span className={`text-xs px-2 py-1 rounded ${code.tag === 'BETA' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100' : code.tag === 'FOUNDER' ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100'}`}>
                          {code.tag}
                        </span>
                        {code.grants_premium && (
                          <span className="text-xs px-2 py-1 rounded bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-100">
                            Premium {code.premium_duration_days}d
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${subtleText} mb-1`}>{code.description}</p>
                      <div className="flex items-center gap-4 text-xs">
                        <span className={subtleText}>
                          Uses: {code.current_uses} / {code.max_uses === -1 ? '∞' : code.max_uses}
                        </span>
                        <span className={subtleText}>
                          Created: {new Date(code.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleCodeStatus(code.id, code.is_active)}
                      className={`px-3 py-1 rounded text-sm font-semibold ${code.is_active ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100' : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100'}`}
                    >
                      {code.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
          </>
        )}

        {activeTab === 'conversations' && (
          <div className="space-y-6">
            {/* Export Section */}
            <div className={`rounded-2xl border p-6 ${cardTheme}`}>
              <h3 className={`font-bold ${fontSizes.xl} mb-4`}>Export Conversations</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>Start Date</label>
                    <input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                    />
                  </div>
                  <div>
                    <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>End Date</label>
                    <input
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                    />
                  </div>
                </div>
                <button
                  onClick={exportConversations}
                  disabled={exporting || !exportStartDate || !exportEndDate}
                  className={`px-6 py-3 rounded-xl font-bold text-lg transition ${
                    exporting || !exportStartDate || !exportEndDate
                      ? 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                  }`}
                >
                  {exporting ? 'Exporting...' : 'Export JSON'}
                </button>
              </div>
            </div>

            {/* User List */}
            <div className={`rounded-2xl border p-6 ${cardTheme}`}>
              <h3 className={`font-bold ${fontSizes.xl} mb-4`}>All Users ({users.length})</h3>
              {loadingConversations ? (
                <p className={subtleText}>Loading...</p>
              ) : users.length === 0 ? (
                <p className={subtleText}>No users found</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {users.map(user => (
                    <button
                      key={user.id}
                      onClick={() => loadUserSessions(user.id)}
                      className={`w-full text-left p-4 rounded-xl border transition ${
                        selectedUserId === user.id
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-600'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <p className={`font-semibold ${fontSizes.lg}`}>
                        {user.name} {user.surname}
                      </p>
                      <p className={`text-xs ${subtleText}`}>
                        Joined: {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Session List */}
            {selectedUserId && (
              <div className={`rounded-2xl border p-6 ${cardTheme}`}>
                <h3 className={`font-bold ${fontSizes.xl} mb-4`}>
                  Sessions ({userSessions.length})
                </h3>
                {loadingConversations ? (
                  <p className={subtleText}>Loading sessions...</p>
                ) : userSessions.length === 0 ? (
                  <p className={subtleText}>No sessions found for this user</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {userSessions.map(session => (
                      <button
                        key={session.id}
                        onClick={() => loadSessionMessages(session.id)}
                        className={`w-full text-left p-4 rounded-xl border transition ${
                          selectedSessionId === session.id
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-600'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <p className={`font-semibold ${fontSizes.lg}`}>
                          {session.topic || 'No topic'}
                        </p>
                        <p className={`text-sm ${subtleText}`}>
                          {new Date(session.started_at).toLocaleString()}
                        </p>
                        <p className={`text-xs ${subtleText}`}>
                          Duration: {session.duration_minutes || 0} minutes
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Message List */}
            {selectedSessionId && (
              <div className={`rounded-2xl border p-6 ${cardTheme}`}>
                <h3 className={`font-bold ${fontSizes.xl} mb-4`}>
                  Conversation ({sessionMessages.length} messages)
                </h3>
                {loadingConversations ? (
                  <p className={subtleText}>Loading messages...</p>
                ) : sessionMessages.length === 0 ? (
                  <p className={subtleText}>No messages in this session</p>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {sessionMessages.map(msg => (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-xl ${
                          msg.role === 'user'
                            ? 'bg-gray-100 dark:bg-gray-800 ml-8'
                            : 'bg-green-50 dark:bg-green-900/20 mr-8'
                        }`}
                      >
                        <p className={`text-xs ${subtleText} mb-1`}>
                          {msg.role === 'user' ? 'User' : 'AI Assistant'} •{' '}
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                        <p className={fontSizes.lg}>{msg.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Create User Section */}
            <div className={`rounded-2xl border p-6 ${cardTheme}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`font-bold ${fontSizes.xl}`}>User Management</h3>
                <button
                  onClick={() => setShowCreateUser(!showCreateUser)}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition"
                >
                  {showCreateUser ? 'Cancel' : '+ Create New User'}
                </button>
              </div>

              {showCreateUser && (
                <div className="mt-6 space-y-4 p-6 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <h4 className={`font-bold ${fontSizes.lg} mb-4`}>Create New User</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>Email *</label>
                      <input
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                        placeholder="user@example.com"
                      />
                    </div>
                    <div>
                      <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>Password *</label>
                      <input
                        type="password"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                        placeholder="Min. 6 characters"
                      />
                    </div>
                    <div>
                      <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>First Name</label>
                      <input
                        type="text"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>Last Name</label>
                      <input
                        type="text"
                        value={newUserSurname}
                        onChange={(e) => setNewUserSurname(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                        placeholder="Doe"
                      />
                    </div>
                    <div>
                      <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>Tier</label>
                      <select
                        value={newUserTier}
                        onChange={(e) => setNewUserTier(e.target.value)}
                        className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                      >
                        <option value="free">Free</option>
                        <option value="premium">Premium</option>
                        <option value="unlimited">Unlimited</option>
                      </select>
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newUserIsAdmin}
                          onChange={(e) => setNewUserIsAdmin(e.target.checked)}
                          className="w-5 h-5"
                        />
                        <span className={`font-semibold ${fontSizes.base}`}>Is Admin</span>
                      </label>
                    </div>
                  </div>
                  <button
                    onClick={createUser}
                    disabled={generating || !newUserEmail || !newUserPassword}
                    className={`px-6 py-3 rounded-xl font-bold transition ${
                      generating || !newUserEmail || !newUserPassword
                        ? 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {generating ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              )}
            </div>

            {/* Users List */}
            <div className={`rounded-2xl border p-6 ${cardTheme}`}>
              <h3 className={`font-bold ${fontSizes.xl} mb-4`}>All Users ({allUsers.length})</h3>
              {loadingUsers ? (
                <p className={subtleText}>Loading users...</p>
              ) : allUsers.length === 0 ? (
                <p className={subtleText}>No users found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`border-b border-gray-200 dark:border-gray-700 ${subtleText}`}>
                        <th className="text-left p-3 font-semibold">Email</th>
                        <th className="text-left p-3 font-semibold">Name</th>
                        <th className="text-left p-3 font-semibold">Tier</th>
                        <th className="text-left p-3 font-semibold">Admin</th>
                        <th className="text-left p-3 font-semibold">Verified</th>
                        <th className="text-left p-3 font-semibold">Created</th>
                        <th className="text-left p-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.map(user => (
                        <tr key={user.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="p-3">
                            <p className={`${fontSizes.base} font-mono text-sm`}>{user.email}</p>
                          </td>
                          <td className="p-3">
                            <p className={fontSizes.base}>{user.name} {user.surname}</p>
                          </td>
                          <td className="p-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              user.tier === 'unlimited' ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100' :
                              user.tier === 'premium' ? 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-100' :
                              'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100'
                            }`}>
                              {user.tier || 'free'}
                            </span>
                          </td>
                          <td className="p-3">
                            {user.is_admin ? (
                              <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="p-3">
                            {user.email_confirmed_at ? (
                              <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                            ) : (
                              <span className="text-red-600 dark:text-red-400 font-bold">✗</span>
                            )}
                          </td>
                          <td className="p-3">
                            <p className={`text-xs ${subtleText}`}>
                              {new Date(user.created_at).toLocaleDateString()}
                            </p>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => resetPassword(user.id, user.email)}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-semibold transition"
                                title="Reset Password"
                              >
                                Reset PW
                              </button>
                              <button
                                onClick={() => deleteUser(user.id, user.email)}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-semibold transition"
                                title="Delete User"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    );
  }

  // A collection of simple, clear SVG icons designed for this app.
  const AppIcon = () => <div className="h-12 w-12 rounded-xl grid place-items-center bg-green-600 text-white"><span className="font-extrabold text-2xl">A</span></div>;
  const UserIcon = () => <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
  strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
  const MicIcon = ({ active, size = 32, color, className }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden className={className}><rect
  x="9" y="2" width="6" height="13" rx="3" stroke="currentColor" strokeWidth="2" /><path d="M5 11a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="2" /><path d="M12 19v3" stroke="currentColor"
  strokeWidth="2" /></svg>;
  const StopIcon = () => <svg width="48" height="48" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg" aria-hidden><rect x="6" y="6" width="12" height="12" rx="2" /></svg>;
  const BookIcon = ({ color = "currentColor", className = "" }) => <svg className={`w-8 h-8 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
  strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v15H6.5A2.5 2.5 0 0 1 4 14.5v-10A2.5 2.5 0 0 1 6.5 2z"/></svg>;
  const ChartIcon = ({ color = "currentColor", className = "" }) => <svg className={`w-8 h-8 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
  strokeLinejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>;
  const AdminIcon = ({ color = "currentColor", className = "" }) => <svg className={`w-8 h-8 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
  strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>;
  const CheckIcon = () => <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3}
  d="M5 13l4 4L19 7" /></svg>;
  const NextStepIcon = () => <svg className="w-6 h-6 text-orange-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round"
  strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>;
