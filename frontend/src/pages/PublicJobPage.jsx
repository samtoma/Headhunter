/*
 * Copyright (c) 2025 Headhunter AI Engineering Team
 * 
 * Public Landing Page for Job Applications
 * This page is accessible without authentication - candidates can apply directly.
 */

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Briefcase, MapPin, Clock, DollarSign, Upload, CheckCircle, AlertCircle, Building2, ExternalLink, Loader2 } from 'lucide-react';

const PublicJobPage = () => {
    const { slug } = useParams();
    const [searchParams] = useSearchParams();

    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        cvFile: null,
    });
    const [formErrors, setFormErrors] = useState({});

    // Extract UTM parameters from URL
    const trackingParams = {
        utm_source: searchParams.get('utm_source') || '',
        utm_medium: searchParams.get('utm_medium') || '',
        utm_campaign: searchParams.get('utm_campaign') || '',
        utm_term: searchParams.get('utm_term') || '',
        utm_content: searchParams.get('utm_content') || '',
        referrer: document.referrer || '',
    };

    // Fetch job data
    useEffect(() => {
        const fetchJob = async () => {
            try {
                const res = await axios.get(`/api/public/jobs/${slug}`);
                setJob(res.data);
                setLoading(false);
            } catch (err) {
                setError(err.response?.data?.detail || 'Job not found');
                setLoading(false);
            }
        };
        fetchJob();
    }, [slug]);

    // Form validation
    const validateForm = () => {
        const errors = {};
        if (!formData.name.trim()) errors.name = 'Name is required';
        if (!formData.email.trim()) errors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Invalid email format';
        if (!formData.cvFile) errors.cvFile = 'Resume is required';
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setSubmitting(true);
        const formPayload = new FormData();
        formPayload.append('name', formData.name);
        formPayload.append('email', formData.email);
        formPayload.append('phone', formData.phone);
        formPayload.append('cv_file', formData.cvFile);

        // Add tracking params
        Object.entries(trackingParams).forEach(([key, value]) => {
            if (value) formPayload.append(key, value);
        });

        try {
            await axios.post(`/api/public/jobs/${slug}/apply`, formPayload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setSubmitted(true);
        } catch (err) {
            setFormErrors({ submit: err.response?.data?.detail || 'Submission failed. Please try again.' });
        }
        setSubmitting(false);
    };

    // Handle file selection
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const ext = file.name.split('.').pop().toLowerCase();
            if (!['pdf', 'doc', 'docx'].includes(ext)) {
                setFormErrors({ ...formErrors, cvFile: 'Only PDF and Word documents are allowed' });
                return;
            }
            setFormData({ ...formData, cvFile: file });
            setFormErrors({ ...formErrors, cvFile: null });
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Job Not Found</h1>
                    <p className="text-slate-600">{error}</p>
                </div>
            </div>
        );
    }

    // Success state
    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted!</h1>
                    <p className="text-slate-600 mb-6">
                        Thank you for applying to <span className="font-semibold">{job.title}</span> at {job.company_name || 'our company'}.
                        We&apos;ll review your application and get back to you soon.
                    </p>
                    {job.company_website && (
                        <a
                            href={job.company_website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                            <ExternalLink size={16} /> Visit our website
                        </a>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Header with Company Branding */}
            <header className="bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
                    {job.company_logo ? (
                        <img src={job.company_logo} alt={job.company_name} className="h-12 w-auto object-contain" />
                    ) : (
                        <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-indigo-600" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">{job.company_name || 'Company'}</h1>
                        {job.company_tagline && (
                            <p className="text-sm text-slate-500">{job.company_tagline}</p>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Job Details */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">{job.title}</h2>

                            {/* Job Meta */}
                            <div className="flex flex-wrap gap-4 mb-6 text-sm text-slate-600">
                                {job.department && (
                                    <span className="flex items-center gap-1">
                                        <Briefcase size={16} className="text-indigo-500" />
                                        {job.department}
                                    </span>
                                )}
                                {job.location && (
                                    <span className="flex items-center gap-1">
                                        <MapPin size={16} className="text-indigo-500" />
                                        {job.location}
                                    </span>
                                )}
                                {job.employment_type && (
                                    <span className="flex items-center gap-1">
                                        <Clock size={16} className="text-indigo-500" />
                                        {job.employment_type}
                                    </span>
                                )}
                                {job.salary_range && (
                                    <span className="flex items-center gap-1">
                                        <DollarSign size={16} className="text-indigo-500" />
                                        {job.salary_range}
                                    </span>
                                )}
                            </div>

                            {/* Description */}
                            {job.description && (
                                <div className="prose prose-slate max-w-none mb-6">
                                    <p className="whitespace-pre-line">{job.description}</p>
                                </div>
                            )}

                            {/* Responsibilities */}
                            {job.responsibilities?.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-bold text-slate-800 uppercase mb-3">Responsibilities</h3>
                                    <ul className="space-y-2">
                                        {job.responsibilities.map((item, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 shrink-0" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Qualifications */}
                            {job.qualifications?.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-bold text-slate-800 uppercase mb-3">Requirements</h3>
                                    <ul className="space-y-2">
                                        {job.qualifications.map((item, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 shrink-0" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Preferred Qualifications */}
                            {job.preferred_qualifications?.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-bold text-slate-800 uppercase mb-3">Nice to Have</h3>
                                    <ul className="space-y-2">
                                        {job.preferred_qualifications.map((item, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 shrink-0" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Benefits */}
                            {job.benefits?.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 uppercase mb-3">Benefits</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {job.benefits.map((item, i) => (
                                            <span key={i} className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-sm">
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Application Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
                            <h3 className="text-lg font-bold text-slate-900 mb-4">Apply Now</h3>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Full Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none ${formErrors.name ? 'border-red-300' : 'border-slate-200'}`}
                                        placeholder="John Smith"
                                    />
                                    {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Email <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none ${formErrors.email ? 'border-red-300' : 'border-slate-200'}`}
                                        placeholder="john@example.com"
                                    />
                                    {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Phone (Optional)
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="+1 (555) 123-4567"
                                    />
                                </div>

                                {/* CV Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Resume <span className="text-red-500">*</span>
                                    </label>
                                    <div className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:bg-slate-50 transition ${formErrors.cvFile ? 'border-red-300' : 'border-slate-200'}`}>
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx"
                                            onChange={handleFileChange}
                                            className="hidden"
                                            id="cv-upload"
                                        />
                                        <label htmlFor="cv-upload" className="cursor-pointer">
                                            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                            {formData.cvFile ? (
                                                <p className="text-sm text-indigo-600 font-medium">{formData.cvFile.name}</p>
                                            ) : (
                                                <p className="text-sm text-slate-500">
                                                    Drop your resume here or <span className="text-indigo-600">browse</span>
                                                </p>
                                            )}
                                            <p className="text-xs text-slate-400 mt-1">PDF, DOC, DOCX (Max 10MB)</p>
                                        </label>
                                    </div>
                                    {formErrors.cvFile && <p className="text-xs text-red-500 mt-1">{formErrors.cvFile}</p>}
                                </div>

                                {/* Submit Error */}
                                {formErrors.submit && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <p className="text-sm text-red-600">{formErrors.submit}</p>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        'Submit Application'
                                    )}
                                </button>

                                <p className="text-xs text-slate-400 text-center">
                                    By submitting, you agree to our privacy policy.
                                </p>
                            </form>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-200 bg-white mt-12">
                <div className="max-w-5xl mx-auto px-4 py-6 text-center text-sm text-slate-500">
                    Powered by <span className="font-semibold text-indigo-600">Headhunter AI</span>
                </div>
            </footer>
        </div>
    );
};

export default PublicJobPage;
