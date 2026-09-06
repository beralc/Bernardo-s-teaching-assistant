// One controller per connection: old events/timers cannot enable a new microphone.
export function createVoiceTurn({ track, send, onState, onError = () => {} }) {
  let closed = false, responseId = null, generating = false, interrupting = false;
  let timer = null, watchdog = null;
  const ignored = new Set();
  const state = value => { if (!closed) onState(value); };
  const mute = () => { clearTimeout(timer); track.enabled = false; };
  const listen = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (closed) return;
      send({ type: 'input_audio_buffer.clear' });
      interrupting = false;
      track.enabled = true;
      state('listening');
    }, 400);
  };
  mute();
  return {
    handle(event) {
      if (closed) return false;
      const id = event.response_id || event.response?.id;
      if (event.type === 'output_audio_buffer.cleared' && interrupting) {
        if (id && id !== responseId) return false;
        clearTimeout(watchdog);
        listen();
        return false;
      }
      if (id && ignored.has(id)) return false;
      if (id && responseId && id !== responseId && event.type !== 'response.created') return false;
      switch (event.type) {
        case 'session.updated': if (!responseId) listen(); break;
        case 'response.created':
          responseId = event.response.id; generating = true;
          mute(); state('preparing'); break;
        case 'output_audio_buffer.started':
          mute(); state('speaking'); break;
        case 'output_audio_buffer.stopped': listen(); break;
        case 'response.done':
          generating = false;
          // Generation completion does NOT mean speaker playback finished.
          if (!(event.response.output || []).some(item =>
            (item.content || []).some(part => ['audio', 'output_audio'].includes(part.type)))) listen();
          break;
        case 'input_audio_buffer.speech_stopped': mute(); state('waiting'); break;
        default: break;
      }
      return true;
    },
    interrupt() {
      if (closed || interrupting || !responseId) return;
      interrupting = true;
      mute(); state('interrupting');
      ignored.add(responseId);
      if (generating) send({ type: 'response.cancel', response_id: responseId });
      // WebRTC clears queued audio AND truncates unplayed server context.
      send({ type: 'output_audio_buffer.clear' });
      watchdog = setTimeout(() => { if (!closed && interrupting) onError(); }, 5000);
      // Stay muted until the server acknowledges the clear.
    },
    prepare() { mute(); state('preparing'); },
    close() { closed = true; clearTimeout(timer); clearTimeout(watchdog); track.enabled = false; },
  };
}
