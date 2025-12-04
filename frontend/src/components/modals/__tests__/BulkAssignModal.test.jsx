import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import BulkAssignModal from '../../modals/BulkAssignModal'

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    ChevronRight: () => <span data-testid="icon-chevron-right" />
}))

describe('BulkAssignModal', () => {
    const mockJobs = [
        { id: 1, title: 'Software Engineer', is_active: true },
        { id: 2, title: 'Product Manager', is_active: true },
        { id: 3, title: 'Archived Job', is_active: false }
    ]

    const defaultProps = {
        jobs: mockJobs,
        selectedCount: 5,
        performBulkAssign: vi.fn(),
        onClose: vi.fn()
    }

    it('renders correctly with title and active jobs', () => {
        render(<BulkAssignModal {...defaultProps} />)

        expect(screen.getByText('Bulk Assign 5 Candidates')).toBeInTheDocument()
        expect(screen.getByText('Software Engineer')).toBeInTheDocument()
        expect(screen.getByText('Product Manager')).toBeInTheDocument()

        // Should not show inactive jobs
        expect(screen.queryByText('Archived Job')).not.toBeInTheDocument()
    })

    it('calls performBulkAssign with job ID when a job is clicked', () => {
        render(<BulkAssignModal {...defaultProps} />)

        fireEvent.click(screen.getByText('Software Engineer'))
        expect(defaultProps.performBulkAssign).toHaveBeenCalledWith(1)
    })

    it('calls onClose when Cancel is clicked', () => {
        render(<BulkAssignModal {...defaultProps} />)

        fireEvent.click(screen.getByText('Cancel'))
        expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('handles empty jobs array gracefully', () => {
        render(<BulkAssignModal {...defaultProps} jobs={[]} />)

        expect(screen.getByText('Bulk Assign 5 Candidates')).toBeInTheDocument()
        // Should just render empty list without crashing
    })

    it('handles null jobs prop gracefully', () => {
        render(<BulkAssignModal {...defaultProps} jobs={null} />)

        expect(screen.getByText('Bulk Assign 5 Candidates')).toBeInTheDocument()
    })

    it('renders correctly with no active jobs', () => {
        const inactiveJobs = [{ id: 1, title: 'Job 1', is_active: false }]
        render(<BulkAssignModal {...defaultProps} jobs={inactiveJobs} />)

        expect(screen.queryByText('Job 1')).not.toBeInTheDocument()
    })
})
