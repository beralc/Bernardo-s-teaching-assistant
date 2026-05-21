import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { API_BASE_URL } from "../config/constants";

export function AdminView({ cardTheme, subtleText, fontSizes, contrast }) {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('codes');

  const [newCodePrefix, setNewCodePrefix] = useState('BETA');
  const [newCodeMaxUses, setNewCodeMaxUses] = useState(1);
  const [newCodeGrantsPremium, setNewCodeGrantsPremium] = useState(false);
  const [newCodePremiumDays, setNewCodePremiumDays] = useState(30);
  const [newCodeDescription, setNewCodeDescription] = useState('');
  const [newCodeTag, setNewCodeTag] = useState('BETA');

  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userSessions, setUserSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionMessages, setSessionMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exporting, setExporting] = useState(false);

  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserSurname, setNewUserSurname] = useState('');
  const [newUserTier, setNewUserTier] = useState('free');
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);

  const [candoUsers, setCandoUsers] = useState([]);
  const [selectedCandoUserId, setSelectedCandoUserId] = useState(null);
  const [selectedUserCandoData, setSelectedUserCandoData] = useState(null);
  const [loadingCando, setLoadingCando] = useState(false);
  const [reanalyzingCando, setReanalyzingCando] = useState(false);
  const [reanalyzeProgress, setReanalyzeProgress] = useState('');
  const [reanalyzingFeedback, setReanalyzingFeedback] = useState(false);
  const [feedbackProgress, setFeedbackProgress] = useState('');

  // Research export settings
  const [anonymizeExport, setAnonymizeExport] = useState(true);
  const [researchStartDate, setResearchStartDate] = useState('');
  const [researchEndDate, setResearchEndDate] = useState('');

  const [vadThreshold, setVadThreshold] = useState(0.85);
  const [silenceDurationMs, setSilenceDurationMs] = useState(800);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    if (activeTab === 'codes') {
      loadCodes();
    } else if (activeTab === 'conversations') {
      loadUsers();
    } else if (activeTab === 'users') {
      loadAllUsers();
    } else if (activeTab === 'cando') {
      loadCandoUsers();
    } else if (activeTab === 'settings') {
      loadConfig();
    }
  }, [activeTab]);

  const loadConfig = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const resp = await fetch(`${API_BASE_URL}/admin/config`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });
    if (resp.ok) {
      const cfg = await resp.json();
      if (cfg.vad_threshold !== undefined) setVadThreshold(parseFloat(cfg.vad_threshold));
      if (cfg.silence_duration_ms !== undefined) setSilenceDurationMs(parseInt(cfg.silence_duration_ms));
    }
  };

  const saveConfig = async () => {
    setSavingConfig(true);
    const { data: { session } } = await supabase.auth.getSession();
    const resp = await fetch(`${API_BASE_URL}/admin/config`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ vad_threshold: vadThreshold, silence_duration_ms: silenceDurationMs })
    });
    setSavingConfig(false);
    if (resp.ok) {
      setMessage('Settings saved. Takes effect on next voice session.');
      setTimeout(() => setMessage(''), 4000);
    } else {
      setMessage('Error saving settings.');
    }
  };

  const loadCodes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('invitation_codes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      setMessage('Error loading codes: ' + error.message);
    } else {
      setCodes(data || []);
    }
    setLoading(false);
  };

  const generateCode = async () => {
    setGenerating(true);
    setMessage('');

    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const code = `${newCodePrefix}${randomPart}`;

    const { error } = await supabase
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
      loadCodes();
      setNewCodeDescription('');
    }
    setGenerating(false);
  };

  const toggleCodeStatus = async (codeId, currentStatus) => {
    const { error } = await supabase
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

  const loadUsers = async () => {
    setLoadingConversations(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, surname, created_at')
      .order('created_at', { ascending: false });

    if (error) {
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
      setMessage('Error loading sessions: ' + error.message);
    } else {
      setUserSessions(data || []);
    }
    setLoadingConversations(false);
  };

  const loadAllUsers = async () => {
    setLoadingUsers(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage('Error: Not authenticated');
        setLoadingUsers(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load users');
      }

      const data = await response.json();
      setAllUsers(data.users || []);
    } catch (error) {
      setMessage('Error loading users: ' + error.message);
    }

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage('Error: Not authenticated');
        setGenerating(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
          name: newUserName,
          surname: newUserSurname,
          tier: newUserTier,
          is_admin: newUserIsAdmin
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user');
      }

      setMessage(`User created successfully: ${newUserEmail}`);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserName('');
      setNewUserSurname('');
      setNewUserTier('free');
      setNewUserIsAdmin(false);
      setShowCreateUser(false);
      loadAllUsers();
    } catch (error) {
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage('Error: Not authenticated');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      setMessage(`User ${userEmail} deleted successfully`);
      loadAllUsers();
    } catch (error) {
      setMessage('Error deleting user: ' + error.message);
    }
  };

  const resetPassword = async (userId, userEmail) => {
    const newPassword = window.prompt(`Enter new password for ${userEmail}:`);

    if (!newPassword) return;
    if (newPassword.length < 6) {
      setMessage('Error: Password must be at least 6 characters');
      return;
    }

    setMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage('Error: Not authenticated');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: newPassword })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reset password');
      }

      setMessage(`Password reset successfully for ${userEmail}`);
    } catch (error) {
      setMessage('Error resetting password: ' + error.message);
    }
  };

  const updateUserTier = async (userId, currentTier, userEmail) => {
    setMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage('Error: Not authenticated');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/tier`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tier: currentTier })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update tier');
      }

      setMessage(`Tier updated successfully for ${userEmail}`);
      loadAllUsers();
    } catch (error) {
      setMessage('Error updating tier: ' + error.message);
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
      const { data: sessions, error: sessionsError } = await supabase
        .from('conversation_sessions')
        .select('*')
        .gte('started_at', exportStartDate)
        .lte('started_at', exportEndDate + 'T23:59:59')
        .order('started_at', { ascending: true });

      if (sessionsError) throw sessionsError;

      if (!sessions || sessions.length === 0) {
        setMessage('No conversations found in this date range');
        setExporting(false);
        return;
      }

      const userIds = [...new Set(sessions.map(s => s.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, surname, age, native_language, country, english_level, tier, created_at, is_admin')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = {};
      profiles?.forEach(p => { profileMap[p.id] = p; });

      const sessionIds = sessions.map(s => s.id);
      const { data: messages, error: messagesError } = await supabase
        .from('conversation_messages')
        .select('*')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      const exportData = sessions.map(session => {
        const sessionMsgs = messages?.filter(m => m.session_id === session.id) || [];
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
          conversation: sessionMsgs.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.created_at
          }))
        };
      });

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
      setMessage('Error exporting: ' + error.message);
    }

    setExporting(false);
  };

  const exportAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, surname, age, native_language, country, study_method, institution_name, english_level, tier, monthly_voice_minutes_used, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const headers = ['ID', 'Name', 'Surname', 'Age', 'Native Language', 'Country', 'Study Method', 'Institution', 'CEFR Level', 'Tier', 'Minutes Used', 'Created At', 'Updated At'];
      const csvRows = [headers.join(',')];

      data.forEach(user => {
        const row = [
          user.id, user.name || '', user.surname || '', user.age || '', user.native_language || '',
          user.country || '', user.study_method || '', user.institution_name || '', user.english_level || '',
          user.tier || 'free', user.monthly_voice_minutes_used || 0, user.created_at || '', user.updated_at || ''
        ];
        csvRows.push(row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));
      });

      const csv = csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setMessage(`Exported ${data.length} users successfully!`);
    } catch (error) {
      setMessage('Error exporting users: ' + error.message);
    }
  };

  const exportAllSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('conversation_sessions')
        .select('id, user_id, started_at, ended_at, duration_minutes, topic, created_at')
        .order('started_at', { ascending: false });

      if (error) throw error;

      const headers = ['Session ID', 'User ID', 'Started At', 'Ended At', 'Duration (min)', 'Topic', 'Created At'];
      const csvRows = [headers.join(',')];

      data.forEach(session => {
        const row = [
          session.id, session.user_id, session.started_at || '', session.ended_at || '',
          session.duration_minutes || 0, session.topic || '', session.created_at || ''
        ];
        csvRows.push(row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));
      });

      const csv = csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sessions_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setMessage(`Exported ${data.length} sessions successfully!`);
    } catch (error) {
      setMessage('Error exporting sessions: ' + error.message);
    }
  };

  const exportAllTranscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('transcriptions')
        .select('id, user_id, session_id, text, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const headers = ['Transcription ID', 'User ID', 'Session ID', 'Text', 'Created At'];
      const csvRows = [headers.join(',')];

      data.forEach(transcript => {
        const row = [
          transcript.id, transcript.user_id, transcript.session_id || '',
          transcript.text || '', transcript.created_at || ''
        ];
        csvRows.push(row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));
      });

      const csv = csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcriptions_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setMessage(`Exported ${data.length} transcriptions successfully!`);
    } catch (error) {
      setMessage('Error exporting transcriptions: ' + error.message);
    }
  };

  // Helper to generate participant codes (P001, P002, ...)
  const generateParticipantCodes = (userIds) => {
    const sorted = [...userIds].sort();
    const codeMap = {};
    sorted.forEach((id, index) => {
      codeMap[id] = `P${String(index + 1).padStart(3, '0')}`;
    });
    return codeMap;
  };

  // Export discourse analysis format (for thesis Chapter 7)
  const exportDiscourseAnalysis = async () => {
    if (!researchStartDate || !researchEndDate) {
      setMessage('Please select both start and end dates for export');
      return;
    }

    setExporting(true);
    setMessage('');

    try {
      // Get sessions in date range
      const { data: sessions, error: sessionsError } = await supabase
        .from('conversation_sessions')
        .select('id, user_id, started_at, ended_at, duration_minutes, topic')
        .gte('started_at', researchStartDate)
        .lte('started_at', researchEndDate + 'T23:59:59')
        .order('started_at', { ascending: true });

      if (sessionsError) throw sessionsError;

      if (!sessions || sessions.length === 0) {
        setMessage('No sessions found in this date range');
        setExporting(false);
        return;
      }

      // Get user profiles for level info
      const userIds = [...new Set(sessions.map(s => s.user_id))];
      const participantCodes = anonymizeExport ? generateParticipantCodes(userIds) : null;

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, surname, english_level')
        .in('id', userIds);

      if (profilesError) throw profilesError;
      const profileMap = {};
      profiles?.forEach(p => { profileMap[p.id] = p; });

      // Get all messages
      const sessionIds = sessions.map(s => s.id);
      const { data: messages, error: messagesError } = await supabase
        .from('conversation_messages')
        .select('session_id, role, content, created_at')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Build CSV with discourse analysis format
      const headers = [
        'participant_id', 'session_id', 'session_date', 'topic', 'duration_min',
        'user_level', 'turn_number', 'speaker', 'timestamp', 'utterance', 'word_count'
      ];
      const csvRows = [headers.join(',')];

      sessions.forEach(session => {
        const sessionMsgs = messages?.filter(m => m.session_id === session.id) || [];
        const profile = profileMap[session.user_id];
        const participantId = anonymizeExport ? participantCodes[session.user_id] : session.user_id;
        const sessionId = anonymizeExport ? `S${session.id.substring(0, 8)}` : session.id;

        sessionMsgs.forEach((msg, turnIndex) => {
          const wordCount = msg.content ? msg.content.split(/\s+/).length : 0;
          const row = [
            participantId,
            sessionId,
            session.started_at?.split('T')[0] || '',
            `"${(session.topic || 'Free conversation').replace(/"/g, '""')}"`,
            session.duration_minutes || 0,
            profile?.english_level || 'Unknown',
            turnIndex + 1,
            msg.role === 'user' ? 'Learner' : 'AI',
            msg.created_at || '',
            `"${(msg.content || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
            wordCount
          ];
          csvRows.push(row.join(','));
        });
      });

      // Download
      const csv = csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const suffix = anonymizeExport ? '_anonymized' : '';
      a.download = `discourse_analysis${suffix}_${researchStartDate}_to_${researchEndDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      const totalTurns = csvRows.length - 1;
      setMessage(`Exported ${sessions.length} sessions (${totalTurns} turns) for discourse analysis!`);
    } catch (error) {
      setMessage('Error exporting discourse data: ' + error.message);
    }

    setExporting(false);
  };

  // Export Can-Do achievements (CANDO-05)
  const exportCanDoAchievements = async () => {
    setExporting(true);
    setMessage('');

    try {
      // Get all achievements with statement details
      const { data: achievements, error: achievementsError } = await supabase
        .from('user_cando_achievements')
        .select(`
          user_id,
          cando_id,
          session_id,
          detected_by,
          confidence_score,
          evidence_text,
          created_at,
          cando_statements (
            level,
            skill_type,
            descriptor
          )
        `)
        .order('created_at', { ascending: true });

      if (achievementsError) throw achievementsError;

      if (!achievements || achievements.length === 0) {
        setMessage('No Can-Do achievements found');
        setExporting(false);
        return;
      }

      // Get user profiles
      const userIds = [...new Set(achievements.map(a => a.user_id))];
      const participantCodes = anonymizeExport ? generateParticipantCodes(userIds) : null;

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, surname, english_level')
        .in('id', userIds);

      if (profilesError) throw profilesError;
      const profileMap = {};
      profiles?.forEach(p => { profileMap[p.id] = p; });

      // Build CSV
      const headers = [
        'participant_id', 'participant_level', 'cando_level', 'skill_type',
        'descriptor', 'confidence', 'detected_by', 'date', 'evidence'
      ];
      const csvRows = [headers.join(',')];

      achievements.forEach(achievement => {
        const profile = profileMap[achievement.user_id];
        const participantId = anonymizeExport ? participantCodes[achievement.user_id] : achievement.user_id;
        const stmt = achievement.cando_statements;

        const row = [
          participantId,
          profile?.english_level || 'Unknown',
          stmt?.level || '',
          stmt?.skill_type || '',
          `"${(stmt?.descriptor || '').replace(/"/g, '""')}"`,
          achievement.confidence_score ? achievement.confidence_score.toFixed(2) : '',
          achievement.detected_by || 'unknown',
          achievement.created_at?.split('T')[0] || '',
          `"${(achievement.evidence_text || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
        ];
        csvRows.push(row.join(','));
      });

      // Download
      const csv = csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const suffix = anonymizeExport ? '_anonymized' : '';
      a.download = `cando_achievements${suffix}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setMessage(`Exported ${achievements.length} Can-Do achievements!`);
    } catch (error) {
      setMessage('Error exporting Can-Do achievements: ' + error.message);
    }

    setExporting(false);
  };

  // Export feedback analysis data (FEED-04, Chapter 11)
  const exportFeedbackAnalysis = async () => {
    console.log('exportFeedbackAnalysis called');
    setExporting(true);
    setMessage('');

    try {
      // Get all feedback instances
      console.log('Querying feedback_instances table...');
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback_instances')
        .select(`
          user_id,
          session_id,
          turn_number,
          feedback_type,
          learner_utterance,
          learner_error,
          ai_response,
          corrected_form,
          uptake_detected,
          uptake_type,
          modified_output,
          confidence_score,
          evidence_notes,
          created_at
        `)
        .order('created_at', { ascending: true });

      console.log('Feedback query result:', { data: feedbackData, error: feedbackError });

      if (feedbackError) throw feedbackError;

      if (!feedbackData || feedbackData.length === 0) {
        setMessage('No feedback data found. Run some conversations first.');
        setExporting(false);
        return;
      }

      // Get user profiles
      const userIds = [...new Set(feedbackData.map(f => f.user_id))];
      const participantCodes = anonymizeExport ? generateParticipantCodes(userIds) : null;

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, english_level')
        .in('id', userIds);

      if (profilesError) throw profilesError;
      const profileMap = {};
      profiles?.forEach(p => { profileMap[p.id] = p; });

      // Build CSV
      const headers = [
        'participant_id', 'participant_level', 'session_date', 'turn_number',
        'feedback_type', 'learner_error', 'corrected_form',
        'uptake_detected', 'uptake_type', 'modified_output',
        'confidence', 'learner_utterance', 'ai_response', 'notes'
      ];
      const csvRows = [headers.join(',')];

      feedbackData.forEach(fb => {
        const profile = profileMap[fb.user_id];
        const participantId = anonymizeExport ? participantCodes[fb.user_id] : fb.user_id;

        const row = [
          participantId,
          profile?.english_level || 'Unknown',
          fb.created_at?.split('T')[0] || '',
          fb.turn_number || '',
          fb.feedback_type || '',
          `"${(fb.learner_error || '').replace(/"/g, '""')}"`,
          `"${(fb.corrected_form || '').replace(/"/g, '""')}"`,
          fb.uptake_detected ? 'Yes' : 'No',
          fb.uptake_type || '',
          fb.modified_output ? 'Yes' : 'No',
          fb.confidence_score ? fb.confidence_score.toFixed(2) : '',
          `"${(fb.learner_utterance || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
          `"${(fb.ai_response || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
          `"${(fb.evidence_notes || '').replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
      });

      // Download
      const csv = csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const suffix = anonymizeExport ? '_anonymized' : '';
      a.download = `feedback_analysis${suffix}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setMessage(`Exported ${feedbackData.length} feedback instances!`);
    } catch (error) {
      setMessage('Error exporting feedback data: ' + error.message);
    }

    setExporting(false);
  };

  const loadCandoUsers = async () => {
    setLoadingCando(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, surname, english_level')
      .order('name');

    if (error) {
      setMessage('Error loading users: ' + error.message);
    } else {
      setCandoUsers(data || []);
    }
    setLoadingCando(false);
  };

  const loadUserCandoData = async (userId) => {
    setLoadingCando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage('No session found');
        setLoadingCando(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/users/${userId}/cando`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedUserCandoData(data);
        setSelectedCandoUserId(userId);
      } else {
        setMessage('Error loading Can-Do data: ' + response.statusText);
      }
    } catch (error) {
      setMessage('Error: ' + error.message);
    }
    setLoadingCando(false);
  };

  const reanalyzeUserSessions = async (userId) => {
    console.log('reanalyzeUserSessions called with userId:', userId);
    if (!userId) {
      console.log('No userId provided, returning');
      return;
    }

    setReanalyzingCando(true);
    setReanalyzeProgress('Fetching sessions...');
    setMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Auth session:', session ? 'Found' : 'Not found');
      if (!session) {
        setMessage('No session found');
        setReanalyzingCando(false);
        return;
      }

      // Get all conversation sessions for this user (including incomplete ones for re-analysis)
      const { data: sessions, error: sessionsError } = await supabase
        .from('conversation_sessions')
        .select('id, topic, ended_at')
        .eq('user_id', userId);

      console.log('Sessions found:', sessions?.length || 0, sessions);

      if (sessionsError) {
        console.error('Sessions error:', sessionsError);
        setMessage('Error fetching sessions: ' + sessionsError.message);
        setReanalyzingCando(false);
        return;
      }

      if (!sessions || sessions.length === 0) {
        setMessage('No sessions found for this user.');
        setReanalyzingCando(false);
        return;
      }

      let analyzed = 0;
      let newAchievements = 0;

      for (const sess of sessions) {
        console.log(`Processing session ${analyzed + 1}/${sessions.length}: ${sess.id}`);
        setReanalyzeProgress(`Analyzing session ${analyzed + 1}/${sessions.length}...`);

        // Get conversation messages for this session
        const { data: messages, error: msgError } = await supabase
          .from('conversation_messages')
          .select('role, content')
          .eq('session_id', sess.id)
          .order('created_at', { ascending: true });

        console.log(`Session ${sess.id} messages:`, messages?.length || 0, msgError);

        if (msgError || !messages || messages.length === 0) {
          console.log(`Skipping session ${sess.id}: no messages`);
          analyzed++;
          continue;
        }

        // Build transcript from conversation messages
        const transcript = messages.map(m => `${m.role === 'user' ? 'Learner' : 'Teacher'}: ${m.content}`).join('\n');
        console.log(`Session ${sess.id} transcript length: ${transcript.length}`);

        if (transcript.trim().length < 20) {
          console.log(`Skipping session ${sess.id}: transcript too short`);
          analyzed++;
          continue;
        }

        // Call analyze_session endpoint
        try {
          console.log(`Calling analyze_session for session ${sess.id}, transcript length: ${transcript.length}`);
          const response = await fetch(`${API_BASE_URL}/analyze_session`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              session_id: sess.id,
              user_id: userId,
              transcript: transcript
            })
          });

          console.log(`Response status for session ${sess.id}: ${response.status}`);

          if (response.ok) {
            const result = await response.json();
            console.log(`Analysis result for session ${sess.id}:`, result);
            if (result.new_achievements) {
              newAchievements += result.new_achievements.length;
            }
          } else {
            const errorText = await response.text();
            console.error(`Error response for session ${sess.id}: ${response.status}`, errorText);
          }
        } catch (err) {
          console.error('Error analyzing session:', sess.id, err);
        }

        analyzed++;
      }

      setReanalyzeProgress('');
      setMessage(`Re-analysis complete! Analyzed ${analyzed} sessions, found ${newAchievements} new achievements.`);

      // Reload the user's Can-Do data
      await loadUserCandoData(userId);

    } catch (error) {
      setMessage('Error during re-analysis: ' + error.message);
    }

    setReanalyzingCando(false);
  };

  const reanalyzeUserFeedback = async (userId) => {
    console.log('reanalyzeUserFeedback called with userId:', userId);
    if (!userId) return;

    setReanalyzingFeedback(true);
    setFeedbackProgress('Fetching sessions...');
    setMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage('No session found');
        setReanalyzingFeedback(false);
        return;
      }

      // Get all conversation sessions for this user
      const { data: sessions, error: sessionsError } = await supabase
        .from('conversation_sessions')
        .select('id, topic')
        .eq('user_id', userId);

      if (sessionsError) {
        setMessage('Error fetching sessions: ' + sessionsError.message);
        setReanalyzingFeedback(false);
        return;
      }

      if (!sessions || sessions.length === 0) {
        setMessage('No sessions found for this user.');
        setReanalyzingFeedback(false);
        return;
      }

      let analyzed = 0;
      let totalFeedback = 0;

      for (const sess of sessions) {
        setFeedbackProgress(`Analyzing feedback ${analyzed + 1}/${sessions.length}...`);

        // Get conversation messages for this session
        const { data: messages, error: msgError } = await supabase
          .from('conversation_messages')
          .select('role, content')
          .eq('session_id', sess.id)
          .order('created_at', { ascending: true });

        if (msgError || !messages || messages.length < 4) {
          analyzed++;
          continue;
        }

        // Format transcript as array for feedback analysis
        const transcript = messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        }));

        try {
          const response = await fetch(`${API_BASE_URL}/analyze_feedback`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              session_id: sess.id,
              user_id: userId,
              transcript: transcript
            })
          });

          if (response.ok) {
            const result = await response.json();
            console.log(`Feedback result for session ${sess.id}:`, result);
            if (result.summary) {
              totalFeedback += (result.summary.recasts || 0) +
                              (result.summary.expansions || 0) +
                              (result.summary.explicit_corrections || 0);
            }
          }
        } catch (err) {
          console.error('Error analyzing feedback:', sess.id, err);
        }

        analyzed++;
      }

      setFeedbackProgress('');
      setMessage(`Feedback analysis complete! Analyzed ${analyzed} sessions, found ${totalFeedback} feedback instances.`);

    } catch (error) {
      setMessage('Error during feedback analysis: ' + error.message);
    }

    setReanalyzingFeedback(false);
  };

  return (
    <section aria-label="Admin dashboard" className="flex flex-col gap-6">
      <div>
        <h2 className={`${fontSizes.xxxl} font-bold`}>Admin Dashboard</h2>
        <p className={`${subtleText} ${fontSizes.lg} mt-1`}>Manage invitation codes and view conversations</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {['codes', 'conversations', 'users', 'cando', 'export', 'settings'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-semibold ${fontSizes.lg} transition whitespace-nowrap ${
              activeTab === tab
                ? 'border-b-2 border-green-600 text-green-600'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab === 'codes' ? 'Invitation Codes' : tab === 'conversations' ? 'User Conversations' : tab === 'users' ? 'Users' : tab === 'cando' ? 'Can-Do' : tab === 'export' ? 'Research Data' : 'Settings'}
          </button>
        ))}
      </div>

      {message && (
        <div className={`p-4 rounded-xl ${message.includes('Error') ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100' : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100'}`}>
          {message}
        </div>
      )}

      {activeTab === 'codes' && (
        <>
          <div className={`rounded-2xl border p-6 ${cardTheme}`}>
            <h3 className={`font-bold ${fontSizes.xl} mb-4`}>Generate New Invitation Code</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="code-prefix" className={`text-sm font-semibold ${subtleText} mb-1 block`}>Code Prefix</label>
                  <input id="code-prefix" name="code-prefix" type="text" value={newCodePrefix} onChange={(e) => setNewCodePrefix(e.target.value.toUpperCase())} className={`w-full px-3 py-2 rounded-lg border ${cardTheme} font-mono`} placeholder="BETA" />
                </div>
                <div>
                  <label htmlFor="code-tag" className={`text-sm font-semibold ${subtleText} mb-1 block`}>Tag</label>
                  <select id="code-tag" name="code-tag" value={newCodeTag} onChange={(e) => setNewCodeTag(e.target.value)} className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}>
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
                  <label htmlFor="code-max-uses" className={`text-sm font-semibold ${subtleText} mb-1 block`}>Max Uses (-1 = unlimited)</label>
                  <input id="code-max-uses" name="code-max-uses" type="number" value={newCodeMaxUses} onChange={(e) => setNewCodeMaxUses(parseInt(e.target.value))} className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`} />
                </div>
                <div>
                  <label htmlFor="code-grants-premium" className={`text-sm font-semibold ${subtleText} mb-1 block`}>
                    <input id="code-grants-premium" name="code-grants-premium" type="checkbox" checked={newCodeGrantsPremium} onChange={(e) => setNewCodeGrantsPremium(e.target.checked)} className="mr-2" />
                    Grants Premium Access
                  </label>
                  {newCodeGrantsPremium && (
                    <input id="code-premium-days" name="code-premium-days" type="number" value={newCodePremiumDays} onChange={(e) => setNewCodePremiumDays(parseInt(e.target.value))} className={`w-full px-3 py-2 rounded-lg border ${cardTheme} mt-2`} placeholder="Days of premium" />
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="code-description" className={`text-sm font-semibold ${subtleText} mb-1 block`}>Description</label>
                <input id="code-description" name="code-description" type="text" value={newCodeDescription} onChange={(e) => setNewCodeDescription(e.target.value)} className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`} placeholder="e.g., Beta testers batch 1" />
              </div>
              <button onClick={generateCode} disabled={generating} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl transition disabled:opacity-50">
                {generating ? 'Generating...' : 'Generate Code'}
              </button>
            </div>
          </div>

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
                          <code className={`font-mono font-bold ${fontSizes.lg} px-2 py-1 rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100`}>{code.code}</code>
                          <span className={`text-xs px-2 py-1 rounded ${code.tag === 'BETA' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100' : code.tag === 'FOUNDER' ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100'}`}>{code.tag}</span>
                          {code.grants_premium && <span className="text-xs px-2 py-1 rounded bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-100">Premium {code.premium_duration_days}d</span>}
                        </div>
                        <p className={`text-sm ${subtleText} mb-1`}>{code.description}</p>
                        <div className="flex items-center gap-4 text-xs">
                          <span className={subtleText}>Uses: {code.current_uses} / {code.max_uses === -1 ? '∞' : code.max_uses}</span>
                          <span className={subtleText}>Created: {new Date(code.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button onClick={() => toggleCodeStatus(code.id, code.is_active)} className={`px-3 py-1 rounded text-sm font-semibold ${code.is_active ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100' : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100'}`}>
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
          <div className={`rounded-2xl border p-6 ${cardTheme}`}>
            <h3 className={`font-bold ${fontSizes.xl} mb-4`}>Export Conversations</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>Start Date</label>
                  <input type="date" value={exportStartDate} onChange={(e) => setExportStartDate(e.target.value)} className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`} />
                </div>
                <div>
                  <label className={`text-sm font-semibold ${subtleText} mb-1 block`}>End Date</label>
                  <input type="date" value={exportEndDate} onChange={(e) => setExportEndDate(e.target.value)} className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`} />
                </div>
              </div>
              <button onClick={exportConversations} disabled={exporting || !exportStartDate || !exportEndDate} className={`px-6 py-3 rounded-xl font-bold text-lg transition ${exporting || !exportStartDate || !exportEndDate ? 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'}`}>
                {exporting ? 'Exporting...' : 'Export JSON'}
              </button>
            </div>
          </div>

          <div className={`rounded-2xl border p-6 ${cardTheme}`}>
            <h3 className={`font-bold ${fontSizes.xl} mb-4`}>All Users ({users.length})</h3>
            {loadingConversations ? <p className={subtleText}>Loading...</p> : users.length === 0 ? <p className={subtleText}>No users found</p> : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {users.map(user => (
                  <button key={user.id} onClick={() => loadUserSessions(user.id)} className={`w-full text-left p-4 rounded-xl border transition ${selectedUserId === user.id ? 'bg-green-50 dark:bg-green-900/20 border-green-600' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                    <p className={`font-semibold ${fontSizes.lg}`}>{user.name} {user.surname}</p>
                    <p className={`text-xs ${subtleText}`}>Joined: {new Date(user.created_at).toLocaleDateString()}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedUserId && (
            <div className={`rounded-2xl border p-6 ${cardTheme}`}>
              <h3 className={`font-bold ${fontSizes.xl} mb-4`}>Sessions ({userSessions.length})</h3>
              {loadingConversations ? <p className={subtleText}>Loading sessions...</p> : userSessions.length === 0 ? <p className={subtleText}>No sessions found</p> : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {userSessions.map(session => (
                    <button key={session.id} onClick={() => loadSessionMessages(session.id)} className={`w-full text-left p-4 rounded-xl border transition ${selectedSessionId === session.id ? 'bg-green-50 dark:bg-green-900/20 border-green-600' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                      <p className={`font-semibold ${fontSizes.lg}`}>{session.topic || 'No topic'}</p>
                      <p className={`text-sm ${subtleText}`}>{new Date(session.started_at).toLocaleString()}</p>
                      <p className={`text-xs ${subtleText}`}>Duration: {session.duration_minutes || 0} minutes</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedSessionId && (
            <div className={`rounded-2xl border p-6 ${cardTheme}`}>
              <h3 className={`font-bold ${fontSizes.xl} mb-4`}>Conversation ({sessionMessages.length} messages)</h3>
              {loadingConversations ? <p className={subtleText}>Loading messages...</p> : sessionMessages.length === 0 ? <p className={subtleText}>No messages</p> : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {sessionMessages.map(msg => (
                    <div key={msg.id} className={`p-4 rounded-xl ${msg.role === 'user' ? 'bg-gray-100 dark:bg-gray-800 ml-8' : 'bg-green-50 dark:bg-green-900/20 mr-8'}`}>
                      <p className={`text-xs ${subtleText} mb-1`}>{msg.role === 'user' ? 'User' : 'AI'} • {new Date(msg.created_at).toLocaleTimeString()}</p>
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
          <div className={`rounded-2xl border p-6 ${cardTheme}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`font-bold ${fontSizes.xl}`}>User Management</h3>
              <button onClick={() => setShowCreateUser(!showCreateUser)} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition">
                {showCreateUser ? 'Cancel' : '+ Create New User'}
              </button>
            </div>

            {showCreateUser && (
              <div className="mt-6 space-y-4 p-6 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <h4 className={`font-bold ${fontSizes.lg} mb-4`}>Create New User</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="new-user-email" className={`text-sm font-semibold ${subtleText} mb-1 block`}>Email *</label>
                    <input id="new-user-email" name="new-user-email" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`} placeholder="user@example.com" />
                  </div>
                  <div>
                    <label htmlFor="new-user-password" className={`text-sm font-semibold ${subtleText} mb-1 block`}>Password *</label>
                    <input id="new-user-password" name="new-user-password" type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`} placeholder="Min. 6 characters" />
                  </div>
                  <div>
                    <label htmlFor="new-user-name" className={`text-sm font-semibold ${subtleText} mb-1 block`}>First Name</label>
                    <input id="new-user-name" name="new-user-name" type="text" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`} />
                  </div>
                  <div>
                    <label htmlFor="new-user-surname" className={`text-sm font-semibold ${subtleText} mb-1 block`}>Last Name</label>
                    <input id="new-user-surname" name="new-user-surname" type="text" value={newUserSurname} onChange={(e) => setNewUserSurname(e.target.value)} className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`} />
                  </div>
                  <div>
                    <label htmlFor="new-user-tier" className={`text-sm font-semibold ${subtleText} mb-1 block`}>Tier</label>
                    <select id="new-user-tier" name="new-user-tier" value={newUserTier} onChange={(e) => setNewUserTier(e.target.value)} className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}>
                      <option value="free">Free</option>
                      <option value="premium">Premium</option>
                      <option value="unlimited">Unlimited</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <label htmlFor="new-user-is-admin" className="flex items-center gap-2 cursor-pointer">
                      <input id="new-user-is-admin" name="new-user-is-admin" type="checkbox" checked={newUserIsAdmin} onChange={(e) => setNewUserIsAdmin(e.target.checked)} className="w-5 h-5" />
                      <span className={`font-semibold ${fontSizes.base}`}>Is Admin</span>
                    </label>
                  </div>
                </div>
                <button onClick={createUser} disabled={generating || !newUserEmail || !newUserPassword} className={`px-6 py-3 rounded-xl font-bold transition ${generating || !newUserEmail || !newUserPassword ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
                  {generating ? 'Creating...' : 'Create User'}
                </button>
              </div>
            )}
          </div>

          <div className={`rounded-2xl border p-6 ${cardTheme}`}>
            <h3 className={`font-bold ${fontSizes.xl} mb-4`}>All Users ({allUsers.length})</h3>
            {loadingUsers ? <p className={subtleText}>Loading users...</p> : allUsers.length === 0 ? <p className={subtleText}>No users found</p> : (
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
                        <td className="p-3"><p className={`${fontSizes.base} font-mono text-sm`}>{user.email}</p></td>
                        <td className="p-3"><p className={fontSizes.base}>{user.name} {user.surname}</p></td>
                        <td className="p-3">
                          <select value={user.tier || 'free'} onChange={(e) => updateUserTier(user.id, e.target.value, user.email)} className={`px-3 py-1 rounded-lg text-xs font-bold border-2 cursor-pointer transition ${user.tier === 'unlimited' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-800 dark:text-purple-100 border-purple-300' : user.tier === 'premium' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-100 border-amber-300' : 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 border-gray-300'} hover:border-blue-500`}>
                            <option value="free">Free</option>
                            <option value="premium">Premium</option>
                            <option value="unlimited">Unlimited</option>
                          </select>
                        </td>
                        <td className="p-3">{user.is_admin ? <span className="text-green-600 font-bold">✓</span> : <span className="text-gray-400">-</span>}</td>
                        <td className="p-3">{user.email_confirmed_at ? <span className="text-green-600 font-bold">✓</span> : <span className="text-red-600 font-bold">✗</span>}</td>
                        <td className="p-3"><p className={`text-xs ${subtleText}`}>{new Date(user.created_at).toLocaleDateString()}</p></td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button onClick={() => resetPassword(user.id, user.email)} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-semibold transition">Reset PW</button>
                            <button onClick={() => deleteUser(user.id, user.email)} className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-semibold transition">Delete</button>
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

      {activeTab === 'export' && (
        <div className="space-y-6">
          {/* Research Data Export Section */}
          <div className={`rounded-2xl border p-6 ${cardTheme}`}>
            <h3 className={`font-bold ${fontSizes.xl} mb-2`}>Research Data Export</h3>
            <p className={`${subtleText} mb-6`}>Export data for thesis analysis with anonymization support.</p>

            {/* Export Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div>
                <label htmlFor="research-start-date" className={`text-sm font-semibold ${subtleText} mb-1 block`}>Start Date</label>
                <input
                  id="research-start-date"
                  name="research-start-date"
                  type="date"
                  value={researchStartDate}
                  onChange={(e) => setResearchStartDate(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                />
              </div>
              <div>
                <label htmlFor="research-end-date" className={`text-sm font-semibold ${subtleText} mb-1 block`}>End Date</label>
                <input
                  id="research-end-date"
                  name="research-end-date"
                  type="date"
                  value={researchEndDate}
                  onChange={(e) => setResearchEndDate(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${cardTheme}`}
                />
              </div>
              <div className="flex items-end">
                <label htmlFor="anonymize-toggle" className="flex items-center gap-3 cursor-pointer p-2">
                  <input
                    id="anonymize-toggle"
                    name="anonymize-toggle"
                    type="checkbox"
                    checked={anonymizeExport}
                    onChange={(e) => setAnonymizeExport(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <div>
                    <span className={`font-semibold ${fontSizes.base}`}>Anonymize Data</span>
                    <p className={`text-xs ${subtleText}`}>Replace IDs with P001, P002...</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Primary Research Exports */}
            <div className="space-y-3 mb-6">
              <h4 className={`font-semibold ${fontSizes.lg} mb-2`}>Thesis Analysis Exports</h4>
              <button
                onClick={exportDiscourseAnalysis}
                disabled={exporting || !researchStartDate || !researchEndDate}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-xl transition flex flex-col items-center justify-center gap-2"
              >
                <span className="text-2xl">📊</span>
                <div className="text-center">
                  <div className="font-bold">Export Discourse Analysis Data</div>
                  <div className="text-sm opacity-90">Turn-by-turn format with participant codes, timestamps, word counts (Chapter 7)</div>
                </div>
              </button>
              <button
                onClick={exportCanDoAchievements}
                disabled={exporting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-xl transition flex flex-col items-center justify-center gap-2"
              >
                <span className="text-2xl">🎯</span>
                <div className="text-center">
                  <div className="font-bold">Export Can-Do Achievements</div>
                  <div className="text-sm opacity-90">CEFR achievements with confidence scores and evidence (Chapter 13)</div>
                </div>
              </button>
              <button
                onClick={exportFeedbackAnalysis}
                disabled={exporting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-xl transition flex flex-col items-center justify-center gap-2"
              >
                <span className="text-2xl">💬</span>
                <div className="text-center">
                  <div className="font-bold">Export Feedback Analysis</div>
                  <div className="text-sm opacity-90">Recasts, expansions, corrections, uptake patterns (Chapter 11)</div>
                </div>
              </button>
            </div>

            {/* Secondary Exports */}
            <div className="space-y-3">
              <h4 className={`font-semibold ${fontSizes.lg} mb-2 ${subtleText}`}>Raw Data Exports</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button onClick={exportAllUsers} disabled={exporting} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-xl transition text-sm">
                  <div className="font-bold">Export Users</div>
                  <div className="text-xs opacity-90">Profiles & demographics</div>
                </button>
                <button onClick={exportAllSessions} disabled={exporting} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-xl transition text-sm">
                  <div className="font-bold">Export Sessions</div>
                  <div className="text-xs opacity-90">Metadata & durations</div>
                </button>
                <button onClick={exportAllTranscriptions} disabled={exporting} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-xl transition text-sm">
                  <div className="font-bold">Export Transcriptions</div>
                  <div className="text-xs opacity-90">Raw conversation text</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'cando' && (
        <div className={`rounded-2xl border p-6 ${cardTheme}`}>
          <h3 className={`font-bold ${fontSizes.xl} mb-4`}>Can-Do Achievement Management</h3>
          <p className={`${subtleText} mb-6`}>View and manage learner Can-Do achievements.</p>
          {loadingCando ? <p className={subtleText}>Loading...</p> : (
            <>
              <div className="mb-6">
                <label htmlFor="cando-user-select" className={`text-sm font-semibold ${subtleText} mb-2 block`}>Select User</label>
                <select id="cando-user-select" name="cando-user-select" value={selectedCandoUserId || ''} onChange={(e) => loadUserCandoData(e.target.value)} className={`w-full px-4 py-3 rounded-lg border ${cardTheme}`}>
                  <option value="">-- Select a user --</option>
                  {candoUsers.map(user => (
                    <option key={user.id} value={user.id}>{user.name} {user.surname} ({user.english_level || 'No level'})</option>
                  ))}
                </select>
              </div>
              {selectedUserCandoData && (
                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <h4 className="font-bold text-lg mb-2">Progress Summary</h4>
                    <p className="text-sm"><span className="font-semibold">Total Achievements:</span> {selectedUserCandoData.total_achievements}</p>
                  </div>
                  {selectedUserCandoData.progress_by_level?.map(levelData => (
                    <div key={levelData.level} className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-lg">{levelData.level}</h4>
                        <span className="text-sm font-semibold bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 px-3 py-1 rounded-full">{levelData.achieved}/{levelData.total}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: `${(levelData.achieved / levelData.total) * 100}%` }}></div>
                      </div>
                      {levelData.recent_achievements?.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Recent Achievements:</p>
                          {levelData.recent_achievements.slice(0, 5).map((achievement, idx) => (
                            <div key={idx} className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                              <p className="mb-1">{achievement.descriptor}</p>
                              <div className="flex justify-between items-center text-xs">
                                <span className={subtleText}>{new Date(achievement.achieved_at).toLocaleDateString()}{achievement.detected_by === 'ai_automatic' && ' • AI Detected'}</span>
                                {achievement.confidence_score && <span className="font-semibold">{(achievement.confidence_score * 100).toFixed(0)}% confidence</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-3">
                    <button onClick={() => loadUserCandoData(selectedCandoUserId)} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition">Refresh Data</button>
                    <button
                      onClick={() => reanalyzeUserSessions(selectedCandoUserId)}
                      disabled={reanalyzingCando || reanalyzingFeedback}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition"
                    >
                      {reanalyzingCando ? 'Analyzing...' : 'Re-analyze Can-Do'}
                    </button>
                    <button
                      onClick={() => reanalyzeUserFeedback(selectedCandoUserId)}
                      disabled={reanalyzingCando || reanalyzingFeedback}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-3 px-4 rounded-lg transition"
                    >
                      {reanalyzingFeedback ? 'Analyzing...' : 'Re-analyze Feedback'}
                    </button>
                  </div>
                  {(reanalyzeProgress || feedbackProgress) && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                      {reanalyzeProgress || feedbackProgress}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
      {activeTab === 'settings' && (
        <div className={`rounded-2xl border p-6 ${cardTheme}`}>
          <h3 className={`font-bold ${fontSizes.xl} mb-2`}>Voice Settings</h3>
          <p className={`${subtleText} mb-8`}>Changes take effect on the next voice session.</p>

          <div className="max-w-md space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className={`font-semibold ${fontSizes.base}`}>VAD Sensitivity Threshold</label>
                <span className={`font-mono font-bold text-green-600 ${fontSizes.lg}`}>{vadThreshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.50"
                max="0.95"
                step="0.05"
                value={vadThreshold}
                onChange={(e) => setVadThreshold(parseFloat(e.target.value))}
                className="w-full accent-green-600"
              />
              <div className={`flex justify-between ${subtleText} text-xs mt-1`}>
                <span>0.50 — very sensitive</span>
                <span>0.95 — barely triggers</span>
              </div>
              <p className={`${subtleText} text-sm mt-3`}>
                Higher = less likely to trigger on background noise or echo. Lower = picks up quieter speech more easily. Current default: 0.85.
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className={`font-semibold ${fontSizes.base}`}>Silence Duration</label>
                <span className={`font-mono font-bold text-green-600 ${fontSizes.lg}`}>{silenceDurationMs} ms</span>
              </div>
              <input
                type="range"
                min="500"
                max="2000"
                step="100"
                value={silenceDurationMs}
                onChange={(e) => setSilenceDurationMs(parseInt(e.target.value))}
                className="w-full accent-green-600"
              />
              <div className={`flex justify-between ${subtleText} text-xs mt-1`}>
                <span>500ms — responds quickly</span>
                <span>2000ms — waits longer</span>
              </div>
              <p className={`${subtleText} text-sm mt-3`}>
                How long after you stop speaking before the AI responds. Increase if it cuts you off mid-thought. Current default: 800ms.
              </p>
            </div>

            <button
              onClick={saveConfig}
              disabled={savingConfig}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-8 rounded-xl transition"
            >
              {savingConfig ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
