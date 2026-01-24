import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useLanguage } from "../LanguageContext";
import { AppIcon } from "./icons";

export function OnboardingScreen({ onStart }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [validatingCode, setValidatingCode] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [premiumDays, setPremiumDays] = useState(0);
  const { t, language, setLanguage } = useLanguage();

  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [age, setAge] = useState('');
  const [nativeLanguage, setNativeLanguage] = useState('');
  const [country, setCountry] = useState('');
  const [englishLevel, setEnglishLevel] = useState('A2');
  const [studyMethod, setStudyMethod] = useState('');
  const [institutionName, setInstitutionName] = useState('');

  const handleAuth = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    if (isSignUp) {
      if (!invitationCode.trim()) {
        setMessage('Please enter an invitation code to sign up.');
        setLoading(false);
        return;
      }

      setValidatingCode(true);

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

      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });

      if (authError) {
        setMessage(authError.message);
        setLoading(false);
        return;
      }

      if (authData.user) {
        const { data: useCodeData, error: useCodeError } = await supabase.rpc(
          'use_invitation_code',
          {
            code_input: invitationCode.trim(),
            user_id_input: authData.user.id
          }
        );

        if (useCodeError) {
          setMessage('Account created but failed to apply invitation code. Please contact support.');
          setLoading(false);
          return;
        }

        if (!useCodeData.success) {
          setMessage('Account created but invitation code could not be applied: ' + useCodeData.error);
          setLoading(false);
          return;
        }

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
            study_method: studyMethod,
            institution_name: institutionName || null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          });

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }

        setPremiumDays(useCodeData.grants_premium ? useCodeData.premium_duration_days : 0);
        setShowConfirmation(true);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message);
      } else {
        setMessage('Logged in successfully!');
      }
    }

    setLoading(false);
  };

  if (showConfirmation) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-blue-50 text-gray-900 min-h-screen flex flex-col justify-center items-center text-center p-8">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl p-12">
          <div className="mx-auto w-32 h-32 mb-8 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-6xl">📧</span>
          </div>
          <h1 className="text-5xl font-extrabold mb-6 text-green-700">{t('confirmation.title')}</h1>
          <p className="text-2xl text-gray-700 mb-8 leading-relaxed">
            {t('confirmation.sentTo')} <strong className="text-green-600">{email}</strong>
          </p>

          <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-6 mb-8">
            <p className="text-lg text-gray-800 font-semibold mb-4">📬 {t('confirmation.nextSteps')}</p>
            <ol className="text-left text-lg text-gray-700 space-y-3 ml-4">
              <li>1️⃣ {t('confirmation.step1')}</li>
              <li>2️⃣ {t('confirmation.step2')}</li>
              <li>3️⃣ {t('confirmation.step3')}</li>
              <li>4️⃣ {t('confirmation.step4')}</li>
            </ol>
          </div>

          {premiumDays > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl p-6 mb-8">
              <p className="text-xl font-bold text-yellow-800">
                🎉 You have <span className="text-2xl text-yellow-600">{premiumDays} days</span> of premium access!
              </p>
            </div>
          )}

          <p className="text-gray-500 text-sm mb-6">{t('confirmation.noEmail')}</p>

          <button
            onClick={() => {
              setShowConfirmation(false);
              setIsSignUp(false);
            }}
            className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white text-xl font-bold rounded-xl shadow-lg transition"
          >
            {t('confirmation.backToLogin')}
          </button>
        </div>
      </div>
    );
  }

  const countries = [
    "Spain", "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria",
    "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
    "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cambodia",
    "Cameroon", "Canada", "Cape Verde", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros",
    "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica",
    "Dominican Republic", "East Timor", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia",
    "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada",
    "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia",
    "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati",
    "North Korea", "South Korea", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya",
    "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta",
    "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro",
    "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger",
    "Nigeria", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea",
    "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis",
    "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia",
    "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia",
    "South Africa", "South Sudan", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan",
    "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan",
    "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
    "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
  ];

  return (
    <div className="bg-gray-50 text-gray-900 min-h-screen flex flex-col justify-center items-center text-center p-8 relative">
      <button
        className="absolute top-4 right-4 px-3 py-2 rounded-xl border border-gray-300 bg-white text-sm font-semibold hover:bg-gray-100 transition"
        onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
        aria-label="Change language"
      >
        {language === 'es' ? '🇬🇧 English' : '🇪🇸 Español'}
      </button>

      <div className="max-w-md w-full">
        <div className="mx-auto w-24 h-24 mb-6 bg-green-100 rounded-3xl flex items-center justify-center">
          <AppIcon />
        </div>
        <h1 className="text-4xl font-bold mb-4">{t('auth.welcome')}</h1>
        <p className="text-xl text-gray-600 mb-8">{t('auth.subtitle')}</p>

        <form onSubmit={handleAuth} className="flex flex-col gap-4 text-left">
          <input type="email" placeholder={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-5 py-3 rounded-xl border border-gray-300 focus:ring-green-500 focus:border-green-500 text-lg" required />
          <input type="password" placeholder={t('auth.password')} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-5 py-3 rounded-xl border border-gray-300 focus:ring-green-500 focus:border-green-500 text-lg" required />

          {isSignUp && (
            <>
              <input type="text" placeholder={t('auth.invitationCode')} value={invitationCode} onChange={(e) => setInvitationCode(e.target.value.toUpperCase())} className="w-full px-5 py-3 rounded-xl border border-gray-300 focus:ring-green-500 focus:border-green-500 text-lg font-mono tracking-wider" required />
              <p className="text-sm text-gray-600 -mt-2">
                {t('auth.noCode')} <a href="mailto:bernardm@ucm.es?subject=Invitation%20Code%20Request" className="text-green-600 hover:underline font-semibold">{t('auth.requestCode')}</a>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder={t('auth.firstName')} value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-green-500 focus:border-green-500" required />
                <input type="text" placeholder={t('auth.lastName')} value={surname} onChange={(e) => setSurname(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-green-500 focus:border-green-500" required />
              </div>
              <input type="number" placeholder={t('auth.age')} value={age} onChange={(e) => setAge(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-green-500 focus:border-green-500" />
              <select value={nativeLanguage} onChange={(e) => setNativeLanguage(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-green-500 focus:border-green-500" required>
                <option value="">{t('auth.selectLanguage')}</option>
                {['Spanish', 'Portuguese', 'French', 'German', 'Italian', 'Mandarin', 'Japanese', 'Korean', 'Arabic', 'Russian', 'Hindi', 'Other'].map(lang => (
                  <option key={lang} value={lang}>{t(`languages.${lang}`)}</option>
                ))}
              </select>
              <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-green-500 focus:border-green-500" required>
                <option value="">{t('auth.selectCountry')}</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={englishLevel} onChange={(e) => setEnglishLevel(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-green-500 focus:border-green-500">
                {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(level => (
                  <option key={level} value={level}>{t(`levels.${level}`)}</option>
                ))}
              </select>
              <select value={studyMethod} onChange={(e) => setStudyMethod(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-green-500 focus:border-green-500" required>
                <option value="">{t('auth.studyMethod')}</option>
                {['Academy', 'App', 'Self-study', 'Private tutor', 'Other'].map(method => (
                  <option key={method} value={method}>{t(`studyMethods.${method}`)}</option>
                ))}
              </select>
              {(studyMethod === 'Academy' || studyMethod === 'App' || studyMethod === 'Private tutor' || studyMethod === 'Other') && (
                <input
                  type="text"
                  placeholder={studyMethod === 'Academy' ? t('auth.academyName') : studyMethod === 'App' ? t('auth.appName') : studyMethod === 'Private tutor' ? t('auth.tutorName') : t('auth.pleaseSpecify')}
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-green-500 focus:border-green-500"
                  required={studyMethod === 'Academy' || studyMethod === 'App'}
                />
              )}
            </>
          )}

          <button type="submit" className="w-full text-xl font-semibold bg-green-600 text-white py-5 px-8 rounded-2xl shadow-lg hover:bg-green-700 transition" disabled={loading}>
            {loading ? t('auth.loading') : (isSignUp ? t('auth.signUp') : t('auth.logIn'))}
          </button>
          <button type="button" onClick={() => setIsSignUp(prev => !prev)} className="w-full text-lg font-semibold text-green-600 py-3">
            {isSignUp ? t('auth.alreadyHaveAccount') : t('auth.needAccount')}
          </button>
        </form>
        {message && <p className="mt-4 text-red-500 text-lg">{message}</p>}
      </div>
    </div>
  );
}
