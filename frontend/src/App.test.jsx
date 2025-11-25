import { render, screen } from '@testing-library/react';
import App from './App';
import { describe, it, expect, vi } from 'vitest';

// --- MOCK AXIOS ---
// This tells the test: "When the app tries to use axios, 
// just return empty lists instead of trying to hit the real internet."
vi.mock('axios', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: [] })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    patch: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

describe('Headhunter App', () => {
  it('renders the dashboard title', () => {
    render(<App />);
    expect(screen.getByText(/Headhunter/i)).toBeInTheDocument();
  });
});