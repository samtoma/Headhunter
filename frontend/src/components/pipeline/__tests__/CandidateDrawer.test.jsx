import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CandidateDrawer from '../CandidateDrawer'
import axios from 'axios'

// Mock axios
vi.mock('axios')

const mockCv = {
    id: 1,
    parsed_data: {
        name: "John Doe",
        email: "john@example.com",
        skills: ["React", "Node.js"]
    },
    applications: [
        { id: 501, job_id: 101, status: "New", rating: 0, notes: "" }
    ]
}

const mockJobs = [
    { id: 101, title: "Frontend Engineer", is_active: true }
]

// Match the exact structure returned by the backend timeline endpoint
const mockTimeline = [
    {
        type: "log",
        id: 1,
        action: "update",
        created_at: "2023-01-01T10:00:00",
        details: { status: "Screening" },
        user_id: 1
    },
    {
        type: "interview",
        id: 1,
        action: "interview_logged",
        created_at: "2023-01-02T14:00:00",
        details: {
            step: "Technical",
            outcome: "Passed",
            rating: 8,
            feedback: "Good candidate"
        },
        user_id: 1
    }
]

describe('CandidateDrawer', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        axios.get.mockImplementation((url) => {
            if (url.includes('/timeline')) return Promise.resolve({ data: mockTimeline })
            if (url.includes('/interviews')) return Promise.resolve({ data: [] })
            if (url.includes('/companies/me')) return Promise.resolve({ data: {} })
            if (url.includes('/users')) return Promise.resolve({ data: [] })
            return Promise.resolve({ data: {} })
        })
    })

    it('renders candidate name and job title', () => {
        render(
            <CandidateDrawer
                cv={mockCv}
                jobs={mockJobs}
                selectedJobId={101}
                onClose={() => { }}
                updateApp={() => { }}
                updateProfile={() => { }}
            />
        )

        expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('switches between sidebar tabs', async () => {
        render(
            <CandidateDrawer
                cv={mockCv}
                jobs={mockJobs}
                selectedJobId={101}
                onClose={() => { }}
                updateApp={() => { }}
                updateProfile={() => { }}
            />
        )

        // Overview tab should be active
        const overviewTab = screen.getByRole('button', { name: /overview/i })
        expect(overviewTab).toHaveClass('text-indigo-600')

        // Click Timeline tab
        const timelineTab = screen.getByRole('button', { name: /timeline/i })
        fireEvent.click(timelineTab)
        expect(timelineTab).toHaveClass('text-indigo-600')

        // Click Interviews tab
        const interviewsTab = screen.getByRole('button', { name: /interviews/i })
        fireEvent.click(interviewsTab)
        expect(interviewsTab).toHaveClass('text-indigo-600')
    })

    it('fetches timeline data when component mounts with an application', async () => {
        render(
            <CandidateDrawer
                cv={mockCv}
                jobs={mockJobs}
                selectedJobId={101}
                onClose={() => { }}
                updateApp={() => { }}
                updateProfile={() => { }}
            />
        )

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/timeline'))
        })
    })

    it('displays timeline items after switching to timeline tab', async () => {
        render(
            <CandidateDrawer
                cv={mockCv}
                jobs={mockJobs}
                selectedJobId={101}
                onClose={() => { }}
                updateApp={() => { }}
                updateProfile={() => { }}
            />
        )

        // Wait for data to load
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/timeline'))
        })

        // Switch to Timeline tab
        const timelineTab = screen.getByRole('button', { name: /timeline/i })
        fireEvent.click(timelineTab)

        // Check that the timeline content is rendered (not the empty state)
        await waitFor(() => {
            expect(screen.queryByText('No activity recorded yet.')).not.toBeInTheDocument()
        })
    })
})
