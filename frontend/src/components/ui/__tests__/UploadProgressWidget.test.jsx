import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import UploadProgressWidget from '../UploadProgressWidget'
import { useUpload } from '../../../context/UploadContext'

// Mock the UploadContext hook
vi.mock('../../../context/UploadContext', () => ({
    useUpload: vi.fn()
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    Loader2: () => <span data-testid="icon-loader" />,
    CheckCircle: () => <span data-testid="icon-check" />,
    XCircle: () => <span data-testid="icon-error" />,
    FileText: () => <span data-testid="icon-file" />,
    X: () => <span data-testid="icon-x" />
}))

describe('UploadProgressWidget', () => {
    const mockCloseWidget = vi.fn()

    // ============================================
    // Test: Not rendering when not uploading
    // ============================================
    it('returns null when uploading is false', () => {
        useUpload.mockReturnValue({
            uploading: false,
            progress: 0,
            status: '',
            fileCount: 0,
            error: null,
            closeWidget: mockCloseWidget
        })

        const { container } = render(<UploadProgressWidget />)
        expect(container.firstChild).toBeNull()
    })

    // ============================================
    // Test: Uploading status
    // ============================================
    it('renders widget with uploading status', () => {
        useUpload.mockReturnValue({
            uploading: true,
            progress: 45,
            status: 'uploading',
            fileCount: 3,
            error: null,
            closeWidget: mockCloseWidget
        })

        render(<UploadProgressWidget />)

        expect(screen.getByText('Uploading Files...')).toBeInTheDocument()
        expect(screen.getByText('3 Files')).toBeInTheDocument()
        expect(screen.getByText('45% uploaded')).toBeInTheDocument()
        expect(screen.getByTestId('icon-loader')).toBeInTheDocument()
    })

    // ============================================
    // Test: Processing status
    // ============================================
    it('renders widget with processing status', () => {
        useUpload.mockReturnValue({
            uploading: true,
            progress: 100,
            status: 'processing',
            fileCount: 5,
            error: null,
            closeWidget: mockCloseWidget
        })

        render(<UploadProgressWidget />)

        expect(screen.getByText('Processing...')).toBeInTheDocument()
        expect(screen.getByText('Parsing CVs...')).toBeInTheDocument()
    })

    // ============================================
    // Test: Complete status
    // ============================================
    it('renders widget with complete status', () => {
        useUpload.mockReturnValue({
            uploading: true,
            progress: 100,
            status: 'complete',
            fileCount: 2,
            error: null,
            closeWidget: mockCloseWidget
        })

        render(<UploadProgressWidget />)

        expect(screen.getByText('Upload Complete')).toBeInTheDocument()
        expect(screen.getByText('All files processed')).toBeInTheDocument()
        expect(screen.getByTestId('icon-check')).toBeInTheDocument()
    })

    // ============================================
    // Test: Error status
    // ============================================
    it('renders widget with error status', () => {
        useUpload.mockReturnValue({
            uploading: true,
            progress: 50,
            status: 'error',
            fileCount: 1,
            error: 'Network connection failed',
            closeWidget: mockCloseWidget
        })

        render(<UploadProgressWidget />)

        expect(screen.getByText('Upload Failed')).toBeInTheDocument()
        expect(screen.getByText('Error occurred')).toBeInTheDocument()
        expect(screen.getByText('Network connection failed')).toBeInTheDocument()
        expect(screen.getByTestId('icon-error')).toBeInTheDocument()
    })

    // ============================================
    // Test: Close button
    // ============================================
    it('calls closeWidget when close button is clicked', () => {
        useUpload.mockReturnValue({
            uploading: true,
            progress: 50,
            status: 'uploading',
            fileCount: 2,
            error: null,
            closeWidget: mockCloseWidget
        })

        render(<UploadProgressWidget />)

        const closeButton = screen.getByTestId('icon-x').closest('button')
        fireEvent.click(closeButton)

        expect(mockCloseWidget).toHaveBeenCalled()
    })

    // ============================================
    // Test: Warning message during upload
    // ============================================
    it('shows warning message during uploading', () => {
        useUpload.mockReturnValue({
            uploading: true,
            progress: 30,
            status: 'uploading',
            fileCount: 4,
            error: null,
            closeWidget: mockCloseWidget
        })

        render(<UploadProgressWidget />)

        expect(screen.getByText('Do not close this tab')).toBeInTheDocument()
    })

    it('shows warning message during processing', () => {
        useUpload.mockReturnValue({
            uploading: true,
            progress: 100,
            status: 'processing',
            fileCount: 4,
            error: null,
            closeWidget: mockCloseWidget
        })

        render(<UploadProgressWidget />)

        expect(screen.getByText('Do not close this tab')).toBeInTheDocument()
    })

    // ============================================
    // Test: Progress bar visibility
    // ============================================
    it('shows progress bar during uploading', () => {
        useUpload.mockReturnValue({
            uploading: true,
            progress: 75,
            status: 'uploading',
            fileCount: 2,
            error: null,
            closeWidget: mockCloseWidget
        })

        const { container } = render(<UploadProgressWidget />)

        // Progress bar should exist with correct width style
        const progressBar = container.querySelector('[style*="width"]')
        expect(progressBar).toBeInTheDocument()
    })

    it('hides progress bar when complete', () => {
        useUpload.mockReturnValue({
            uploading: true,
            progress: 100,
            status: 'complete',
            fileCount: 2,
            error: null,
            closeWidget: mockCloseWidget
        })

        render(<UploadProgressWidget />)

        // Warning message should not appear when complete
        expect(screen.queryByText('Do not close this tab')).not.toBeInTheDocument()
    })

    // ============================================
    // Test: File count display
    // ============================================
    it('displays correct file count', () => {
        useUpload.mockReturnValue({
            uploading: true,
            progress: 10,
            status: 'uploading',
            fileCount: 10,
            error: null,
            closeWidget: mockCloseWidget
        })

        render(<UploadProgressWidget />)

        expect(screen.getByText('10 Files')).toBeInTheDocument()
    })
})
