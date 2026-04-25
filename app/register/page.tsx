"use client";

import React, { useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import Link from "next/link";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // --- LIVE PASSWORD SECURITY CHECKS ---
  const rules = {
    length: password.length >= 8 && password.length <= 20,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    // Must have length > 0 and NOT contain the forbidden characters
    noForbidden: password.length > 0 && !/[:;,"'/\\]/.test(password),
    // Must have length > 0 and NOT contain spaces
    noSpaces: password.length > 0 && !/\s/.test(password),
  };

  // True only if every single rule is met
  const isPasswordValid = Object.values(rules).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // SIMPLE VALIDATION
    if (!username || !password) {
      toast.error("Please fill all fields");
      return;
    }

    // EXTRA SECURITY: Block submission if bypassing disabled button
    if (!isPasswordValid) {
      toast.error("Please ensure your password meets all security requirements.");
      return;
    }

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        }, //convert into json format ang input
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message);
      } else {
        toast.success(data.message);
        setUsername("");
        setPassword("");
      }
    } catch {
      toast.error("Request failed");
    }
  };

  // Helper Component for the Checklist UI
  const RuleItem = ({ isValid, text }: { isValid: boolean, text: string }) => (
    <div className={`flex items-center gap-2 text-xs font-medium transition-colors ${isValid ? "text-green-600" : "text-red-500"}`}>
      {isValid ? (
        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
      ) : (
        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
      )}
      <span>{text}</span>
    </div>
  );

  return ( //ui design
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 relative">
      
      {/* BACK BUTTON */}
      <Link 
        href="/" 
        className="absolute top-6 left-6 text-sm font-medium text-gray-500 hover:text-blue-600 flex items-center gap-2 transition"
      >
        <span>←</span> Back to Home
      </Link>

      <Toaster position="top-right" />

      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg">
        
        {/* Header */}
        <h1 className="text-2xl font-bold text-gray-800 text-center">
          Create Account
        </h1>
        <p className="text-gray-500 text-center mt-2 mb-6 text-sm">
          Register to access the system
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="text-sm text-gray-600">Username</label>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full mt-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            
            {/* LIVE CHECKLIST */}
            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-1.5">
              <RuleItem isValid={rules.length} text="8-20 characters" />
              <RuleItem isValid={rules.uppercase} text="At least one capital letter (A to Z)" />
              <RuleItem isValid={rules.lowercase} text="At least one lowercase letter (a to z)" />
              <RuleItem isValid={rules.number} text="At least one number (0 to 9)" />
              <RuleItem isValid={rules.noForbidden} text={`Don't use : ; , " ' / \\`} />
              <RuleItem isValid={rules.noSpaces} text="No spaces" />
            </div>
          </div>

          <button
            type="submit"
            disabled={!isPasswordValid || !username}
            className={`w-full py-2.5 rounded-lg font-medium transition-all ${
              isPasswordValid && username
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md" 
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Sign Up
          </button>
        </form>

        {/* Footer */}
        <p className="text-sm text-gray-500 text-center mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}