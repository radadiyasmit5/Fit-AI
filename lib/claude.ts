// Helper to call Supabase Edge Functions for AI features
// Will be implemented in later steps

import { supabaseUrl, supabaseAnonKey } from "./supabase";

interface ClaudeResponse<T> {
  data: T | null;
  error: string | null;
}

export async function callEdgeFunction<T>(
  functionName: string,
  body: Record<string, unknown>
): Promise<ClaudeResponse<T>> {
  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/${functionName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: data.error ?? "Unknown error" };
    }

    return { data: data as T, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
