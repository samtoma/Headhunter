import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InviteUserModal from './InviteUserModal';
import { userService, departmentService } from '../../services/api';

// Mock the API service
vi.mock('../../services/api', () => ({
    userService: {
        invite: vi.fn(),
    },
    departmentService: {
        getAll: vi.fn(),
    },
}));

describe('InviteUserModal', () => {
    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();
    const mockDepartments = [
        { id: 1, name: 'Engineering' },
        { id: 2, name: 'HR' },
        { id: 3, name: 'Sales' },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock departments fetch - returns array directly, not { data: [...] }
        departmentService.getAll.mockResolvedValue(mockDepartments);
    });

    it('should not render when isOpen is false', () => {
        render(<InviteUserModal isOpen={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        expect(screen.queryByText('Invite Team Member')).not.toBeInTheDocument();
    });

    it('should render form fields when open', async () => {
        render(<InviteUserModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        expect(screen.getByText('Invite Team Member')).toBeInTheDocument();
        expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
        expect(screen.getByLabelText('Role')).toBeInTheDocument();
        expect(screen.getByLabelText('Department')).toBeInTheDocument();

        // Wait for departments to load
        await waitFor(() => {
            expect(departmentService.getAll).toHaveBeenCalled();
        });
    });

    it('should call API and success callback on valid submission', async () => {
        userService.invite.mockResolvedValueOnce({}); // Success response

        render(<InviteUserModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

        // Wait for departments to load
        await waitFor(() => {
            expect(screen.getByText('HR')).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'recruiter' } });
        fireEvent.change(screen.getByLabelText('Department'), { target: { value: 'HR' } });

        fireEvent.click(screen.getByText('Send Invite'));

        await waitFor(() => {
            expect(userService.invite).toHaveBeenCalledWith({
                email: 'test@example.com',
                role: 'recruiter',
                department: 'HR'
            });
            expect(mockOnSuccess).toHaveBeenCalled();
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    it('should display error message on API failure', async () => {
        const errorMessage = 'User already exists';
        userService.invite.mockRejectedValueOnce({
            response: { data: { detail: errorMessage } }
        });

        render(<InviteUserModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

        fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'fail@example.com' } });
        fireEvent.click(screen.getByText('Send Invite'));

        await waitFor(() => {
            expect(screen.getByText(errorMessage)).toBeInTheDocument();
            expect(mockOnSuccess).not.toHaveBeenCalled();
            expect(mockOnClose).not.toHaveBeenCalled();
        });
    });
});

