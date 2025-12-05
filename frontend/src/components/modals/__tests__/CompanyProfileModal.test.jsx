import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import axios from 'axios'
import CompanyProfileModal from '../CompanyProfileModal'

// Mock axios
vi.mock('axios')

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    Building2: (props) => <span data-testid="icon-building" {...props} />,
    X: (props) => <span data-testid="icon-x" {...props} />,
    Sparkles: (props) => <span data-testid="icon-sparkles" {...props} />,
    Loader2: (props) => <span data-testid="icon-loader" {...props} />,
    Users: (props) => <span data-testid="icon-users" {...props} />,
    Target: (props) => <span data-testid="icon-target" {...props} />,
    Share2: (props) => <span data-testid="icon-share" {...props} />
}))

describe('CompanyProfileModal', () => {
    const mockOnClose = vi.fn()

    const mockProfileData = {
        name: 'TechCorp',
        tagline: 'Building the future',
        industry: 'Technology',
        description: 'A tech company',
        culture: 'Fast-paced',
        mission: 'To innovate',
        vision: 'Be the best',
        values: '["Innovation", "Teamwork"]',
        founded_year: 2020,
        company_size: '51-200',
        headquarters: 'San Francisco, USA',
        company_type: 'Private',
        specialties: '["AI", "Cloud"]',
        products_services: 'Software solutions',
        target_market: 'Enterprise',
        competitive_advantage: 'AI-first approach',
        departments: '["Engineering", "Sales"]',
        social_linkedin: 'https://linkedin.com/company/techcorp',
        social_twitter: 'https://twitter.com/techcorp',
        social_facebook: '',
        logo_url: '',
        website: 'https://techcorp.com'
    }

    beforeEach(() => {
        vi.clearAllMocks()
        axios.get.mockResolvedValue({ data: mockProfileData })
        axios.put.mockResolvedValue({ data: mockProfileData })
        axios.post.mockResolvedValue({ data: mockProfileData })
    })

    // ============================================
    // Test: Modal structure and rendering
    // ============================================
    it('renders modal with header and all tabs', async () => {
        render(<CompanyProfileModal onClose={mockOnClose} />)

        // Header
        expect(screen.getByText('Company Profile')).toBeInTheDocument()

        // All 5 tabs
        expect(screen.getByText('Basic Info')).toBeInTheDocument()
        expect(screen.getByText('Departments')).toBeInTheDocument()
        expect(screen.getByText('About')).toBeInTheDocument()
        expect(screen.getByText('Business')).toBeInTheDocument()
        expect(screen.getByText('Social')).toBeInTheDocument()

        // Footer buttons
        expect(screen.getByText('Regenerate with AI')).toBeInTheDocument()
        expect(screen.getByText('Cancel')).toBeInTheDocument()
        expect(screen.getByText('Save Profile')).toBeInTheDocument()
    })

    it('loads company profile data on mount', async () => {
        render(<CompanyProfileModal onClose={mockOnClose} />)

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/api/company/profile')
        })

        // Verify data is populated (company name appears in input)
        await waitFor(() => {
            const nameInput = screen.getByDisplayValue('TechCorp')
            expect(nameInput).toBeInTheDocument()
        })
    })

    // ============================================
    // Test: Tab switching
    // ============================================
    it('switches between tabs correctly', async () => {
        render(<CompanyProfileModal onClose={mockOnClose} />)

        // Wait for initial load
        await waitFor(() => {
            expect(screen.getByDisplayValue('TechCorp')).toBeInTheDocument()
        })

        // Click Departments tab
        fireEvent.click(screen.getByText('Departments'))
        expect(screen.getByText('Manage Departments')).toBeInTheDocument()

        // Click About tab
        fireEvent.click(screen.getByText('About'))
        expect(screen.getByText('Mission Statement')).toBeInTheDocument()

        // Click Business tab
        fireEvent.click(screen.getByText('Business'))
        expect(screen.getByText('Products & Services')).toBeInTheDocument()

        // Click Social tab
        fireEvent.click(screen.getByText('Social'))
        expect(screen.getByText('LinkedIn URL')).toBeInTheDocument()
    })

    // ============================================
    // Test: Department management
    // ============================================
    it('adds a new department', async () => {
        render(<CompanyProfileModal onClose={mockOnClose} />)

        await waitFor(() => {
            expect(screen.getByDisplayValue('TechCorp')).toBeInTheDocument()
        })

        // Switch to Departments tab
        fireEvent.click(screen.getByText('Departments'))

        // Type new department name
        const input = screen.getByPlaceholderText('e.g. Engineering, Sales, Marketing')
        fireEvent.change(input, { target: { value: 'Marketing' } })

        // Click Add button
        fireEvent.click(screen.getByText('Add'))

        // Verify department appears (since it's added to a comma-separated string)
        await waitFor(() => {
            expect(screen.getByText('Marketing')).toBeInTheDocument()
        })
    })

    it('removes a department', async () => {
        render(<CompanyProfileModal onClose={mockOnClose} />)

        await waitFor(() => {
            expect(screen.getByDisplayValue('TechCorp')).toBeInTheDocument()
        })

        // Switch to Departments tab
        fireEvent.click(screen.getByText('Departments'))

        // Wait for existing departments to render
        await waitFor(() => {
            expect(screen.getByText('Engineering')).toBeInTheDocument()
        })

        // Click X button on a department (find delete button in department pill)
        const engineeringDept = screen.getByText('Engineering').closest('div')
        const deleteBtn = engineeringDept.querySelector('button')
        fireEvent.click(deleteBtn)

        // Verify department is removed
        await waitFor(() => {
            expect(screen.queryByText('Engineering')).not.toBeInTheDocument()
        })
    })

    // ============================================
    // Test: Save functionality
    // ============================================
    it('saves profile and closes modal on success', async () => {
        render(<CompanyProfileModal onClose={mockOnClose} />)

        await waitFor(() => {
            expect(screen.getByDisplayValue('TechCorp')).toBeInTheDocument()
        })

        // Click Save Profile
        fireEvent.click(screen.getByText('Save Profile'))

        await waitFor(() => {
            expect(axios.put).toHaveBeenCalledWith('/api/company/profile', expect.any(Object))
        })

        await waitFor(() => {
            expect(mockOnClose).toHaveBeenCalled()
        })
    })

    it('shows error alert on save failure', async () => {
        axios.put.mockRejectedValue(new Error('Save failed'))
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { })

        render(<CompanyProfileModal onClose={mockOnClose} />)

        await waitFor(() => {
            expect(screen.getByDisplayValue('TechCorp')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('Save Profile'))

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith('Failed to save company profile. Please try again.')
        })

        alertSpy.mockRestore()
    })

    // ============================================
    // Test: Cancel button
    // ============================================
    it('calls onClose when Cancel is clicked', async () => {
        render(<CompanyProfileModal onClose={mockOnClose} />)

        fireEvent.click(screen.getByText('Cancel'))

        expect(mockOnClose).toHaveBeenCalled()
    })

    it('calls onClose when X button is clicked', async () => {
        render(<CompanyProfileModal onClose={mockOnClose} />)

        // Get the X icon in the header (first one, not in departments)
        const closeButtons = screen.getAllByTestId('icon-x')
        fireEvent.click(closeButtons[0].closest('button'))

        expect(mockOnClose).toHaveBeenCalled()
    })

    // ============================================
    // Test: Regenerate with AI
    // ============================================
    it('regenerates profile with AI successfully', async () => {
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { })

        render(<CompanyProfileModal onClose={mockOnClose} />)

        await waitFor(() => {
            expect(screen.getByDisplayValue('TechCorp')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('Regenerate with AI'))

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith('/api/company/regenerate', { url: 'https://techcorp.com' })
        })

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith('Profile regenerated successfully!')
        })

        alertSpy.mockRestore()
    })

    it('disables regenerate button when website is empty', async () => {
        axios.get.mockResolvedValue({ data: { ...mockProfileData, website: '' } })

        render(<CompanyProfileModal onClose={mockOnClose} />)

        await waitFor(() => {
            const regenButton = screen.getByText('Regenerate with AI').closest('button')
            expect(regenButton).toBeDisabled()
        })
    })

    it('shows error alert on regenerate failure', async () => {
        axios.post.mockRejectedValue(new Error('Regenerate failed'))
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { })

        render(<CompanyProfileModal onClose={mockOnClose} />)

        await waitFor(() => {
            expect(screen.getByDisplayValue('TechCorp')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('Regenerate with AI'))

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith('Failed to regenerate profile. Please check the website URL.')
        })

        alertSpy.mockRestore()
    })

    // ============================================
    // Test: Loading states
    // ============================================
    it('shows loading state during save', async () => {
        // Make save take time
        axios.put.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: mockProfileData }), 100)))

        render(<CompanyProfileModal onClose={mockOnClose} />)

        await waitFor(() => {
            expect(screen.getByDisplayValue('TechCorp')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText('Save Profile'))

        // Button should show loading text
        expect(screen.getByText('Saving...')).toBeInTheDocument()

        await waitFor(() => {
            expect(mockOnClose).toHaveBeenCalled()
        })
    })

    it('shows loading state during regenerate', async () => {
        axios.post.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: mockProfileData }), 100)))

        render(<CompanyProfileModal onClose={mockOnClose} />)

        await waitFor(() => {
            expect(screen.getByDisplayValue('TechCorp')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByText(/Regenerate with AI/))

        // Text should NOT change
        expect(screen.getByText(/Regenerate with AI/)).toBeInTheDocument()

        // Icon should spin
        const icon = screen.getByTestId('icon-sparkles')
        expect(icon).toHaveClass('animate-spin')
    })

    // ============================================
    // Test: Form input handling
    // ============================================
    it('updates form fields on input change', async () => {
        render(<CompanyProfileModal onClose={mockOnClose} />)

        await waitFor(() => {
            expect(screen.getByDisplayValue('TechCorp')).toBeInTheDocument()
        })

        // Change company name
        const nameInput = screen.getByDisplayValue('TechCorp')
        fireEvent.change(nameInput, { target: { value: 'NewCorp' } })

        expect(screen.getByDisplayValue('NewCorp')).toBeInTheDocument()
    })

    // ============================================
    // Test: Helper functions (parseJsonArray, toJsonArray)
    // ============================================
    describe('Helper Functions', () => {
        // Test parseJsonArray by checking how values are displayed
        it('parses JSON array strings correctly', async () => {
            render(<CompanyProfileModal onClose={vi.fn()} />)

            await waitFor(() => {
                // Values field should show "Innovation, Teamwork" (parsed from JSON array)
                fireEvent.click(screen.getByText('About'))
            })

            // The values input should have comma-separated values after parsing
            await waitFor(() => {
                const valuesInput = screen.getByPlaceholderText('Innovation, Integrity, Teamwork')
                expect(valuesInput.value).toContain('Innovation')
            })
        })
    })
})
