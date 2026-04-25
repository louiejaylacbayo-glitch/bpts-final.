import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
// Import the Aiven database pool we configured earlier!
// Note: Depending on your folder structure, you might need to adjust this path 
// (e.g., "../../../../lib/db" if "@/lib/db" doesn't work)
import db from "@/lib/db"; 

export async function POST(req) {
  try {
    const { username, password } = await req.json();

    // Fetch the user directly using our secure Aiven database pool
    const [rows] = await db.execute(
      "SELECT * FROM account_table WHERE username = ?",
      [username]
    );

    const user = rows[0];

    // Check if user exists
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 400 });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ message: "Invalid password" }, { status: 400 });
    }

    // CREATE THE SECURE TOKEN
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1d" } // Token expires in 1 day
    );

    // Prepare the success response
    const response = NextResponse.json(
      { 
        message: "Login successful",
        user: { id: user.id, username: user.username }
      },
      { status: 200 }
    );

    // ATTACH THE TOKEN AS AN HTTP-ONLY COOKIE
    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", 
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 1 day in seconds
      path: "/",
    });

    return response;

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}