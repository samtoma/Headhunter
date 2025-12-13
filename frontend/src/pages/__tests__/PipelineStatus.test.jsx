import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Pipeline from '../../pages/Pipeline'
import { AuthProvider } from '../../context/AuthContext'
import { UploadProvider } from '../../context/UploadContext'

// Mock dependencies
vi.mock('axios')
vi.mock('react-router-dom', () => ({
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/pipeline' }),
}))

// Mock virtualization
vi.mock('react-virtualized-auto-sizer', () => ({
    default: ({ children }) => children({ height: 1000, width: 1000 })
}))
vi.mock('react-window', () => ({
    FixedSizeGrid: ({ children }) => <div>{children({ columnIndex: 0, rowIndex: 0, style: {} })}</div>
}))

// Mock useHeadhunter
const useHeadhunterMock = vi.fn()
vi.mock('../../context/HeadhunterContext', async () => {
    const actual = await vi.importActual('../../context/HeadhunterContext')
    return {
        ...actual,
        useHeadhunter: () => useHeadhunterMock()
    }
})

describe('Pipeline Status Change', () => {
    const mockJob = { id: 1, title: 'Frontend Dev', department: 'Engineering', is_active: true, status: 'Open' }
    const mockProfile = {
        id: 101,
        parsed_data: { name: 'John Doe', skills: ['React'] },
        applications: [{ id: 1, job_id: 1, status: 'New' }],
        uploaded_at: '2023-01-01'
    }

    const defaultContext = {
        jobs: [mockJob],
        profiles: [mockProfile],
        setProfiles: vi.fn(),
        fetchJobs: vi.fn(),
        fetchProfiles: vi.fn(),
        loadMoreProfiles: vi.fn(),
        hasMore: false,
        isFetchingMore: false,
        loading: false,
        jobsLoading: false,
        selectedJobId: 1, // Selected Job
        search: '',
        setSearch: vi.fn(),
        sortBy: 'newest',
        setSortBy: vi.fn(),
        updateApp: vi.fn(),
        updateProfile: vi.fn(),
        assignJob: vi.fn(),
        removeJob: vi.fn(),
        pipelineStages: ['Screening', 'Technical', 'Culture', 'Final'],
        companyStages: ['Screening', 'Technical', 'Culture', 'Final']
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
    })

    it('updates status when moving candidate to a new column', async () => {
        const updateApp = vi.fn().mockResolvedValue({})
        const setProfiles = vi.fn()

        // We need to simulate the Board View
        // The Board View renders when selectedJob is present (which it is) and viewMode is 'board' (default is list?)
        // Pipeline.jsx: const [viewMode, setViewMode] = useState("list");
        // We need to switch to board view first.

        renderPipeline({ updateApp, setProfiles })

        // Switch to Board View
        // Find the view toggle button. It usually has an icon.
        // Let's assume there's a button with "Board" or similar, or we check PipelineHeader.
        // PipelineHeader usually has view toggles.
        // Let's try to find the button by icon name or assume text.
        // If we can't find it, we might need to mock the initial state of viewMode in Pipeline.jsx, but we can't easily.
        // Instead, let's click the button.

        const boardBtn = screen.getByLabelText('Board View') // Assuming accessible name
        fireEvent.click(boardBtn)

        // Now we should see columns. "New", "Screening", etc.
        expect(screen.getByText('New')).toBeInTheDocument()
        expect(screen.getByText('Screening')).toBeInTheDocument()

        // Find the candidate card in "New" column
        expect(screen.getByText('John Doe')).toBeInTheDocument()

        // Simulate Drag and Drop
        // This is tricky in JSDOM. We can try to call the onDrop handler of the target column directly if we can access it,
        // or trigger drag events.

        // Let's try firing drop on the "Screening" column.
        // We need to find the drop zone for "Screening".
        const screeningCol = screen.getByText('Screening').closest('.flex-col') // Assuming column structure

        // Mock dataTransfer
        const dataTransfer = {
            getData: vi.fn().mockReturnValue('101'),
            setData: vi.fn()
        }

        fireEvent.drop(screeningCol, { dataTransfer })

        // Verify updateApp is called
        await waitFor(() => {
            expect(updateApp).toHaveBeenCalledWith(1, { status: 'Screening' })
        })

        // Verify optimistic update (setProfiles called)
        expect(setProfiles).toHaveBeenCalled()
    })
})
