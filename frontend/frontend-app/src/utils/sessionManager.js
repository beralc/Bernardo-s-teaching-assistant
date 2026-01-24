import { supabase } from "../supabaseClient";
import { API_BASE_URL } from "../config/constants";

// Module-level state for session tracking
let sessionStartTime = null;
let sessionLogId = null;
// eslint-disable-next-line no-unused-vars
let sessionConversation = []; // Used for Can-Do system (currently disabled)

export function getSessionLogId() {
  return sessionLogId;
}

export async function saveTranscription(text, correctedText = null) {
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
        session_id: sessionLogId
      }
    ]);

  if (error) {
    console.error('Error saving transcription:', error.message, error);
  } else {
    console.log('Transcription saved successfully!', data);
  }
}

export async function startSession(topic = null) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) {
    console.warn('No user logged in, cannot start session');
    return;
  }

  sessionStartTime = new Date();
  sessionConversation = [];

  console.log('Starting session with topic:', topic?.title || 'No topic');

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

export async function endSession(conversation = null) {
  if (!sessionLogId || !sessionStartTime) return;

  // Capture and clear immediately to prevent race condition with duplicate calls
  const capturedSessionLogId = sessionLogId;
  const capturedSessionStartTime = sessionStartTime;
  sessionLogId = null;
  sessionStartTime = null;
  sessionConversation = [];

  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return;

  const endTime = new Date();
  const durationMinutes = Math.round((endTime.getTime() - capturedSessionStartTime.getTime()) / (1000 * 60));

  // Update conversation session
  const { error } = await supabase
    .from('conversation_sessions')
    .update({
      ended_at: endTime.toISOString(),
      duration_minutes: durationMinutes
    })
    .eq('id', capturedSessionLogId);

  if (error) {
    console.error('Error ending session:', error.message);
  } else {
    console.log('Session ended. Duration:', durationMinutes, 'minutes');

    // Log usage for cost tracking
    const costUsd = durationMinutes * 0.06;

    await supabase
      .from('usage_logs')
      .insert([{
        user_id: user.id,
        action_type: 'voice_conversation',
        duration_minutes: durationMinutes,
        cost_usd: costUsd,
        metadata: { session_id: capturedSessionLogId }
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

    // Analyze conversation for Can-Do achievements if we have a transcript
    // DISABLED FOR NOW - Can-Do system not in use
    // if (conversation && conversation.length > 0) {
    //   console.log('Analyzing session for Can-Do achievements...');
    //   analyzeSessionForCando(capturedSessionLogId, user.id, conversation);
    // }
  }
}

export async function analyzeSessionForCando(sessionId, userId, conversation) {
  try {
    const validMessages = conversation.filter(msg => msg.text && msg.text.trim().length > 0);

    if (validMessages.length === 0) {
      console.log('No valid messages in conversation, skipping Can-Do analysis');
      return;
    }

    const transcript = validMessages
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
      .join('\n');

    console.log('Analyzing session:', { sessionId, userId, conversationLength: conversation.length, validMessages: validMessages.length, transcriptLength: transcript.length });

    if (!transcript || transcript.trim().length === 0) {
      console.log('Empty transcript, skipping Can-Do analysis');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('No session found, cannot analyze Can-Do');
      return;
    }

    const response = await fetch(`${API_BASE_URL}/analyze_session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: userId,
        transcript: transcript
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Failed to analyze session:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody
      });
      return;
    }

    const result = await response.json();
    console.log('Can-Do analysis result:', result);

    if (result.new_achievements && result.new_achievements.length > 0) {
      showAchievementsNotification(result.new_achievements);
    }

  } catch (error) {
    console.error('Error analyzing session for Can-Do:', error);
  }
}

export function showAchievementsNotification(achievements) {
  const count = achievements.length;
  const message = count === 1
    ? `You unlocked a new achievement: "${achievements[0].descriptor}"`
    : `You unlocked ${count} new achievements!`;

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Achievement Unlocked!', { body: message });
  } else {
    alert(message);
  }
}
