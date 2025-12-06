import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import GoogleSignInButton from '../GoogleSignInButton'

describe('GoogleSignInButton', () => {
    it('renders correctly', () => {
        render(<GoogleSignInButton />)
        expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
        expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('redirects to correct URL on click', () => {
        // Mock window.location
        Object.defineProperty(window, 'location', {
            value: { href: '' },
            writable: true
        })

        render(<GoogleSignInButton />)
        fireEvent.click(screen.getByRole('button'))

        expect(window.location.href).toBe('/api/auth/google/login')
    })
})
