import { NextResponse } from "next/server";

export async function POST() {
  try {
    // 1. Prepare the success response
    const response = NextResponse.json(
      { message: "Logged out successfully" },
      { status: 200 }
    );

    // 2. Destroy the secure cookie!
    // Next.js makes this super easy with the .delete() method
    response.cookies.delete("auth_token");

    return response;
  } catch (error) {
    console.error("LOGOUT ERROR:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}