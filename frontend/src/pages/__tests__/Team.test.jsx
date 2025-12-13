import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Team from '../Team';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

// Mock dependencies
vi.mock('axios');
vi.mock('../../context/AuthContext');

describe('Team Component', () => {
    const mockUsers = [
        { id: 1, email: 'admin@test.com', role: 'admin', department: 'Executive', is_active: true, login_count: 10 },
        { id: 2, email: 'user@test.com', role: 'interviewer', department: 'Engineering', is_active: true, login_count: 5 }
    ];

    const mockStats = {
        total: 2,
        active: 2,
        roles: { admin: 1, interviewer: 1, hiring_manager: 0, recruiter: 0 }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        axios.get.mockImplementation((url) => {
            if (url === '/api/users/') return Promise.resolve({ data: mockUsers });
            if (url === '/api/users/stats') return Promise.resolve({ data: mockStats });
            if (url === '/api/company/departments') return Promise.resolve({ data: [{ id: 1, name: 'Engineering' }, { id: 2, name: 'Sales' }] });
            return Promise.reject(new Error('Not found'));
        });
    });

    it('renders users and stats for admin', async () => {
        useAuth.mockReturnValue({ user: { role: 'admin' } });

        render(<Team onOpenMobileSidebar={() => { }} />);

        // Check stats
        await waitFor(() => {
            expect(screen.getByText('Total Users')).toBeInTheDocument();
            expect(screen.getAllByText('2').length).toBeGreaterThan(0); // Total count
        });

        // Check users
        expect(screen.getByText('admin@test.com')).toBeInTheDocument();
        expect(screen.getByText('user@test.com')).toBeInTheDocument();

        // Check Admin actions visible
        expect(screen.getAllByText('Edit')).toHaveLength(2);
    });

    it('filters users by search', async () => {
        useAuth.mockReturnValue({ user: { role: 'admin' } });
        render(<Team onOpenMobileSidebar={() => { }} />);

        await waitFor(() => screen.getByText('admin@test.com'));

        const searchInput = screen.getByPlaceholderText(/Search by name/i);
        fireEvent.change(searchInput, { target: { value: 'Engineering' } });

        expect(screen.queryByText('admin@test.com')).not.toBeInTheDocument();
        expect(screen.getByText('user@test.com')).toBeInTheDocument();
    });

    it('hides actions for non-admins', async () => {
        useAuth.mockReturnValue({ user: { role: 'interviewer' } });
        render(<Team onOpenMobileSidebar={() => { }} />);

        await waitFor(() => screen.getByText('admin@test.com'));

        expect(screen.queryByText('Edit')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Remove User')).not.toBeInTheDocument();
    });

    it('allows admin to delete user', async () => {
        useAuth.mockReturnValue({ user: { role: 'admin' } });
        axios.delete.mockResolvedValue({});

        // Mock confirm
        window.confirm = vi.fn(() => true);

        render(<Team onOpenMobileSidebar={() => { }} />);
        await waitFor(() => screen.getByText('user@test.com'));

        const deleteButtons = screen.getAllByTitle('Remove User');
        fireEvent.click(deleteButtons[1]); // Delete second user

        expect(window.confirm).toHaveBeenCalled();
        expect(axios.delete).toHaveBeenCalledWith('/api/users/2');

        await waitFor(() => {
            expect(screen.queryByText('user@test.com')).not.toBeInTheDocument();
        });
    });

    it('allows admin to edit user role', async () => {
        useAuth.mockReturnValue({ user: { role: 'admin' } });
        axios.patch.mockResolvedValue({});

        render(<Team onOpenMobileSidebar={() => { }} />);
        await waitFor(() => screen.getByText('user@test.com'));

        const editButtons = screen.getAllByText('Edit');
        fireEvent.click(editButtons[1]); // Edit second user

        // Change role
        const roleSelect = screen.getByDisplayValue('Interviewer');
        fireEvent.change(roleSelect, { target: { value: 'recruiter' } });

        // Save
        const saveButton = screen.getByTitle('Save');
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(axios.patch).toHaveBeenCalledWith('/api/users/2/role', expect.objectContaining({ role: 'recruiter' }));
        });
    });

    it('allows admin to invite new user', async () => {
        useAuth.mockReturnValue({ user: { role: 'admin' } });
        axios.post.mockResolvedValue({});

        render(<Team onOpenMobileSidebar={() => { }} />);

        fireEvent.click(screen.getByText('Invite Member'));

        const emailInput = screen.getByPlaceholderText('colleague@company.com');
        fireEvent.change(emailInput, { target: { value: 'new@test.com' } });

        const passwordInput = screen.getByPlaceholderText('••••••••');
        fireEvent.change(passwordInput, { target: { value: 'password123' } });

        fireEvent.click(screen.getByText('Send Invite'));

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith('/api/users/', expect.objectContaining({
                email: 'new@test.com',
                password: 'password123'
            }));
        });
    });
});
