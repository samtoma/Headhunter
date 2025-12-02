import { useState } from 'react';
import { Search as SearchIcon, Sparkles, User, Briefcase, ChevronRight, ArrowRight } from 'lucide-react';
import axios from 'axios';
import CandidateDrawer from '../components/pipeline/CandidateDrawer';
import { useHeadhunter } from '../context/HeadhunterContext';

const Search = ({ onOpenMobileSidebar }) => {
    const { jobs } = useHeadhunter();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [selectedCv, setSelectedCv] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setSearched(true);
        try {
            const res = await axios.get(`/api/search/candidates`, {
                params: { q: query }
            });
            setResults(res.data);
        } catch (err) {
            console.error("Search failed", err);
        } finally {
            setLoading(false);
        }
    };

    const handleViewProfile = async (cvId) => {
        try {
            // Fetch full profile details
            const res = await axios.get(`/api/profiles/${cvId}`);
            setSelectedCv(res.data);
        } catch (err) {
            console.error("Failed to fetch profile", err);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header */}
            <div className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 md:px-8 shrink-0 sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={onOpenMobileSidebar} className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                        <SearchIcon size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <Sparkles className="text-indigo-600" size={20} /> AI Search
                        </h1>
                        <p className="text-xs text-slate-500 hidden md:block">Find candidates using natural language</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-4xl mx-auto flex flex-col gap-8">

                    {/* Search Bar */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <form onSubmit={handleSearch} className="relative">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="e.g. 'Senior React developer with 5 years experience and AWS knowledge'"
                                className="w-full pl-12 pr-32 py-4 bg-slate-50 border border-slate-200 rounded-xl text-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition shadow-inner"
                            />
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
                            <button
                                type="submit"
                                disabled={loading || !query.trim()}
                                className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading ? "Searching..." : <>Search <ArrowRight size={18} /></>}
                            </button>
                        </form>
                        <div className="mt-3 flex gap-2 text-xs text-slate-500 flex-wrap">
                            <span className="font-bold uppercase tracking-wider text-slate-400">Try:</span>
                            <button onClick={() => setQuery("Frontend developer with React and TypeScript")} className="hover:text-indigo-600 hover:underline">Frontend developer with React...</button>
                            <span>•</span>
                            <button onClick={() => setQuery("Project Manager with Agile certification")} className="hover:text-indigo-600 hover:underline">Project Manager with Agile...</button>
                            <span>•</span>
                            <button onClick={() => setQuery("Data Scientist knowing Python and PyTorch")} className="hover:text-indigo-600 hover:underline">Data Scientist knowing Python...</button>
                        </div>
                    </div>

                    {/* Results */}
                    {searched && (
                        <div className="space-y-4">
                            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                {loading ? "Searching..." : `Found ${results.length} candidates`}
                            </h2>

                            {results.length === 0 && !loading ? (
                                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                        <SearchIcon size={32} />
                                    </div>
                                    <h3 className="text-slate-900 font-bold mb-1">No matches found</h3>
                                    <p className="text-slate-500 text-sm">Try adjusting your query with different keywords.</p>
                                </div>
                            ) : (
                                results.map((candidate) => (
                                    <div key={candidate.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition group flex flex-col md:flex-row gap-4 items-start md:items-center">

                                        {/* Score Badge */}
                                        <div className="shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                                            <span className="text-xl font-bold">{Math.round(candidate.score * 100)}%</span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Match</span>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-bold text-slate-900 truncate">{candidate.name}</h3>
                                            <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                                                <Briefcase size={14} />
                                                <span className="truncate">{candidate.last_job_title || "No Title"}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {candidate.skills && JSON.parse(candidate.skills).slice(0, 5).map((skill, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md border border-slate-200">
                                                        {skill}
                                                    </span>
                                                ))}
                                                {candidate.skills && JSON.parse(candidate.skills).length > 5 && (
                                                    <span className="px-2 py-0.5 bg-slate-50 text-slate-400 text-xs rounded-md border border-slate-100">
                                                        +{JSON.parse(candidate.skills).length - 5}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleViewProfile(candidate.id)}
                                            className="shrink-0 px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-lg hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition flex items-center gap-2 w-full md:w-auto justify-center"
                                        >
                                            View Profile <ChevronRight size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Candidate Drawer Overlay */}
            {selectedCv && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setSelectedCv(null)} />
                    <div className="relative w-full max-w-5xl h-full bg-white shadow-2xl animate-in slide-in-from-right duration-300">
                        <CandidateDrawer
                            cv={selectedCv}
                            onClose={() => setSelectedCv(null)}
                            jobs={jobs}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Search;
