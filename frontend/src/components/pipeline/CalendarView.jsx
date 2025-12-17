import { useState, useEffect, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const localizer = momentLocalizer(moment);

const CalendarView = ({ jobId, onEventClick, onSelectSlot }) => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState('month');
    const [currentDate, setCurrentDate] = useState(new Date());

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        try {
            // Calculate scale based on view
            let start = moment(currentDate).startOf('month').toDate();
            let end = moment(currentDate).endOf('month').toDate();

            if (view === 'week') {
                start = moment(currentDate).startOf('week').toDate();
                end = moment(currentDate).endOf('week').toDate();
            } else if (view === 'day') {
                start = moment(currentDate).startOf('day').toDate();
                end = moment(currentDate).endOf('day').toDate();
            }

            const res = await axios.get('/api/interviews/calendar', {
                params: {
                    job_id: jobId,
                    start: start.toISOString(),
                    end: end.toISOString()
                }
            });

            // Transform date strings to Date objects
            const formattedEvents = res.data.map(evt => ({
                ...evt,
                start: new Date(evt.start),
                end: new Date(evt.end)
            }));

            setEvents(formattedEvents);
        } catch (err) {
            console.error("Failed to fetch calendar events", err);
        } finally {
            setLoading(false);
        }
    }, [jobId, currentDate, view]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const handleNavigate = (newDate) => {
        setCurrentDate(newDate);
    };

    const handleViewChange = (newView) => {
        setView(newView);
    };

    const eventStyleGetter = (event) => {
        let backgroundColor = '#3b82f6'; // blue-500 default
        let borderColor = '#2563eb';

        switch (event.status) {
            case 'Completed':
                backgroundColor = '#10b981'; // emerald-500
                borderColor = '#059669';
                break;
            case 'Cancelled':
                backgroundColor = '#ef4444'; // red-500
                borderColor = '#dc2626';
                break;
            case 'No-Show':
                backgroundColor = '#f97316'; // orange-500
                borderColor = '#ea580c';
                break;
            default:
                break;
        }

        return {
            style: {
                backgroundColor,
                borderColor,
                borderRadius: '6px',
                opacity: 0.9,
                color: 'white',
                border: '0px',
                display: 'block',
                fontSize: '0.8rem'
            }
        };
    };

    const CustomToolbar = (toolbar) => {
        const goToBack = () => {
            toolbar.onNavigate('PREV');
        };

        const goToNext = () => {
            toolbar.onNavigate('NEXT');
        };

        const goToCurrent = () => {
            toolbar.onNavigate('TODAY');
        };

        const label = () => {
            const date = moment(toolbar.date);
            return (
                <span className="text-lg font-bold text-slate-700 capitalize">
                    {date.format('MMMM YYYY')}
                </span>
            );
        };

        return (
            <div className="flex items-center justify-between mb-4 p-2">
                <div className="flex items-center gap-2">
                    <button
                        onClick={goToBack}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={goToNext}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition"
                    >
                        <ChevronRight size={20} />
                    </button>
                    <button
                        onClick={goToCurrent}
                        className="ml-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                    >
                        Today
                    </button>
                </div>

                <div className="flex-1 text-center">
                    {label()}
                </div>

                <div className="flex bg-slate-100 rounded-lg p-1">
                    {['month', 'week', 'day'].map(v => (
                        <button
                            key={v}
                            onClick={() => toolbar.onView(v)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize transition ${toolbar.view === v
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-slate-600 hover:text-slate-800'
                                }`}
                        >
                            {v}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="h-[600px] bg-white rounded-xl border border-slate-200 p-4 relative">
            {loading && (
                <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center backdrop-blur-sm rounded-xl">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                </div>
            )}

            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                onSelectEvent={(event) => onEventClick && onEventClick(event)}
                onSelectSlot={(slotInfo) => onSelectSlot && onSelectSlot(slotInfo)}
                selectable={true}
                onNavigate={handleNavigate}
                onView={handleViewChange}
                view={view}
                date={currentDate}
                eventPropGetter={eventStyleGetter}
                components={{
                    toolbar: CustomToolbar
                }}
                popup
            />
        </div>
    );
};

export default CalendarView;
