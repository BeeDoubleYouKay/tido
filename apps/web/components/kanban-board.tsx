"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import type { SerializedStory } from "@/lib/story-types";
import type { StoryStatusValue } from "@/lib/story-validation";

type KanbanColumn = {
  id: StoryStatusValue | "NO_STATUS";
  label: string;
  color: string;
  description: string;
};

const COLUMNS: KanbanColumn[] = [
  {
    id: "NO_STATUS",
    label: "No Status",
    color: "bg-gray-100",
    description: "This item hasn't been started"
  },
  {
    id: "BACKLOG",
    label: "Backlog",
    color: "bg-gray-100",
    description: "This item hasn't been started"
  },
  {
    id: "READY",
    label: "Ready",
    color: "bg-blue-100",
    description: "This is ready to be picked up"
  },
  {
    id: "IN_PROGRESS",
    label: "In progress",
    color: "bg-yellow-100",
    description: "This is actively being worked on"
  },
  {
    id: "REVIEW",
    label: "In review",
    color: "bg-purple-100",
    description: "This item is in review"
  },
  {
    id: "DONE",
    label: "Done",
    color: "bg-green-100",
    description: "This has been completed"
  }
];

type StoryCard = {
  id: string;
  title: string;
  status: StoryStatusValue | null;
  tags: Array<{ label: string; color: string }>;
  upgradeId?: string;
};

type KanbanBoardProps = {
  initialStories: SerializedStory[];
};

function StoryCardComponent({ story }: { story: StoryCard }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: story.id
  });

  const style = {
    transform: CSS.Translate.toString(transform)
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={clsx(
        "bg-white rounded-lg border border-gray-200 p-3 mb-2 cursor-grab active:cursor-grabbing",
        "hover:shadow-md transition-shadow",
        isDragging && "opacity-50"
      )}
    >
      <div className="flex items-start gap-2 mb-2">
        {story.upgradeId && (
          <span className="text-xs text-purple-600 font-medium">{story.upgradeId}</span>
        )}
      </div>
      <h4 className="text-sm font-medium text-gray-900 mb-2">{story.title}</h4>
      {story.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {story.tags.map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 text-xs rounded-full"
              style={{ backgroundColor: tag.color, color: "#fff" }}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function DroppableColumn({
  column,
  stories,
  count
}: {
  column: KanbanColumn;
  stories: StoryCard[];
  count: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id
  });

  return (
    <div className="flex-1 min-w-[280px] flex flex-col">
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <div className={clsx("w-3 h-3 rounded-full", column.color)} />
          <h3 className="text-sm font-semibold text-gray-700">{column.label}</h3>
          <span className="text-xs text-gray-500">{count}</span>
          <span className="text-xs text-gray-400 ml-auto">Estimate: 0</span>
        </div>
        <p className="text-xs text-gray-500 ml-5">{column.description}</p>
      </div>
      <div
        ref={setNodeRef}
        className={clsx(
          "flex-1 rounded-lg p-2 min-h-[400px] transition-colors",
          isOver ? "bg-blue-50 border-2 border-blue-300" : "bg-gray-50 border border-gray-200"
        )}
      >
        {stories.map((story) => (
          <StoryCardComponent key={story.id} story={story} />
        ))}
      </div>
    </div>
  );
}

export function KanbanBoard({ initialStories }: KanbanBoardProps) {
  const [stories, setStories] = useState<StoryCard[]>(() =>
    initialStories.map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      tags: (s as any).tags || [],
      upgradeId: `#${s.id.substring(s.id.length - 3)}`
    }))
  );

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const updateStatus = useMutation({
    mutationFn: async ({
      storyId,
      newStatus
    }: {
      storyId: string;
      newStatus: StoryStatusValue | null;
    }) => {
      const response = await fetch(`/api/stories/${storyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) throw new Error("Failed to update story");
      return response.json();
    },
    onMutate: async ({ storyId, newStatus }) => {
      setStories((prev) =>
        prev.map((s) => (s.id === storyId ? { ...s, status: newStatus } : s))
      );
    },
    onError: () => {
      // Revert on error
      setStories(
        initialStories.map((s) => ({
          id: s.id,
          title: s.title,
          status: s.status,
          tags: (s as any).tags || [],
          upgradeId: `#${s.id.substring(s.id.length - 3)}`
        }))
      );
    }
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const storyId = active.id as string;
    const newColumnId = over.id as string;

    let newStatus: StoryStatusValue | null = null;
    if (newColumnId !== "NO_STATUS") {
      newStatus = newColumnId as StoryStatusValue;
    }

    const story = stories.find((s) => s.id === storyId);
    if (story && story.status !== newStatus) {
      updateStatus.mutate({ storyId, newStatus });
    }

    setActiveId(null);
  };

  const getColumnStories = (columnId: KanbanColumn["id"]) => {
    if (columnId === "NO_STATUS") {
      return stories.filter((s) => s.status === null);
    }
    return stories.filter((s) => s.status === columnId);
  };

  const activeStory = activeId ? stories.find((s) => s.id === activeId) : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((column) => {
          const columnStories = getColumnStories(column.id);
          return (
            <DroppableColumn
              key={column.id}
              column={column}
              stories={columnStories}
              count={columnStories.length}
            />
          );
        })}
      </div>
      <DragOverlay>
        {activeStory ? (
          <div className="bg-white rounded-lg border-2 border-blue-400 p-3 shadow-lg rotate-3">
            <h4 className="text-sm font-medium text-gray-900">{activeStory.title}</h4>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
