import { useState, useMemo } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useHeadhunter } from '../context/HeadhunterContext';
import { useAuth } from '../context/AuthContext';
import { useUpload } from '../context/UploadContext';
import PipelineHeader from '../components/pipeline/PipelineHeader';
import CandidateCard from '../components/pipeline/CandidateCard';
import BulkActionBar from '../components/pipeline/BulkActionBar';
import CandidateDrawer from '../components/pipeline/CandidateDrawer';
import PipelineBoard from '../components/pipeline/PipelineBoard';
import UploadModal from '../components/modals/UploadModal';
import BulkAssignModal from '../components/modals/BulkAssignModal';
import CreateJobModal from '../components/modals/CreateJobModal';
import ScheduleInterviewModal from '../components/modals/ScheduleInterviewModal';
import CalendarView from '../components/pipeline/CalendarView';
import TimelineView from '../components/pipeline/TimelineView';
import axios from 'axios';

const Pipeline = ({ onOpenMobileSidebar }) => {
    const {
        jobs, profiles, setProfiles, fetchJobs, fetchProfiles,
        loadMoreProfiles, hasMore, isFetchingMore,
        search, setSearch, sortBy, setSortBy,
        selectedJobId, // Added setSelectedJobId
        updateApp, updateProfile, assignJob, removeJob,
        loading, jobsLoading,
        pipelineStages, companyStages
    } = useHeadhunter();

    const { uploadFiles: startUpload, uploading } = useUpload();

    // Derive selectedJob from context instead of local state
    const selectedJob = useMemo(() =>
        (jobs || []).find(j => j.id === selectedJobId) || null,
        [jobs, selectedJobId]);

    const [viewMode, setViewMode] = useState("list");
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectedCv, setSelectedCv] = useState(null);

    // Modals
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleData, setScheduleData] = useState(null); // {candidate, stage} - Replaced pendingSchedule

    // Local file selection state (before upload starts)
    const [uploadFiles, setUploadFiles] = useState(null);
    const [selectedDepartment, setSelectedDepartment] = useState("All");
    const [showEditJobModal, setShowEditJobModal] = useState(false);

    const handleEditJob = () => {
        if (selectedJob) {
            setShowEditJobModal(true);
        }
    };

    const handleUpdateJob = async (updatedData, selectedMatches) => {
        try {
            await axios.patch(`/api/jobs/${selectedJob.id}`, updatedData);
            // If matches were selected, assign them
            if (selectedMatches && selectedMatches.length > 0) {
                await axios.post('/api/jobs/bulk_assign', {
                    job_id: selectedJob.id,
                    cv_ids: selectedMatches
                });
            }
            fetchJobs();
            setShowEditJobModal(false);
        } catch (err) {
            console.error(err);
            alert("Failed to update job");
        }
    };

    const filteredProfiles = useMemo(() => {
        let result = profiles || [];

        // 1. Filter by Department (Only in General Pool)
        if (!selectedJob && selectedDepartment !== "All") {
            result = result.filter(p => {
                // Check if candidate has ANY application to a job in this department
                return Array.isArray(p.applications) && p.applications.some(app => {
                    const job = (jobs || []).find(j => j.id === app.job_id);
                    return job && job.department === selectedDepartment;
                });
            });
        }

        return result;
    }, [profiles, selectedJob, selectedDepartment, jobs]);

    // Actions
    const toggleSelect = (id) => {
        if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
        else setSelectedIds([...selectedIds, id]);
    };

    const handleSelectAll = () => {
        if (selectedIds.length === filteredProfiles.length) setSelectedIds([]);
        else setSelectedIds(filteredProfiles.map(p => p.id));
    };

    const performUpload = async (files, jobId) => {
        setShowUploadModal(false);
        startUpload(files, jobId, () => {
            // On success
            fetchProfiles();
            fetchJobs();
        });
        setUploadFiles(null);
    };

    const handleDeleteCV = async (e, id) => {
        e.stopPropagation(); if (!confirm("Delete candidate?")) return;
        try {
            await axios.delete(`/api/cv/${id}`);
            setProfiles(prev => prev.filter(p => p.id !== id));
            if (selectedCv?.id === id) setSelectedCv(null);
            fetchJobs();
        } catch (err) {
            console.error(err);
            alert("Failed");
        }
    };

    const handleReprocess = async (e, id) => {
        e.stopPropagation();
        try {
            await axios.post(`/api/cv/${id}/reprocess`);
            setProfiles(prev => prev.map(p => p.id === id ? { ...p, is_parsed: false } : p));
        } catch (err) {
            console.error(err);
            alert("Failed");
        }
    };

    // Kanban Logic: Sync with interview stages
    const getStatus = (cv) => {
        if (!selectedJob) return "New";
        const app = Array.isArray(cv.applications) ? cv.applications.find(a => a.job_id === selectedJob.id) : null;
        if (!app) return "New";

        // If application has interviews, use the latest interview stage
        if (app.interviews && Array.isArray(app.interviews) && app.interviews.length > 0) {
            // Sort by created_at or scheduled_at to get the latest (most recent) interview
            const sortedInterviews = [...app.interviews].sort((a, b) => {
                const dateA = new Date(a.scheduled_at || a.created_at || 0);
                const dateB = new Date(b.scheduled_at || b.created_at || 0);
                return dateB - dateA; // Most recent first
            });
            const stage = sortedInterviews[0].step;
            // console.log(`Candidate ${cv.name}: Found ${app.interviews.length} interviews, using stage: ${stage}`);
            return stage; // Return the latest interview stage
        }

        // Handle legacy "Interview" status - if app status is "Interview" but no interviews,
        // default to "Screening" (first interview stage)
        if (app.status === "Interview") {
            // console.log(`Candidate ${cv.name}: Legacy Interview status, defaulting to Screening`);
            return "Screening";
        }

        // Otherwise, fall back to application status
        // console.log(`Candidate ${cv.name}: No interviews, using app status: ${app.status}`);
        return app.status;
    };
    // Pipeline-Interview Merge: Interview stages are now columns
    const COLUMNS = useMemo(() => ["New", ...pipelineStages, "Offer", "Hired", "Silver Medalist", "Rejected"], [pipelineStages]);

    const onDragStart = (e, id) => e.dataTransfer.setData("cvId", id);

    const onDrop = async (e, newStatus) => {
        const id = parseInt(e.dataTransfer.getData("cvId"));
        const cv = profiles.find(p => p.id === id);
        if (!cv) {
            console.error("Candidate not found:", id);
            return;
        }

        // Ensure job is selected
        if (!selectedJob) {
            alert("Please select a job first");
            return;
        }

        // Define interview stages
        const INTERVIEW_STAGES = pipelineStages;

        const app = cv.applications?.find(a => a.job_id === selectedJob.id);
        if (!app) {
            console.error("No application found for candidate:", cv.name, "job:", selectedJob.title);
            alert(`This candidate doesn't have an application for ${selectedJob.title}. Please assign them to the job first.`);
            return;
        }

        // Handle interview stage drops
        if (INTERVIEW_STAGES.includes(newStatus)) {
            // Check configuration
            const stageConfig = companyStages.find(s => (s.name || s) === newStatus);
            const requiresInterview = stageConfig?.requiresInterview !== false; // Default to true

            // Check if interview already exists for this stage
            const existingInterview = app.interviews?.find(i => i.step === newStatus);

            if (existingInterview || (!requiresInterview && !stageConfig?.requiresReviewer)) {
                // Just update status if interview exists OR if interview/review is not required
                await updateApp(app.id, { status: newStatus });
                setProfiles(prev => prev.map(p => {
                    if (p.id !== id) return p;
                    const newApps = p.applications.map(a => {
                        if (a.id === app.id) {
                            return { ...a, status: newStatus };
                        }
                        return a;
                    });
                    return { ...p, applications: newApps };
                }));
                console.log("Status updated (Interview exists or not required)");
            } else {
                // Show modal to schedule new interview or assign reviewer
                const candidate = profiles.find(p => p.id === id);
                setScheduleData({
                    candidate,
                    stage: newStatus,
                    mode: stageConfig?.requiresReviewer && !requiresInterview ? 'review' : 'interview'
                });
                setShowScheduleModal(true);
            }
            return;
        }

        // Handle "Hired" status with confirmation
        if (newStatus === "Hired") {
            if (!confirm(`Confirm Hiring ${cv.name || 'Candidate'}? This will record the official hire date.`)) return;
        }

        // Handle other status updates (non-interview stages)
        if (app) {
            setProfiles(prev => prev.map(p => {
                if (p.id !== id) return p;
                const newApps = p.applications.map(a => a.id === app.id ? { ...a, status: newStatus } : a);
                return { ...p, applications: newApps };
            }));
            await updateApp(app.id, { status: newStatus });
        }
    };

    const handleBulkReprocess = async () => {
        if (!confirm(`Reprocess ${selectedIds.length} CVs?`)) return;
        try {
            await axios.post('/api/cv/reprocess_bulk', selectedIds);
            setProfiles(prev => prev.map(p => selectedIds.includes(p.id) ? { ...p, is_parsed: false } : p));
            setSelectedIds([]);
            alert("Reprocessing started");
        } catch (err) {
            console.error(err);
            alert("Failed to reprocess");
        }
    };

    /**
     * Handles the bulk deletion of selected candidates.
     * Prompts for confirmation before sending a request to the backend.
     */
    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedIds.length} candidates? This cannot be undone.`)) return;
        try {
            await axios.post('/api/cv/bulk_delete', { cv_ids: selectedIds });
            setProfiles(prev => prev.filter(p => !selectedIds.includes(p.id)));
            setSelectedIds([]);
            fetchJobs(); // Update counts
        } catch (err) {
            console.error("Failed to bulk delete", err);
            alert("Failed to delete candidates");
        }
    };

    /**
     * Handles the bulk assignment of selected candidates to a specific job.
     * @param {number} jobId - The ID of the job to assign candidates to.
     */
    const handleBulkAssign = async (jobId) => {
        try {
            await axios.post('/api/jobs/bulk_assign', {
                job_id: jobId,
                cv_ids: selectedIds
            });
            fetchJobs();
            fetchProfiles();
            setShowBulkAssignModal(false);
            setSelectedIds([]);
            alert("Candidates assigned successfully");
        } catch (err) {
            console.error("Failed to bulk assign", err);
            alert("Failed to assign candidates");
        }
    };

    return (
        <>
            <PipelineHeader
                onOpenMobileSidebar={onOpenMobileSidebar}
                selectedJob={selectedJob}
                handleToggleArchive={async (job, newStatus) => {
                    try {
                        const isActive = newStatus === 'Open';
                        await axios.patch(`/api/jobs/${job.id}`, { status: newStatus, is_active: isActive });
                        fetchJobs();
                    } catch (err) {
                        console.error("Failed to update job status", err);
                        alert("Failed to update job status");
                    }
                }}
                viewMode={viewMode}
                setViewMode={setViewMode}
                handleSelectAll={handleSelectAll}
                selectedIds={selectedIds}
                filteredProfiles={filteredProfiles}
                searchTerm={search}
                setSearchTerm={setSearch}
                uploading={uploading}
                performUpload={performUpload}
                setUploadFiles={setUploadFiles}
                setShowUploadModal={setShowUploadModal}
                sortBy={sortBy}
                setSortBy={setSortBy}
                selectedDepartment={selectedDepartment}
                setSelectedDepartment={setSelectedDepartment}
                departments={["All", ...new Set((jobs || []).map(j => j.department).filter(Boolean))]}
                onEditJob={handleEditJob}
                user={useAuth().user}
            />

            <div className="flex-1 overflow-hidden p-4 md:p-8 relative flex flex-col">
                {(loading || jobsLoading) && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                )}

                {!loading && filteredProfiles.length === 0 && viewMode !== 'calendar' ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <div className="text-lg font-medium">No candidates found</div>
                        <div className="text-sm">Upload CVs to get started</div>
                    </div>
                ) : (
                    <>
                        {/* LIST VIEW */}
                        {viewMode === 'list' && (
                            <div className="h-full w-full">
                                <AutoSizer>
                                    {({ height, width }) => {
                                        const COLUMN_WIDTH = 320;
                                        const GAP = 16;
                                        const columnCount = Math.floor(width / (COLUMN_WIDTH + GAP)) || 1;
                                        const rowCount = Math.ceil(filteredProfiles.length / columnCount);

                                        const Cell = ({ columnIndex, rowIndex, style }) => {
                                            const index = rowIndex * columnCount + columnIndex;
                                            if (index >= filteredProfiles.length) return null;
                                            const cv = filteredProfiles[index];

                                            const adjustedStyle = {
                                                ...style,
                                                left: style.left + GAP,
                                                top: style.top + GAP,
                                                width: style.width - GAP,
                                                height: style.height - GAP
                                            };

                                            return (
                                                <div style={adjustedStyle}>
                                                    <CandidateCard
                                                        cv={cv}
                                                        onClick={() => setSelectedCv(cv)}
                                                        onDelete={handleDeleteCV}
                                                        onReprocess={handleReprocess}
                                                        status={selectedJob ? getStatus(cv) : null}
                                                        jobs={jobs}
                                                        selectable={!selectedJob}
                                                        selected={selectedIds.includes(cv.id)}
                                                        onSelect={() => toggleSelect(cv.id)}
                                                    />
                                                </div>
                                            );
                                        };

                                        return (
                                            <Grid
                                                columnCount={columnCount}
                                                columnWidth={(width - GAP) / columnCount}
                                                height={height}
                                                rowCount={rowCount}
                                                rowHeight={220}
                                                width={width}
                                                onItemsRendered={({ visibleRowStopIndex }) => {
                                                    if (visibleRowStopIndex >= rowCount - 2 && hasMore && !isFetchingMore) {
                                                        loadMoreProfiles();
                                                    }
                                                }}
                                            >
                                                {Cell}
                                            </Grid>
                                        );
                                    }}
                                </AutoSizer>
                            </div>
                        )}

                        {/* KANBAN VIEW */}
                        {viewMode === 'kanban' && (
                            <PipelineBoard
                                columns={COLUMNS}
                                profiles={filteredProfiles}
                                getStatus={getStatus}
                                onDrop={onDrop}
                                onDragStart={onDragStart}
                                onSelectCv={setSelectedCv}
                                onDeleteCv={handleDeleteCV}
                                onReprocessCv={handleReprocess}
                                jobs={jobs}
                            />
                        )}

                        {/* CALENDAR VIEW */}
                        {viewMode === 'calendar' && (
                            <div className="h-full overflow-y-auto">
                                {selectedJob ? (
                                    <CalendarView
                                        jobId={selectedJob.id}
                                        onEventClick={(event) => {
                                            const interviewData = {
                                                id: event.id,
                                                candidate_name: event.resource?.candidate_name,
                                                job_title: event.resource?.job_title,
                                                step: event.resource?.step,
                                                scheduled_at: event.start,
                                                status: event.status,
                                                interviewer_id: event.resource?.interviewer_id
                                            };

                                            setScheduleData({
                                                interview: interviewData,
                                            });
                                            setShowScheduleModal(true);
                                        }}
                                        onSelectSlot={(slotInfo) => {
                                            // Handle click on free slot
                                            setScheduleData({
                                                preselectedDate: slotInfo.start,
                                            });
                                            setShowScheduleModal(true);
                                        }}
                                    />
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                        <div className="text-lg font-medium">Select a job to view calendar</div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TIMELINE VIEW */}
                        {viewMode === 'timeline' && (
                            <TimelineView
                                jobId={selectedJob?.id}
                                onSelectCandidate={(candidate) => {
                                    // Find the full CV profile from candidate data
                                    const cv = profiles.find(p =>
                                        p.applications?.some(a => a.id === candidate.application_id)
                                    );
                                    if (cv) setSelectedCv(cv);
                                }}
                                onScheduleInterview={({ candidate, stage }) => {
                                    // Find the full CV profile
                                    const cv = profiles.find(p =>
                                        p.applications?.some(a => a.id === candidate.application_id)
                                    );
                                    if (cv) {
                                        setScheduleData({
                                            candidate: cv,
                                            stage: stage,
                                            mode: 'interview'
                                        });
                                        setShowScheduleModal(true);
                                    }
                                }}
                                onViewInterview={({ candidate }) => {
                                    // Find the full CV profile and open drawer
                                    const cv = profiles.find(p =>
                                        p.applications?.some(a => a.id === candidate.application_id)
                                    );
                                    if (cv) setSelectedCv(cv);
                                }}
                            />
                        )}
                    </>
                )}
            </div>

            <BulkActionBar
                selectedIds={selectedIds}
                setShowBulkAssignModal={setShowBulkAssignModal}
                performBulkReprocess={handleBulkReprocess}
                performBulkDelete={handleBulkDelete}
                clearSelection={() => setSelectedIds([])}
            />

            {
                selectedCv && (
                    <CandidateDrawer
                        cv={selectedCv}
                        onClose={() => setSelectedCv(null)}
                        jobs={jobs}
                        updateApp={updateApp}
                        updateProfile={updateProfile}
                        selectedJobId={selectedJobId}
                        assignJob={assignJob}
                        removeJob={removeJob}
                        companyStages={companyStages}
                    />
                )
            }

            {showUploadModal && <UploadModal jobs={jobs} uploadFiles={uploadFiles} performUpload={performUpload} onClose={() => setShowUploadModal(false)} />}
            {showBulkAssignModal && <BulkAssignModal jobs={jobs} selectedCount={selectedIds.length} performBulkAssign={handleBulkAssign} onClose={() => setShowBulkAssignModal(false)} />}
            {showEditJobModal && <CreateJobModal onClose={() => setShowEditJobModal(false)} onCreate={handleUpdateJob} initialData={selectedJob} />}

            {showScheduleModal && scheduleData && (
                <ScheduleInterviewModal
                    show={showScheduleModal}
                    onClose={() => {
                        setShowScheduleModal(false);
                        setScheduleData(null);
                    }}
                    onSchedule={(result) => {
                        console.log("Scheduled/Updated:", result);
                        // Optional: Refresh calendar here if needed
                    }}
                    candidate={scheduleData.candidate}
                    candidates={filteredProfiles} // Pass available candidates
                    job={selectedJob}
                    initialStep={scheduleData.stage}
                    interviewToEdit={scheduleData.interview}
                    preselectedDate={scheduleData.preselectedDate}
                    mode={scheduleData.mode}
                />
            )}
        </>
    );
};

export default Pipeline;
