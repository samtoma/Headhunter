import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import CandidateCard from '../CandidateCard'

// Mock useAuth
vi.mock('../../../context/AuthContext', () => ({
    useAuth: () => ({ token: 'mock-token' })
}))

// Mock lucide-react icons to avoid rendering issues
vi.mock('lucide-react', () => ({
    Briefcase: () => <span data-testid="icon-briefcase" />,
    GraduationCap: () => <span data-testid="icon-graduation-cap" />,
    Heart: () => <span data-testid="icon-heart" />,
    Flag: () => <span data-testid="icon-flag" />,
    CheckSquare: () => <span data-testid="icon-check-square" />,
    Square: () => <span data-testid="icon-square" />,
    RotateCw: () => <span data-testid="icon-rotate-cw" />,
    Trash2: () => <span data-testid="icon-trash-2" />,
    RefreshCw: () => <span data-testid="icon-refresh-cw" />,
    Download: () => <span data-testid="icon-download" />
}))

describe('CandidateCard', () => {
    const mockCv = {
        id: 123,
        is_parsed: true,
        uploaded_at: '2023-01-01T00:00:00Z',
        projected_experience: 5,
        parsed_data: {
            name: 'John Doe',
            last_job_title: 'Software Engineer',
            last_company: 'Tech Corp',
            skills: ['React', 'Node.js', 'Python'],
            education: [{ school: 'University of Code' }],
            marital_status: 'Single',
            military_status: 'N/A'
        }
    }

    const defaultProps = {
        cv: mockCv,
        onClick: vi.fn(),
        onDelete: vi.fn(),
        onReprocess: vi.fn(),
        onSelect: vi.fn(),
        selectable: false,
        selected: false,
        compact: false
    }

    it('renders candidate information correctly', () => {
        render(<CandidateCard {...defaultProps} />)

        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('Software Engineer')).toBeInTheDocument()
        expect(screen.getByText(/Tech Corp/)).toBeInTheDocument()
        expect(screen.getByText('University of Code')).toBeInTheDocument()
        expect(screen.getByText('5y')).toBeInTheDocument()
        expect(screen.getByText('React')).toBeInTheDocument()
    })

    it('calls onClick when card is clicked', () => {
        render(<CandidateCard {...defaultProps} />)
        fireEvent.click(screen.getByText('John Doe').closest('div.group'))
        expect(defaultProps.onClick).toHaveBeenCalled()
    })

    it('calls onDelete when trash icon is clicked', () => {
        render(<CandidateCard {...defaultProps} />)
        const deleteBtn = screen.getByTestId('icon-trash-2').closest('button')
        fireEvent.click(deleteBtn)
        expect(defaultProps.onDelete).toHaveBeenCalledWith(expect.anything(), 123)
    })

    it('calls onReprocess when rotate icon is clicked', () => {
        render(<CandidateCard {...defaultProps} />)
        const reprocessBtn = screen.getByTestId('icon-rotate-cw').closest('button')
        fireEvent.click(reprocessBtn)
        expect(defaultProps.onReprocess).toHaveBeenCalledWith(expect.anything(), 123)
    })

    it('renders selection checkbox when selectable is true', () => {
        render(<CandidateCard {...defaultProps} selectable={true} />)
        expect(screen.getByTestId('icon-square')).toBeInTheDocument()
    })

    it('calls onSelect when checkbox is clicked', () => {
        render(<CandidateCard {...defaultProps} selectable={true} />)
        const checkbox = screen.getByTestId('icon-square').closest('div')
        fireEvent.click(checkbox)
        expect(defaultProps.onSelect).toHaveBeenCalled()
    })

    it('shows loading spinner when not parsed', () => {
        const unparsedCv = { ...mockCv, is_parsed: false }
        render(<CandidateCard {...defaultProps} cv={unparsedCv} />)
        expect(screen.getByTestId('icon-refresh-cw')).toBeInTheDocument()
    })

    it('renders download link with correct token', () => {
        render(<CandidateCard {...defaultProps} />)
        const downloadLink = screen.getByTitle('Download CV')
        expect(downloadLink).toHaveAttribute('href', '/api/cv/123/download?token=mock-token')
    })
})
