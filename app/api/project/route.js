import db from "@/lib/db";
import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import fs from "fs";

// GET REQUEST - FOR DASHBOARD FILTERING
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

    const [rows] = await db.query(query, params);
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST REQUEST - FOR UPLOADING DATA AND FILES
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
    
    // Shield 1: Validate Title Text
    if (!name || name.length < 5 || name.includes("<script>")) {
      return NextResponse.json({ error: "Invalid project title detected." }, { status: 400 });
    }

    // Shield 2: Validate Budget Amount
    if (budget <= 0 || isNaN(budget)) {
      return NextResponse.json({ error: "Invalid budget amount detected." }, { status: 400 });
    }

    let dbFilePath = "0"; // Default value if no file is uploaded

    if (file && typeof file !== "string") {
      
      // Shield 3: Server-side File Size Check (10MB)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: "File exceeds server 10MB limit." }, { status: 400 });
      }

      // Shield 4: Server-side File Type Check
      const allowedTypes = [
        "application/pdf", 
        "application/msword", 
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
        "image/jpeg", 
        "image/png"
      ];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: "Malicious or unsupported file type blocked." }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // --- NEW: ADVANCED FILENAME SANITIZATION ---
      const ext = path.extname(file.name).toLowerCase();
      const uniqueId = Math.random().toString(36).substring(2, 8);
      const safeFileName = `project_${Date.now()}_${uniqueId}${ext}`;
      
      // Direct files to the 'uploads' subfolder inside 'public'
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      
      // Ensure the uploads folder exists inside public
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, safeFileName);
      await writeFile(filePath, buffer);

      // Save the relative path to the database
      dbFilePath = `uploads/${safeFileName}`; 
    }

    const query = `
      INSERT INTO projects_table (name, category, budget, duration, status, description, files, created_by)
      VALUES (?, ?, ?, ?, 'Pending', ?, ?, ?)
    `;

    await db.query(query, [name, category, budget, duration, description, dbFilePath, created_by]);

    return NextResponse.json({ message: "Success" });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT REQUEST - FOR UPDATING EXISTING PROJECTS
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, name, category, budget, duration, status, description } = body;

    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const query = `
      UPDATE projects_table 
      SET name = ?, category = ?, budget = ?, duration = ?, status = ?, description = ?
      WHERE id = ?
    `;
    
    await db.query(query, [name, category, budget, duration, status, description, id]);
    return NextResponse.json({ message: "Project updated successfully!" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE REQUEST - FOR DELETING PROJECTS
export async function DELETE(request) {
  try {
    let id;

    // 1. First, check if the ID was sent in the URL (e.g., /api/project?id=123)
    const { searchParams } = new URL(request.url);
    id = searchParams.get("id");

    // 2. If it's NOT in the URL, check if it was sent in a JSON body
    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch (parseError) {
        // If there's no body, it will throw an error, which we can safely ignore
      }
    }

    // 3. If we STILL don't have an ID, return the error
    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const query = "DELETE FROM projects_table WHERE id = ?";
    await db.query(query, [id]);

    return NextResponse.json({ message: "Project deleted successfully!" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}