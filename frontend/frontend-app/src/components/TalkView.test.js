import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { TalkView } from './TalkView';
jest.mock('../supabaseClient', () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: 'test' } } }) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { is_admin: true } }) }) }) }),
  },
}));
jest.mock('../utils/sessionManager', () => ({
  startSession: jest.fn(), endSession: jest.fn(), getSessionLogId: jest.fn(),
}));
jest.mock('../LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: key => key }) }));
const props = { fontSizes: {}, selectedTopic: { title: 'Coffee', description: 'Practice' }, onSaveTranscription: jest.fn() };

beforeEach(() => {
  jest.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

test('selecting a topic does not request the microphone automatically', async () => {
  const getUserMedia = jest.fn();
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  render(<TalkView {...props} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Start conversation' })).toBeEnabled());
  expect(getUserMedia).not.toHaveBeenCalled();
});

test('stopping during a pending permission request stops the late stream', async () => {
  let resolveStream;
  const getUserMedia = jest.fn(() => new Promise(resolve => { resolveStream = resolve; }));
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  render(<TalkView {...props} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Start conversation' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Start conversation' }));
  fireEvent.click(screen.getByRole('button', { name: 'End conversation' }));
  const stop = jest.fn();
  await act(async () => resolveStream({ getTracks: () => [{ stop }] }));
  expect(stop).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Start conversation' })).toBeInTheDocument();
});
