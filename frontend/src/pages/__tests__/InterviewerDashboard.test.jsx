import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import InterviewerDashboard from '../InterviewerDashboard';
import axios from 'axios';
import { useHeadhunter } from '../../context/HeadhunterContext';

// Mock dependencies
vi.mock('axios');
vi.mock('../../context/HeadhunterContext');

// Mock CandidateDrawer since it's complex
vi.mock('../../components/pipeline/CandidateDrawer', () => ({
    default: ({ onClose, cv }) => (
        <div data-testid="candidate-drawer">
            <h2>Drawer: {cv?.parsed_data?.name || 'Unknown'}</h2>
            <button onClick={onClose}>Close</button>
        </div>
    )
}));

describe('InterviewerDashboard Component', () => {
    const mockInterviews = [
        {
            id: 1,
            candidate_name: 'John Doe',
            job_title: 'Frontend Dev',
            scheduled_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            cv_id: 101,
            application_id: 201,
            step: 'Technical Interview',
            status: null
        },
        {
            id: 2,
            candidate_name: 'Jane Smith',
            job_title: 'Backend Dev',
            scheduled_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
            cv_id: 102,
            application_id: 202,
            step: 'Manager Interview',
            status: 'Passed',
            rating: 9
        }
    ];

    const mockCv = {
        id: 101,
        parsed_data: { name: 'John Doe', skills: 'React' }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        useHeadhunter.mockReturnValue({ jobs: [] });
        axios.get.mockImplementation((url) => {
            if (url === '/api/interviews/my') return Promise.resolve({ data: mockInterviews });
            if (url === '/api/profiles/101') return Promise.resolve({ data: mockCv });
            return Promise.reject(new Error('Not found'));
        });
    });

    it('renders upcoming interviews by default', async () => {
        render(<InterviewerDashboard onOpenMobileSidebar={() => { }} />);

        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument(); // Past interview
        expect(screen.getByText('Frontend Dev')).toBeInTheDocument();
    });

    it('switches to past interviews tab', async () => {
        render(<InterviewerDashboard onOpenMobileSidebar={() => { }} />);

        await waitFor(() => screen.getByText('John Doe'));

        fireEvent.click(screen.getByText(/Past/));

        await waitFor(() => {
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        });
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
        expect(screen.getByText('Outcome:')).toBeInTheDocument();
        expect(screen.getByText('Passed')).toBeInTheDocument();
    });

    it('opens candidate drawer when clicking View Profile', async () => {
        render(<InterviewerDashboard onOpenMobileSidebar={() => { }} />);

        await waitFor(() => screen.getByText('John Doe'));

        fireEvent.click(screen.getByText('View Profile'));

        // Should fetch CV and show drawer
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/api/profiles/101');
            expect(screen.getByTestId('candidate-drawer')).toBeInTheDocument();
            expect(screen.getByText('Drawer: John Doe')).toBeInTheDocument();
        });
    });

    it('handles empty state', async () => {
        axios.get.mockResolvedValue({ data: [] });
        render(<InterviewerDashboard onOpenMobileSidebar={() => { }} />);

        await waitFor(() => {
            expect(screen.getByText(/No upcoming interviews found/i)).toBeInTheDocument();
        });
    });
});
