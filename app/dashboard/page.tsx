"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link"; 

export default function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserName, setCurrentUserName] = useState("User");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Notification State (Top Bar)
  const [hasNewUpdate, setHasNewUpdate] = useState(false); 
  const [showNotifications, setShowNotifications] = useState(false);
  const [latestNotification, setLatestNotification] = useState(""); 

  // Side Toast Notification State
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // Action States for Modals
  const [viewingProject, setViewingProject] = useState<any | null>(null);
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<any | null>(null); 

  // NEW: Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Helper to show the side notification
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3000);
  };

  const fetchProjects = async () => {
    try {
      const userSession = localStorage.getItem("user");
      if (!userSession) {
        router.push("/login");
        return;
      }
      const userData = JSON.parse(userSession);
      const username = userData.username || userData.name || "Admin";
      setCurrentUserName(username);

      const timestamp = new Date().getTime();
      const res = await fetch(`/api/project?username=${encodeURIComponent(username)}&t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      
      const vaultData = localStorage.getItem("dashboard_projects_vault");
      const oldProjects = vaultData ? JSON.parse(vaultData) : null; 

      if (oldProjects !== null) {
        if (data.length > oldProjects.length) {
          const newlyAdded = data.find((newP: any) => 
            !oldProjects.some((oldP: any) => (oldP.id || oldP._id) === (newP.id || newP._id) || oldP.name === newP.name)
          ) || data[data.length - 1]; 
          
          if (newlyAdded) {
            setLatestNotification(`${newlyAdded.name} - New project added`);
            setHasNewUpdate(true);
          }
        } 
        else if (data.length < oldProjects.length) {
          const deletedProject = oldProjects.find((oldP: any) => 
            !data.some((newP: any) => (newP.id || newP._id) === (oldP.id || oldP._id) || newP.name === oldP.name)
          );

          if (deletedProject) {
            setLatestNotification(`${deletedProject.name} has been deleted`);
            setHasNewUpdate(true);
          }
        }
        else if (data.length === oldProjects.length) {
          const newlyUpdated = data.find((newP: any) => {
            const oldP = oldProjects.find((o: any) => (o.id || o._id) === (newP.id || newP._id) || o.name === newP.name);
            if (!oldP) return false;
            return (
              oldP.name !== newP.name ||
              oldP.status !== newP.status ||
              oldP.budget !== newP.budget ||
              oldP.category !== newP.category ||
              oldP.files !== newP.files
            );
          });

          if (newlyUpdated) {
            setLatestNotification(`${newlyUpdated.name} has been updated`);
            setHasNewUpdate(true);
          }
        }
      }
      
      localStorage.setItem("dashboard_projects_vault", JSON.stringify(data));
      setProjects(data);

    } catch (err) {
      console.error("Error loading projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    const interval = setInterval(fetchProjects, 5000);
    return () => clearInterval(interval);
  }, []); 

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    setHasNewUpdate(false); 
  };

  const logout = async () => {
    try {
      await fetch("/api/users/logout", { method: "POST" });
      localStorage.removeItem("user");
      localStorage.removeItem("dashboard_projects_vault"); 
      router.push("/login");
    } catch (error) {
      console.error("Failed to logout securely:", error);
      localStorage.removeItem("user");
      router.push("/login");
    }
  };

  const confirmDelete = (project: any) => {
    setProjectToDelete(project);
  };

  const executeDelete = async () => {
    if (!projectToDelete) return;

    try {
      const projectId = projectToDelete.id || projectToDelete._id;
      const res = await fetch(`/api/project?id=${projectId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        showToast("Project deleted successfully!", "success");
        setProjectToDelete(null); 
        fetchProjects(); 
      } else {
        showToast("Failed to delete the project.", "error");
      }
    } catch (err) {
      console.error("Error deleting project:", err);
      showToast("An error occurred while deleting.", "error");
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const projectId = editingProject.id || editingProject._id;
      const res = await fetch(`/api/project?id=${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingProject),
      });

      if (res.ok) {
        showToast("Project updated successfully!", "success");
        setEditingProject(null);
        fetchProjects(); 
      } else {
        showToast("Failed to update project.", "error");
      }
    } catch (err) {
      console.error("Error updating project:", err);
      showToast("An error occurred while updating.", "error");
    }
  };

  const filteredProjects = projects.filter((p) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      (p.name && p.name.toLowerCase().includes(searchLower)) ||
      (p.category && p.category.toLowerCase().includes(searchLower));
    
    const matchesStatus = statusFilter === "All" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const total = projects.length;
  const ongoing = projects.filter((p) => p.status === "Ongoing").length;
  const completed = projects.filter((p) => p.status === "Completed").length;
  const pending = projects.filter((p) => p.status === "Pending").length;

  const getStatusStyle = (status: string) => {
    if (status === "Ongoing") return "bg-blue-100 text-blue-700 border-blue-200";
    if (status === "Completed") return "bg-green-100 text-green-700 border-green-200";
    if (status === "Pending") return "bg-orange-100 text-orange-700 border-orange-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans relative overflow-hidden">
      
      {/* SIDE TOAST NOTIFICATION */}
      {toast.show && (
        <div className={`fixed top-8 right-8 z-[100] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl transition-all duration-300 ease-in-out border ${
          toast.type === "success" 
            ? "bg-white border-green-500 text-green-700" 
            : "bg-white border-red-500 text-red-700"
        }`}>
          <span className="text-xl">{toast.type === "success" ? "✅" : "⚠️"}</span>
          <p className="font-bold text-sm">{toast.message}</p>
        </div>
      )}

      {/* NEW: Mobile Background Overlay (Darkens screen when menu is open on phone) */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* SIDEBAR - UPDATED FOR MOBILE SLIDE-OUT */}
      <aside className={`fixed md:sticky top-0 left-0 z-50 w-64 bg-blue-900 text-white flex flex-col p-6 shadow-xl h-screen transition-transform duration-300 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="flex-1">
          {/* Close button inside sidebar for mobile */}
          <div className="flex justify-between items-start mb-10">
            <h1 className="text-lg font-bold leading-tight">
              Barangay <br />
              <span className="text-sm opacity-70 font-normal">Project Tracker</span>
            </h1>
            <button className="md:hidden text-white opacity-70 hover:opacity-100" onClick={() => setIsMobileMenuOpen(false)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          <nav className="space-y-3 text-sm">
            <Link href="/dashboard" className="bg-blue-600 p-3 rounded-xl cursor-pointer font-semibold shadow-sm flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              Dashboard
            </Link>
            <Link href="/upload" className="opacity-80 hover:opacity-100 cursor-pointer p-3 hover:bg-blue-800 rounded-xl transition flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Upload Project
            </Link>
            <Link href="/update" className="opacity-80 hover:opacity-100 cursor-pointer p-3 hover:bg-blue-800 rounded-xl transition flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Update Project
            </Link>
            <Link href="/comments" className="opacity-80 hover:opacity-100 cursor-pointer p-3 hover:bg-blue-800 rounded-xl transition flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              View Comments
            </Link>
            <Link href="/settings" className="opacity-80 hover:opacity-100 cursor-pointer p-3 hover:bg-blue-800 rounded-xl transition flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Settings
            </Link>
          </nav>
        </div>
        
        <div onClick={logout} className="bg-blue-800/80 hover:bg-blue-800 p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-colors shadow-sm group" title="Logout">
          <div className="w-10 h-10 rounded-full bg-teal-400 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {currentUserName ? currentUserName.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="flex-col overflow-hidden flex-1 text-left">
            <span className="block text-sm font-bold text-white truncate">{currentUserName}</span>
            <span className="block text-xs text-blue-300 truncate font-normal">Administrator</span>
          </div>
          <svg className="w-5 h-5 text-blue-300 group-hover:text-white transition-colors flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto relative w-full">
        {/* TOP HEADER - UPDATED WITH HAMBURGER MENU */}
        <div className="bg-white p-4 flex flex-wrap md:flex-nowrap justify-between items-center border-b shadow-sm gap-4 sticky top-0 z-10 w-full">
          
          <div className="flex items-center gap-3 w-full md:w-auto md:flex-1">
            {/* Hamburger Button */}
            <button 
              className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>

            {/* Search Bar */}
            <div className="relative flex-1 max-w-xl text-left">
              <span className="absolute left-3 top-2.5 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </span>
              <input 
                type="text" placeholder="Search projects..." 
                className="bg-gray-50 border border-gray-200 rounded-full pl-10 pr-4 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 w-full md:w-96 transition-all" 
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-6 justify-end w-full md:w-auto">
            <div className="relative cursor-pointer" onClick={handleNotificationClick}>
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              {hasNewUpdate && <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-56 md:w-64 bg-white border border-gray-100 shadow-lg rounded-xl p-3 z-50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 text-left">Recent Updates</p>
                  <div className="bg-blue-50 p-2 rounded-lg text-left">
                    <p className="text-xs text-blue-900 font-bold">{latestNotification || `You have ${total} active projects.`}</p>
                  </div>
                </div>
              )}
            </div>

            <Link href="/settings" className="flex items-center gap-3 border-l pl-4 md:pl-6 cursor-pointer hover:opacity-80 transition-all">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <div className="text-left hidden md:block">
                <p className="text-sm font-bold text-gray-800">{currentUserName}</p>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Administrator</p>
              </div>
            </Link>
          </div>
        </div>

        <div className="p-4 md:p-8">
          <div className="mb-6 md:mb-8 text-left">
            <h2 className="text-2xl font-black text-gray-800">Dashboard</h2>
            <p className="text-gray-400 text-sm font-medium">Overview of all barangay project</p>
          </div>

          {/* You already had this perfect! grid-cols-1 on phone, grid-cols-4 on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
            <Card title="Total Projects" value={total} type="total" />
            <Card title="Ongoing Projects" value={ongoing} type="ongoing" />
            <Card title="Completed Projects" value={completed} type="completed" />
            <Card title="Pending Projects" value={pending} type="pending" />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 overflow-hidden w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h3 className="font-bold text-gray-800 text-lg">Project List</h3>
              
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-auto">
                  <span className="absolute left-3 top-2.5 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </span>
                  <input 
                    type="text" placeholder="Search in table..." 
                    className="bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 w-full md:w-56 transition-all font-medium text-gray-600"
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="relative group w-full md:w-auto">
                  <select 
                    className="bg-gray-50 border border-gray-200 rounded-lg pl-4 pr-10 py-2 text-xs outline-none appearance-none cursor-pointer hover:bg-gray-100 transition-all font-semibold text-gray-600 h-[34px] w-full"
                    value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All Status</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending</option>
                  </select>
                  <span className="absolute right-3 top-2.5 text-gray-400 pointer-events-none text-[8px]">▼</span>
                </div>
              </div>
            </div>

            {loading ? (
              <p className="text-center text-gray-400 py-10 italic">Loading database...</p>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-sm border-collapse min-w-[600px]">
                  <thead>
                    <tr className="text-gray-400 border-b text-left">
                      <th className="pb-3 pl-2 font-bold uppercase text-[10px] tracking-widest">Project Title</th>
                      <th className="pb-3 font-bold uppercase text-[10px] tracking-widest">Category</th>
                      <th className="pb-3 font-bold uppercase text-[10px] tracking-widest">Budget</th>
                      <th className="pb-3 font-bold uppercase text-[10px] tracking-widest">Status</th>
                      <th className="pb-3 text-center font-bold uppercase text-[10px] tracking-widest">Files</th>
                      <th className="pb-3 text-center font-bold uppercase text-[10px] tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-left">
                    {filteredProjects.map((p) => (
                      <tr key={p.id || p._id || p.name} className="hover:bg-blue-50/30 transition-all">
                        <td className="py-4 pl-2 font-bold text-gray-700">{p.name}</td>
                        <td className="py-4 text-gray-500">{p.category}</td>
                        <td className="py-4 font-bold text-gray-700 text-xs">₱{Number(p.budget).toLocaleString()}</td>
                        <td className="py-4">
                          <span className={`px-3 py-1 rounded-full text-[9px] uppercase border font-black tracking-tighter whitespace-nowrap ${getStatusStyle(p.status)}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-4 text-center">
                          {p.files && p.files !== "0" ? (
                            <div className="flex justify-center gap-3">
                              <a href={`/${p.files}`} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-800 hover:scale-110 transition-transform flex items-center justify-center gap-1">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              </a>
                            </div>
                          ) : (
                            <span className="text-gray-200">—</span>
                          )}
                        </td>
                        <td className="py-4">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => setViewingProject(p)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition" title="View">
                              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                            <button onClick={() => setEditingProject({...p})} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition" title="Edit">
                              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => confirmDelete(p)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition" title="Delete">
                              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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

        {/* --- MODALS STAY THE SAME (View, Edit, Delete) --- */}
        {viewingProject && (
          <div className="fixed inset-0 z-[60] flex justify-center items-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl border w-full max-w-lg overflow-hidden relative">
              <div className="bg-blue-900 text-white px-6 py-4 flex justify-between items-center">
                <h3 className="font-bold text-lg">Project Details</h3>
                <button onClick={() => setViewingProject(null)} className="text-white text-2xl hover:opacity-70">&times;</button>
              </div>
              <div className="p-6 space-y-4 text-sm text-gray-700 text-left">
                <div className="grid grid-cols-3 border-b pb-2"><span className="font-semibold text-gray-400">Name:</span><span className="col-span-2 font-bold text-blue-900">{viewingProject.name}</span></div>
                <div className="grid grid-cols-3 border-b pb-2"><span className="font-semibold text-gray-400">Budget:</span><span className="col-span-2 font-mono">₱{Number(viewingProject.budget).toLocaleString()}</span></div>
                <div className="grid grid-cols-3 border-b pb-2"><span className="font-semibold text-gray-400">Status:</span><span className="col-span-2"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusStyle(viewingProject.status)}`}>{viewingProject.status}</span></span></div>
                <div className="grid grid-cols-3 border-b pb-2"><span className="font-semibold text-gray-400">Description:</span><span className="col-span-2 text-gray-600">{viewingProject.description || "No description provided."}</span></div>
              </div>
              <div className="bg-gray-50 px-6 py-4 flex justify-end">
                <button onClick={() => setViewingProject(null)} className="bg-gray-200 px-6 py-2 rounded-xl text-sm font-bold hover:bg-gray-300 transition">Close</button>
              </div>
            </div>
          </div>
        )}

        {editingProject && (
          <div className="fixed inset-0 z-[60] flex justify-center items-center p-4 bg-black/40 backdrop-blur-sm">
            {/* Same editing modal code you had before... */}
            <div className="bg-white rounded-2xl shadow-2xl border w-full max-w-lg overflow-hidden relative">
              <div className="bg-green-700 text-white px-6 py-4 flex justify-between items-center">
                <h3 className="font-bold text-lg">Edit Project Info</h3>
                <button type="button" onClick={() => setEditingProject(null)} className="text-white text-2xl hover:opacity-70">&times;</button>
              </div>
              <form onSubmit={handleSaveEdit}>
                <div className="p-4 md:p-6 space-y-4 text-sm text-gray-700 text-left h-[60vh] md:h-auto overflow-y-auto">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Project Name</label>
                    <input type="text" name="name" value={editingProject.name || ""} onChange={(e) => setEditingProject({...editingProject, name: e.target.value})} required className="w-full border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500 transition bg-gray-50" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1">Category</label>
                      <select name="category" value={editingProject.category || ""} onChange={(e) => setEditingProject({...editingProject, category: e.target.value})} required className="w-full border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500 transition bg-gray-50">
                        <option value="Infrastructure">Infrastructure</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Repair">Repair</option>
                        <option value="Sanitation">Sanitation</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1">Status</label>
                      <select name="status" value={editingProject.status || "Pending"} onChange={(e) => setEditingProject({...editingProject, status: e.target.value})} className="w-full border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500 transition bg-gray-50">
                        <option value="Pending">Pending</option>
                        <option value="Ongoing">Ongoing</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1">Budget (₱)</label>
                      <input type="number" name="budget" value={editingProject.budget || ""} onChange={(e) => setEditingProject({...editingProject, budget: e.target.value})} required className="w-full border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500 transition bg-gray-50" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 mb-1">Duration</label>
                      <input type="text" name="duration" value={editingProject.duration || ""} onChange={(e) => setEditingProject({...editingProject, duration: e.target.value})} required className="w-full border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500 transition bg-gray-50" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Description</label>
                    <textarea name="description" value={editingProject.description || ""} onChange={(e) => setEditingProject({...editingProject, description: e.target.value})} rows={3} className="w-full border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500 transition bg-gray-50" />
                  </div>
                </div>
                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
                  <button type="button" onClick={() => setEditingProject(null)} className="bg-gray-200 px-5 py-2 rounded-xl text-sm font-bold hover:bg-gray-300 transition">Cancel</button>
                  <button type="submit" className="bg-green-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-green-700 transition">
                    Update Project
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {projectToDelete && (
          <div className="fixed inset-0 z-[60] flex justify-center items-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl border w-full max-w-sm overflow-hidden relative text-center p-8">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h3 className="font-black text-xl text-gray-800 mb-2">Delete Project?</h3>
              <p className="text-gray-500 text-sm mb-6">
                Are you sure you want to delete <span className="font-bold text-gray-800">"{projectToDelete.name}"</span>? This action cannot be undone.
              </p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setProjectToDelete(null)} className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-200 transition">
                  Cancel
                </button>
                <button onClick={executeDelete} className="bg-red-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-red-700 transition active:scale-95">
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// MAKE SURE TO KEEP YOUR CARD COMPONENT DOWN HERE!
// function Card({ title, value, type }) { ... }

// Reusable Card Component
function Card({ title, value, type }: { title: string, value: number, type: 'total' | 'ongoing' | 'completed' | 'pending' }) {
  const configs = {
    total: {
      grad: "from-blue-500 to-blue-600",
      icon: <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />,
      subIcon: <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    },
    ongoing: {
      grad: "from-emerald-500 to-emerald-600",
      icon: <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />,
      subIcon: <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    },
    completed: {
      grad: "from-purple-500 to-purple-600",
      icon: <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
      subIcon: <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    },
    pending: {
      grad: "from-orange-500 to-orange-600",
      icon: <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
      subIcon: <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    }
  };
  const config = configs[type];
  return (
    <div className={`bg-gradient-to-br ${config.grad} text-white p-5 rounded-2xl shadow-lg flex flex-col justify-between min-h-[140px] transition-transform hover:scale-[1.03]`}>
      <div className="flex justify-between items-start">
        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{config.icon}</svg>
        </div>
        <svg className="w-4 h-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">{config.subIcon}</svg>
      </div>
      <div className="text-left">
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1">{title}</p>
        <h3 className="text-3xl font-black">{value}</h3>
      </div>
    </div>
  );
}