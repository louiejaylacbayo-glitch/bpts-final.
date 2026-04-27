"use client";

import { useEffect, useState, useRef, FormEvent } from "react";
import Link from "next/link";

// --- TypeScript Interfaces ---
interface Project {
  id?: string;
  _id?: string;
  name: string;
  status: string;
  category?: string;
  created_by?: string;
  budget?: string | number;
  duration?: string;
  files?: string;
  description?: string;
}

interface ProjectComment {
  id?: string;
  _id?: string;
  project_id: string;
  name?: string;
  resident_name?: string;
  comment_text: string;
  date_submitted: string | Date;
  admin_reply?: string;
}

export default function PublicProjectMonitoring() {
  // --- States ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [loading, setLoading] = useState(true);

  // Feedback Form States
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Toast Notification State & Ref
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    
    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3000);
  };

  // --- Effects ---
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch("/api/project", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch projects");
        
        const data: Project[] = await res.json();
        setProjects(data);
        if (data.length > 0) setSelectedProject(data[0]);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    const currentId = selectedProject?.id || selectedProject?._id;
    if (currentId) {
      setComments([]); 
      fetchComments(String(currentId));
    }
  }, [selectedProject]);

  // --- API Handlers ---
  const fetchComments = async (projectId: string) => {
    try {
      const res = await fetch(`/api/comments?projectId=${projectId}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch comments");

      const data: ProjectComment[] = await res.json();
      const filtered = data.filter((c) => String(c.project_id) === String(projectId));
      setComments(filtered);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const handleSubmitComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !comment.trim()) {
      return showNotification("Please fill in your name and comment.", "error");
    }

    setSubmitting(true);
    const id = selectedProject?.id || selectedProject?._id;
    
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), comment: comment.trim(), projectId: id }),
      });

      if (res.ok) {
        showNotification("Feedback submitted successfully!", "success");
        setName("");
        setComment("");
        if (id) fetchComments(String(id)); 
      } else {
        showNotification("Failed to submit feedback. Please try again.", "error");
      }
    } catch (error) {
      console.error("Submission Error:", error);
      showNotification("An error occurred. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const getFileUrl = (filePath: string) => {
    if (filePath.startsWith('http')) return filePath;
    const cleanPath = filePath.replace(/^\/?/, '');
    return cleanPath.includes('uploads/') ? `/${cleanPath}` : `/uploads/${cleanPath}`;
  };

  // Helper to strictly check if a file truly exists
  const hasValidFile = (fileStr?: string) => {
    return fileStr && fileStr.trim() !== "" && fileStr !== "null" && fileStr !== "undefined";
  };

  // --- Render ---
  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#f0f4f8] text-gray-400 font-medium">
      Loading community projects...
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-[#f0f4f8] font-sans relative">
      
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-top-5 fade-in duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl border ${
            toast.type === 'success' ? 'bg-white border-green-100 text-gray-800' : 'bg-white border-red-100 text-gray-800'
          }`}>
            <div className={`p-2 rounded-full ${toast.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {toast.type === 'success' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              )}
            </div>
            <p className="text-sm font-bold">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white px-4 md:px-8 py-4 flex justify-between items-center shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-[#10b981] p-2 rounded-lg text-white font-bold text-xl hidden sm:block">BP</div>
          <div className="text-left">
            <h1 className="font-bold text-gray-800 text-base md:text-lg leading-none">Barangay Project Tracker</h1>
            <p className="text-xs text-gray-400 mt-1">Public Project Monitoring</p>
          </div>
        </div>
        <Link href="/" className="text-sm font-medium text-gray-500 hover:text-gray-800 transition flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          <span className="hidden sm:inline">Back to Home</span>
        </Link>
      </header>

      {/* Main Layout Area */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden p-4 md:p-6 gap-6 max-w-[1600px] mx-auto w-full">
        
        {/* Project Sidebar */}
        <aside className="w-full lg:w-[350px] xl:w-[400px] shrink-0 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-y-auto p-5 md:p-6 scrollbar-hide flex flex-col max-h-[40vh] lg:max-h-none lg:h-full">
          <div className="mb-4 md:mb-6 shrink-0">
            <h2 className="text-xl font-bold text-gray-800 text-left">All Projects</h2>
            <p className="text-sm text-gray-500 text-left">{projects.length} active projects</p>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto pr-2">
            {projects.map((p) => {
              const pId = p.id || p._id;
              const isSelected = (selectedProject?.id || selectedProject?._id) === pId;
              
              const statusLower = p.status?.toLowerCase() || "";
              let statusClasses = "bg-gray-100 text-gray-600";
              if (statusLower === "ongoing") statusClasses = "bg-blue-100 text-blue-700";
              if (statusLower === "completed") statusClasses = "bg-green-100 text-green-700";
              if (statusLower === "pending") statusClasses = "bg-yellow-100 text-yellow-700";

              return (
                <div
                  key={pId}
                  onClick={() => setSelectedProject(p)}
                  className={`p-4 rounded-2xl cursor-pointer transition-all text-left relative overflow-hidden shrink-0 ${
                    isSelected ? "bg-blue-50/50" : "bg-white hover:bg-gray-50 border border-gray-100"
                  }`}
                >
                  {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#1a237e] rounded-l-2xl"></div>}
                  
                  <div className="flex justify-between items-start gap-4">
                    <h3 className={`font-bold text-sm ${isSelected ? "text-gray-900 ml-2" : "text-gray-700"}`}>
                      {p.name}
                    </h3>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {p.category || "Maintenance"}
                    </span>
                  </div>
                  
                  <div className={`mt-3 inline-block px-3 py-1 text-xs font-semibold rounded-full ${isSelected ? "ml-2" : ""} ${statusClasses}`}>
                    {p.status || "Unknown"}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Project Content Right Side */}
        <main className="flex-1 overflow-y-auto scrollbar-hide pb-10">
          {selectedProject ? (
            <div className="max-w-5xl mx-auto space-y-6 text-left animate-in fade-in duration-500">
              
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                
                <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="bg-indigo-50 p-3 rounded-full text-indigo-500 shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 truncate">Project Title</p>
                    <p className="text-sm font-bold text-gray-800 truncate">{selectedProject.name || "Untitled"}</p>
                  </div>
                </div>

                <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="bg-teal-50 p-3 rounded-full text-teal-500 shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 truncate">Status</p>
                    <p className="text-sm font-bold text-gray-800 uppercase truncate">{selectedProject.status || "Unknown"}</p>
                  </div>
                </div>

                <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="bg-orange-50 p-3 rounded-full text-orange-500 shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 truncate">Category</p>
                    <p className="text-sm font-bold text-gray-800 truncate">{selectedProject.category || "Maintenance"}</p>
                  </div>
                </div>

                <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="bg-blue-50 p-3 rounded-full text-blue-500 shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 truncate">Location</p>
                    <p className="text-sm font-bold text-gray-800 truncate">{selectedProject.created_by || "Main Street, Barangay Centro"}</p>
                  </div>
                </div>

                <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="bg-green-50 p-3 rounded-full text-green-500 shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 truncate">Budget</p>
                    <p className="text-sm font-bold text-gray-800 truncate">₱{Number(selectedProject.budget || 0).toLocaleString()}</p>
                  </div>
                </div>

                <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="bg-purple-50 p-3 rounded-full text-purple-500 shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 truncate">Duration</p>
                    <p className="text-sm font-bold text-gray-800 truncate">{selectedProject.duration || "3 months"}</p>
                  </div>
                </div>

                {/* THIS IS THE UPDATED ATTACHED FILES SECTION */}
                <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4 xl:col-span-2">
                  <div className="bg-rose-50 p-3 rounded-full text-rose-500 shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 truncate">Attached Files</p>
                    {hasValidFile(selectedProject.files) ? (
                      <a href={getFileUrl(selectedProject.files!)} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-600 hover:underline truncate block">
                        View Document
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-gray-500 italic">No document attached</p>
                    )}
                  </div>
                </div>

                <div className="xl:col-span-2 bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider truncate">Project Description</p>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed break-words">{selectedProject.description || "No description provided for this project."}</p>
                </div>
              </div>

              {/* Feedback Form Card */}
              <div className="bg-white p-5 md:p-8 rounded-3xl shadow-sm border border-gray-100 mt-6">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-800">Submit Your Feedback</h3>
                  <p className="text-sm text-gray-500 mt-1">Share your thoughts, suggestions, or concerns about this project</p>
                </div>

                <form onSubmit={handleSubmitComment} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Your Name</label>
                    <input 
                      type="text" 
                      placeholder="Enter your full name" 
                      className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
                      value={name} 
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Your Comment</label>
                    <textarea 
                      rows={4} 
                      placeholder="Write your feedback or inquiry here..." 
                      className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
                      value={comment} 
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </div>
                  
                  <button 
                    disabled={submitting}
                    className="w-full bg-[#10b981] hover:bg-[#059669] text-white py-3.5 rounded-xl font-bold shadow-sm disabled:bg-gray-300 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    {submitting ? "Submitting..." : "Submit Comment"}
                  </button>
                </form>
              </div>

              {/* Feedback List */}
              {comments.length > 0 && (
                <div className="space-y-4 pt-4">
                  <h3 className="text-lg font-bold text-gray-800">Community Comments</h3>
                  {comments.map((c, i) => (
                    <div key={c.id || c._id || i} className="flex flex-col gap-2">
                      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                          <p className="font-bold text-gray-800 text-sm">{c.resident_name || c.name}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(c.date_submitted).toLocaleDateString(undefined, { 
                              year: 'numeric', month: 'long', day: 'numeric' 
                            })}
                          </p>
                        </div>
                        <p className="text-gray-600 text-sm break-words">"{c.comment_text}"</p>
                      </div>
                      
                      {c.admin_reply && (
                        <div className="bg-emerald-50 p-4 ml-4 md:ml-8 rounded-2xl border border-emerald-100 shadow-sm relative">
                          <div className="absolute -left-2 md:-left-3 top-4 w-2 md:w-3 h-px bg-emerald-200"></div>
                          <p className="text-[10px] text-emerald-600 font-bold uppercase mb-1">Official Response</p>
                          <p className="text-gray-800 text-sm font-medium break-words">{c.admin_reply}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 font-medium pb-20">
              Select a project to view.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}