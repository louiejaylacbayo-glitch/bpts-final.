import db from "@/lib/db";
import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import fs from "fs";

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

// 2. POST REQUEST - HANDLES TEXT DATA & OPTIONAL FILE UPLOAD
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

    // FILE HANDLING BLOCK
    if (file && typeof file !== "string" && file.size > 0) {
      try {
        // Size & Type Checks
        const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png"];
        if (file.size > 10 * 1024 * 1024) throw new Error("File too large");
        if (!allowedTypes.includes(file.type)) throw new Error("Invalid file type");

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        const ext = path.extname(file.name).toLowerCase();
        const uniqueId = Math.random().toString(36).substring(2, 8);
        const safeFileName = `project_${Date.now()}_${uniqueId}${ext}`;
        
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        
        // This part often fails on Vercel (Read-Only FS)
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, safeFileName);
        await writeFile(filePath, buffer);

        dbFilePath = `uploads/${safeFileName}`; 
      } catch (fileError) {
        // CATCHING EROFS ERROR: Project text still saves, but file is skipped
        console.warn("File storage skipped (Vercel Read-Only):", fileError.message);
        dbFilePath = "file-not-stored-serverless"; 
      }
    }

    const query = `
      INSERT INTO projects_table (name, category, budget, duration, status, description, files, created_by)
      VALUES (?, ?, ?, ?, 'Pending', ?, ?, ?)
    `;

    await db.execute(query, [name, category, budget, duration, description, dbFilePath, created_by]);

    return NextResponse.json({ message: "Success! Project data saved." });
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