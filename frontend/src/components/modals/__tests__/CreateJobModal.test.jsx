import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import axios from 'axios'
import CreateJobModal from '../CreateJobModal'

vi.mock('axios')

describe('CreateJobModal', () => {
    const defaultProps = {
        onClose: vi.fn(),
        onCreate: vi.fn(),
        initialData: {
            title: 'Test Job',
            department: 'Engineering',
            required_experience: 5,
            skills_required: ['React'],
            responsibilities: [],
            qualifications: [],
            preferred_qualifications: [],
            benefits: []
        }
    }

    beforeEach(() => {
        vi.clearAllMocks()
        axios.get.mockResolvedValue({ data: { departments: '["Engineering", "Sales"]' } })
        axios.post.mockResolvedValue({ data: [] }) // Default for matches
    })

    it('renders with initial data', () => {
        render(<CreateJobModal {...defaultProps} />)
        expect(screen.getByText('Edit Job Pipeline')).toBeInTheDocument()
        expect(screen.getByText('Re-Analyze')).toBeInTheDocument()
    })

    it('shows analyzing state - both buttons disabled during analysis', async () => {
        // Mock analyze response with delay
        axios.post.mockImplementation((url) => {
            if (url.includes('/analyze')) {
                return new Promise(resolve => setTimeout(() => resolve({
                    data: {
                        responsibilities: [],
                        qualifications: [],
                        preferred_qualifications: [],
                        benefits: [],
                        skills_required: []
                    }
                }), 100))
            }
            return Promise.resolve({ data: [] })
        })

        render(<CreateJobModal {...defaultProps} />)

        const analyzeBtn = screen.getByText('Re-Analyze')

        fireEvent.click(analyzeBtn)

        // Both buttons should be disabled during loading (shared state)
        expect(analyzeBtn).toBeDisabled()

        await waitFor(() => expect(analyzeBtn).not.toBeDisabled())
    })

    it('shows refreshing state - both buttons disabled during refresh', async () => {
        // Mock matches response with delay
        axios.post.mockImplementation((url) => {
            if (url.includes('/matches')) {
                return new Promise(resolve => setTimeout(() => resolve({ data: [] }), 100))
            }
            return Promise.resolve({ data: {} })
        })

        render(<CreateJobModal {...defaultProps} />)

        const refreshBtn = screen.getByText('Refresh Candidates')

        fireEvent.click(refreshBtn)

        // Both buttons should be disabled during loading (shared state)
        expect(refreshBtn).toBeDisabled()

        await waitFor(() => expect(refreshBtn).not.toBeDisabled())
    })
})
