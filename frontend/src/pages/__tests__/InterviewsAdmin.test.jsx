import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import InterviewsAdmin from '../InterviewsAdmin'
import axios from 'axios'
import { BrowserRouter } from 'react-router-dom'

vi.mock('axios')

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
        ...actual,
        useNavigate: () => navigateMock
    }
})

const mockInterviews = [
    {
        id: 1,
        candidate_name: "Bruce Wayne",
        job_title: "Security Manager",
        step: "Final",
        interviewer_name: "Lucius Fox",
        scheduled_at: "2023-11-15T10:00:00",
        status: "Scheduled",
        outcome: null
    },
    {
        id: 2,
        candidate_name: "Clark Kent",
        job_title: "Journalist",
        step: "Screening",
        interviewer_name: "Lois Lane",
        scheduled_at: "2023-11-14T14:00:00",
        status: "Completed",
        outcome: "Passed"
    }
]

describe('InterviewsAdmin', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        axios.get.mockResolvedValue({ data: mockInterviews })
    })

    it('renders interviews list', async () => {
        render(
            <BrowserRouter>
                <InterviewsAdmin onOpenMobileSidebar={() => { }} />
            </BrowserRouter>
        )

        await waitFor(() => {
            expect(screen.getByText('Bruce Wayne')).toBeInTheDocument()
            // Clark Kent is 'Completed', so might not be in the default 'Scheduled' view
            // expect(screen.getByText('Clark Kent')).toBeInTheDocument() 
        })
    })

    it('filters interviews by status', async () => {
        render(
            <BrowserRouter>
                <InterviewsAdmin onOpenMobileSidebar={() => { }} />
            </BrowserRouter>
        )

        await waitFor(() => {
            expect(screen.getByText('Bruce Wayne')).toBeInTheDocument()
        })

        // Click Completed tab
        // Use getAllByText because "Completed" appears in the tab AND the status badge for Clark Kent.
        // We want the tab (button).
        const completedTab = screen.getByRole('button', { name: /Completed/i })
        fireEvent.click(completedTab)

        await waitFor(() => {
            expect(screen.queryByText('Bruce Wayne')).not.toBeInTheDocument()
            expect(screen.getByText('Clark Kent')).toBeInTheDocument()
        })
    })

    it('navigates to interview details on row click', async () => {
        render(
            <BrowserRouter>
                <InterviewsAdmin onOpenMobileSidebar={() => { }} />
            </BrowserRouter>
        )

        await waitFor(() => {
            expect(screen.getByText('Bruce Wayne')).toBeInTheDocument()
        })

        // Click on the row (find by candidate name text)
        fireEvent.click(screen.getByText('Bruce Wayne'))

        expect(navigateMock).toHaveBeenCalledWith('/interview/1')
    })

    it('renders empty state when no interviews', async () => {
        axios.get.mockResolvedValue({ data: [] })
        render(
            <BrowserRouter>
                <InterviewsAdmin onOpenMobileSidebar={() => { }} />
            </BrowserRouter>
        )

        await waitFor(() => {
            expect(screen.getByText('No interviews found')).toBeInTheDocument()
        })
    })
})
