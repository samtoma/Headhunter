import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Search from '../Search';
import axios from 'axios';
import { useHeadhunter } from '../../context/HeadhunterContext';

// Mock dependencies
vi.mock('axios');
vi.mock('../../context/HeadhunterContext');

// Mock CandidateDrawer
vi.mock('../../components/pipeline/CandidateDrawer', () => ({
    default: ({ onClose, cv }) => (
        <div data-testid="candidate-drawer">
            <h2>Drawer: {cv?.parsed_data?.name || 'Unknown'}</h2>
            <button onClick={onClose}>Close</button>
        </div>
    )
}));

describe('Search Component', () => {
    const mockResults = [
        {
            id: 1,
            name: 'John Doe',
            score: 0.85,
            last_job_title: 'Senior Developer',
            skills: '["React", "Node.js"]'
        },
        {
            id: 2,
            name: 'Jane Smith',
            score: 0.72,
            last_job_title: 'Product Manager',
            skills: '["Agile", "Scrum"]'
        }
    ];

    const mockProfile = {
        id: 1,
        parsed_data: { name: 'John Doe', skills: 'React' }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        useHeadhunter.mockReturnValue({ jobs: [] });
        axios.get.mockImplementation((url, config) => {
            if (url === '/api/search/candidates') {
                if (config.params.q === 'React') return Promise.resolve({ data: mockResults });
                return Promise.resolve({ data: [] });
            }
            if (url === '/api/profiles/1') return Promise.resolve({ data: mockProfile });
            return Promise.reject(new Error('Not found'));
        });
    });

    it('renders search bar and suggestions', () => {
        render(<Search onOpenMobileSidebar={() => { }} />);
        expect(screen.getByPlaceholderText(/e.g. 'Senior React developer/i)).toBeInTheDocument();
        expect(screen.getByText(/Frontend developer with React/i)).toBeInTheDocument();
    });

    it('performs search and displays results', async () => {
        render(<Search onOpenMobileSidebar={() => { }} />);

        const input = screen.getByPlaceholderText(/e.g. 'Senior React developer/i);
        fireEvent.change(input, { target: { value: 'React' } });

        const button = screen.getByText('Search');
        fireEvent.click(button);

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/api/search/candidates', { params: { q: 'React' } });
            expect(screen.getByText('Found 2 candidates')).toBeInTheDocument();
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('85%')).toBeInTheDocument(); // Score
        });
    });

    it('handles no results', async () => {
        render(<Search onOpenMobileSidebar={() => { }} />);

        const input = screen.getByPlaceholderText(/e.g. 'Senior React developer/i);
        fireEvent.change(input, { target: { value: 'Unknown' } });

        const button = screen.getByText('Search');
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByText('No matches found')).toBeInTheDocument();
        });
    });

    it('opens profile drawer', async () => {
        render(<Search onOpenMobileSidebar={() => { }} />);

        // Search first
        const input = screen.getByPlaceholderText(/e.g. 'Senior React developer/i);
        fireEvent.change(input, { target: { value: 'React' } });
        fireEvent.click(screen.getByText('Search'));

        await waitFor(() => screen.getByText('John Doe'));

        // Click view profile
        const viewButtons = screen.getAllByText('View Profile');
        fireEvent.click(viewButtons[0]);

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/api/profiles/1');
            expect(screen.getByTestId('candidate-drawer')).toBeInTheDocument();
            expect(screen.getByText('Drawer: John Doe')).toBeInTheDocument();
        });
    });
});
