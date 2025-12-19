import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import PipelineHeader from '../PipelineHeader'

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    Search: () => <span data-testid="icon-search" />,
    LayoutGrid: () => <span data-testid="icon-layout-grid" />,
    Kanban: () => <span data-testid="icon-kanban" />,
    Upload: () => <span data-testid="icon-upload" />,
    Menu: () => <span data-testid="icon-menu" />,
    Briefcase: () => <span data-testid="icon-briefcase" />,
    Layers: () => <span data-testid="icon-layers" />,
    Calendar: () => <span data-testid="icon-calendar" />,
    GanttChart: () => <span data-testid="icon-gantt-chart" />,
    X: () => <span data-testid="icon-x" />,
    Plus: () => <span data-testid="icon-plus" />
}))

describe('PipelineHeader', () => {
    const defaultProps = {
        selectedJob: null,
        handleToggleArchive: vi.fn(),
        viewMode: 'list',
        setViewMode: vi.fn(),
        handleSelectAll: vi.fn(),
        selectedIds: [],
        filteredProfiles: [],
        searchTerm: '',
        setSearchTerm: vi.fn(),
        uploading: false,
        performUpload: vi.fn(),
        setUploadFiles: vi.fn(),
        setShowUploadModal: vi.fn(),
        sortBy: 'newest',
        setSortBy: vi.fn(),
        onOpenMobileSidebar: vi.fn(),
        selectedDepartment: 'All',
        setSelectedDepartment: vi.fn(),
        departments: ['All', 'Engineering', 'Sales'],
        onEditJob: vi.fn(),
        user: { role: 'admin' }
    }

    it('renders General Pool title when no job selected', () => {
        render(<PipelineHeader {...defaultProps} />)
        expect(screen.getByText('General Pool')).toBeInTheDocument()
    })

    it('renders Job title and department when job selected', () => {
        const job = { id: 1, title: 'Software Engineer', department: 'Engineering', is_active: true, status: 'Open' }
        render(<PipelineHeader {...defaultProps} selectedJob={job} />)
        expect(screen.getByText('Software Engineer')).toBeInTheDocument()
        expect(screen.getByText('Engineering')).toBeInTheDocument()
    })

    it('renders Archived badge when job is inactive', () => {
        const job = { id: 1, title: 'Software Engineer', is_active: false, status: 'Closed' }
        render(<PipelineHeader {...defaultProps} selectedJob={job} />)
        expect(screen.getByText('ARCHIVED')).toBeInTheDocument()
    })

    it('calls setSearchTerm when search input changes', () => {
        render(<PipelineHeader {...defaultProps} />)
        const input = screen.getByPlaceholderText('Search...')
        fireEvent.change(input, { target: { value: 'test' } })
        expect(defaultProps.setSearchTerm).toHaveBeenCalledWith('test')
    })

    it('calls setSortBy when sort dropdown changes', () => {
        render(<PipelineHeader {...defaultProps} />)
        // Find select by display value or role
        // The select has value={sortBy}
        const selects = screen.getAllByRole('combobox')
        // The sort select is likely the one with "Newest First" option
        const sortSelect = selects.find(s => s.value === 'newest')

        fireEvent.change(sortSelect, { target: { value: 'oldest' } })
        expect(defaultProps.setSortBy).toHaveBeenCalledWith('oldest')
    })

    it('toggles view mode when buttons clicked', () => {
        const job = { id: 1, title: 'Software Engineer', is_active: true }
        render(<PipelineHeader {...defaultProps} selectedJob={job} />)

        const kanbanIcon = screen.getByTestId('icon-kanban')
        fireEvent.click(kanbanIcon.closest('button'))
        expect(defaultProps.setViewMode).toHaveBeenCalledWith('kanban')

        const listIcon = screen.getByTestId('icon-layout-grid')
        fireEvent.click(listIcon.closest('button'))
        expect(defaultProps.setViewMode).toHaveBeenCalledWith('list')
    })

    it('calls handleToggleArchive when status changes', () => {
        const job = { id: 1, title: 'Software Engineer', is_active: true, status: 'Open' }
        render(<PipelineHeader {...defaultProps} selectedJob={job} />)

        const statusSelect = screen.getByDisplayValue('● Open')
        fireEvent.change(statusSelect, { target: { value: 'On Hold' } })
        expect(defaultProps.handleToggleArchive).toHaveBeenCalledWith(job, 'On Hold')
    })

    it('calls onEditJob when edit button clicked (admin)', () => {
        const job = { id: 1, title: 'Software Engineer', is_active: true, status: 'Open' }
        render(<PipelineHeader {...defaultProps} selectedJob={job} user={{ role: 'admin' }} />)

        fireEvent.click(screen.getByText('Edit'))
        expect(defaultProps.onEditJob).toHaveBeenCalled()
    })

    it('does not show edit button for standard user', () => {
        const job = { id: 1, title: 'Software Engineer', is_active: true, status: 'Open' }
        render(<PipelineHeader {...defaultProps} selectedJob={job} user={{ role: 'standard' }} />)

        expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    })

    it('handles file upload for general pool', () => {
        // This test is covered by 'handles file upload selection' test below
        render(<PipelineHeader {...defaultProps} />)
        expect(screen.getByText('Upload CV')).toBeInTheDocument()
    })

    // Rewrite upload test to be cleaner
    it('handles file upload selection', () => {
        const { container } = render(<PipelineHeader {...defaultProps} />)
        // In general pool, we have a label acting as button with nested input
        const input = container.querySelector('input[type="file"]')
        const file = new File(['dummy'], 'resume.pdf', { type: 'application/pdf' })

        fireEvent.change(input, { target: { files: [file] } })

        expect(defaultProps.setUploadFiles).toHaveBeenCalled()
        expect(defaultProps.setShowUploadModal).toHaveBeenCalledWith(true)
    })

    it('handles file upload for specific job', () => {
        const job = { id: 1, title: 'Software Engineer' }
        render(<PipelineHeader {...defaultProps} selectedJob={job} />)

        // In specific job, we have a button that opens the modal
        fireEvent.click(screen.getByText('Add Candidate'))

        expect(defaultProps.setShowUploadModal).toHaveBeenCalledWith(true)
    })
})
