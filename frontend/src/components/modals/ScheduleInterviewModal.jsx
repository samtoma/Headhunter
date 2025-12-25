import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { X, Calendar, Clock, User, Briefcase, ChevronDown } from 'lucide-react';

const ScheduleInterviewModal = ({ show, onClose, onSchedule, candidate, candidates, job, initialStep, interviewToEdit, preselectedDate, mode = "interview" }) => {
    const [step, setStep] = useState(initialStep || "Screening");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [interviewerId, setInterviewerId] = useState("");
    const [selectedCandidateId, setSelectedCandidateId] = useState(candidate?.id || "");
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [companyStages, setCompanyStages] = useState([]);

    const [sendNotifications, setSendNotifications] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await axios.get('/api/users/');
                setUsers(res.data);
            } catch (err) {
                console.error("Failed to fetch users", err);
            }
        };

        const fetchCompanySettings = async () => {
            try {
                const res = await axios.get('/api/companies/me');
                if (res.data.settings) {
                    try {
                        const settings = JSON.parse(res.data.settings);
                        if (settings.interview_emails_enabled !== undefined && !initialStep && !interviewToEdit) {
                            setSendNotifications(settings.interview_emails_enabled);
                        }
                    } catch { /* ignore */ }
                }

                if (res.data.interview_stages) {
                    const stages = JSON.parse(res.data.interview_stages);
                    setCompanyStages(stages);
                    if (stages.length > 0 && !initialStep && !interviewToEdit) {
                        setStep(stages[0].name);
                    }
                } else {
                    setCompanyStages([
                        { name: "Screening" },
                        { name: "Technical" },
                        { name: "Manager" },
                        { name: "Final" }
                    ]);
                }
            } catch (err) {
                console.error("Failed to fetch settings", err);
            }
        };

        if (show) {
            fetchUsers();
            fetchCompanySettings();

            if (interviewToEdit) {
                // Buffer to Pre-fill data
                if (interviewToEdit.scheduled_at) {
                    const scheduledDate = new Date(interviewToEdit.scheduled_at);
                    setDate(scheduledDate.toISOString().split('T')[0]);
                    // Format time as HH:MM
                    const hh = String(scheduledDate.getHours()).padStart(2, '0');
                    const mm = String(scheduledDate.getMinutes()).padStart(2, '0');
                    setTime(`${hh}:${mm}`);
                }

                setStep(interviewToEdit.step);
                setInterviewerId(interviewToEdit.interviewer_id || "");
                setSelectedCandidateId(null); // Not editable
            } else {
                // Default date/time logic
                if (preselectedDate) {
                    const d = new Date(preselectedDate);
                    setDate(d.toISOString().split('T')[0]);
                    const hh = String(d.getHours()).padStart(2, '0');
                    const mm = String(d.getMinutes()).padStart(2, '0');
                    setTime(`${hh}:${mm}`);
                } else {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    setDate(tomorrow.toISOString().split('T')[0]);
                    setTime("10:00");
                }

                setStep(initialStep || "Screening");
                setInterviewerId("");
                setSelectedCandidateId(candidate?.id || "");
            }
        }
    }, [show, initialStep, interviewToEdit, preselectedDate, candidate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const scheduledAt = mode === 'review' ? null : new Date(`${date}T${time}`).toISOString();

            const payload = {
                step: step,
                status: mode === 'review' ? "Pending Review" : "Scheduled",
                scheduled_at: scheduledAt,
                interviewer_id: interviewerId ? parseInt(interviewerId) : null,
                send_notifications: sendNotifications
            };

            let res;
            if (interviewToEdit) {
                res = await axios.patch(`/api/interviews/${interviewToEdit.id}`, payload);
            } else {
                // Use selected candidate if not passed originally
                const targetCandidate = candidate || candidates?.find(c => c.id == selectedCandidateId);

                if (!targetCandidate) {
                    alert("Please select a candidate");
                    setLoading(false);
                    return;
                }

                const app = targetCandidate.applications.find(a => a.job_id === job.id);
                if (!app) {
                    alert("Candidate does not have an application for this job.");
                    setLoading(false);
                    return;
                }

                // POST requires application_id
                payload.application_id = app.id;
                payload.outcome = "Pending";
                res = await axios.post('/api/interviews/', payload);
            }

            onSchedule(res.data);
            onClose();
        } catch (err) {
            console.error("Failed to schedule interview", err);
            alert("Failed to schedule interview");
        } finally {
            setLoading(false);
        }
    };

    if (!show) return null;

    // Display Logic
    const isEditing = !!interviewToEdit;
    const isNewFromCalendar = !candidate && !interviewToEdit;

    // Fallback display names
    const displayCandidateName = candidate?.name || candidate?.parsed_data?.name || interviewToEdit?.candidate_name || "Candidate";
    const displayJobTitle = job?.title || interviewToEdit?.job_title || "Job";

    return createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="text-indigo-600" size={20} />
                        {mode === 'review' ? "Assign Reviewer" : (isEditing ? "Reschedule Interview" : "Schedule Interview")}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">

                    {isNewFromCalendar ? (
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Candidate</label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <select
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition appearance-none"
                                    value={selectedCandidateId}
                                    onChange={e => setSelectedCandidateId(e.target.value)}
                                    required
                                >
                                    <option value="">Select Candidate...</option>
                                    {candidates && candidates.map(c => (
                                        <option key={c.id} value={c.id}>{c.name || c.parsed_data?.name || "Unknown Candidate"}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={16} />
                            </div>
                        </div>
                    ) : (
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-indigo-600 font-bold border border-indigo-100 shadow-sm shrink-0">
                                {displayCandidateName.charAt(0)}
                            </div>
                            <div>
                                <div className="font-bold text-indigo-900">{displayCandidateName}</div>
                                <div className="text-xs text-indigo-600 font-medium mt-0.5 flex items-center gap-1.5">
                                    <Briefcase size={12} /> {displayJobTitle}
                                </div>
                            </div>
                        </div>
                    )}

                    {mode !== 'review' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                    <input
                                        type="date"
                                        required={mode !== 'review'}
                                        className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Time</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                    <input
                                        type="time"
                                        required={mode !== 'review'}
                                        className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                        value={time}
                                        onChange={e => setTime(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Stage</label>
                            <select
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                value={step}
                                onChange={e => setStep(e.target.value)}
                            >
                                {companyStages.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{mode === 'review' ? "Reviewer" : "Interviewer"}</label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <select
                                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition appearance-none"
                                    value={interviewerId}
                                    onChange={e => setInterviewerId(e.target.value)}
                                    required
                                >
                                    <option value="">{users.length === 0 ? "Loading users..." : "Select Interviewer..."}</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <label className="flex items-center gap-2 text-sm text-slate-600 font-medium cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={sendNotifications}
                                onChange={e => setSendNotifications(e.target.checked)}
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                            />
                            Send Email Invitation
                        </label>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading || !interviewerId}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span> : mode === 'review' ? "Assign Reviewer" : (interviewToEdit ? "Update Schedule" : "Confirm Schedule")}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default ScheduleInterviewModal;