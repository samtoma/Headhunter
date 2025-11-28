import { render, screen } from '@testing-library/react'; // Import waitFor
import App from './App';
import { describe, it, expect, vi } from 'vitest';

// --- MOCK AXIOS ---
vi.mock('axios', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: [] })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    patch: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
    interceptors: {
      request: { use: vi.fn(() => { }) },
      response: { use: vi.fn(() => { }) }
    },
    defaults: {
      headers: {
        common: {}
      }
    }
  },
}));

describe('Headhunter App', () => {
  it('renders the dashboard title', async () => {
    render(<App />);

    // Use findByText (async) instead of getByText.
    // This waits for the component to finish its initial rendering cycle.
    expect(await screen.findByText(/Headhunter/i)).toBeInTheDocument();
  });
});