import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@Rankup-manager/backend/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET() {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Set auth token for Convex
    const token = await getToken({ template: "convex" });
    convex.setAuth(token || undefined);

    // Get projects from Convex
    const projects = await convex.query(api.projects.getProjects);

    return NextResponse.json({
      success: true,
      userId,
      totalProjects: projects.length,
      projects: projects.map(p => ({
        _id: p._id,
        name: p.name,
        domain: p.domain,
        bigQueryProjectId: p.bigQueryProjectId,
        createdAt: new Date(p.createdAt).toISOString(),
        updatedAt: new Date(p.updatedAt).toISOString()
      }))
    });

  } catch (error) {
    console.error("Check Convex projects error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}