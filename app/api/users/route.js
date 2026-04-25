import { NextResponse } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcryptjs"; // 1. NEW: Import the hashing library

export async function POST(req) {
  try {
    // get data from frontend
    const { username, password } = await req.json();

    // check if there is input from user
    if (!username || !password) {
      return NextResponse.json(
        { message: "All fields are required" }, 
        { status: 400 } 
      );
    }

    // --- STRICT BACKEND SECURITY CHECKS ---
    const isLengthValid = password.length >= 8 && password.length <= 20;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasNoForbidden = !/[:;,"'/\\]/.test(password);
    const hasNoSpaces = !/\s/.test(password);

    if (!isLengthValid || !hasUppercase || !hasLowercase || !hasNumber || !hasNoForbidden || !hasNoSpaces) {
      return NextResponse.json(
        { message: "Security Error: Password does not meet strict requirements." },
        { status: 400 }
      );
    }
    // ------------------------------------------

    // CHECK KUNG NAAY EXISTING USER
    const [existing] = await db.query(
      "SELECT * FROM account_table WHERE username = ?",
      [username]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { message: "Username already exists" },
        { status: 400 }
      );
    }

    // 2. NEW: HASH THE PASSWORD BEFORE SAVING
    // The "10" is the salt rounds (makes it extremely hard for hackers to crack)
    const hashedPassword = await bcrypt.hash(password, 10);

    // if user is not made, insert user to database using the HASHED password
    await db.query(
      "INSERT INTO account_table (username, password) VALUES (?, ?)",
      [username, hashedPassword] // Notice we save hashedPassword here!
    );

    // SUCCESS RESPONSE
    return NextResponse.json(
      { message: "Account created successfully" },
      { status: 201 } 
    );

  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return NextResponse.json(
      { message: "Server error" },
      { status: 500 } 
    );
  }
}