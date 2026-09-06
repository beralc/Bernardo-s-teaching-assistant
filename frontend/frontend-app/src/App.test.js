import { render, screen, fireEvent } from '@testing-library/react';
import { ConversationStartersView } from './components/ConversationStartersView';
import { ListeningView } from './components/ListeningView';
import { readPreference, writePreference } from './utils/preferences';

jest.mock('./LanguageContext', () => ({ useLanguage: () => ({ language: 'en' }) }));
const styling = { cardTheme: '', subtleText: '', fontSizes: {} };

test('topics begin with three choices; just chat has no topic', () => {
  const start = jest.fn();
  render(<ConversationStartersView {...styling} onStartConversation={start} />);
  expect(screen.getAllByRole('button', { name: 'Choose this topic' })).toHaveLength(3);
  expect(start).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'More topics' }));
  expect(screen.getAllByRole('button', { name: 'Choose this topic' })).toHaveLength(6);
  fireEvent.click(screen.getByRole('button', { name: /Just chat/ }));
  expect(start).toHaveBeenCalledWith(null);
});

test('interrupt and end are distinct, named controls; red button stays enormous', () => {
  const interrupt = jest.fn(), stop = jest.fn();
  render(<ListeningView {...styling} voiceState="speaking" onInterrupt={interrupt} onStop={stop} elapsedSeconds={0} usageRemaining={3} />);
  fireEvent.click(screen.getByRole('button', { name: 'I would like to speak' }));
  expect(interrupt).toHaveBeenCalledTimes(1);
  expect(stop).not.toHaveBeenCalled();
  const end = screen.getByRole('button', { name: 'End conversation' });
  expect(end).toHaveClass('w-48', 'h-48', 'bg-red-600');
  fireEvent.click(end);
  expect(stop).toHaveBeenCalledTimes(1);
});

test('preferences survive reload and malformed storage falls back', () => {
  writePreference('display-font-size', 2);
  expect(readPreference('display-font-size', 1)).toBe(2);
  localStorage.setItem('display-font-size', 'broken');
  expect(readPreference('display-font-size', 1)).toBe(1);
});
