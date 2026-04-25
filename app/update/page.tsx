"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UpdateProject() {
  const router = useRouter();
  const [currentUserName, setCurrentUserName] = useState("Loading...");
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Mobile Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modal States
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Custom Alert & Delete States
  const [toastMessage, setToastMessage] = useState<{ text: string, type: "success" | "error" | "loading" } | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const fetchProjects = async (username: string) => {
    try {
      const res = await fetch(`/api/project?username=${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Failed to fetch projects", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userSession = localStorage.getItem("user");
    if (userSession) {
      try {
        const userData = JSON.parse(userSession);
        const username = userData.username || userData.name || "Unknown Admin";
        setCurrentUserName(username);
        fetchProjects(username);
      } catch (e) {
        setCurrentUserName("Unknown Admin");
        setLoading(false);
      }
    } else {
      router.push("/login");
    }
  }, [router]);

  const logout = async () => {
    try {
      await fetch("/api/users/logout", {
        method: "POST",
      });
      localStorage.removeItem("user");
      localStorage.removeItem("dashboard_projects_vault"); 
      router.push("/login");
    } catch (error) {
      console.error("Failed to logout securely:", error);
      localStorage.removeItem("user");
      router.push("/login");
    }
  };

  const getStatusStyle = (status: string) => {
    if (status === "Ongoing") return "bg-blue-100 text-blue-700";
    if (status === "Completed") return "bg-green-100 text-green-700";
    if (status === "Pending") return "bg-orange-100 text-orange-700";
    return "bg-gray-100 text-gray-700";
  };

  const filteredProjects = projects.filter((project) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (project.name && project.name.toLowerCase().includes(searchLower)) ||
      (project.category && project.category.toLowerCase().includes(searchLower)) ||
      (project.status && project.status.toLowerCase().includes(searchLower))
    );
  });

  // --- HANDLERS ---
  const handleViewClick = (project: any) => {
    setSelectedProject(project);
    setIsViewModalOpen(true);
  };

  const handleEditClick = (project: any) => {
    setEditFormData({ ...project }); 
    setIsEditModalOpen(true);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setToastMessage({ text: "Saving changes...", type: "loading" });
    
    try {
      const res = await fetch("/api/project", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });

      if (res.ok) {
        setToastMessage({ text: "Project updated successfully!", type: "success" });
        setTimeout(() => setToastMessage(null), 3000);
        setIsEditModalOpen(false);
        fetchProjects(currentUserName);
      } else {
        setToastMessage({ text: "Failed to update project.", type: "error" });
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (error) {
      setToastMessage({ text: "Error updating project.", type: "error" });
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (projectId: string) => {
    setProjectToDelete(projectId);
  };

  const executeDelete = async () => {
    if (!projectToDelete) return;
    const projectId = projectToDelete;
    setProjectToDelete(null);
    
    setToastMessage({ text: "Deleting project...", type: "loading" });
    try {
      const res = await fetch("/api/project", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: projectId }),
      });
      if (res.ok) {
        setToastMessage({ text: "Project deleted successfully!", type: "success" });
        setTimeout(() => setToastMessage(null), 3000);
        fetchProjects(currentUserName);
      } else {
        setToastMessage({ text: "Failed to delete project.", type: "error" });
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (error) {
      setToastMessage({ text: "Something went wrong.", type: "error" });
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 relative text-gray-800">
      
      {/* CUSTOM ALERT TOAST */}
      {toastMessage && (
        <div className={`fixed top-6 right-6 z-[60] bg-white border-l-4 shadow-xl rounded-md p-4 flex items-center gap-3 transition-all duration-300 transform translate-y-0 opacity-100 ${
          toastMessage.type === 'success' ? 'border-green-500' : 
          toastMessage.type === 'error' ? 'border-red-500' : 
          'border-blue-500'
        }`}>
          <div className={`rounded-full p-1 ${
            toastMessage.type === 'success' ? 'bg-green-100 text-green-600' : 
            toastMessage.type === 'error' ? 'bg-red-100 text-red-600' : 
            'bg-blue-100 text-blue-600'
          }`}>
            {toastMessage.type === 'success' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>}
            {toastMessage.type === 'error' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>}
            {toastMessage.type === 'loading' && <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>}
          </div>
          <p className="text-sm font-semibold text-gray-800">{toastMessage.text}</p>
        </div>
      )}

      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* RESPONSIVE SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-blue-900 text-white flex flex-col p-6 shadow-xl transform transition-transform duration-300 md:relative md:translate-x-0 ${
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="flex-1">
          <div className="flex justify-between items-start mb-10">
            <h1 className="text-lg font-bold leading-tight whitespace-nowrap">
              Barangay <br />
              <span className="text-sm opacity-70 font-normal">Project Tracker</span>
            </h1>
            {/* Mobile Close Button */}
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden text-white/80 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <nav className="space-y-3 text-sm">
            <div onClick={() => router.push("/dashboard")} className="opacity-80 hover:opacity-100 cursor-pointer p-3 hover:bg-blue-800 rounded-xl transition flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              <span className="whitespace-nowrap">Dashboard</span>
            </div>
            
            <div onClick={() => router.push("/upload")} className="opacity-80 hover:opacity-100 cursor-pointer p-3 hover:bg-blue-800 rounded-xl transition flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              <span className="whitespace-nowrap">Upload Project</span>
            </div>
            
            <div onClick={() => router.push("/update")} className="bg-blue-600 p-3 rounded-xl cursor-default font-semibold shadow-sm flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              <span className="whitespace-nowrap">Update Project</span>
            </div>
            
            <div onClick={() => router.push("/comments")} className="opacity-80 hover:opacity-100 cursor-pointer p-3 hover:bg-blue-800 rounded-xl transition flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              <span className="whitespace-nowrap">View Comments</span>
            </div>

            <div onClick={() => router.push("/settings")} className="opacity-80 hover:opacity-100 cursor-pointer p-3 hover:bg-blue-800 rounded-xl transition flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <span className="whitespace-nowrap">Settings</span>
            </div>
          </nav>
        </div>
        
        <div onClick={logout} className="bg-blue-800/80 hover:bg-blue-800 p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-colors shadow-sm mt-4">
          <div className="w-10 h-10 rounded-full bg-teal-400 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {currentUserName ? currentUserName.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="flex-col overflow-hidden flex-1 text-left">
            <span className="block text-sm font-bold text-white truncate whitespace-nowrap">
              {currentUserName}
            </span>
            <span className="block text-xs text-blue-300 truncate font-normal whitespace-nowrap">
              Administrator
            </span>
          </div>
          <div className="text-white/80 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-x-hidden flex flex-col w-full">
        
        {/* TOP BAR */}
        <div className="bg-white p-4 flex justify-between items-center border-b shadow-sm sticky top-0 z-20 gap-4">
          <div className="flex items-center flex-1 gap-2">
            {/* Hamburger Menu (Mobile Only) */}
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 text-gray-600 hover:text-blue-900 focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            
            {/* Search Input */}
            <div className="relative w-full max-w-md text-left hidden md:block">
              <input 
                type="text" 
                placeholder="Search projects..." 
                className="border rounded-full px-10 py-2 w-full outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="absolute left-4 top-2.5 opacity-40">🔍</span>
            </div>
          </div>
          
          {/* Header Profile Shortcut */}
          <div onClick={() => router.push("/settings")} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-all flex-shrink-0">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {currentUserName.charAt(0).toUpperCase()}
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold">{currentUserName}</p>
              <p className="text-xs text-gray-400">Barangay Admin</p>
            </div>
          </div>
        </div>

        {/* Mobile Search Input (Visible only on small screens below the top bar) */}
        <div className="md:hidden p-4 bg-white border-b shadow-sm">
          <div className="relative w-full text-left">
            <input 
              type="text" 
              placeholder="Search projects..." 
              className="border rounded-full px-10 py-2 w-full outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="absolute left-4 top-2.5 opacity-40">🔍</span>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="p-4 md:p-6">
          <div className="mb-6 text-left">
            <h2 className="text-2xl font-bold text-gray-800">Update Projects</h2>
            <p className="text-gray-500 text-sm font-medium">Manage and edit existing projects for <span className="text-blue-900 font-bold">{currentUserName}</span></p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
            <h3 className="font-bold mb-4 text-gray-700 text-left">Project Management</h3>

            {loading ? (
              <p className="text-center text-gray-400 py-10 italic">Loading projects...</p>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-400">
                  {searchQuery ? `No projects match "${searchQuery}".` : "No projects found."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b text-left">
                      <th className="py-3 font-semibold whitespace-nowrap min-w-[150px]">Project Name</th>
                      <th className="font-semibold whitespace-nowrap min-w-[120px]">Category</th>
                      <th className="font-semibold whitespace-nowrap min-w-[100px]">Budget</th>
                      <th className="font-semibold whitespace-nowrap min-w-[100px]">Duration</th>
                      <th className="font-semibold whitespace-nowrap min-w-[100px]">Status</th>
                      <th className="font-semibold text-center whitespace-nowrap min-w-[150px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-left">
                    {filteredProjects.map((project) => (
                      <tr key={project.id || project._id} className="hover:bg-blue-50/40 transition">
                        <td className="py-4 font-bold text-gray-700">{project.name}</td>
                        <td className="py-4 text-gray-600">{project.category}</td>
                        <td className="py-4 font-mono text-gray-600">₱{Number(project.budget).toLocaleString()}</td>
                        <td className="py-4 text-gray-600">{project.duration}</td>
                        <td className="py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-black shadow-sm ${getStatusStyle(project.status)}`}>
                            {project.status || "Pending"}
                          </span>
                        </td>
                        <td className="py-4">
                          <div className="flex justify-center gap-3">
                            <button onClick={() => handleViewClick(project)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition" title="View Details">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                            <button onClick={() => handleEditClick(project)} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition" title="Edit">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => handleDeleteClick(project.id || project._id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition" title="Delete">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* VIEW MODAL */}
      {isViewModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border w-full max-w-lg overflow-hidden relative">
            <div className="bg-blue-900 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-lg">Project Details</h3>
              <button onClick={() => setIsViewModalOpen(false)} className="text-white text-2xl hover:opacity-70">&times;</button>
            </div>
            <div className="p-6 space-y-4 text-sm text-gray-700 text-left">
              <div className="grid grid-cols-3 border-b pb-2"><span className="font-semibold text-gray-400">Name:</span><span className="col-span-2 font-bold text-blue-900">{selectedProject.name}</span></div>
              <div className="grid grid-cols-3 border-b pb-2"><span className="font-semibold text-gray-400">Budget:</span><span className="col-span-2 font-mono">₱{Number(selectedProject.budget).toLocaleString()}</span></div>
              <div className="grid grid-cols-3 border-b pb-2"><span className="font-semibold text-gray-400">Status:</span><span className="col-span-2"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusStyle(selectedProject.status)}`}>{selectedProject.status}</span></span></div>
              <div className="grid grid-cols-3 border-b pb-2"><span className="font-semibold text-gray-400">Description:</span><span className="col-span-2 text-gray-600">{selectedProject.description || "No description provided."}</span></div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end">
              <button onClick={() => setIsViewModalOpen(false)} className="bg-gray-200 px-6 py-2 rounded-xl text-sm font-bold hover:bg-gray-300 transition">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && editFormData && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border w-full max-w-lg overflow-hidden relative max-h-[90vh] overflow-y-auto">
            <div className="bg-green-700 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-10">
              <h3 className="font-bold text-lg">Edit Project Info</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-white text-2xl hover:opacity-70">&times;</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="p-6 space-y-4 text-sm text-gray-700 text-left">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Project Name</label>
                  <input type="text" name="name" value={editFormData.name || ""} onChange={handleEditChange} required className="w-full border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500 transition bg-gray-50" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Category</label>
                    <select name="category" value={editFormData.category || ""} onChange={handleEditChange} required className="w-full border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500 transition bg-gray-50">
                      <option value="Maintenance">Maintenance</option>
                      <option value="Infrastructure">Infrastructure</option>
                      <option value="Repair">Repair</option>
                      <option value="Sanitation">Sanitation</option>
                      <option value="Health & Wellness">Health & Wellness</option>
                      <option value="Education">Education</option>
                      <option value="Security & Peace">Security & Peace</option>
                      <option value="Environment">Environment / Greening</option>
                      <option value="Sports & Recreation">Sports & Recreation</option>
                      <option value="Livelihood">Livelihood Programs</option>
                      <option value="Disaster Response">Disaster Risk Reduction</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Status</label>
                    <select name="status" value={editFormData.status || "Pending"} onChange={handleEditChange} className="w-full border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500 transition bg-gray-50">
                      <option value="Pending">Pending</option>
                      <option value="Ongoing">Ongoing</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Budget (₱)</label>
                    <input type="number" name="budget" value={editFormData.budget || ""} onChange={handleEditChange} required className="w-full border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500 transition bg-gray-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Duration</label>
                    <input type="text" name="duration" value={editFormData.duration || ""} onChange={handleEditChange} required className="w-full border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500 transition bg-gray-50" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Description</label>
                  <textarea name="description" value={editFormData.description || ""} onChange={handleEditChange} rows={3} className="w-full border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500 transition bg-gray-50" />
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t sticky bottom-0">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="bg-gray-200 px-5 py-2 rounded-xl text-sm font-bold hover:bg-gray-300 transition">Cancel</button>
                <button type="submit" disabled={isSaving} className="bg-green-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-green-700 transition disabled:opacity-50">
                  {isSaving ? "Saving..." : "Update Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {projectToDelete && (
        <div className="fixed inset-0 z-[60] flex justify-center items-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border w-full max-w-sm overflow-hidden text-center p-6">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Delete Project?</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete this project? This action cannot be undone.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setProjectToDelete(null)} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition">Cancel</button>
              <button onClick={executeDelete} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition shadow-lg shadow-red-200">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}