import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '../LanguageContext';
import { OnboardingModal, hasCompletedOnboarding } from './OnboardingModal';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'en');
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});

test('practice controls do not request microphone access, and completion belongs to the user', () => {
  const getUserMedia = jest.fn();
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  const complete = jest.fn();
  render(<LanguageProvider><OnboardingModal userId="learner" onComplete={complete} /></LanguageProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  fireEvent.click(screen.getByRole('button', { name: 'Try starting' }));
  fireEvent.click(screen.getByRole('button', { name: 'Try stopping' }));
  expect(screen.getByRole('status')).toHaveTextContent('Practice finished');
  expect(getUserMedia).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getByText(/To interrupt a reply/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Go to the app' }));
  expect(complete).toHaveBeenCalledTimes(1);
  expect(hasCompletedOnboarding('learner')).toBe(true);
  expect(hasCompletedOnboarding('someone-else')).toBe(false);
});

test('language can change inside the guide and each step receives heading focus', () => {
  render(<LanguageProvider><OnboardingModal userId="learner" onComplete={() => {}} /></LanguageProvider>);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'es' } });
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  expect(screen.getByRole('heading', { name: 'Prueba los botones' })).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: 'Atrás' }));
  expect(screen.getByRole('heading', { name: 'Elige de qué hablar' })).toHaveFocus();
});
