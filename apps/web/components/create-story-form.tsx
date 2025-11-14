"use client";

import { ChangeEvent, FormEvent, useState } from "react";

import { Button } from "@totracker/ui";

import type { SerializedStory } from "@/lib/story-types";

type CreateStoryFormProps = {
  onCreate: (story: SerializedStory) => void;
};

export function CreateStoryForm({ onCreate }: CreateStoryFormProps) {
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.message ?? "Unable to create story");
      setIsSubmitting(false);
      return;
    }

    const payload = (await response.json()) as { story: SerializedStory };
    onCreate(payload.story);
    setTitle("");
    setIsSubmitting(false);
  }

  return (
    <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="new-story-title">
          Quick add story
        </label>
        <input
          id="new-story-title"
          type="text"
          placeholder="e.g. Draft sprint backlog"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={title}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setTitle(event.target.value)}
        />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Adding..." : "Add to backlog"}
      </Button>
    </form>
  );
}
