import React from "react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen bg-white overflow-hidden">
      
      {/* LEFT SIDE */}
      <div className="hidden lg:flex w-1/2 relative bg-[#1e40af]">
        <img
          src="https://images.unsplash.com/photo-1577412647305-991150c7d163?auto=format&fit=crop&q=80"
          alt="Barangay"
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60"
        />
        <div className="relative z-10 flex flex-col justify-center p-20 text-white">
          <h2 className="text-5xl font-extrabold leading-tight mb-6 animate-in slide-in-from-left duration-700">
            BARANGAY <br />
            PROJECT TRACKER
          </h2>
          <p className="text-lg text-blue-100/80 max-w-md">
            Empowering the community through transparency and efficient project management.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-gray-100">
        
        {/* CARD */}
        <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md text-center">
          
          {/* Title */}
          <h1 className="text-3xl font-extrabold text-blue-900 mb-3">
            Barangay Project Tracker
          </h1>

          {/* Subtitle */}
          <p className="text-gray-500 mb-8">
            Manage and monitor community development projects
          </p>

          {/* BUTTONS */}
          <div className="space-y-4">
            
            {/* Login */}
            <Link
              href="/login"
              className="w-full bg-blue-700 hover:bg-blue-800 text-white py-3 rounded-xl font-semibold shadow-md transition block"
            >
              Login
            </Link>

            {/* Create Account */}
            <Link
              href="/register"
              className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold shadow-md transition block"
            >
              Create Account
            </Link>

            {/* UPDATED: View Public Projects */}
            <Link 
              href="/view"
              className="w-full bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-xl font-semibold shadow-md transition block"
            >
              View Public Projects
            </Link>
          </div>

          {/* Footer */}
          <p className="text-xs text-gray-400 mt-8">
            © 2026 Barangay Project Tracker
          </p>
        </div>
      </div>
    </main>
  );
}