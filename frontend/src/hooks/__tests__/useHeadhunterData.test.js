import { renderHook, waitFor } from '@testing-library/react';
import { useHeadhunterData } from '../useHeadhunterData';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios');

// Mock AuthContext
const mockUseAuth = vi.fn();
vi.mock('../../context/AuthContext', () => ({
    useAuth: () => mockUseAuth()
}));

describe('useHeadhunterData', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default axios mocks
        axios.get.mockResolvedValue({ data: [] });
    });

    it('should NOT fetch jobs if token is missing', async () => {
        // Arrange
        mockUseAuth.mockReturnValue({ token: null });

        // Act
        const { result } = renderHook(() => useHeadhunterData());

        // Assert
        // Wait a tick to ensure effects run
        await waitFor(() => {
            expect(result.current.jobsLoading).toBe(false);
        });

        expect(axios.get).not.toHaveBeenCalledWith('/api/jobs/');
    });

    it('should fetch jobs if token is present', async () => {
        // Arrange
        mockUseAuth.mockReturnValue({ token: 'fake-token' });
        const mockJobs = [{ id: 1, title: 'Test Job' }];
        axios.get.mockImplementation((url) => {
            if (url === '/api/jobs/') return Promise.resolve({ data: mockJobs });
            if (url === '/api/profiles/stats/overview') return Promise.resolve({ data: {} });
            return Promise.resolve({ data: [] });
        });

        // Act
        const { result } = renderHook(() => useHeadhunterData());

        // Assert
        await waitFor(() => {
            expect(result.current.jobs).toEqual(mockJobs);
        });

        expect(axios.get).toHaveBeenCalledWith('/api/jobs/');
    });
});
