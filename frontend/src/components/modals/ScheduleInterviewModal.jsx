import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Calendar, Clock, User, Briefcase } from 'lucide-react';

const ScheduleInterviewModal = ({ show, onClose, onSchedule, candidate, job, initialStep }) => {
    const [step, setStep] = useState(initialStep || "Screening");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [interviewerId, setInterviewerId] = useState("");
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [companyStages, setCompanyStages] = useState([]);

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
                if (res.data.interview_stages) {
                    const stages = JSON.parse(res.data.interview_stages);
                    setCompanyStages(stages);
                    if (stages.length > 0 && !initialStep) {
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
            // Default to tomorrow 10am
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setDate(tomorrow.toISOString().split('T')[0]);
            setTime("10:00");
        }
    }, [show, initialStep]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const scheduledAt = new Date(`${date}T${time}`).toISOString();

            const payload = {
                application_id: candidate.applications.find(a => a.job_id === job.id).id,
                step: step,
                status: "Scheduled", // Explicitly scheduled
                outcome: "Pending",
                scheduled_at: scheduledAt,
                interviewer_id: interviewerId ? parseInt(interviewerId) : null
            };

            const res = await axios.post('/api/interviews/', payload);
            onSchedule(res.data);
            onClose();
        } catch (err) {
            console.error("Failed to schedule interview", err);
            alert("Failed to schedule interview");
        } finally {
            setLoading(false);
        }
    };

    if (!show || !candidate || !job) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="text-indigo-600" size={20} />
                        Schedule Interview
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">

                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-indigo-600 font-bold border border-indigo-100 shadow-sm shrink-0">
                            {(candidate.name || candidate.parsed_data?.name || "?").charAt(0)}
                        </div>
                        <div>
                            <div className="font-bold text-indigo-900">{candidate.name || candidate.parsed_data?.name || "Candidate"}</div>
                            <div className="text-xs text-indigo-600 font-medium mt-0.5 flex items-center gap-1.5">
                                <Briefcase size={12} /> {job.title}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input
                                    type="date"
                                    required
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
                                    required
                                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                    value={time}
                                    onChange={e => setTime(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

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
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Interviewer</label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <select
                                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition appearance-none"
                                    value={interviewerId}
                                    onChange={e => setInterviewerId(e.target.value)}
                                >
                                    <option value="">Select Interviewer...</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span> : "Confirm Schedule"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ScheduleInterviewModal;
