import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useLanguage } from "../LanguageContext";
import { TIER_LIMITS, API_BASE_URL } from "../config/constants";

// ---- GDPR helpers (used only within AccountModal) ----------------------

/**
 * Calls POST /user/delete-account with the current user's Bearer token.
 * Returns { success: true } or throws an Error.
 */
async function apiDeleteAccount(accessToken) {
  const resp = await fetch(`${API_BASE_URL}/user/delete-account`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || 'Failed to delete account');
  }
  return data;
}

/**
 * Calls GET /user/export-data and triggers a browser file download
 * of the returned JSON as "my-data.json".
 */
async function apiDownloadData(accessToken) {
  const resp = await fetch(`${API_BASE_URL}/user/export-data`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to export data');
  }
  const json = await resp.json();
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'my-data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function AccountModal({ userInfo, onClose, onLogout, onSave, theme, cardTheme, subtleText, currentAvatarUrl }) {
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'learning' | 'security' | 'help'
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

  // GDPR: delete account flow
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // GDPR: export data flow
  const [exportingData, setExportingData] = useState(false);
  const [exportError, setExportError] = useState('');

  // Help tab: FAQ accordion and feedback form
  const [openFaqIndex, setOpenFaqIndex] = useState(-1);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState('idle'); // 'idle' | 'sending' | 'success' | 'error'

  // Can-Do achievements
  // Can-Do data loaded for future profile display
  // eslint-disable-next-line no-unused-vars
  const [candoData, setCandoData] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [loadingCando, setLoadingCando] = useState(false);

  // Load profile data on mount
  useEffect(() => {
    loadProfile();
    fetchCanDoAchievements();
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
      setSaveMessage(t('account.profile.profileSaveError') + error.message);
      console.error('Error saving profile:', error);
    } else {
      setSaveMessage(t('account.profile.profileSaved'));
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
      setPasswordMessage(t('account.security.passwordMismatch'));
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage(t('account.security.passwordTooShort'));
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordMessage(t('common.error') + ': ' + error.message);
    } else {
      setPasswordMessage(t('account.security.passwordUpdated'));
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
      setSaveMessage(t('account.profile.photoSizeError'));
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

      setSaveMessage(t('account.profile.photoSaved'));
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error uploading photo:', error);
      setSaveMessage(t('account.profile.photoUploadError') + error.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ---- GDPR: delete account ----
  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    setDeleteError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setDeleteError(t('account.privacy.sessionError'));
        setDeletingAccount(false);
        return;
      }
      await apiDeleteAccount(session.access_token);
      // Sign out locally — the account no longer exists on the server
      await supabase.auth.signOut();
    } catch (err) {
      setDeleteError(err.message || t('account.privacy.genericError'));
      setDeletingAccount(false);
    }
  };

  // ---- GDPR: download data ----
  const handleDownloadData = async () => {
    setExportingData(true);
    setExportError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setExportError(t('account.privacy.sessionError'));
        setExportingData(false);
        return;
      }
      await apiDownloadData(session.access_token);
    } catch (err) {
      setExportError(err.message || t('account.privacy.genericError'));
    } finally {
      setExportingData(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) return;
    setFeedbackStatus('sending');
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase
      .from('feedback')
      .insert({ user_id: user?.id ?? null, message: feedbackText.trim() });
    if (error) {
      setFeedbackStatus('error');
    } else {
      setFeedbackStatus('success');
      setFeedbackText('');
      setTimeout(() => setFeedbackStatus('idle'), 4000);
    }
  };

  // Derive the dynamic institution label from the current study method
  const getInstitutionLabel = () => {
    if (studyMethod === 'Academy') return t('account.profile.academyName');
    if (studyMethod === 'App') return t('account.profile.appName');
    if (studyMethod === 'Private tutor') return t('account.profile.tutorName');
    return t('account.profile.pleaseSpecify');
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
          <button
            onClick={() => setActiveTab('help')}
            className={`px-4 py-2 font-semibold transition ${activeTab === 'help' ? 'border-b-2 border-green-600 text-green-600' : subtleText}`}
          >
            {t('account.tabs.help')}
          </button>
        </div>

        {userInfo ? (
          <div className="space-y-4">
            {saveMessage && (
              <div className={`p-3 rounded-xl ${saveMessage.includes('success') || saveMessage.includes('correctamente') ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100'}`}>
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
                    {t('account.profile.logout')}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>{t('account.profile.name')}</label>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('account.profile.firstName')}
                        className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                      />
                    ) : (
                      <p className="text-lg py-2">{name || t('account.profile.notSet')}</p>
                    )}
                  </div>
                  <div>
                    <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>{t('account.profile.surname')}</label>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={surname}
                        onChange={(e) => setSurname(e.target.value)}
                        placeholder={t('account.profile.lastName')}
                        className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                      />
                    ) : (
                      <p className="text-lg py-2">{surname || t('account.profile.notSet')}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>{t('account.profile.age')}</label>
                  {isEditingProfile ? (
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder={t('account.profile.agePlaceholder')}
                      className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                    />
                  ) : (
                    <p className="text-lg py-2">{age || t('account.profile.notSet')}</p>
                  )}
                </div>

                <div>
                  <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>{t('account.profile.nativeLanguage')}</label>
                  {isEditingProfile ? (
                    <select
                      value={nativeLanguage}
                      onChange={(e) => setNativeLanguage(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                    >
                      <option value="">{t('account.profile.selectLanguage')}</option>
                      <option value="Spanish">{t('languages.Spanish')}</option>
                      <option value="Portuguese">{t('languages.Portuguese')}</option>
                      <option value="French">{t('languages.French')}</option>
                      <option value="German">{t('languages.German')}</option>
                      <option value="Italian">{t('languages.Italian')}</option>
                      <option value="Mandarin">{t('languages.Mandarin')}</option>
                      <option value="Japanese">{t('languages.Japanese')}</option>
                      <option value="Korean">{t('languages.Korean')}</option>
                      <option value="Arabic">{t('languages.Arabic')}</option>
                      <option value="Russian">{t('languages.Russian')}</option>
                      <option value="Hindi">{t('languages.Hindi')}</option>
                      <option value="Other">{t('languages.Other')}</option>
                    </select>
                  ) : (
                    <p className="text-lg py-2">{nativeLanguage ? t(`languages.${nativeLanguage}`) : t('account.profile.notSet')}</p>
                  )}
                </div>

                <div>
                  <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>{t('account.profile.country')}</label>
                  {isEditingProfile ? (
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                    >
                      <option value="">{t('account.profile.selectCountry')}</option>
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
                    <p className="text-lg py-2">{country || t('account.profile.notSet')}</p>
                  )}
                </div>

                <div>
                  <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>{t('account.profile.studyingAt')}</label>
                  {isEditingProfile ? (
                    <select
                      value={studyMethod}
                      onChange={(e) => setStudyMethod(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                    >
                      <option value="">{t('account.profile.select')}</option>
                      <option value="Academy">{t('studyMethods.Academy')}</option>
                      <option value="App">{t('studyMethods.App')}</option>
                      <option value="Self-study">{t('studyMethods.Self-study')}</option>
                      <option value="Private tutor">{t('studyMethods.Private tutor')}</option>
                      <option value="Other">{t('studyMethods.Other')}</option>
                    </select>
                  ) : (
                    <p className="text-lg py-2">{studyMethod ? t(`studyMethods.${studyMethod}`) : t('account.profile.notSet')}</p>
                  )}
                </div>

                {(isEditingProfile && (studyMethod === 'Academy' || studyMethod === 'App' || studyMethod === 'Private tutor' || studyMethod === 'Other')) && (
                  <div>
                    <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>
                      {getInstitutionLabel()}
                    </label>
                    <input
                      type="text"
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                      placeholder={studyMethod === 'Private tutor' ? t('account.profile.optionalPlaceholder') : ''}
                    />
                  </div>
                )}

                {!isEditingProfile && institutionName && (
                  <div>
                    <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>{t('account.profile.institutionName')}</label>
                    <p className="text-lg py-2">{institutionName}</p>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className={`text-sm font-semibold ${subtleText} mb-1`}>{t('account.profile.email')}</p>
                  <p className="text-lg mb-3">{userInfo.email}</p>

                  <p className={`text-sm font-semibold ${subtleText} mb-1`}>{t('account.profile.accountCreated')}</p>
                  <p className="text-lg">{userInfo.createdAt}</p>
                </div>

                {/* Usage Stats Section */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className={`text-sm font-semibold ${subtleText} mb-2`}>{t('account.usage.currentPlan')}</p>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      usageStats.tier === 'premium' || usageStats.tier === 'enterprise'
                        ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100'
                        : usageStats.tier === 'starter'
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100'
                    }`}>
                      {TIER_LIMITS[usageStats.tier].name} {t('account.usage.tierLabel')}
                    </span>
                  </div>

                  <p className={`text-sm font-semibold ${subtleText} mb-2`}>{t('account.usage.title')}</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{t('account.usage.used')}</span>
                      <span className="font-semibold">
                        {usageStats.used} / {usageStats.limit === -1 ? '∞' : usageStats.limit} {t('account.usage.minutes')}
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
                      <p className="text-xs text-green-600 dark:text-green-400">{t('account.usage.unlimited')}</p>
                    )}
                    {usageStats.limit !== -1 && usageStats.used >= usageStats.limit && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {t('account.usage.limitReached')}{new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString()}
                      </p>
                    )}
                    {usageStats.limit !== -1 && usageStats.used < usageStats.limit && (
                      <p className="text-xs text-gray-700 dark:text-gray-400">
                        {usageStats.limit - usageStats.used} {t('account.usage.remaining')}
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
                      {t('account.profile.cancel')}
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl transition"
                    >
                      {t('account.profile.saveChanges')}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl transition mt-4"
                  >
                    {t('account.profile.editProfile')}
                  </button>
                )}
              </div>
            )}

            {/* Learning Tab */}
            {activeTab === 'learning' && (
              <div className="space-y-4">
                <div>
                  <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>{t('account.learning.englishLevel')}</label>
                  <select
                    value={englishLevel}
                    onChange={(e) => setEnglishLevel(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                  >
                    <option value="A1">{t('levels.A1')}</option>
                    <option value="A2">{t('levels.A2')}</option>
                    <option value="B1">{t('levels.B1')}</option>
                    <option value="B2">{t('levels.B2')}</option>
                    <option value="C1">{t('levels.C1')}</option>
                    <option value="C2">{t('levels.C2')}</option>
                  </select>
                </div>

                <div>
                  <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>{t('account.voice.title')}</label>
                  <select
                    value={voicePreference}
                    onChange={(e) => setVoicePreference(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                  >
                    <option value="alloy">{t('voices.alloy')}</option>
                    <option value="ash">{t('voices.ash')}</option>
                    <option value="ballad">{t('voices.ballad')}</option>
                    <option value="coral">{t('voices.coral')}</option>
                    <option value="echo">{t('voices.echo')}</option>
                    <option value="fable">{t('voices.fable')}</option>
                    <option value="nova">{t('voices.nova')}</option>
                    <option value="onyx">{t('voices.onyx')}</option>
                    <option value="sage">{t('voices.sage')}</option>
                    <option value="shimmer">{t('voices.shimmer')}</option>
                    <option value="verse">{t('voices.verse')}</option>
                  </select>
                  <p className={`text-xs ${subtleText} mt-1`}>{t('account.voice.hint')}</p>
                </div>

                <div>
                  <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>{t('account.learning.studyFrequency')}</label>
                  <select
                    value={studyFrequency}
                    onChange={(e) => setStudyFrequency(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                  >
                    <option value="Daily">{t('account.learning.daily')}</option>
                    <option value="3x per week">{t('account.learning.threePerWeek')}</option>
                    <option value="Weekly">{t('account.learning.weekly')}</option>
                    <option value="Occasionally">{t('account.learning.occasionally')}</option>
                  </select>
                </div>

                <button
                  onClick={handleSaveProfile}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl transition mt-4"
                >
                  {t('account.learning.savePreferences')}
                </button>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-4">
                <h3 className="font-bold text-lg">{t('account.security.title')}</h3>
                <div className="space-y-3">
                  <input
                    type="password"
                    placeholder={t('account.security.newPassword')}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border ${cardTheme}`}
                  />
                  <input
                    type="password"
                    placeholder={t('account.security.confirmPassword')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border ${cardTheme}`}
                  />
                  {passwordMessage && (
                    <p className={`text-sm ${passwordMessage.includes('successfully') || passwordMessage.includes('correctamente') ? 'text-green-600' : 'text-red-600'}`}>
                      {passwordMessage}
                    </p>
                  )}
                  <button
                    onClick={handlePasswordChange}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl transition"
                  >
                    {t('account.security.updatePassword')}
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

                {/* ---- Data & Privacy Section ---- */}
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
                  <h3 className="font-bold text-lg">{t('account.privacy.title')}</h3>
                  <p className={`text-sm leading-relaxed ${subtleText}`}>
                    {t('account.privacy.description')}{' '}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 underline hover:text-green-800"
                    >
                      {t('account.privacy.privacyLink')}
                    </a>
                  </p>

                  {/* Download My Data */}
                  <button
                    onClick={handleDownloadData}
                    disabled={exportingData}
                    className={`w-full flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-2xl border transition text-base
                      ${exportingData
                        ? 'opacity-60 cursor-not-allowed bg-gray-100 dark:bg-gray-800 border-gray-300'
                        : 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                      }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {exportingData ? t('account.privacy.downloadPreparing') : t('account.privacy.downloadButton')}
                  </button>
                  {exportError && (
                    <p className="text-sm text-red-600 dark:text-red-400">{exportError}</p>
                  )}

                  {/* Delete My Account — Danger Zone */}
                  <div className="rounded-2xl border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 space-y-3">
                    <h4 className="font-bold text-red-700 dark:text-red-400 text-base">
                      {t('account.privacy.dangerZone')}
                    </h4>
                    <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">
                      {t('account.privacy.dangerDescription')}
                    </p>

                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => { setShowDeleteConfirm(true); setDeleteError(''); }}
                        className="w-full bg-white dark:bg-gray-900 border-2 border-red-500 text-red-600 dark:text-red-400 font-bold py-3 px-6 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/40 transition text-base"
                      >
                        {t('account.privacy.deleteButton')}
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <p className="font-semibold text-red-800 dark:text-red-200 text-sm text-center">
                          {t('account.privacy.deleteConfirm')}
                        </p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }}
                            disabled={deletingAccount}
                            className={`flex-1 font-bold py-3 px-4 rounded-2xl border transition text-base ${cardTheme} border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800`}
                          >
                            {t('account.privacy.deleteCancel')}
                          </button>
                          <button
                            onClick={handleDeleteAccount}
                            disabled={deletingAccount}
                            className={`flex-1 font-bold py-3 px-4 rounded-2xl transition text-base text-white
                              ${deletingAccount
                                ? 'bg-red-400 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-700'
                              }`}
                          >
                            {deletingAccount ? t('account.privacy.deleting') : t('account.privacy.deleteConfirmButton')}
                          </button>
                        </div>
                        {deleteError && (
                          <p className="text-sm text-red-600 dark:text-red-400 text-center">{deleteError}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Help Tab */}
            {activeTab === 'help' && (
              <div className="space-y-6">
                {/* FAQ accordion */}
                <div>
                  <h3 className="font-bold text-lg mb-3">{t('account.help.faqTitle')}</h3>
                  <div className="space-y-2">
                    {t('account.help.faq').map((item, i) => (
                      <div key={i} className={`rounded-2xl border ${cardTheme} overflow-hidden`}>
                        <button
                          onClick={() => setOpenFaqIndex(openFaqIndex === i ? -1 : i)}
                          className="w-full flex items-center justify-between px-5 py-4 text-left font-semibold text-base gap-3"
                          aria-expanded={openFaqIndex === i}
                        >
                          <span>{item.q}</span>
                          <svg
                            className={`w-5 h-5 shrink-0 transition-transform ${openFaqIndex === i ? 'rotate-180' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {openFaqIndex === i && (
                          <div className={`px-5 pb-4 text-base leading-relaxed ${subtleText}`}>
                            {item.a}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Send Feedback */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="font-bold text-lg mb-1">{t('account.help.feedbackTitle')}</h3>
                  <p className={`text-sm mb-3 ${subtleText}`}>{t('account.help.feedbackSubtitle')}</p>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder={t('account.help.feedbackPlaceholder')}
                    rows={4}
                    disabled={feedbackStatus === 'sending' || feedbackStatus === 'success'}
                    className={`w-full px-4 py-3 rounded-2xl border text-base resize-none ${cardTheme} disabled:opacity-60`}
                  />
                  {feedbackStatus === 'success' && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-2">{t('account.help.feedbackSuccess')}</p>
                  )}
                  {feedbackStatus === 'error' && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-2">{t('account.help.feedbackError')}</p>
                  )}
                  <button
                    onClick={handleSubmitFeedback}
                    disabled={!feedbackText.trim() || feedbackStatus === 'sending' || feedbackStatus === 'success'}
                    className="w-full mt-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-4 rounded-2xl transition text-lg"
                  >
                    {feedbackStatus === 'sending' ? t('account.help.feedbackSending') : t('account.help.feedbackSubmit')}
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
