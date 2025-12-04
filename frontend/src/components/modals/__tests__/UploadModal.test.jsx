import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import UploadModal from '../../modals/UploadModal'

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    ChevronRight: () => <span data-testid="icon-chevron-right" />
}))

describe('UploadModal', () => {
    const mockJobs = [
        { id: 1, title: 'Software Engineer', is_active: true },
        { id: 2, title: 'Product Manager', is_active: true },
        { id: 3, title: 'Archived Job', is_active: false }
    ]

    const mockFiles = [new File(['dummy'], 'test.pdf', { type: 'application/pdf' })]

    const defaultProps = {
        jobs: mockJobs,
        uploadFiles: mockFiles,
        performUpload: vi.fn(),
        onClose: vi.fn()
    }

    it('renders correctly with title and options', () => {
        render(<UploadModal {...defaultProps} />)

        expect(screen.getByText('Select Pipeline')).toBeInTheDocument()
        expect(screen.getByText('Software Engineer')).toBeInTheDocument()
        expect(screen.getByText('Product Manager')).toBeInTheDocument()
        expect(screen.getByText('General Pool')).toBeInTheDocument()

        // Should not show inactive jobs
        expect(screen.queryByText('Archived Job')).not.toBeInTheDocument()
    })

    it('calls performUpload with files and job ID when a job is clicked', () => {
        render(<UploadModal {...defaultProps} />)

        fireEvent.click(screen.getByText('Software Engineer'))
        expect(defaultProps.performUpload).toHaveBeenCalledWith(mockFiles, 1)
    })

    it('calls performUpload with files and null when General Pool is clicked', () => {
        render(<UploadModal {...defaultProps} />)

        fireEvent.click(screen.getByText('General Pool'))
        expect(defaultProps.performUpload).toHaveBeenCalledWith(mockFiles, null)
    })

    it('calls onClose when Cancel is clicked', () => {
        render(<UploadModal {...defaultProps} />)

        fireEvent.click(screen.getByText('Cancel'))
        expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('handles empty jobs array', () => {
        render(<UploadModal {...defaultProps} jobs={[]} />)

        expect(screen.getByText('General Pool')).toBeInTheDocument()
    })

    it('handles null jobs prop', () => {
        render(<UploadModal {...defaultProps} jobs={null} />)

        expect(screen.getByText('General Pool')).toBeInTheDocument()
    })
})
