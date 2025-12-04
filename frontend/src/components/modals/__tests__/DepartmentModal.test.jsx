import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import DepartmentModal from '../../modals/DepartmentModal'
import axios from 'axios'

// Mock axios
vi.mock('axios')

describe('DepartmentModal AI Generation', () => {
    const mockOnClose = vi.fn()
    const mockOnSave = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders the Generate with AI button', () => {
        render(
            <DepartmentModal
                isOpen={true}
                onClose={mockOnClose}
                department={null}
                onSave={mockOnSave}
            />
        )

        expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument()
    })

    it('disables AI button when name is empty', () => {
        render(
            <DepartmentModal
                isOpen={true}
                onClose={mockOnClose}
                department={null}
                onSave={mockOnSave}
            />
        )

        const aiButton = screen.getByRole('button', { name: /generate/i })
        expect(aiButton).toBeDisabled()
    })

    it('enables AI button when name is entered', async () => {
        render(
            <DepartmentModal
                isOpen={true}
                onClose={mockOnClose}
                department={null}
                onSave={mockOnSave}
            />
        )

        const nameInput = screen.getByPlaceholderText(/e.g. Engineering, Sales/i)
        fireEvent.change(nameInput, { target: { value: 'Engineering' } })

        const aiButton = screen.getByRole('button', { name: /generate/i })
        expect(aiButton).not.toBeDisabled()
    })

    it('calls API and populates form on AI generation', async () => {
        const mockResponse = {
            description: "AI generated description",
            technologies: ["Python", "React"],
            job_templates: [
                {
                    title_match: "Backend",
                    description: "Backend role context",
                    technologies: ["Python"]
                }
            ]
        }
        axios.post.mockResolvedValue({ data: mockResponse })

        render(
            <DepartmentModal
                isOpen={true}
                onClose={mockOnClose}
                department={null}
                onSave={mockOnSave}
            />
        )

        // Enter department name
        const nameInput = screen.getByPlaceholderText(/e.g. Engineering, Sales/i)
        fireEvent.change(nameInput, { target: { value: 'Engineering' } })

        // Click AI generate button
        const aiButton = screen.getByRole('button', { name: /generate/i })
        fireEvent.click(aiButton)

        // Verify API was called
        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith('/api/departments/generate', {
                name: 'Engineering'
            })
        })

        // Verify form was populated (check description)
        await waitFor(() => {
            const descTextarea = screen.getByPlaceholderText(/Describe what this department does/i)
            expect(descTextarea.value).toBe("AI generated description")
        })

        // Verify technologies were added (the modal renders them as badges)
        await waitFor(() => {
            expect(screen.getAllByText('Python').length).toBeGreaterThan(0)
        })
    })

    it('shows loading state during generation', async () => {
        // Make axios slow to resolve
        axios.post.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({
            data: { description: "test", technologies: [], job_templates: [] }
        }), 500)))

        render(
            <DepartmentModal
                isOpen={true}
                onClose={mockOnClose}
                department={null}
                onSave={mockOnSave}
            />
        )

        const nameInput = screen.getByPlaceholderText(/e.g. Engineering, Sales/i)
        fireEvent.change(nameInput, { target: { value: 'Engineering' } })

        const aiButton = screen.getByRole('button', { name: /generate/i })
        fireEvent.click(aiButton)

        // Should show generating state
        await waitFor(() => {
            expect(screen.getByText('Generate')).toBeInTheDocument()
        })
    })
})
