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
import {
  addDays,
  addMonths,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths
} from "date-fns";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@totracker/ui";

import type { SerializedStory } from "@/lib/story-types";
import type { StoryStatusValue } from "@/lib/story-validation";

import { CreateStoryForm } from "./create-story-form";

const ROOT_KEY = "root";

type NormalizedStory = {
  id: string;
  title: string;
  status: StoryStatusValue;
  dueDateKey: string | null;
  parentId: string | null;
  priority: number;
  description: string | null;
};

type StoryState = {
  byId: Record<string, NormalizedStory>;
  children: Record<string, string[]>;
};

type BacklogNode = {
  story: NormalizedStory;
  children: BacklogNode[];
};

type StoryCalendarBoardProps = {
  initialStories: SerializedStory[];
};

export function StoryCalendarBoard({ initialStories }: StoryCalendarBoardProps) {
  const [state, setState] = useState<StoryState>(() => normalizeStories(initialStories));
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const calendarAssignments = useMemo(() => buildCalendarAssignments(state), [state]);
  const backlogTree = useMemo(() => buildBacklogTree(state, null), [state]);
  const calendarDays = useMemo(() => generateCalendarDays(currentMonth), [currentMonth]);

  const getParentTitle = (parentId: string | null) =>
    parentId ? state.byId[parentId]?.title : undefined;

  const activeStory = activeId ? state.byId[activeId] ?? null : null;

  const updateDueDate = useMutation({
    mutationFn: async ({
      storyId,
      dueDateKey
    }: {
      storyId: string;
      dueDateKey: string | null;
    }) => {
      const response = await fetch(`/api/stories/${storyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dueDate: dueDateKey ? new Date(`${dueDateKey}T00:00:00`).toISOString() : null,
          startDate: dueDateKey ? new Date(`${dueDateKey}T00:00:00`).toISOString() : null
        })
      });

      if (!response.ok) {
        throw new Error("Unable to update story");
      }

      const payload = (await response.json()) as { story: SerializedStory };
      return payload.story;
    }
  });

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const storyId = event.active.id as string;
    const overId = event.over?.id as string | undefined;

    if (!overId) {
      return;
    }

    const targetDueDate = resolveDueDateKey(overId);

    if (targetDueDate === undefined) {
      return;
    }

    const story = state.byId[storyId];

    if (!story || story.dueDateKey === targetDueDate) {
      return;
    }

    const previousDueDate = story.dueDateKey;

    setState((prev: StoryState) => updateStory(prev, storyId, { dueDateKey: targetDueDate }));

    updateDueDate.mutate(
      { storyId, dueDateKey: targetDueDate },
      {
        onError: () =>
          setState((prev: StoryState) => updateStory(prev, storyId, { dueDateKey: previousDueDate })),
        onSuccess: (serverStory: SerializedStory) =>
          setState((prev: StoryState) => mergeStory(prev, serverStory, { replaceExisting: true }))
      }
    );
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  function handleStoryCreated(serverStory: SerializedStory) {
  setState((prev: StoryState) => mergeStory(prev, serverStory, { replaceExisting: false }));
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(280px,320px)_1fr]">
        <aside className="flex flex-col gap-6">
          <BacklogColumn
            nodes={backlogTree}
            state={state}
            onStoryCreated={handleStoryCreated}
            isSaving={updateDueDate.isPending}
          />
        </aside>

        <section className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Calendar board</h2>
              <p className="text-sm text-slate-600">
                Drag stories onto a day to schedule them. Drop back into the backlog to clear dates.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setCurrentMonth((value: Date) => subMonths(value, 1))}>
                Previous
              </Button>
              <Button variant="secondary" onClick={() => setCurrentMonth((value: Date) => addMonths(value, 1))}>
                Next
              </Button>
            </div>
          </div>

          <header className="grid grid-cols-7 gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {generateWeekdayLabels().map((label) => (
              <div key={label} className="rounded-md bg-slate-50 px-2 py-1 text-center">
                {label}
              </div>
            ))}
          </header>

          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((date) => {
              const dateKey = format(date, "yyyy-MM-dd");
              const stories = calendarAssignments[dateKey] ?? [];

              return (
                <CalendarDayCell
                  key={dateKey}
                  date={date}
                  stories={stories}
                  isCurrentMonth={isSameMonth(date, currentMonth)}
                  getParentTitle={getParentTitle}
                />
              );
            })}
          </div>

          {updateDueDate.isError && (
            <p className="text-sm text-rose-600">We could not save the latest drag-and-drop change.</p>
          )}
        </section>
      </div>

      <DragOverlay>
        {activeStory ? (
          <div className="max-w-xs">
            <StoryCard story={activeStory} parentTitle={getParentTitle(activeStory.parentId)} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function BacklogColumn({
  nodes,
  state,
  onStoryCreated,
  isSaving
}: {
  nodes: BacklogNode[];
  state: StoryState;
  onStoryCreated: (story: SerializedStory) => void;
  isSaving: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: "backlog" });
  const hasStories = nodes.length > 0;

  return (
    <div
      ref={(node: HTMLElement | null) => setNodeRef(node)}
      className={clsx(
        "w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm",
        isOver && "border-indigo-400 shadow-[0_0_0_2px_rgba(129,140,248,0.35)]"
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Backlog</h3>
        {isSaving && <span className="text-xs text-slate-500">Saving...</span>}
      </div>
      <p className="mt-1 text-sm text-slate-600">Stories without a committed date live here.</p>

      <div className="mt-4 space-y-3">
        {hasStories ? (
          nodes.map((node) => <BacklogItem key={node.story.id} node={node} state={state} depth={0} />)
        ) : (
          <p className="rounded-md border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            Nothing left in the backlog. Create a story or drag one back from the calendar.
          </p>
        )}
      </div>

      <CreateStoryForm onCreate={onStoryCreated} />
    </div>
  );
}

function BacklogItem({
  node,
  state,
  depth
}: {
  node: BacklogNode;
  state: StoryState;
  depth: number;
}) {
  const parentTitle = node.story.parentId ? state.byId[node.story.parentId]?.title : undefined;

  return (
    <div className="space-y-2" style={{ marginLeft: depth * 16 }}>
      <StoryDraggable story={node.story}>
        <StoryCard story={node.story} parentTitle={parentTitle} />
      </StoryDraggable>

      {node.children.length > 0 && (
        <div className="space-y-2 border-l border-slate-200 pl-4">
          {node.children.map((child) => (
            <BacklogItem key={child.story.id} node={child} state={state} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function CalendarDayCell({
  date,
  stories,
  isCurrentMonth,
  getParentTitle
}: {
  date: Date;
  stories: NormalizedStory[];
  isCurrentMonth: boolean;
  getParentTitle: (parentId: string | null) => string | undefined;
}) {
  const dateKey = format(date, "yyyy-MM-dd");
  const { isOver, setNodeRef } = useDroppable({ id: `day-${dateKey}` });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "min-h-[140px] rounded-lg border bg-white p-2 shadow-sm transition",
        isOver && "border-indigo-400 shadow-[0_0_0_2px_rgba(129,140,248,0.35)]",
        !isCurrentMonth && "bg-slate-50 text-slate-400"
      )}
    >
      <div className="flex items-center justify-between text-xs font-semibold">
        <span>{format(date, "d")}</span>
      </div>

      <div className="mt-2 space-y-2">
        {stories.map((story) => (
          <StoryDraggable key={story.id} story={story}>
            <StoryCard story={story} parentTitle={getParentTitle(story.parentId)} />
          </StoryDraggable>
        ))}
      </div>
    </div>
  );
}

function StoryDraggable({ story, children }: { story: NormalizedStory; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: story.id });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx("cursor-grab active:cursor-grabbing", isDragging && "opacity-60")}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
}

function StoryCard({
  story,
  parentTitle,
  isDragging
}: {
  story: NormalizedStory;
  parentTitle?: string;
  isDragging?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-slate-200 bg-white p-3 text-left text-sm shadow-sm",
        isDragging && "border-indigo-400 shadow-lg"
      )}
    >
      <p className="font-medium text-slate-900">{story.title}</p>
      {parentTitle && <p className="mt-1 text-xs text-slate-500">Child of {parentTitle}</p>}
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>{formatStatus(story.status)}</span>
        <span>Priority {story.priority}</span>
      </div>
    </div>
  );
}

function formatStatus(status: StoryStatusValue) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeStories(initialStories: SerializedStory[]): StoryState {
  const byId: Record<string, NormalizedStory> = {};
  const children: Record<string, string[]> = { [ROOT_KEY]: [] };

  function register(stories: SerializedStory[], parentId: string | null) {
    const key = parentId ?? ROOT_KEY;

    if (!children[key]) {
      children[key] = [];
    }

    for (const story of stories) {
      const normalized: NormalizedStory = {
        id: story.id,
        title: story.title,
        status: story.status as StoryStatusValue,
        dueDateKey: story.dueDate ? story.dueDate.slice(0, 10) : null,
        parentId,
        priority: story.priority,
        description: story.description ?? null
      };

      byId[story.id] = normalized;
      children[key].push(story.id);

      if (!children[story.id]) {
        children[story.id] = [];
      }

      if (story.children.length) {
        register(story.children, story.id);
      }
    }
  }

  register(initialStories, null);

  return { byId, children };
}

function buildBacklogTree(state: StoryState, parentId: string | null): BacklogNode[] {
  const key = parentId ?? ROOT_KEY;
  const ids = state.children[key] ?? [];

  return ids
    .map((id) => state.byId[id])
    .filter((story): story is NormalizedStory => Boolean(story))
    .filter((story) => story.dueDateKey === null)
    .map((story) => ({
      story,
      children: buildBacklogTree(state, story.id)
    }));
}

function buildCalendarAssignments(state: StoryState) {
  const assignments: Record<string, NormalizedStory[]> = {};

  Object.values(state.byId).forEach((story) => {
    if (story?.dueDateKey) {
      if (!assignments[story.dueDateKey]) {
        assignments[story.dueDateKey] = [];
      }

      assignments[story.dueDateKey].push(story);
    }
  });

  Object.keys(assignments).forEach((key) => {
    assignments[key] = assignments[key].slice().sort((a, b) => a.priority - b.priority);
  });

  return assignments;
}

function updateStory(state: StoryState, storyId: string, patch: Partial<NormalizedStory>): StoryState {
  const story = state.byId[storyId];

  if (!story) {
    return state;
  }

  return {
    byId: {
      ...state.byId,
      [storyId]: {
        ...story,
        ...patch
      }
    },
    children: state.children
  };
}

function mergeStory(
  state: StoryState,
  serverStory: SerializedStory,
  { replaceExisting }: { replaceExisting: boolean }
): StoryState {
  const normalized: NormalizedStory = {
    id: serverStory.id,
    title: serverStory.title,
    status: serverStory.status as StoryStatusValue,
    dueDateKey: serverStory.dueDate ? serverStory.dueDate.slice(0, 10) : null,
    parentId: serverStory.parentId ?? null,
    priority: serverStory.priority,
    description: serverStory.description ?? null
  };

  const parentKey = normalized.parentId ?? ROOT_KEY;
  const existing = state.byId[normalized.id];
  const childrenMap = { ...state.children };

  if (!childrenMap[normalized.id]) {
    childrenMap[normalized.id] = [];
  }

  if (!childrenMap[parentKey]) {
    childrenMap[parentKey] = [];
  }

  if (existing && existing.parentId !== normalized.parentId) {
    const previousKey = existing.parentId ?? ROOT_KEY;
    childrenMap[previousKey] = (childrenMap[previousKey] ?? []).filter((id) => id !== normalized.id);
  }

  if (!existing || !replaceExisting) {
    if (!childrenMap[parentKey].includes(normalized.id)) {
      childrenMap[parentKey] = [...childrenMap[parentKey], normalized.id];
    }
  }

  return {
    byId: {
      ...state.byId,
      [normalized.id]: normalized
    },
    children: childrenMap
  };
}

function resolveDueDateKey(overId: string): string | null | undefined {
  if (overId === "backlog") {
    return null;
  }

  if (overId.startsWith("day-")) {
    return overId.replace("day-", "");
  }

  return undefined;
}

function generateCalendarDays(currentMonth: Date) {
  const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function generateWeekdayLabels() {
  const reference = startOfWeek(new Date(), { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, index) => format(addDays(reference, index), "EEE"));
}
