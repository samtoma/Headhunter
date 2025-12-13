import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.alert
window.alert = vi.fn();