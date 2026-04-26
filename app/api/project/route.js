import db from "@/lib/db";
import { NextResponse } from "next/server";
// Import Vercel Blob to handle cloud uploads
import { put } from "@vercel/blob";

// 1. GET REQUEST - FOR DASHBOARD FILTERING
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    let query = "SELECT * FROM projects_table";
    let params = [];

    if (username && username !== "undefined") {
      query += " WHERE created_by = ? ORDER BY created_at DESC";
      params.push(username);
    } else {
      query += " ORDER BY created_at DESC";
    }

    const [rows] = await db.execute(query, params);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. POST REQUEST - HANDLES TEXT DATA & VERCEL BLOB UPLOAD
export async function POST(request) {
  try {
    const formData = await request.formData();
    
    const name = formData.get("name") || "";
    const category = formData.get("category");
    const budget = Number(formData.get("budget"));
    const duration = formData.get("duration");
    const description = formData.get("description");
    const file = formData.get("file");
    const created_by = formData.get("created_by") || "Admin User";

    // --- BACKEND SHIELDS ---
    if (!name || name.length < 5 || name.includes("<script>")) {
      return NextResponse.json({ error: "Invalid project title." }, { status: 400 });
    }

    if (budget <= 0 || isNaN(budget)) {
      return NextResponse.json({ error: "Invalid budget amount." }, { status: 400 });
    }

    let dbFilePath = "0"; 

    // --- NEW VERCEL BLOB UPLOAD LOGIC ---
    if (file && typeof file !== "string" && file.size > 0) {
      try {
        const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png"];
        if (file.size > 10 * 1024 * 1024) throw new Error("File too large");
        if (!allowedTypes.includes(file.type)) throw new Error("Invalid file type");

        // Generate a unique name for the cloud
        const uniqueId = Math.random().toString(36).substring(2, 8);
        const fileName = `projects/${Date.now()}_${uniqueId}_${file.name}`;

        // Send the file directly to Vercel Blob
        const blob = await put(fileName, file, { access: 'public' });
        
        // Save the permanent Cloud URL to your database
        dbFilePath = blob.url; 
        
      } catch (fileError) {
        console.error("Blob Upload Error:", fileError.message);
        dbFilePath = "upload-failed"; 
      }
    }

    const query = `
      INSERT INTO projects_table (name, category, budget, duration, status, description, files, created_by)
      VALUES (?, ?, ?, ?, 'Pending', ?, ?, ?)
    `;

    await db.execute(query, [name, category, budget, duration, description, dbFilePath, created_by]);

    return NextResponse.json({ message: "Success! Project data and file saved." });
  } catch (error) {
    console.error("POST API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. PUT REQUEST - FOR UPDATING EXISTING PROJECTS
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, name, category, budget, duration, status, description } = body;

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const query = `
      UPDATE projects_table 
      SET name = ?, category = ?, budget = ?, duration = ?, status = ?, description = ?
      WHERE id = ?
    `;
    
    await db.execute(query, [name, category, budget, duration, status, description, id]);
    return NextResponse.json({ message: "Project updated!" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 4. DELETE REQUEST - FOR DELETING PROJECTS
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const query = "DELETE FROM projects_table WHERE id = ?";
    await db.execute(query, [id]);

    return NextResponse.json({ message: "Project deleted!" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}