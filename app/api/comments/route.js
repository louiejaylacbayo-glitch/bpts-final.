import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
// Import the secure Aiven pool
import db from "@/lib/db"; 

// 1. GET: Fetches comments securely
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId"); 

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    
    let adminName = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        adminName = decoded.username; 
      } catch (error) {
        console.error("Invalid token:", error);
      }
    }

    if (!projectId && !adminName) {
      return NextResponse.json([], { status: 200 });
    }

    let query = `
      SELECT 
        pc.*, 
        r.name AS resident_name,
        p.name AS project_name
      FROM project_comments pc
      LEFT JOIN residents_table r ON pc.resident_id = r.resident_id
      INNER JOIN projects_table p ON pc.project_id = p.id
      WHERE 1=1
    `;

    let params = [];

    if (projectId) {
      query += ` AND pc.project_id = ?`;
      params.push(projectId);
    } else if (adminName) {
      query += ` AND p.created_by = ?`;
      params.push(adminName);
    }

    query += ` ORDER BY pc.date_submitted DESC`;

    // Use the global 'db' pool with .execute
    const [rows] = await db.execute(query, params);
    
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error("Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

// 2. POST: Handle resident feedback submission
export async function POST(req) {
  try {
    const { name, comment, projectId } = await req.json();

    // Use db.execute for all database operations
    await db.execute(
      "INSERT INTO residents_table (name) VALUES (?) ON DUPLICATE KEY UPDATE name=name",
      [name]
    );
    
    const [residentRows] = await db.execute(
      "SELECT resident_id FROM residents_table WHERE name = ?", 
      [name]
    );
    
    const residentId = residentRows[0].resident_id;

    await db.execute(
      "INSERT INTO project_comments (project_id, resident_id, comment_text, date_submitted) VALUES (?, ?, ?, NOW())",
      [projectId, residentId, comment]
    );

    return NextResponse.json({ message: "Success" }, { status: 201 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }
}

// 3. PATCH: Saves the admin reply
export async function PATCH(req) {
  try {
    const body = await req.json();
    const { comment_id, admin_reply } = body;

    if (!comment_id || !admin_reply) {
      return NextResponse.json(
        { error: "Comment ID and Reply text are required." },
        { status: 400 }
      );
    }

    await db.execute(
      `UPDATE project_comments 
       SET admin_reply = ?, date_replied = NOW() 
       WHERE comment_id = ?`,
      [admin_reply, comment_id]
    );

    return NextResponse.json({ message: "Reply saved successfully!" }, { status: 200 });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json({ error: "Failed to save reply" }, { status: 500 });
  }
}