import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import Analytics from '../Analytics';
import axios from 'axios';

// Mock dependencies
vi.mock('axios');
// Mock Recharts to avoid rendering complex SVG in tests
vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }) => <div>{children}</div>,
    BarChart: () => <div data-testid="bar-chart">BarChart</div>,
    Bar: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    AreaChart: () => <div data-testid="area-chart">AreaChart</div>,
    Area: () => null,
}));

describe('Analytics Component', () => {
    const mockData = {
        pipeline: [
            { name: 'New', value: 5 },
            { name: 'Hired', value: 2 }
        ],
        activity: [
            { date: '2023-01-01', applications: 10 }
        ],
        kpi: {
            total_hires: 12,
            active_jobs: 3,
            avg_time_to_hire: 15
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        axios.get.mockResolvedValue({ data: mockData });
    });

    it('renders loading state initially', () => {
        // Mock a pending promise to keep it in loading state
        axios.get.mockImplementation(() => new Promise(() => { }));
        render(<Analytics onOpenMobileSidebar={() => { }} />);
        // Check for spinner or loading indicator structure
        // The component renders a div with 'animate-spin' class
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
    });

    it('renders dashboard data after loading', async () => {
        render(<Analytics onOpenMobileSidebar={() => { }} />);

        await waitFor(() => {
            expect(screen.getByText('Total Hires')).toBeInTheDocument();
            expect(screen.getByText('12')).toBeInTheDocument(); // KPI Value
            expect(screen.getByText('Active Jobs')).toBeInTheDocument();
            expect(screen.getByText('3')).toBeInTheDocument(); // KPI Value
        });

        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
        expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    });

    it('fetches data with selected days', async () => {
        render(<Analytics onOpenMobileSidebar={() => { }} />);

        await waitFor(() => screen.getByText('Total Hires'));

        // Change select to 7 days
        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: '7' } });

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/api/analytics/dashboard', { params: { days: 7 } });
        });
    });

    it('handles export', async () => {
        // Mock blob response
        const mockBlob = new Blob(['csv data'], { type: 'text/csv' });
        axios.get.mockResolvedValueOnce({ data: mockData }); // Initial load
        axios.get.mockResolvedValueOnce({ data: mockBlob }); // Export call

        // Mock URL.createObjectURL
        global.URL.createObjectURL = vi.fn(() => 'blob:url');
        global.URL.revokeObjectURL = vi.fn();

        render(<Analytics onOpenMobileSidebar={() => { }} />);
        await waitFor(() => screen.getByText('Total Hires'));

        const exportBtn = screen.getByText('Export CSV');
        fireEvent.click(exportBtn);

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('/api/analytics/export', { responseType: 'blob' });
        });
    });
});
