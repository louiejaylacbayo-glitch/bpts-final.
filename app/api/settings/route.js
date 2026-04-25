import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

const dbConfig = {
  host: "localhost",
  user: "root",
  password: "",
  database: "bpts",
};

// --- GET: Fetch personal info when the page loads ---
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get("user_id");

    if (!user_id || user_id === "undefined") {
      return NextResponse.json({ error: "No user ID provided" }, { status: 400 });
    }

    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(
      "SELECT * FROM personal_info_table WHERE user_id = ?",
      [user_id]
    );
    
    await connection.end();

    if (rows.length > 0) {
      return NextResponse.json(rows[0]);
    } else {
      return NextResponse.json({}); // Return empty if no data exists yet
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// --- POST: Save or Update personal info ---
export async function POST(req) {
  try {
    const body = await req.json();
    
    // Extract data from frontend request
    const { user_id, email, phone, address } = body;

    if (!user_id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const connection = await mysql.createConnection(dbConfig);

    // 1. Check if this user already has a record in personal_info_table
    const [existingRows] = await connection.execute(
      "SELECT id FROM personal_info_table WHERE user_id = ?",
      [user_id]
    );

    if (existingRows.length > 0) {
      // 2a. If they exist, UPDATE their existing record
      await connection.execute(
        "UPDATE personal_info_table SET email = ?, phone_number = ?, address = ? WHERE user_id = ?",
        [email, phone, address, user_id]
      );
    } else {
      // 2b. If they don't exist yet, INSERT a brand new row
      await connection.execute(
        "INSERT INTO personal_info_table (user_id, email, phone_number, address) VALUES (?, ?, ?, ?)",
        [user_id, email, phone, address]
      );
    }

    await connection.end();
    return NextResponse.json({ message: "Personal info securely saved to database!" }, { status: 200 });

  } catch (error) {
    console.error("Database save error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}