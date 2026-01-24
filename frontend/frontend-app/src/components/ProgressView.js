import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useLanguage } from "../LanguageContext";
import { API_BASE_URL } from "../config/constants";

export function ProgressView({ cardTheme, subtleText, fontSizes, contrast }) {
  const { t } = useLanguage();
  const [conversationSearch, setConversationSearch] = useState('');
  const [timeStats, setTimeStats] = useState({
    totalMinutes: 0,
    dailyAverageMinutes: 0,
    todayMinutes: 0,
    conversationCount: 0,
    topicDiversity: 0,
    currentStreak: 0
  });
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [showConversations, setShowConversations] = useState(false);
  const [candoData, setCandoData] = useState(null);
  const [loadingCando, setLoadingCando] = useState(true);

  useEffect(() => {
    loadTimeStats();
    loadTranscriptions();
    loadCanDoAchievements();
  }, []);

  const loadTimeStats = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { data: sessionsData, error } = await supabase
      .from('conversation_sessions')
      .select('duration_minutes, started_at, topic')
      .eq('user_id', user.id)
      .not('duration_minutes', 'is', null);

    if (error) {
      console.error('Error loading time stats:', error);
      setLoading(false);
      return;
    }

    if (sessionsData && sessionsData.length > 0) {
      const totalMinutes = sessionsData.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayMinutes = sessionsData
        .filter(s => new Date(s.started_at) >= today)
        .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

      const firstSessionDate = new Date(Math.min(...sessionsData.map(s => new Date(s.started_at))));
      const daysSinceStart = Math.max(1, Math.ceil((Date.now() - firstSessionDate) / (1000 * 60 * 60 * 24)));
      const dailyAverageMinutes = Math.round(totalMinutes / daysSinceStart);

      const conversationCount = sessionsData.length;
      const uniqueTopics = new Set(sessionsData.map(s => s.topic).filter(t => t && t.trim() !== ''));
      const topicDiversity = uniqueTopics.size;

      const sessionDates = sessionsData
        .map(s => {
          const date = new Date(s.started_at);
          date.setHours(0, 0, 0, 0);
          return date.getTime();
        })
        .sort((a, b) => b - a);

      const uniqueDates = [...new Set(sessionDates)];

      let currentStreak = 0;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);

      let checkDate = uniqueDates.includes(todayStart.getTime())
        ? todayStart.getTime()
        : (uniqueDates.includes(yesterdayStart.getTime()) ? yesterdayStart.getTime() : null);

      if (checkDate) {
        currentStreak = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
          const expectedDate = new Date(checkDate);
          expectedDate.setDate(expectedDate.getDate() - i);
          expectedDate.setHours(0, 0, 0, 0);

          if (uniqueDates[i] === expectedDate.getTime()) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      setTimeStats({
        totalMinutes,
        dailyAverageMinutes,
        todayMinutes,
        conversationCount,
        topicDiversity,
        currentStreak
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

  const loadCanDoAchievements = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    setLoadingCando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
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
      }
    } catch (error) {
      console.error('[ProgressView] Error fetching Can-Do achievements:', error);
    } finally {
      setLoadingCando(false);
    }
  };

  const loadTranscriptions = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

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

    const formattedSessions = (sessionsData || []).map(session => ({
      ...session,
      title: session.topic || `Conversation on ${new Date(session.started_at).toLocaleDateString()}`,
      date: new Date(session.started_at),
      expanded: false,
      transcripts: [],
      allText: session.transcriptions?.map(t => t.text).join(' ') || ''
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
    const updatedSessions = sessions.map(s => {
      if (s.id === sessionId) {
        if (s.expanded) {
          return { ...s, expanded: false };
        } else {
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

    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return { ...s, transcripts: data || [] };
      }
      return s;
    }));
  };

  return (
    <section aria-label="Progress dashboard" className="flex flex-col gap-6">
      <div>
        <h2 className={`${fontSizes.xxxl} font-bold`}>{t('progress.title')}</h2>
        <p className={`${subtleText} ${fontSizes.lg} mt-1`}>{t('progress.updated')}: {new Date().toLocaleDateString()}</p>
      </div>

      <div className={`rounded-2xl border p-6 ${cardTheme}`}>
        <h3 className={`font-bold ${fontSizes.xl} mb-4`}>{t('progress.practiceTime')}</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className={`${subtleText} ${fontSizes.base}`}>{t('progress.totalTime')}</div>
            <div className={`${fontSizes.xxl} font-bold mt-1 text-green-600 dark:text-green-400`}>
              {formatTime(timeStats.totalMinutes)}
            </div>
          </div>
          <div className="text-center">
            <div className={`${subtleText} ${fontSizes.base}`}>{t('progress.dailyAverage')}</div>
            <div className={`${fontSizes.xxl} font-bold mt-1 text-blue-600 dark:text-blue-400`}>
              {formatTime(timeStats.dailyAverageMinutes)}
            </div>
          </div>
          <div className="text-center">
            <div className={`${subtleText} ${fontSizes.base}`}>{t('progress.today')}</div>
            <div className={`${fontSizes.xxl} font-bold mt-1 text-purple-600 dark:text-purple-400`}>
              {formatTime(timeStats.todayMinutes)}
            </div>
          </div>
        </div>
      </div>

      <div className={`rounded-2xl border p-6 ${cardTheme}`}>
        <h3 className={`font-bold ${fontSizes.xl} mb-4`}>{t('progress.learningJourney')}</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className={`${subtleText} ${fontSizes.base}`}>{t('progress.conversations')}</div>
            <div className={`${fontSizes.xxl} font-bold mt-1 text-green-600 dark:text-green-400`}>
              {timeStats.conversationCount}
            </div>
            <div className={`${subtleText} text-sm mt-1`}>
              {timeStats.conversationCount === 1 ? t('progress.session') : t('progress.sessions')}
            </div>
          </div>
          <div className="text-center">
            <div className={`${subtleText} ${fontSizes.base}`}>{t('progress.practiceStreak')}</div>
            <div className={`${fontSizes.xxl} font-bold mt-1 text-orange-600 dark:text-orange-400`}>
              {timeStats.currentStreak}
            </div>
            <div className={`${subtleText} text-sm mt-1`}>
              {timeStats.currentStreak === 1 ? t('progress.day') : t('progress.days')}
            </div>
          </div>
          <div className="text-center">
            <div className={`${subtleText} ${fontSizes.base}`}>{t('progress.topicsExplored')}</div>
            <div className={`${fontSizes.xxl} font-bold mt-1 text-blue-600 dark:text-blue-400`}>
              {timeStats.topicDiversity}
            </div>
            <div className={`${subtleText} text-sm mt-1`}>
              {timeStats.topicDiversity === 1 ? t('progress.topic') : t('progress.topics')}
            </div>
          </div>
        </div>
      </div>

      {/* Can-Do Achievements Section */}
      <div className={`rounded-2xl border p-6 ${cardTheme}`}>
        <h3 className={`font-bold ${fontSizes.xl} mb-4`}>Can-Do Achievements</h3>
        {loadingCando ? (
          <p className={`${subtleText} text-center py-4`}>Loading achievements...</p>
        ) : candoData && candoData.progress_by_level && candoData.progress_by_level.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className={`${fontSizes.lg} font-semibold`}>Total Achievements</span>
              <span className={`${fontSizes.xl} font-bold text-green-600 dark:text-green-400`}>
                {candoData.total_achievements}
              </span>
            </div>
            {candoData.progress_by_level.map(level => (
              <div key={level.level} className={`p-4 rounded-xl border ${contrast ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-bold ${fontSizes.lg}`}>{level.level}</span>
                  <span className={`${subtleText} ${fontSizes.base}`}>
                    {level.achieved}/{level.total} ({Math.round(level.percentage)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-green-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${level.percentage}%` }}
                  />
                </div>
                {level.recent_achievements && level.recent_achievements.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {level.recent_achievements.slice(0, 2).map((achievement, idx) => (
                      <div key={idx} className={`text-sm pl-3 border-l-2 border-green-500 ${subtleText}`}>
                        {achievement.descriptor}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={`text-center py-8 ${subtleText}`}>
            <p className="mb-2">No achievements yet</p>
            <p className={`text-sm`}>Start a conversation to unlock your first Can-Do statements!</p>
          </div>
        )}
      </div>

      <div className={`rounded-2xl border p-6 ${cardTheme}`}>
        <h3 className={`font-bold ${fontSizes.xl} mb-3`}>{t('progress.myConversations')}</h3>

        <div className="mb-4">
          <input
            type="text"
            placeholder={t('progress.searchPlaceholder')}
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

                    {session.expanded && (
                      <div className={`px-4 pb-4 pt-3 border-t ${contrast ? 'border-gray-700' : 'border-gray-200'}`}>
                        {session.transcripts.length > 0 ? (
                          <div className="space-y-3">
                            {session.transcripts.map((transcript, tIdx) => {
                              const isBot = transcript.text.toLowerCase().startsWith('bot:') || transcript.text.toLowerCase().startsWith('assistant:');
                              const isUser = transcript.text.toLowerCase().startsWith('user:') || transcript.text.toLowerCase().startsWith('you:');

                              let displayText = transcript.text;
                              if (isBot) {
                                displayText = transcript.text.replace(/^(bot:|assistant:)\s*/i, '');
                              } else if (isUser) {
                                displayText = transcript.text.replace(/^(user:|you:)\s*/i, '');
                              }

                              const messageRole = isBot ? 'bot' : 'user';

                              return (
                                <div key={transcript.id || tIdx} className={`flex gap-3 ${messageRole === 'user' ? 'flex-row-reverse' : ''}`}>
                                  <div className={`w-10 h-10 rounded-full flex-shrink-0 grid place-items-center ${messageRole === 'bot' ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                    {messageRole === 'bot' ? '🤖' : '🙂'}
                                  </div>
                                  <div className={`flex-1 rounded-2xl px-4 py-3 border max-w-[80%] ${messageRole === 'bot' ? 'bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-900 dark:text-gray-100' : 'bg-green-50 dark:bg-green-900/50 border-green-200 dark:border-green-800 text-gray-900 dark:text-gray-100'}`}>
                                    <p className={`${fontSizes.base} leading-relaxed`}>{displayText}</p>
                                    {transcript.corrected_text && (
                                      <p className={`${fontSizes.base} ${subtleText} italic mt-2 pt-2 border-t ${contrast ? 'border-gray-600' : 'border-gray-200'}`}>
                                        Corrected: {transcript.corrected_text}
                                      </p>
                                    )}
                                    <p className={`text-xs ${subtleText} mt-2`}>
                                      {new Date(transcript.created_at).toLocaleTimeString()}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className={`text-center py-4 ${subtleText} text-sm`}>
                            {t('progress.noTranscripts')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-center py-8 ${subtleText}`}>
                {conversationSearch ? t('progress.noMatchingConversations') : t('progress.noConversationsYet')}
              </p>
            )}
            <button
              onClick={() => setShowConversations(false)}
              className={`w-full text-center py-3 mt-4 rounded-xl border font-semibold ${cardTheme} hover:bg-gray-100 dark:hover:bg-gray-800 transition ${fontSizes.base}`}
            >
              {t('progress.hideConversations')}
            </button>
          </>
        ) : (
          <button
            onClick={() => setShowConversations(true)}
            className={`w-full text-center py-4 rounded-xl border font-semibold ${cardTheme} hover:bg-gray-100 dark:hover:bg-gray-800 transition ${fontSizes.lg}`}
          >
            {t('progress.viewConversations')} ({sessions.length})
          </button>
        )}
      </div>
    </section>
  );
}
