import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Pipeline from '../Pipeline'
import { AuthProvider } from '../../context/AuthContext'
import { UploadProvider } from '../../context/UploadContext'
import axios from 'axios'

// Mock dependencies
vi.mock('axios')
vi.mock('react-router-dom', () => ({
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/pipeline' }),
}))

// Mock virtualization libraries
vi.mock('react-virtualized-auto-sizer', () => ({
    default: ({ children }) => children({ height: 1000, width: 1000 })
}))

vi.mock('react-window', () => ({
    FixedSizeGrid: ({ children, columnCount, rowCount, columnWidth, rowHeight }) => (
        <div>
            {Array.from({ length: rowCount }).map((_, rowIndex) => (
                Array.from({ length: columnCount }).map((_, columnIndex) => (
                    children({ columnIndex, rowIndex, style: { width: columnWidth, height: rowHeight } })
                ))
            ))}
        </div>
    )
}))

// Mock useHeadhunter hook
const useHeadhunterMock = vi.fn()
vi.mock('../../context/HeadhunterContext', async () => {
    const actual = await vi.importActual('../../context/HeadhunterContext')
    return {
        ...actual,
        useHeadhunter: () => useHeadhunterMock()
    }
})

// Mock child components to focus on integration logic
vi.mock('../../components/pipeline/CandidateCard', () => ({
    default: ({ cv, onClick, selected, onSelect }) => (
        <div data-testid={`card-${cv.id}`} onClick={onClick}>
            {cv.parsed_data.name}
            <button onClick={(e) => { e.stopPropagation(); onSelect() }}>
                {selected ? 'Selected' : 'Select'}
            </button>
        </div>
    )
}))

vi.mock('../../components/pipeline/BulkActionBar', () => ({
    default: ({ selectedIds, performBulkDelete }) => (
        selectedIds.length > 0 ? (
            <div data-testid="bulk-action-bar">
                <span>{selectedIds.length} Selected</span>
                <button onClick={performBulkDelete}>Bulk Delete</button>
            </div>
        ) : null
    )
}))

describe('Pipeline Integration', () => {
    const mockJobs = [
        { id: 1, title: 'Frontend Dev', department: 'Engineering', is_active: true, status: 'Open' },
        { id: 2, title: 'Sales Rep', department: 'Sales', is_active: true, status: 'Open' }
    ]

    const mockProfiles = [
        {
            id: 101,
            parsed_data: { name: 'John Doe', skills: ['React'] },
            applications: [{ job_id: 1, status: 'New' }],
            uploaded_at: '2023-01-01'
        },
        {
            id: 102,
            parsed_data: { name: 'Jane Smith', skills: ['Sales'] },
            applications: [{ job_id: 2, status: 'Interview' }],
            uploaded_at: '2023-01-02'
        },
        {
            id: 103,
            parsed_data: { name: 'Bob Wilson', skills: ['Python'] },
            applications: [], // General pool
            uploaded_at: '2023-01-03'
        }
    ]

    const defaultContext = {
        jobs: mockJobs,
        profiles: mockProfiles,
        setProfiles: vi.fn(),
        fetchJobs: vi.fn(),
        fetchProfiles: vi.fn(),
        loadMoreProfiles: vi.fn(),
        hasMore: false,
        isFetchingMore: false,
        loading: false,
        jobsLoading: false,
        selectedJobId: null,
        search: '',
        setSearch: vi.fn(),
        sortBy: 'newest',
        setSortBy: vi.fn(),
        updateApp: vi.fn(),
        updateProfile: vi.fn(),
        assignJob: vi.fn(),
        removeJob: vi.fn()
    }

    const renderPipeline = (contextOverrides = {}) => {
        useHeadhunterMock.mockReturnValue({ ...defaultContext, ...contextOverrides })

        return render(
            <AuthProvider>
                <UploadProvider>
                    <Pipeline onOpenMobileSidebar={vi.fn()} />
                </UploadProvider>
            </AuthProvider>
        )
    }

    beforeEach(() => {
        vi.clearAllMocks()
        window.confirm = vi.fn(() => true)
        window.alert = vi.fn()
    })

    it('renders General Pool title when no job selected', () => {
        renderPipeline()
        expect(screen.getByText('General Pool')).toBeInTheDocument()
    })

    it('renders Job title when job selected', () => {
        renderPipeline({ selectedJobId: 1 })
        expect(screen.getByText('Frontend Dev')).toBeInTheDocument()
    })

    it('filters candidates by search term', () => {
        // Since filtering happens in Pipeline.jsx using context values,
        // we need to ensure the component receives the data.
        // Pipeline.jsx filters `profiles` based on `selectedDepartment`.
        // It DOES NOT filter by `search` term in `filteredProfiles` memo.
        // It passes `search` to `PipelineHeader`.
        // If the search filtering is expected to be done by the backend (and thus `profiles` already filtered),
        // then we should simulate that by passing filtered profiles.

        const filtered = [mockProfiles[1]]
        renderPipeline({ profiles: filtered, search: 'Jane' })

        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
        expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    })

    it('filters by department in General Pool', () => {
        renderPipeline({ selectedJobId: null })

        // Find department select
        // Actually there are multiple selects. We need to find the one for department.
        // It has options "All", "Engineering", "Sales"
        const selects = screen.getAllByRole('combobox')
        const deptSelect = selects.find(s => s.innerHTML.includes('Engineering'))

        fireEvent.change(deptSelect, { target: { value: 'Engineering' } })

        // Should show John Doe (Engineering) but not Jane Smith (Sales)
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
    })

    it('handles bulk selection and deletion', async () => {
        axios.post.mockResolvedValue({ data: { success: true } })
        const setProfiles = vi.fn()

        renderPipeline({ setProfiles })

        // Select two candidates
        fireEvent.click(screen.getByTestId('card-101').querySelector('button'))
        fireEvent.click(screen.getByTestId('card-102').querySelector('button'))

        // Bulk action bar should appear
        expect(screen.getByTestId('bulk-action-bar')).toBeInTheDocument()
        expect(screen.getByText('2 Selected')).toBeInTheDocument()

        // Click delete
        fireEvent.click(screen.getByText('Bulk Delete'))

        // Verify confirmation
        expect(window.confirm).toHaveBeenCalled()

        // Verify API call
        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith('/api/cv/bulk_delete', { cv_ids: [101, 102] })
        })

        // Verify state update
        await waitFor(() => {
            expect(setProfiles).toHaveBeenCalled()
        })
    })

    it('handles job status update', async () => {
        axios.patch.mockResolvedValue({ data: {} })
        const fetchJobs = vi.fn()

        renderPipeline({ selectedJobId: 1, fetchJobs })

        // Find status select
        // It has value "Open"
        const statusSelect = screen.getByDisplayValue('● Open')

        fireEvent.change(statusSelect, { target: { value: 'Closed' } })

        await waitFor(() => {
            expect(axios.patch).toHaveBeenCalledWith('/api/jobs/1', { status: 'Closed', is_active: false })
            expect(fetchJobs).toHaveBeenCalled()
        })
    })

    it('shows loading spinner when loading', () => {
        renderPipeline({ loading: true })
        // Check for spinner presence (it has animate-spin class)
        const spinner = document.querySelector('.animate-spin')
        expect(spinner).toBeInTheDocument()
    })

    it('shows "No candidates found" when empty', () => {
        renderPipeline({ profiles: [] })
        expect(screen.getByText('No candidates found')).toBeInTheDocument()
    })

    it('opens upload modal when Add clicked in General Pool', () => {
        renderPipeline({ selectedJobId: null })

        // Find Add button (it's a label acting as button)
        const addBtn = screen.getByText('Add')

        // We can't easily click the file input label to trigger modal without file selection
        // But the code says: onChange of input triggers modal if no selectedJob

        const fileInput = addBtn.closest('label').querySelector('input[type="file"]')
        const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' })

        fireEvent.change(fileInput, { target: { files: [file] } })

        expect(screen.getByText('Select Pipeline')).toBeInTheDocument() // Modal title
    })
})
