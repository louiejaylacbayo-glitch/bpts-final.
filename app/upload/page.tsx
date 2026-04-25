"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UploadProject() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentUserName, setCurrentUserName] = useState("Loading...");
  
  // Mobile Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Toast Notification State
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  
  const [formData, setFormData] = useState({
    name: "",
    category: "Maintenance",
    budget: "",
    duration: "",
    description: "",
  });

  // Helper to show the side notification
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3000);
  };

  useEffect(() => {
    const userSession = localStorage.getItem("user");
    if (userSession) {
      try {
        const userData = JSON.parse(userSession);
        setCurrentUserName(userData.username || "Unknown Admin");
      } catch (e) {
        setCurrentUserName("Unknown Admin");
      }
    } else {
      router.push("/login");
    }
  }, [router]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast("File is too large. Maximum size is 10MB.", "error");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = ''; 
      return;
    }
    
    const allowedTypes = [
      "application/pdf", 
      "application/msword", 
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
      "image/jpeg", 
      "image/png"
    ];
    
    if (!allowedTypes.includes(file.type)) {
      showToast("Invalid file type. Only PDF, DOC, JPG, and PNG.", "error");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setToast({ ...toast, show: false }); // Hide any existing toast

    if (formData.name.trim().length < 5) {
      return showToast("Project title must be at least 5 characters long.", "error");
    }
    if (Number(formData.budget) <= 0) {
      return showToast("Budget must be a valid number greater than 0.", "error");
    }

    const userSession = localStorage.getItem("user");
    let usernameForDB = "Unknown Admin";

    if (userSession) {
      try {
        const userData = JSON.parse(userSession);
        usernameForDB = userData.username || "Unknown Admin";
      } catch (e) {
        console.error("Failed to parse user session");
      }
    }

    const data = new FormData();
    data.append("name", formData.name);
    data.append("category", formData.category);
    data.append("budget", formData.budget);
    data.append("duration", formData.duration);
    data.append("description", formData.description);
    data.append("created_by", usernameForDB); 

    if (selectedFile) {
      data.append("file", selectedFile);
    }

    try {
      const res = await fetch("/api/project", {
        method: "POST",
        body: data, 
      });

      if (res.ok) {
        showToast("Project saved successfully!", "success");
        
        // Clear form
        setFormData({ name: "", category: "Maintenance", budget: "", duration: "", description: "" });
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        
        // Redirect after delay
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } else {
        const err = await res.json();
        showToast("Server Error: " + err.error, "error");
      }
    } catch (error) {
      showToast("Failed to connect to server.", "error");
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-800 relative">
      
      {/* SIDE TOAST NOTIFICATION */}
      {toast.show && (
        <div className={`fixed top-8 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl transition-all duration-300 ease-in-out border ${
          toast.type === "success" 
            ? "bg-white border-green-500 text-green-700" 
            : "bg-white border-red-500 text-red-700"
        }`}>
          <span className="text-xl">{toast.type === "success" ? "✅" : "⚠️"}</span>
          <p className="font-bold text-sm">{toast.message}</p>
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
            
            <div onClick={() => router.push("/upload")} className="bg-blue-600 p-3 rounded-xl cursor-default font-semibold shadow-sm flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              <span className="whitespace-nowrap">Upload Project</span>
            </div>
            
            <div onClick={() => router.push("/update")} className="opacity-80 hover:opacity-100 cursor-pointer p-3 hover:bg-blue-800 rounded-xl transition flex items-center gap-3">
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
            <span className="block text-sm font-bold text-white truncate whitespace-nowrap">{currentUserName}</span>
            <span className="block text-xs text-blue-300 truncate font-normal whitespace-nowrap">Administrator</span>
          </div>
          <div className="text-white/80 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </div>
        </div>
      </aside>

      <div className="flex-1 overflow-x-hidden flex flex-col w-full">
        {/* TOP BAR */}
        <div className="bg-white p-4 flex justify-between md:justify-end items-center border-b shadow-sm sticky top-0 z-20">
          {/* Hamburger Menu (Mobile Only) */}
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden p-2 text-gray-600 hover:text-blue-900 focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>

          <div onClick={() => router.push("/settings")} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-all">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm">
              {currentUserName.charAt(0).toUpperCase()}
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{currentUserName}</p>
              <p className="text-xs text-gray-400">Administrator</p>
            </div>
          </div>
        </div>

        {/* FORM CONTENT */}
        <div className="p-4 md:p-8 max-w-4xl mx-auto w-full">
          <button onClick={() => router.back()} className="text-blue-600 text-sm font-bold mb-4 flex items-center gap-1 hover:underline">
            ← Go Back
          </button>
          
          <h2 className="text-2xl font-bold text-blue-900">Upload New Project</h2>
          <p className="text-gray-500 mb-8 font-medium">Add a new infrastructure project for <span className="text-blue-600">{currentUserName}</span></p>

          <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-2xl shadow-md border border-gray-100 space-y-6">
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Project Title</label>
              <input 
                type="text" 
                value={formData.name}
                placeholder="Enter project title" 
                required
                className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 transition"
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
              <p className="text-xs text-gray-500 mt-1">Must be at least 5 characters long and clearly state the project name.</p>
            </div>

           <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Project Category</label>
              <select 
                className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 transition"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              >
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
              <p className="text-xs text-gray-500 mt-1">Select the classification that best fits this project.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Budget (₱)</label>
                <input 
                  type="number" 
                  value={formData.budget}
                  min="1"
                  placeholder="500000" 
                  required
                  className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 transition"
                  onChange={(e) => setFormData({...formData, budget: e.target.value})}
                />
                <p className="text-xs text-gray-500 mt-1">Enter the total budget without commas (e.g., 50000).</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Duration</label>
                <input 
                  type="text" 
                  value={formData.duration}
                  placeholder="3 months" 
                  required
                  className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 transition"
                  onChange={(e) => setFormData({...formData, duration: e.target.value})}
                />
                <p className="text-xs text-gray-500 mt-1">Estimated time to complete (e.g., '45 days', '3 months').</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Supporting Files</label>
              
              <div className="mb-3 flex gap-2 items-center bg-blue-50 p-3 rounded-lg border border-blue-100">
                <span className="text-blue-600 text-lg">ℹ️</span>
                <p className="text-xs text-blue-800 leading-tight">
                  <strong>Requirements:</strong> Only PDF, Word Docs, or Images (JPG/PNG). <br />
                  The file must be <strong>smaller than 10MB</strong>.
                </p>
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".pdf, .doc, .docx, .png, .jpg, .jpeg"
                onChange={handleFileChange} 
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 md:p-8 flex flex-col items-center justify-center transition group cursor-pointer ${
                  selectedFile ? 'border-blue-500 bg-blue-50' : 'border-gray-200 text-gray-400 hover:bg-blue-50 hover:border-blue-300'
                }`}
              >
                <span className={`text-4xl mb-2 transition ${selectedFile ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {selectedFile ? '📄' : '📤'}
                </span>
                <p className={`text-sm font-semibold text-center ${selectedFile ? 'text-blue-700' : 'group-hover:text-blue-600'}`}>
                  {selectedFile ? selectedFile.name : "Click to select a file"}
                </p>
                {selectedFile && (
                  <p className="text-xs text-blue-500 mt-1">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB — Ready to upload
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Project Description</label>
              <textarea 
                rows={4} 
                value={formData.description}
                placeholder="Provide detailed description..."
                className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 transition"
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              ></textarea>
              <p className="text-xs text-gray-500 mt-1">Provide a clear summary of the project goals, location, and key details.</p>
            </div>

            <div className="flex justify-end pt-4">
              <button type="submit" className="w-full md:w-auto bg-blue-600 text-white px-10 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg active:scale-95">
                Save Project
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}