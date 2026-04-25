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

    // Using .execute for the Aiven Connection Pool
    const [rows] = await db.execute(query, params);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. POST REQUEST - FOR UPLOADING DATA AND FILES
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

    if (file && typeof file !== "string") {
      // Security Check: Size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: "File exceeds 10MB limit." }, { status: 400 });
      }

      // Security Check: Type
      const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png"];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: "Unsupported file type blocked." }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const ext = path.extname(file.name).toLowerCase();
      const uniqueId = Math.random().toString(36).substring(2, 8);
      const safeFileName = `project_${Date.now()}_${uniqueId}${ext}`;
      
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, safeFileName);
      await writeFile(filePath, buffer);

      dbFilePath = `uploads/${safeFileName}`; 
    }

    const query = `
      INSERT INTO projects_table (name, category, budget, duration, status, description, files, created_by)
      VALUES (?, ?, ?, ?, 'Pending', ?, ?, ?)
    `;

    await db.execute(query, [name, category, budget, duration, description, dbFilePath, created_by]);

    return NextResponse.json({ message: "Success" });
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

    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const query = `
      UPDATE projects_table 
      SET name = ?, category = ?, budget = ?, duration = ?, status = ?, description = ?
      WHERE id = ?
    `;
    
    await db.execute(query, [name, category, budget, duration, status, description, id]);
    return NextResponse.json({ message: "Project updated successfully!" }, { status: 200 });
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
      try {
        const body = await request.json();
        id = body.id;
      } catch (e) {}
    }

    if (!id) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const query = "DELETE FROM projects_table WHERE id = ?";
    await db.execute(query, [id]);

    return NextResponse.json({ message: "Project deleted successfully!" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}