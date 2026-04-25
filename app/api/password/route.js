import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs"; 

const dbConfig = {
  host: "localhost",
  user: "root",
  password: "",
  database: "bpts",
};

// --- POST: Securely encrypts and updates the password ---
export async function POST(req) {
  try {
    const body = await req.json();
    const { user_id, current_password, new_password } = body;

    if (!user_id || !current_password || !new_password) {
      return NextResponse.json({ error: "Please fill in all password fields" }, { status: 400 });
    }

    // NEW SECURITY CHECK: Reject if current and new passwords are the exact same
    if (current_password === new_password) {
      return NextResponse.json({ error: "New password cannot be the same as your current password." }, { status: 400 });
    }

    const connection = await mysql.createConnection(dbConfig);

    // 1. Fetch the user's current password from the database
    const [rows] = await connection.execute(
      "SELECT password FROM account_table WHERE id = ?",
      [user_id]
    );

    if (rows.length === 0) {
      await connection.end();
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const actualPassword = rows[0].password;

    // 2. Security Check: Does the submitted current password match the database?
    let isCurrentPasswordValid = false;

    if (actualPassword.startsWith("$2a$") || actualPassword.startsWith("$2b$") || actualPassword.startsWith("$2y$")) {
      isCurrentPasswordValid = await bcrypt.compare(current_password, actualPassword);
    } else {
      isCurrentPasswordValid = (current_password === actualPassword);
    }

    if (!isCurrentPasswordValid) {
      await connection.end();
      return NextResponse.json({ error: "Incorrect Current Password. Access Denied." }, { status: 401 });
    }

    // 3. ENCRYPT THE NEW PASSWORD
    const hashedNewPassword = await bcrypt.hash(new_password, 10);

    // 4. Update the database with the NEW ENCRYPTED password
    await connection.execute(
      "UPDATE account_table SET password = ? WHERE id = ?",
      [hashedNewPassword, user_id]
    );

    await connection.end();
    return NextResponse.json({ message: "Password updated successfully and securely encrypted!" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}