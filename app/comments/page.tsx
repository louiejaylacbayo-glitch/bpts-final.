"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// TypeScript Interfaces
interface Comment {
  comment_id: string | number;
  project_id: string | number;
  project_name?: string;
  resident_name?: string;
  comment_text: string;
  date_submitted: string;
  admin_reply?: string;
}

interface UserSession {
  username?: string;
  name?: string;
  role?: string;
}

const timeAgo = (dateString: string) => {
  if (!dateString) return "Just now";
  const now = new Date();
  const past = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  return `${Math.floor(diffInHours / 24)} days ago`;
};

export default function ViewComments() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="p-10 text-center text-xs font-bold uppercase tracking-widest text-gray-400 animate-pulse">
          Loading Feed...
        </div>
      </div>
    }>
      <CommentsContent />
    </Suspense>
  );
}

function CommentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdFromUrl = searchParams.get("id");

  // State Declarations
  const [currentUserName, setCurrentUserName] = useState("Admin");
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [replyText, setReplyText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Mobile Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Notification & Alert States
  const [hasNewUpdate, setHasNewUpdate] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [latestNotification, setLatestNotification] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // Session Check
  useEffect(() => {
    const userSession = localStorage.getItem("user");
    if (userSession) {
      try {
        const userData: UserSession = JSON.parse(userSession);
        setCurrentUserName(userData.username || userData.name || "Admin");
      } catch (e) {
        setCurrentUserName("Admin");
      }
    } else {
      router.push("/login");
    }
  }, [router]);

  const fetchComments = useCallback(async () => {
    if (!currentUserName || currentUserName === "User") return;
    try {
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/comments?createdBy=${currentUserName}&t=${timestamp}`, {
        cache: 'no-store'
      }); 
      
      if (res.ok) {
        const data: Comment[] = await res.json();
        const vaultData = localStorage.getItem("comments_vault");
        const oldComments: Comment[] | null = vaultData ? JSON.parse(vaultData) : null;

        if (oldComments !== null) {
          const oldCommentIds = oldComments.map((c) => c.comment_id);
          const brandNewComments = data.filter((c) => !oldCommentIds.includes(c.comment_id));

          if (brandNewComments.length > 0) {
            const newlyAdded = brandNewComments[0];
            setLatestNotification(`${newlyAdded.resident_name || "A resident"} commented on ${newlyAdded.project_name || "a project"}`);
            setHasNewUpdate(true);
          }
        }

        localStorage.setItem("comments_vault", JSON.stringify(data));
        
        const filtered = projectIdFromUrl 
          ? data.filter((c) => String(c.project_id) === String(projectIdFromUrl))
          : data;

        setComments(filtered);
        
        setSelectedComment((currentlySelected) => {
          if (!currentlySelected && filtered.length > 0) return filtered[0];
          return currentlySelected;
        });
      }
    } catch (error) {
      console.error("Failed to fetch comments", error);
    } finally {
      setLoading(false);
    }
  }, [currentUserName, projectIdFromUrl]);

  useEffect(() => {
    fetchComments();
    const interval = setInterval(fetchComments, 5000); 
    return () => clearInterval(interval);
  }, [fetchComments]);

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    setHasNewUpdate(false);
  };

  const handleSendReply = async () => {
    if (!replyText || !selectedComment) return;
    try {
      const res = await fetch("/api/comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          comment_id: selectedComment.comment_id, 
          admin_reply: replyText 
        }),
      });
      if (res.ok) {
        setToastMessage("Reply sent successfully!");
        setTimeout(() => setToastMessage(""), 3000); 
        
        setReplyText("");
        fetchComments(); 
      }
    } catch (error) {
      console.error("Error sending reply.", error);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/users/logout", { method: "POST" });
      localStorage.removeItem("user");
      localStorage.removeItem("comments_vault"); 
      router.push("/login");
    } catch (error) {
      console.error("Failed to logout securely:", error);
      localStorage.removeItem("user");
      localStorage.removeItem("comments_vault"); 
      router.push("/login");
    }
  };

  const filteredComments = comments.filter((c) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (c.resident_name?.toLowerCase().includes(searchLower)) ||
      (c.comment_text?.toLowerCase().includes(searchLower))
    );
  });

  const newFeedbacksCount = filteredComments.filter(c => !c.admin_reply).length;

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden relative">
      
      {/* CUSTOM ALERT TOAST */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-white border-l-4 border-green-500 shadow-xl rounded-md p-4 flex items-center gap-3 transition-all duration-300 transform translate-y-0 opacity-100">
          <div className="bg-green-100 rounded-full p-1 text-green-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <p className="text-sm font-semibold text-gray-800">{toastMessage}</p>
        </div>
      )}

      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* RESPONSIVE SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out w-64 bg-blue-900 text-white flex flex-col p-6 shadow-xl h-full flex-shrink-0 z-50`}>
        <div className="flex-1 text-left">
          <div className="flex justify-between items-center mb-10">
            <h1 className="text-lg font-bold leading-tight">
              Barangay <br />
              <span className="text-sm opacity-70 font-normal">Project Tracker</span>
            </h1>
            {/* Close button for mobile */}
            <button className="lg:hidden text-white/70 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <nav className="space-y-3 text-sm">
            <div onClick={() => router.push("/dashboard")} className="opacity-80 hover:opacity-100 cursor-pointer p-3 hover:bg-blue-800 rounded-xl transition flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              Dashboard
            </div>
            <div onClick={() => router.push("/upload")} className="opacity-80 hover:opacity-100 cursor-pointer p-3 hover:bg-blue-800 rounded-xl transition flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Upload Project
            </div>
            <div onClick={() => router.push("/update")} className="opacity-80 hover:opacity-100 cursor-pointer p-3 hover:bg-blue-800 rounded-xl transition flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Update Project
            </div>
            <div className="bg-blue-600 p-3 rounded-xl cursor-default font-semibold shadow-sm flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              View Comments
            </div>
            <div onClick={() => router.push("/settings")} className="opacity-80 hover:opacity-100 cursor-pointer p-3 hover:bg-blue-800 rounded-xl transition flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Settings
            </div>
          </nav>
        </div>
        
        <div onClick={logout} className="bg-blue-800/80 hover:bg-blue-800 p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-colors shadow-sm mt-4">
          <div className="w-10 h-10 rounded-full bg-teal-400 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 uppercase">
            {currentUserName ? currentUserName.charAt(0) : 'A'}
          </div>
          <div className="flex-col overflow-hidden flex-1 text-left">
            <span className="block text-sm font-bold text-white truncate">{currentUserName}</span>
            <span className="block text-xs text-blue-300 truncate font-normal">Administrator</span>
          </div>
          <div className="text-white/80 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden w-full">
        {/* HEADER */}
        <header className="bg-white h-16 flex justify-between items-center px-4 md:px-8 border-b shadow-sm shrink-0 gap-4 z-10 w-full">
          
          <div className="flex items-center gap-4 flex-1">
            {/* Hamburger Icon for Mobile */}
            <button 
              className="lg:hidden text-gray-600 hover:text-gray-900 focus:outline-none"
              onClick={() => setIsSidebarOpen(true)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>

            {/* Search Bar */}
            <div className="relative flex-1 max-w-xl">
              <span className="absolute left-3 top-2.5 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </span>
              <input 
                type="text" 
                placeholder="Search comments..." 
                className="bg-gray-50 border border-gray-200 rounded-full pl-10 pr-4 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 w-full md:w-96 transition-all" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            {/* Notification Bell */}
            <div className="relative cursor-pointer" onClick={handleNotificationClick}>
              <svg className="w-6 h-6 text-gray-500 hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {hasNewUpdate && (
                <span className="absolute -top-1 -right-1 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-white"></span>
              )}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-64 md:w-72 bg-white border border-gray-100 shadow-2xl rounded-2xl p-4 z-50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Recent Activity</p>
                  <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-xl text-left">
                    <p className="text-xs text-blue-900 font-bold leading-snug">{latestNotification || `You are all caught up!`}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Section */}
            <div 
              onClick={() => router.push("/settings")} 
              className="flex items-center gap-3 pl-4 md:pl-6 border-l border-gray-100 cursor-pointer hover:opacity-80 transition-all"
            >
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm uppercase">
                {currentUserName ? currentUserName.charAt(0) : 'A'}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-bold text-gray-800 leading-tight">{currentUserName}</p>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Administrator</p>
              </div>
            </div>
          </div>
        </header>

        {/* FEED CONTENT - Stacked on Mobile, Side-by-Side on Desktop */}
        <div className="flex-1 p-4 md:p-8 flex flex-col lg:flex-row gap-6 overflow-hidden bg-[#f0f2f5] w-full">
          
          {/* LEFT PANEL: Comments Feed */}
          <div className="w-full lg:w-[400px] flex flex-col flex-shrink-0 h-1/2 lg:h-full">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-4 md:p-5 rounded-t-2xl shadow-sm z-10 shrink-0 text-left">
              <h2 className="font-semibold text-lg text-white">All Comments</h2>
              <p className="text-sm text-white/80 mt-0.5">{newFeedbacksCount} new feedbacks</p>
            </div>

            <div className="flex-1 bg-gray-100/50 rounded-b-2xl p-4 overflow-y-auto space-y-3 no-scrollbar shadow-inner border border-gray-200 border-t-0">
              {loading ? (
                 <div className="text-center py-10 text-sm text-gray-400">Loading Feed...</div>
              ) : filteredComments.map((c) => (
                <div key={c.comment_id} className="flex flex-col gap-2">
                  <div 
                    onClick={() => setSelectedComment(c)}
                    className={`p-4 rounded-xl shadow-sm border transition-all cursor-pointer text-left ${
                      selectedComment?.comment_id === c.comment_id 
                        ? "bg-white border-blue-400 ring-1 ring-blue-400" 
                        : "bg-white border-gray-100 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#10b981] text-white flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-gray-800 truncate">{c.resident_name || "Anonymous"}</span>
                          <span className="bg-gray-100 text-gray-600 text-[10px] font-medium px-2 py-0.5 rounded-full">Community</span>
                        </div>
                        {c.project_name && (
                          <p className="text-[11px] text-blue-600 font-bold mb-1 uppercase tracking-wide">Project: {c.project_name}</p>
                        )}
                        <p className="text-sm text-gray-600 leading-relaxed mb-2">{c.comment_text}</p>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {timeAgo(c.date_submitted)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {c.admin_reply && (
                    <div className="p-3 md:p-4 rounded-xl shadow-sm border border-blue-100 bg-[#f0f4f8] ml-6 text-left">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-gray-800 truncate">{currentUserName}</span>
                            <span className="bg-blue-100 text-blue-700 text-[10px] font-medium px-2 py-0.5 rounded-full">Admin</span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed mb-2">{c.admin_reply}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT PANEL: Reply Area */}
          <div className="w-full lg:flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6 flex flex-col h-1/2 lg:h-full">
            {selectedComment ? (
              <div className="flex flex-col h-full">
                <div className="bg-[#f8f9fa] rounded-2xl p-3 md:p-5 border border-gray-100 flex gap-3 md:gap-4 flex-1 mb-4 overflow-hidden">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <textarea 
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Write your reply to ${selectedComment.resident_name || "Community"} regarding ${selectedComment.project_name || "this project"}...`}
                    className="flex-1 bg-transparent border-none outline-none resize-none text-gray-700 placeholder-gray-400 text-sm md:text-base pt-2 h-full"
                  />
                </div>
                <div className="mt-auto flex justify-end shrink-0">
                  <button 
                    onClick={handleSendReply}
                    className="bg-[#2a3b7c] hover:bg-[#1e2a5e] text-white px-5 md:px-6 py-2 md:py-2.5 rounded-xl text-sm md:text-base font-medium shadow-md transition-all active:scale-95 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    Send Reply
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400 flex-col gap-3">
                <svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                <p className="text-sm md:text-base">Select a comment to respond</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}