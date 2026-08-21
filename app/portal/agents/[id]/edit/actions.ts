"use server";

export type UpdateProjectState = {
  error?: string;
};

export async function updateProject(): Promise<UpdateProjectState> {
  return { error: "Projekt adatokat csak superadmin módosíthat." };
}
