import { render, screen } from '@testing-library/react'; // Import waitFor
import App from './App';
import { describe, it, expect, vi } from 'vitest';

// --- MOCK AXIOS ---
vi.mock('axios', () => {
  const mockAxiosInstance = {
    get: vi.fn(() => Promise.resolve({ data: [] })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    patch: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
      get: vi.fn(() => Promise.resolve({ data: [] })),
      post: vi.fn(() => Promise.resolve({ data: {} })),
      patch: vi.fn(() => Promise.resolve({ data: {} })),
      delete: vi.fn(() => Promise.resolve({ data: {} })),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      defaults: {
        headers: {
          common: {}
        }
      }
    },
  };
});

describe('Headhunter App', () => {
  it('renders the login screen when not authenticated', async () => {
    render(<App />);

    // App should show login screen when no token is present
    expect(await screen.findByText(/Welcome Back/i)).toBeInTheDocument();
  });
});