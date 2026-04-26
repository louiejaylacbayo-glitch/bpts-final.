import { NextResponse } from "next/server";
import bcrypt from "bcryptjs"; 
// --- 1. IMPORT YOUR CENTRAL DB CONNECTION ---
// Make sure this path points to your lib/db.js file
import db from "@/lib/db"; 

export async function POST(req) {
  try {
    const body = await req.json();
    const { user_id, current_password, new_password } = body;

    // Validation
    if (!user_id || !current_password || !new_password) {
      return NextResponse.json({ error: "Please fill in all password fields" }, { status: 400 });
    }

    if (current_password === new_password) {
      return NextResponse.json({ error: "New password cannot be the same as your current password." }, { status: 400 });
    }

    // --- 2. USE THE IMPORTED 'db' POOL ---
    // This will automatically use your Aiven cloud settings from process.env
    const [rows] = await db.execute(
      "SELECT password FROM account_table WHERE id = ?",
      [user_id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const actualPassword = rows[0].password;
    let isCurrentPasswordValid = false;

    // Check if password is encrypted or plain text (for legacy accounts)
    if (actualPassword.startsWith("$2a$") || actualPassword.startsWith("$2b$") || actualPassword.startsWith("$2y$")) {
      isCurrentPasswordValid = await bcrypt.compare(current_password, actualPassword);
    } else {
      isCurrentPasswordValid = (current_password === actualPassword);
    }

    if (!isCurrentPasswordValid) {
      return NextResponse.json({ error: "Incorrect Current Password. Access Denied." }, { status: 401 });
    }

    // --- 3. HASH AND UPDATE ---
    const hashedNewPassword = await bcrypt.hash(new_password, 10);

    await db.execute(
      "UPDATE account_table SET password = ? WHERE id = ?",
      [hashedNewPassword, user_id]
    );

    // Note: No need to call .end() when using a Pool (db.js)
    return NextResponse.json({ message: "Password updated successfully!" });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: "Database connection failed. Please check cloud settings." }, { status: 500 });
  }
}