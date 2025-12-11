import CandidateCard from './CandidateCard';

const PipelineBoard = ({
    columns,
    profiles,
    getStatus,
    onDrop,
    onDragStart,
    onSelectCv,
    onDeleteCv,
    onReprocessCv,
    jobs
}) => {
    return (
        <div className="flex gap-6 overflow-x-auto pb-4 h-full">
            {columns.map(col => (
                <div
                    key={col}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => onDrop(e, col)}
                    className="min-w-[320px] bg-slate-100 rounded-xl flex flex-col h-full border border-slate-200/60"
                    data-testid={`column-${col}`}
                >
                    <div className="p-3 border-b border-slate-200/50 bg-slate-50/50 rounded-t-xl flex justify-between font-bold text-xs text-slate-600 uppercase">
                        <span>{col}</span>
                        <span className="bg-white px-2 py-0.5 rounded">
                            {profiles.filter(p => getStatus(p) === col).length}
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {profiles.filter(p => getStatus(p) === col).map(cv => (
                            <div key={cv.id} draggable onDragStart={e => onDragStart(e, cv.id)}>
                                <CandidateCard
                                    cv={cv}
                                    onClick={() => onSelectCv(cv)}
                                    onDelete={onDeleteCv}
                                    onReprocess={onReprocessCv}
                                    compact
                                    jobs={jobs}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default PipelineBoard;
