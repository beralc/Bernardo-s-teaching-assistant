import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useLanguage } from "../LanguageContext";
import { TIER_LIMITS, API_BASE_URL } from "../config/constants";

export function AccountModal({ userInfo, onClose, onLogout, onSave, theme, cardTheme, subtleText, currentAvatarUrl }) {
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'learning' | 'security'
  const { t } = useLanguage();
  // eslint-disable-next-line no-unused-vars
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
  const [studyMethod, setStudyMethod] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl || '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Learning Profile
  const [englishLevel, setEnglishLevel] = useState('A2');
  // eslint-disable-next-line no-unused-vars
  const [learningGoals, setLearningGoals] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [preferredSkills, setPreferredSkills] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [interests, setInterests] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [preferredAccent, setPreferredAccent] = useState('American');
  const [studyFrequency, setStudyFrequency] = useState('Daily');
  const [voicePreference, setVoicePreference] = useState('sage');

  // Usage stats
  const [usageStats, setUsageStats] = useState({ used: 0, limit: 30, tier: 'free' });

  // Can-Do achievements
  // eslint-disable-next-line no-unused-vars
  const [candoData, setCandoData] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [loadingCando, setLoadingCando] = useState(false);

  // Load profile data on mount
  useEffect(() => {
    loadProfile();
    // fetchCanDoAchievements(); // DISABLED - Can-Do system not in use
  }, []);

  // Sync avatar URL when parent updates
  useEffect(() => {
    if (currentAvatarUrl && currentAvatarUrl !== avatarUrl) {
      setAvatarUrl(currentAvatarUrl);
    }
  }, [currentAvatarUrl, avatarUrl]);

  const loadProfile = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    // eslint-disable-next-line no-unused-vars
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
      setStudyMethod(data.study_method || '');
      setInstitutionName(data.institution_name || '');
      setEnglishLevel(data.english_level || 'A2');
      setLearningGoals(data.learning_goals || []);
      setPreferredSkills(data.preferred_skills || []);
      setInterests(data.interests || []);
      setPreferredAccent(data.preferred_accent || 'American');
      setStudyFrequency(data.study_frequency || 'Daily');
      setVoicePreference(data.voice_preference || 'sage');
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

  // eslint-disable-next-line no-unused-vars
  const fetchCanDoAchievements = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    setLoadingCando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('No session found for Can-Do fetch');
        setLoadingCando(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/users/${user.id}/cando`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCandoData(data);
        console.log('Can-Do data loaded:', data);
      } else {
        console.error('Failed to fetch Can-Do achievements:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching Can-Do achievements:', error);
    } finally {
      setLoadingCando(false);
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
        study_method: studyMethod,
        institution_name: institutionName || null,
        english_level: englishLevel,
        learning_goals: learningGoals,
        preferred_skills: preferredSkills,
        interests,
        preferred_accent: preferredAccent,
        study_frequency: studyFrequency,
        voice_preference: voicePreference,
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
      const currentUser = (await supabase.auth.getUser()).data.user;
      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', currentUser.id);

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
          <h2 className="text-2xl font-bold">{t('account.title')}</h2>
          <button onClick={onClose} className="text-3xl hover:opacity-70" aria-label={t('common.close')}>×</button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('personal')}
            className={`px-4 py-2 font-semibold transition ${activeTab === 'personal' ? 'border-b-2 border-green-600 text-green-600' : subtleText}`}
          >
            {t('account.tabs.personal')}
          </button>
          <button
            onClick={() => setActiveTab('learning')}
            className={`px-4 py-2 font-semibold transition ${activeTab === 'learning' ? 'border-b-2 border-green-600 text-green-600' : subtleText}`}
          >
            {t('account.tabs.learning')}
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 font-semibold transition ${activeTab === 'security' ? 'border-b-2 border-green-600 text-green-600' : subtleText}`}
          >
            {t('account.tabs.security')}
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
                      <h3 className="font-bold text-xl">{name || surname ? `${name} ${surname}` : t('account.profile.title')}</h3>
                      <p className={`text-sm ${subtleText}`}>{userInfo.email}</p>
                      {uploadingPhoto && <p className="text-sm text-green-600">{t('common.loading')}</p>}
                      {isEditingProfile && !avatarUrl && (
                        <p className="text-xs text-green-600 mt-1">{t('account.profile.uploadHint')}</p>
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
                      <option value="Spain">Spain</option>
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="Mexico">Mexico</option>
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

                <div>
                  <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>Studying at</label>
                  {isEditingProfile ? (
                    <select
                      value={studyMethod}
                      onChange={(e) => setStudyMethod(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                    >
                      <option value="">Select...</option>
                      <option value="Academy">Academy</option>
                      <option value="App">App</option>
                      <option value="Self-study">Self-study</option>
                      <option value="Private tutor">Private tutor</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <p className="text-lg py-2">{studyMethod || 'Not set'}</p>
                  )}
                </div>

                {(isEditingProfile && (studyMethod === 'Academy' || studyMethod === 'App' || studyMethod === 'Private tutor' || studyMethod === 'Other')) && (
                  <div>
                    <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>
                      {studyMethod === 'Academy' ? 'Academy name' : studyMethod === 'App' ? 'App name' : studyMethod === 'Private tutor' ? 'Tutor name' : 'Please specify'}
                    </label>
                    <input
                      type="text"
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                      placeholder={studyMethod === 'Private tutor' ? 'Optional' : ''}
                    />
                  </div>
                )}

                {!isEditingProfile && institutionName && (
                  <div>
                    <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>Institution/App name</label>
                    <p className="text-lg py-2">{institutionName}</p>
                  </div>
                )}

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
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100'
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
                      <p className="text-xs text-green-600 dark:text-green-400">Unlimited voice conversations</p>
                    )}
                    {usageStats.limit !== -1 && usageStats.used >= usageStats.limit && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        Limit reached. Resets on {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString()}
                      </p>
                    )}
                    {usageStats.limit !== -1 && usageStats.used < usageStats.limit && (
                      <p className="text-xs text-gray-700 dark:text-gray-400">
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
                  <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>AI Voice Assistant</label>
                  <select
                    value={voicePreference}
                    onChange={(e) => setVoicePreference(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                  >
                    <option value="sage">Jennifer (USA) - Clear, professional</option>
                    <option value="shimmer">Sarah (USA) - Gentle, warm</option>
                    <option value="coral">Emma (USA) - Bright, energetic</option>
                    <option value="ballad">Peter (UK) - Calm, British</option>
                    <option value="echo">Michael (USA) - Warm, friendly</option>
                    <option value="onyx">David (USA) - Deep, authoritative</option>
                    <option value="ash">James (USA) - Smooth, articulate</option>
                    <option value="verse">Sofia (USA) - Expressive, dynamic</option>
                  </select>
                  <p className={`text-xs ${subtleText} mt-1`}>Choose the voice that sounds best to you. Changes apply to your next conversation.</p>
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
                    {t('auth.logOut')}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p>{t('account.loading')}</p>
        )}
      </div>
    </div>
  );
}
