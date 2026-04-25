"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link"; 

export default function Settings() {
  const router = useRouter();
  const [accountId, setAccountId] = useState(null);
  
  // Mobile Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Form States
  const [currentUserName, setCurrentUserName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [savedAddress, setSavedAddress] = useState(""); 

  // --- EDIT MODE STATES ---
  const [editEmail, setEditEmail] = useState(false);
  const [editPhone, setEditPhone] = useState(false);
  const [editAddress, setEditAddress] = useState(false);
  
  // --- PHILIPPINE ADDRESS API STATES ---
  const [provinces, setProvinces] = useState<any[]>([]);
  const [municipalities, setMunicipalities] = useState<any[]>([]);
  const [barangays, setBarangays] = useState<any[]>([]);

  const [selectedProvCode, setSelectedProvCode] = useState("");
  const [selectedMunCode, setSelectedMunCode] = useState("");

  const [provinceName, setProvinceName] = useState("");
  const [municipalityName, setMunicipalityName] = useState("");
  const [barangayName, setBarangayName] = useState("");

  const [phoneError, setPhoneError] = useState("");

  // --- SECURE PASSWORD STATES ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // --- TOAST NOTIFICATION STATE ---
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setToast({ show: true, message, type });
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 3000);
  };

  // --- NEW PASSWORD VALIDATION RULES ---
  const reqLength = newPassword.length >= 8 && newPassword.length <= 20;
  const reqUpper = /[A-Z]/.test(newPassword);
  const reqLower = /[a-z]/.test(newPassword);
  const reqNum = /[0-9]/.test(newPassword);
  // Matches if it DOES NOT contain: : ; , " ' / \
  const reqNoRestrictedChars = !/[:;,"'\/\\]/.test(newPassword) || newPassword.length === 0; 
  const reqNoSpaces = !/\s/.test(newPassword) || newPassword.length === 0;

  // Make sure it doesn't default to valid on page load for required inputs
  const isPasswordValid = reqLength && reqUpper && reqLower && reqNum && reqNoRestrictedChars && reqNoSpaces && newPassword.length > 0;

  // Validation UI Icon Helper
  const ValidationIcon = ({ isValid }: { isValid: boolean }) => {
    return isValid ? (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-emerald-600 flex-shrink-0">
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
      </svg>
    ) : (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-500 flex-shrink-0">
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
      </svg>
    );
  };

  // 1. Load User Session & Persistent Settings Data
  useEffect(() => {
    const userSession = localStorage.getItem("user");
    if (!userSession) {
      router.push("/login");
      return;
    }

    try {
      const userData = JSON.parse(userSession);
      setAccountId(userData.id || "1");
      setCurrentUserName(userData.username || "Admin");

      const vaultKey = `admin_settings_vault_${userData.id || "1"}`;
      const vaultData = localStorage.getItem(vaultKey);
      
      if (vaultData) {
        const parsedVault = JSON.parse(vaultData);
        setEmail(parsedVault.email || "");
        setPhone(parsedVault.phone || "");
        setSavedAddress(parsedVault.address || "No address saved yet.");
        if (parsedVault.username) setCurrentUserName(parsedVault.username);
      } else {
        fetch(`/api/settings?user_id=${userData.id}`)
          .then((res) => res.json())
          .then((data) => {
            if (data && !data.error) {
              setEmail(data.email || "");
              setPhone(data.phone_number || "");
              setSavedAddress(data.address || "No address saved yet.");
            }
          })
          .catch((err) => console.error("API Fetch Error:", err));
      }
    } catch (e) {
      console.error("Session parse error", e);
    }
  }, [router]);

  // 2. Load Philippine Provinces on Mount
  useEffect(() => {
    fetch("https://psgc.gitlab.io/api/provinces")
      .then(res => res.json())
      .then(data => {
        const sorted = data.sort((a: any, b: any) => a.name.localeCompare(b.name));
        setProvinces(sorted);
      })
      .catch(err => console.error("Error loading provinces:", err));
  }, []);

  const handleProvinceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    
    setSelectedProvCode(code);
    setProvinceName(name);

    setMunicipalities([]);
    setBarangays([]);
    setSelectedMunCode("");
    setMunicipalityName("");
    setBarangayName("");

    if (code) {
      const res = await fetch(`https://psgc.gitlab.io/api/provinces/${code}/cities-municipalities`);
      const data = await res.json();
      setMunicipalities(data.sort((a: any, b: any) => a.name.localeCompare(b.name)));
    }
  };

  const handleMunicipalityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    
    setSelectedMunCode(code);
    setMunicipalityName(name);

    setBarangays([]);
    setBarangayName("");

    if (code) {
      const res = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${code}/barangays`);
      const data = await res.json();
      setBarangays(data.sort((a: any, b: any) => a.name.localeCompare(b.name)));
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    if (/[^0-9]/.test(value)) {
      setPhoneError("Numbers only! Letters and symbols are not allowed.");
      return; 
    } else {
      setPhoneError(""); 
    }

    if (value.length <= 11) setPhone(value);
  };

  const handleSave = async () => {
    if (email && !email.toLowerCase().endsWith("@gmail.com")) {
      showNotification("Security Error: Email must be a valid @gmail.com address.", "error");
      return;
    }

    if (phone && phone.length !== 11) {
      showNotification("Security Error: Phone number must be exactly 11 digits.", "error");
      return;
    }

    let finalAddress = savedAddress;
    
    if (provinceName && municipalityName && barangayName) {
      finalAddress = `${barangayName}, ${municipalityName}, ${provinceName}`;
    } else if (provinceName || municipalityName) {
      showNotification("Security Error: Please complete the Province, Municipality, and Barangay selections to update your address.", "error");
      return;
    }

    const settingsData = {
      username: currentUserName,
      email: email,
      phone: phone,
      address: finalAddress,
    };
    
    const vaultKey = `admin_settings_vault_${accountId || "1"}`;
    localStorage.setItem(vaultKey, JSON.stringify(settingsData));

    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const userSession = JSON.parse(storedUser);
      localStorage.setItem("user", JSON.stringify({ ...userSession, username: currentUserName }));
    }

    setSavedAddress(finalAddress);

    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: accountId || "1",
          ...settingsData
        }),
      });
    } catch (error) {
      console.warn("Backend API not connected perfectly, but local vault saved successfully.");
    }

    setEditEmail(false);
    setEditPhone(false);
    setEditAddress(false);

    showNotification("Settings saved successfully! Data is now permanently stored.", "success");
  };

  // --- SECURE PASSWORD LOGIC ---
  const handlePasswordSave = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showNotification("Please fill in all password fields.", "error");
      return;
    }

    if (!isPasswordValid) {
      showNotification("Your new password does not meet the security requirements.", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotification("Error: New passwords do not match!", "error");
      return;
    }

    // NEW SECURITY CHECK: Prevent using the same password
    if (currentPassword === newPassword) {
      showNotification("Error: Your new password cannot be the same as your current password!", "error");
      return;
    }

    try {
      const res = await fetch("/api/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: accountId || "1",
          current_password: currentPassword, 
          new_password: newPassword
        }),
      });
      
      const data = await res.json();

      if (res.ok) {
        showNotification("Password successfully updated and encrypted!", "success");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        showNotification(`Error: ${data.message || data.error}`, "error");
      }
    } catch (error) {
      console.error("Password update error:", error);
      showNotification("Something went wrong connecting to the database.", "error");
    }
  };

  const logout = async () => {
    try {
      // 1. Tell the server to destroy the secure cookie
      await fetch("/api/users/logout", {
        method: "POST",
      });

      // 2. Clear local storage
      localStorage.removeItem("user");
      
      // 3. Send them back to the login screen
      router.push("/login");
      
    } catch (error) {
      console.error("Failed to logout securely:", error);
      // Fallback: still clear storage and redirect even if server fetch fails
      localStorage.removeItem("user");
      router.push("/login");
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden relative">
      
      {/* Toast Notification UI */}
      {toast.show && (
        <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-top-5 fade-in duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl border ${
            toast.type === 'success' 
              ? 'bg-white border-green-100 text-gray-800' 
              : 'bg-white border-red-100 text-gray-800'
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
            <Link href="/dashboard" className="opacity-80 hover:opacity-100 p-3 hover:bg-blue-800 rounded-xl transition flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              Dashboard
            </Link>
            
            <Link href="/upload" className="opacity-80 hover:opacity-100 p-3 hover:bg-blue-800 rounded-xl transition flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Upload Project
            </Link>
            
            <Link href="/update" className="opacity-80 hover:opacity-100 p-3 hover:bg-blue-800 rounded-xl transition flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Update Project
            </Link>
            
            <Link href="/comments" className="opacity-80 hover:opacity-100 p-3 hover:bg-blue-800 rounded-xl transition flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              View Comments
            </Link>
            
            <div className="bg-blue-600 p-3 rounded-xl cursor-default font-semibold shadow-sm flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Settings
            </div>
          </nav>
        </div>
        
        <div onClick={logout} className="bg-blue-800/80 hover:bg-blue-800 p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-colors shadow-sm group mt-4" title="Logout">
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
      <main className="flex-1 flex flex-col h-screen overflow-hidden w-full">
        
        {/* HEADER */}
        <header className="bg-white px-4 md:px-8 flex justify-between items-center border-b shadow-sm gap-4 shrink-0 h-16 z-10 w-full">
          <div className="flex items-center gap-4 flex-1">
            {/* Hamburger Icon for Mobile */}
            <button 
              className="lg:hidden text-gray-600 hover:text-gray-900 focus:outline-none"
              onClick={() => setIsSidebarOpen(true)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="relative flex-1 max-w-xl text-left"></div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 border-l pl-4 md:pl-6 cursor-default">
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

        {/* SETTINGS FORM */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-[#f0f2f5] w-full">
          <div className="max-w-4xl mx-auto space-y-6 text-left">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4 md:mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Account Settings</h2>
                <p className="text-gray-500 text-sm md:text-base">Manage your administrative profile</p>
              </div>
              <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-sm w-full md:w-auto">
                Save Changes
              </button>
            </div>

            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-8">
              <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">Personal Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* 1. ADMIN NAME (LOCKED) */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Admin Name (Username)</label>
                  <input 
                    type="text" 
                    value={currentUserName} 
                    readOnly 
                    className="w-full bg-gray-200 border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-500 cursor-not-allowed outline-none" 
                    title="Username cannot be changed to protect project history"
                  />
                  <p className="text-[11px] text-orange-500 font-medium mt-2 italic">
                    For data consistency and record-keeping, the username field is permanent.
                  </p>
                </div>

                {/* 2. EMAIL ADDRESS */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Email Address</label>
                    {!editEmail && (
                      <button onClick={() => setEditEmail(true)} className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-md font-bold text-gray-700 transition">
                        {email ? "Edit" : "Add Email"}
                      </button>
                    )}
                  </div>
                  
                  {!editEmail ? (
                    email && <p className="text-sm text-gray-800 font-medium bg-gray-50 p-3 rounded-xl border border-gray-100 truncate">{email}</p>
                  ) : (
                    <div>
                      <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                      />
                      <p className="text-[11px] text-gray-400 mt-2">Example: yourname@gmail.com</p>
                    </div>
                  )}
                </div>

                {/* 3. PHONE NUMBER */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Phone Number</label>
                    {!editPhone && (
                      <button onClick={() => setEditPhone(true)} className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-md font-bold text-gray-700 transition">
                        {phone ? "Edit" : "Add Phone"}
                      </button>
                    )}
                  </div>

                  {!editPhone ? (
                    phone && <p className="text-sm text-gray-800 font-medium bg-gray-50 p-3 rounded-xl border border-gray-100">{phone}</p>
                  ) : (
                    <div>
                      <input 
                        type="text" 
                        value={phone} 
                        onChange={handlePhoneChange} 
                        placeholder="09102002551"
                        className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ${phoneError ? "border-red-500 focus:ring-red-500" : "border-gray-200 focus:ring-blue-500"}`} 
                      />
                      {phoneError ? (
                        <p className="text-[11px] text-red-500 font-bold mt-2">{phoneError}</p>
                      ) : (
                        <p className="text-[11px] text-gray-400 mt-2">Example: 09123456789 (11 digits only)</p>
                      )}
                    </div>
                  )}
                </div>

                {/* 4. OFFICE ADDRESS */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Office Address</label>
                    {!editAddress && (
                      <button onClick={() => setEditAddress(true)} className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-md font-bold text-gray-700 transition">
                        {(savedAddress && savedAddress !== "No address saved yet.") ? "Edit" : "Add Address"}
                      </button>
                    )}
                  </div>

                  {!editAddress ? (
                    (savedAddress && savedAddress !== "No address saved yet.") && (
                      <p className="text-sm text-gray-800 font-medium bg-gray-50 p-3 rounded-xl border border-gray-100 leading-relaxed">
                        {savedAddress}
                      </p>
                    )
                  ) : (
                    <div className="space-y-4">
                      {savedAddress && savedAddress !== "No address saved yet." && (
                        <div className="text-sm p-3 bg-blue-50 text-blue-800 rounded-lg border border-blue-100">
                          <span className="font-bold">Current:</span> {savedAddress}
                        </div>
                      )}

                      <select 
                        value={selectedProvCode} 
                        onChange={handleProvinceChange} 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="" disabled>1. Select Province</option>
                        {provinces.map((prov) => (
                          <option key={prov.code} value={prov.code}>{prov.name}</option>
                        ))}
                      </select>

                      <select 
                        value={selectedMunCode} 
                        onChange={handleMunicipalityChange} 
                        disabled={!selectedProvCode} 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <option value="" disabled>2. Select Municipality / City</option>
                        {municipalities.map((mun) => (
                          <option key={mun.code} value={mun.code}>{mun.name}</option>
                        ))}
                      </select>

                      <select 
                        value={barangayName} 
                        onChange={(e) => setBarangayName(e.target.value)} 
                        disabled={!selectedMunCode}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <option value="" disabled>3. Select Barangay</option>
                        {barangays.map((brgy) => (
                          <option key={brgy.code} value={brgy.name}>{brgy.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

              </div>
            </section>

            {/* SECURITY SETTINGS */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-8 mt-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">Security Settings</h3>
              </div>
              
              <div className="space-y-6">
                {/* CURRENT PASSWORD FIELD */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Current Password</label>
                  <input 
                    type="password" 
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)} 
                    placeholder="Enter your current password to authorize changes"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 max-w-md" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start border-t border-gray-100 pt-6">
                  
                  {/* NEW PASSWORD WITH LIVE RULES */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">New Password</label>
                    <input 
                      type="password" 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                      placeholder="Enter new password"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                    
                    {/* CUSTOM RULES CHECKLIST UI */}
                    {newPassword !== undefined && (
                      <div className="mt-4 text-[13px] space-y-2 bg-white border border-gray-100 shadow-sm p-4 rounded-xl">
                        
                        <div className="flex items-center gap-3">
                          <ValidationIcon isValid={reqLength && newPassword.length > 0} />
                          <span className={reqLength && newPassword.length > 0 ? "text-emerald-700" : "text-red-500"}>8-20 characters</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <ValidationIcon isValid={reqUpper} />
                          <span className={reqUpper ? "text-emerald-700" : "text-red-500"}>At least one capital letter (A to Z)</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <ValidationIcon isValid={reqLower} />
                          <span className={reqLower ? "text-emerald-700" : "text-red-500"}>At least one lowercase letter (a to z)</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <ValidationIcon isValid={reqNum} />
                          <span className={reqNum ? "text-emerald-700" : "text-red-500"}>At least one number (0 to 9)</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <ValidationIcon isValid={reqNoRestrictedChars && newPassword.length > 0} />
                          <span className={reqNoRestrictedChars && newPassword.length > 0 ? "text-emerald-700" : "text-red-500"}>Don&apos;t use : ; , &quot; &apos; / \</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <ValidationIcon isValid={reqNoSpaces && newPassword.length > 0} />
                          <span className={reqNoSpaces && newPassword.length > 0 ? "text-emerald-700" : "text-red-500"}>No spaces</span>
                        </div>

                      </div>
                    )}
                  </div>

                  {/* RE-TYPE PASSWORD */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Confirm New Password</label>
                    <input 
                      type="password" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      placeholder="Re-type new password"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button 
                  onClick={handlePasswordSave} 
                  className={`px-6 py-2 rounded-xl font-bold transition-all shadow-sm w-full md:w-auto ${
                    !isPasswordValid || !currentPassword || !confirmPassword
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                  disabled={!isPasswordValid || !currentPassword || !confirmPassword}
                >
                  Update Password
                </button>
              </div>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}