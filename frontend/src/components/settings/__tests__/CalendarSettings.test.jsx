import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CalendarSettings from '../CalendarSettings';
import api from '../../../services/api';

// Mock API
vi.mock('../../../services/api');

describe('CalendarSettings', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders connect buttons when no connection', async () => {
        api.get.mockResolvedValueOnce({ data: [] }); // connections

        render(<CalendarSettings />);

        await waitFor(() => {
            expect(screen.getByText('Connect Google Calendar')).toBeInTheDocument();
            expect(screen.getByText('Connect Outlook')).toBeInTheDocument();
        });

        expect(screen.getByText('Google Calendar')).toBeInTheDocument();
        expect(screen.getByText('Microsoft Outlook')).toBeInTheDocument();
    });

    it('renders connected state correctly for Google', async () => {
        api.get.mockResolvedValueOnce({
            data: [{ provider: 'google', email: 'test@example.com', sync_enabled: true }]
        });

        render(<CalendarSettings />);

        await waitFor(() => {
            expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
        });

        expect(screen.getByText('Disconnect')).toBeInTheDocument();
        expect(screen.queryByText('Connect Google Calendar')).not.toBeInTheDocument();
        // Microsoft should still show connect
        expect(screen.getByText('Connect Outlook')).toBeInTheDocument();
    });

    it('handles google connect click', async () => {
        api.get.mockResolvedValueOnce({ data: [] }); // connections
        api.get.mockResolvedValueOnce({ data: { url: 'http://mock-auth-url' } }); // connect

        // Mock window.location
        delete window.location;
        window.location = { href: '' };

        render(<CalendarSettings />);

        await waitFor(() => screen.getByText('Connect Google Calendar'));

        fireEvent.click(screen.getByText('Connect Google Calendar'));

        await waitFor(() => {
            expect(api.get).toHaveBeenCalledWith('/calendars/connect/google');
            expect(window.location.href).toBe('http://mock-auth-url');
        });
    });

    it('handles microsoft connect click', async () => {
        api.get.mockResolvedValueOnce({ data: [] }); // connections
        api.get.mockResolvedValueOnce({ data: { url: 'http://mock-ms-url' } }); // connect

        delete window.location;
        window.location = { href: '' };

        render(<CalendarSettings />);

        await waitFor(() => screen.getByText('Connect Outlook'));

        fireEvent.click(screen.getByText('Connect Outlook'));

        await waitFor(() => {
            expect(api.get).toHaveBeenCalledWith('/calendars/connect/microsoft');
            expect(window.location.href).toBe('http://mock-ms-url');
        });
    });

    it('handles disconnect click', async () => {
        api.get.mockResolvedValueOnce({
            data: [{ provider: 'google', email: 'test@example.com' }]
        });
        api.delete.mockResolvedValueOnce({});
        api.get.mockResolvedValueOnce({ data: [] }); // Refresh

        // Mock confirm
        window.confirm = vi.fn(() => true);

        render(<CalendarSettings />);

        await waitFor(() => screen.getAllByText('Disconnect')[0]); // Use getAll as duplicate labels might exist if multiple connected, but here only 1

        fireEvent.click(screen.getByText('Disconnect'));

        await waitFor(() => {
            expect(api.delete).toHaveBeenCalledWith('/calendars/disconnect/google');
            expect(window.confirm).toHaveBeenCalled();
        });
    });
});
