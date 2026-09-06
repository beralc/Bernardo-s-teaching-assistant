import { createVoiceTurn } from './voiceTurn';

let track, send, onState, turn;
beforeEach(() => {
  jest.useFakeTimers();
  track = { enabled: true };
  send = jest.fn(); onState = jest.fn();
  turn = createVoiceTurn({ track, send, onState });
});
afterEach(() => { turn.close(); jest.useRealTimers(); });
const event = (type, extra = {}) => turn.handle({ type, ...extra });
const response = () => event('response.created', { response: { id: 'r1' } });

test('generation finishing before playback starts never reopens the microphone', () => {
  response();
  event('response.done', { response: { id: 'r1', output: [{ content: [{ type: 'audio' }] }] } });
  jest.advanceTimersByTime(1000);
  expect(track.enabled).toBe(false);
  event('output_audio_buffer.started', { response_id: 'r1' });
  event('output_audio_buffer.stopped', { response_id: 'r1' });
  jest.advanceTimersByTime(399);
  expect(track.enabled).toBe(false);
  jest.advanceTimersByTime(1);
  expect(track.enabled).toBe(true);
});

test('interrupt cancels and clears, waits for acknowledgement, ignores late response events', () => {
  response(); turn.interrupt(); turn.interrupt();
  expect(send.mock.calls.map(([message]) => message.type)).toEqual(['response.cancel', 'output_audio_buffer.clear']);
  jest.advanceTimersByTime(1000);
  expect(track.enabled).toBe(false);
  event('output_audio_buffer.cleared', { response_id: 'r1' });
  jest.advanceTimersByTime(400);
  expect(track.enabled).toBe(true);
  expect(event('output_audio_buffer.started', { response_id: 'r1' })).toBe(false);
  expect(track.enabled).toBe(true);
});

test('close cancels pending microphone activation', () => {
  event('session.updated');
  turn.close();
  jest.advanceTimersByTime(1000);
  expect(track.enabled).toBe(false);
  expect(send).not.toHaveBeenCalled();
});

test('a previous playback completion cannot reopen the microphone during a new reply', () => {
  response();
  event('response.created', { response: { id: 'r2' } });
  event('output_audio_buffer.stopped', { response_id: 'r1' });
  jest.advanceTimersByTime(1000);
  expect(track.enabled).toBe(false);
});

test('interrupt after generation finishes clears playback without cancelling an inactive response', () => {
  response();
  event('response.done', { response: { id: 'r1', output: [{ content: [{ type: 'audio' }] }] } });
  turn.interrupt();
  expect(send.mock.calls.map(([message]) => message.type)).toEqual(['output_audio_buffer.clear']);
});
