import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import PipelineBoard from '../PipelineBoard'

// Mock CandidateCard
vi.mock('../CandidateCard', () => ({
    default: ({ cv, onClick, onDelete, onReprocess }) => (
        <div data-testid={`card-${cv.id}`} onClick={onClick}>
            {cv.parsed_data.name}
            <button onClick={(e) => onDelete(e, cv.id)}>Delete</button>
            <button onClick={(e) => onReprocess(e, cv.id)}>Reprocess</button>
        </div>
    )
}))

describe('PipelineBoard', () => {
    const mockProfiles = [
        { id: 1, parsed_data: { name: 'Alice' }, applications: [{ job_id: 101, status: 'New' }] },
        { id: 2, parsed_data: { name: 'Bob' }, applications: [{ job_id: 101, status: 'Interview' }] }
    ]

    const columns = ['New', 'Interview', 'Hired']
    const jobs = [{ id: 101, title: 'Engineer' }]

    const defaultProps = {
        columns,
        profiles: mockProfiles,
        getStatus: (cv) => cv.applications[0].status,
        onDrop: vi.fn(),
        onDragStart: vi.fn(),
        onSelectCv: vi.fn(),
        onDeleteCv: vi.fn(),
        onReprocessCv: vi.fn(),
        jobs
    }

    it('renders all columns', () => {
        render(<PipelineBoard {...defaultProps} />)
        columns.forEach(col => {
            expect(screen.getByText(col)).toBeInTheDocument()
        })
    })

    it('renders candidates in correct columns', () => {
        render(<PipelineBoard {...defaultProps} />)

        // Alice should be in New
        const newCol = screen.getByTestId('column-New')
        expect(newCol).toHaveTextContent('Alice')

        // Bob should be in Interview
        const interviewCol = screen.getByTestId('column-Interview')
        expect(interviewCol).toHaveTextContent('Bob')
    })

    it('calls onSelectCv when card clicked', () => {
        render(<PipelineBoard {...defaultProps} />)
        fireEvent.click(screen.getByTestId('card-1'))
        expect(defaultProps.onSelectCv).toHaveBeenCalledWith(mockProfiles[0])
    })

    it('calls onDrop when dropping on column', () => {
        render(<PipelineBoard {...defaultProps} />)
        const newCol = screen.getByTestId('column-New')

        fireEvent.drop(newCol)
        expect(defaultProps.onDrop).toHaveBeenCalledWith(expect.anything(), 'New')
    })

    it('calls onDragStart when dragging card', () => {
        render(<PipelineBoard {...defaultProps} />)
        const card = screen.getByTestId('card-1').closest('div[draggable]')

        fireEvent.dragStart(card)
        expect(defaultProps.onDragStart).toHaveBeenCalledWith(expect.anything(), 1)
    })
})
