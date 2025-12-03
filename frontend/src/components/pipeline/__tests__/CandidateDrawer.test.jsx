import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import CandidateDrawer from '../CandidateDrawer'

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    MapPin: () => <span data-testid="icon-map-pin" />,
    User: () => <span data-testid="icon-user" />,
    Briefcase: () => <span data-testid="icon-briefcase" />,
    Bug: () => <span data-testid="icon-bug" />,
    Pencil: () => <span data-testid="icon-pencil" />,
    X: () => <span data-testid="icon-x" />,
    ExternalLink: () => <span data-testid="icon-external-link" />,
    Linkedin: () => <span data-testid="icon-linkedin" />,
    Github: () => <span data-testid="icon-github" />,
    FileText: () => <span data-testid="icon-file-text" />,
    BrainCircuit: () => <span data-testid="icon-brain-circuit" />,
    GraduationCap: () => <span data-testid="icon-graduation-cap" />,
    Layers: () => <span data-testid="icon-layers" />,
    LayoutGrid: () => <span data-testid="icon-layout-grid" />,
    DollarSign: () => <span data-testid="icon-dollar-sign" />,
    Star: () => <span data-testid="icon-star" />,
    AlertCircle: () => <span data-testid="icon-alert-circle" />,
    Check: () => <span data-testid="icon-check" />,
    Save: () => <span data-testid="icon-save" />,
    ChevronDown: () => <span data-testid="icon-chevron-down" />,
    Heart: () => <span data-testid="icon-heart" />,
    Flag: () => <span data-testid="icon-flag" />,
    MessageSquare: () => <span data-testid="icon-message-square" />,
    Clock: () => <span data-testid="icon-clock" />,
    Plus: () => <span data-testid="icon-plus" />
}))

// Mock Axios
vi.mock('axios', () => ({
    default: {
        get: vi.fn(() => Promise.resolve({ data: [] })),
        post: vi.fn(() => Promise.resolve({ data: {} })),
        patch: vi.fn(() => Promise.resolve({ data: {} })),
        delete: vi.fn(() => Promise.resolve({ data: {} }))
    }
}))

describe('CandidateDrawer Assignment', () => {
    const mockCv = {
        id: 1,
        parsed_data: {
            name: "John Doe",
            email: "john@example.com",
            skills: ["Python"]
        },
        applications: []
    }

    const mockJobs = [
        { id: 101, title: "Software Engineer", is_active: true },
        { id: 102, title: "Product Manager", is_active: true }
    ]

    it('opens assignment dropdown and calls assignJob on click', async () => {
        const assignJobMock = vi.fn()

        render(
            <CandidateDrawer
                cv={mockCv}
                onClose={vi.fn()}
                updateApp={vi.fn()}
                updateProfile={vi.fn()}
                jobs={mockJobs}
                selectedJobId={null}
                assignJob={assignJobMock}
                removeJob={vi.fn()}
            />
        )

        // Find "Assign to Job..." button
        const assignButton = screen.getByText('Assign to Job...')
        fireEvent.click(assignButton)

        // Check if dropdown opens
        expect(screen.getByText('Software Engineer')).toBeInTheDocument()
        expect(screen.getByText('Product Manager')).toBeInTheDocument()

        // Click on a job
        fireEvent.click(screen.getByText('Software Engineer'))

        // Verify assignJob called
        expect(assignJobMock).toHaveBeenCalledWith(1, 101)
    })

    it('calls removeJob when remove button is clicked', () => {
        const removeJobMock = vi.fn()
        const cvWithApp = {
            ...mockCv,
            applications: [{ id: 500, job_id: 101, status: 'New' }]
        }

        render(
            <CandidateDrawer
                cv={cvWithApp}
                onClose={vi.fn()}
                updateApp={vi.fn()}
                updateProfile={vi.fn()}
                jobs={mockJobs}
                selectedJobId={101}
                assignJob={vi.fn()}
                removeJob={removeJobMock}
            />
        )

        // Find "Remove from Pipeline" button
        const removeButton = screen.getByText('Remove from Pipeline')
        fireEvent.click(removeButton)

        // Verify removeJob called with app ID
        expect(removeJobMock).toHaveBeenCalledWith(500)
    })

    it('shows loading state when removing from pipeline', async () => {
        const removeJobMock = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)))
        const cvWithApp = {
            ...mockCv,
            applications: [{ id: 500, job_id: 101, status: 'New' }]
        }

        render(
            <CandidateDrawer
                cv={cvWithApp}
                onClose={vi.fn()}
                updateApp={vi.fn()}
                updateProfile={vi.fn()}
                jobs={mockJobs}
                selectedJobId={101}
                assignJob={vi.fn()}
                removeJob={removeJobMock}
            />
        )

        const removeButton = screen.getByText('Remove from Pipeline')
        fireEvent.click(removeButton)

        // Should show removing state immediately
        expect(screen.getByText('Removing...')).toBeInTheDocument()
        expect(removeButton).toBeDisabled()

        // Wait for promise to resolve
        await waitFor(() => expect(removeJobMock).toHaveBeenCalled())
    })

    it('hides job in dropdown if already assigned', () => {
        const cvWithApp = {
            ...mockCv,
            applications: [{ id: 500, job_id: 101, status: 'New' }]
        }

        render(
            <CandidateDrawer
                cv={cvWithApp}
                onClose={vi.fn()}
                updateApp={vi.fn()}
                updateProfile={vi.fn()}
                jobs={mockJobs}
                selectedJobId={null}
                assignJob={vi.fn()}
                removeJob={vi.fn()}
            />
        )

        // Clear active job to see General Pool
        const clearButton = screen.getByTitle('Back to General Pool')
        fireEvent.click(clearButton)

        // Open dropdown
        const assignButton = screen.getByText('Assign to Job...')
        fireEvent.click(assignButton)

        // Find the assigned job button - Should NOT be present
        const assignedJobButton = screen.queryByRole('button', { name: /Software Engineer/i })
        expect(assignedJobButton).not.toBeInTheDocument()

        // Unassigned job should be present
        const unassignedJobButton = screen.getByRole('button', { name: /Product Manager/i })
        expect(unassignedJobButton).toBeInTheDocument()
    })
})
