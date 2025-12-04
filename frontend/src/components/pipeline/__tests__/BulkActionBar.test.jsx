import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import BulkActionBar from '../BulkActionBar'

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    Layers: () => <span data-testid="icon-layers" />,
    PlayCircle: () => <span data-testid="icon-play-circle" />,
    Trash2: () => <span data-testid="icon-trash-2" />,
    X: () => <span data-testid="icon-x" />
}))

describe('BulkActionBar', () => {
    const defaultProps = {
        selectedIds: [1, 2, 3],
        setShowBulkAssignModal: vi.fn(),
        performBulkReprocess: vi.fn(),
        performBulkDelete: vi.fn(),
        clearSelection: vi.fn()
    }

    it('does not render when selectedIds is empty', () => {
        const { container } = render(<BulkActionBar {...defaultProps} selectedIds={[]} />)
        expect(container).toBeEmptyDOMElement()
    })

    it('renders correctly when items are selected', () => {
        render(<BulkActionBar {...defaultProps} />)
        expect(screen.getByText('3 Selected')).toBeInTheDocument()
        expect(screen.getByText('Assign to Pipeline')).toBeInTheDocument()
        expect(screen.getByText('Reprocess')).toBeInTheDocument()
        expect(screen.getByText('Delete')).toBeInTheDocument()
    })

    it('calls setShowBulkAssignModal when Assign button is clicked', () => {
        render(<BulkActionBar {...defaultProps} />)
        fireEvent.click(screen.getByText('Assign to Pipeline'))
        expect(defaultProps.setShowBulkAssignModal).toHaveBeenCalledWith(true)
    })

    it('calls performBulkReprocess when Reprocess button is clicked', () => {
        render(<BulkActionBar {...defaultProps} />)
        fireEvent.click(screen.getByText('Reprocess'))
        expect(defaultProps.performBulkReprocess).toHaveBeenCalled()
    })

    it('calls performBulkDelete when Delete button is clicked', () => {
        render(<BulkActionBar {...defaultProps} />)
        fireEvent.click(screen.getByText('Delete'))
        expect(defaultProps.performBulkDelete).toHaveBeenCalled()
    })

    it('calls clearSelection when X button is clicked', () => {
        render(<BulkActionBar {...defaultProps} />)
        const closeBtn = screen.getByTestId('icon-x').closest('button')
        fireEvent.click(closeBtn)
        expect(defaultProps.clearSelection).toHaveBeenCalled()
    })

    it('updates count when selectedIds changes', () => {
        const { rerender } = render(<BulkActionBar {...defaultProps} />)
        expect(screen.getByText('3 Selected')).toBeInTheDocument()

        rerender(<BulkActionBar {...defaultProps} selectedIds={[1]} />)
        expect(screen.getByText('1 Selected')).toBeInTheDocument()
    })
})
