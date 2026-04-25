"use client";

import React, { useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import Link from "next/link";
import { useRouter } from "next/navigation"; 

export default function Login() {
  const [username, setUsername] = useState(""); 
  const [password, setPassword] = useState(""); 
  const [loading, setLoading] = useState(false); 
  const router = useRouter(); 

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error("Please fill all fields");
      return;
    }

    setLoading(true); 
    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Login failed");
      } else {
        toast.success(data.message || "Login successful");

        // 🔥 THE FIX: We ensure the ID from the database is captured.
        // This spreads the data from the API and ensures 'id' is present.
        const userData = data.user || data;
        
        const sessionData = {
          id: userData.id, // This is the crucial 7, 8, or 9 from your SQL
          username: username,
        };
        
        localStorage.setItem("user", JSON.stringify(sessionData));

        router.push("/dashboard");

        setUsername("");
        setPassword("");
      }
    } catch (error) {
      console.error(error);
      toast.error("Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 relative">
      
      {/* BACK TO HOME BUTTON */}
      <Link 
        href="/" 
        className="absolute top-6 left-6 text-sm font-medium text-gray-500 hover:text-blue-600 flex items-center gap-2 transition"
      >
        <span>←</span> Back to Home
      </Link>

      <Toaster position="top-right" />

      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold text-gray-800 text-center">
          Welcome Back
        </h1>
        <p className="text-gray-500 text-center mt-2 mb-6 text-sm">
          Login to your account
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left">
            <label className="text-sm text-gray-600 font-bold">Username</label>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full mt-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-700"
            />
          </div>

          <div className="text-left">
            <label className="text-sm text-gray-600 font-bold">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-700"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition mt-4 ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-6">
          Don’t have an account?{" "}
          <Link href="/register" className="text-blue-600 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}