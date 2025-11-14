"use client";

import { useState, useMemo, Fragment, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { useMutation } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, GripVertical, MoreHorizontal, Plus } from "lucide-react";

import type { SerializedStory } from "@/lib/story-types";
import type { StoryStatusValue } from "@/lib/story-validation";
import { StoryDetailPanel } from "./story-detail-panel";
import { InlineChildStoryForm } from "./inline-child-story-form";

type User = {
  id: string;
  email: string;
  name: string | null;
};

type StoryRow = {
  id: string;
  title: string;
  description: string | null;
  status: StoryStatusValue | null;
  assignees: User[];
  effort: number | null;
  priority: number;
  position: number;
  children: StoryRow[];
  createdAt: string;
  updatedAt: string;
};

type GroupBy = "none" | "status" | "priority";
type SortBy = "priority" | "position" | "effort" | "status";

type BacklogTableProps = {
  initialStories: SerializedStory[];
  users: User[];
};

const STATUS_LABELS: Record<StoryStatusValue | "NO_STATUS", string> = {
  NO_STATUS: "No Status",
  BACKLOG: "Backlog",
  READY: "Ready",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  REVIEW: "In review",
  DONE: "Done",
  ARCHIVED: "Archived"
};

const PRIORITY_LABELS: Record<number, string> = {
  1: "High Priority",
  2: "Medium Priority",
  3: "Normal Priority",
  4: "Low Priority"
};

function StatusBadge({ status }: { status: StoryStatusValue | null }) {
  const colors: Record<StoryStatusValue | "NO_STATUS", string> = {
    NO_STATUS: "bg-gray-100 text-gray-700",
    BACKLOG: "bg-gray-100 text-gray-700",
    READY: "bg-blue-100 text-blue-700",
    IN_PROGRESS: "bg-yellow-100 text-yellow-700",
    BLOCKED: "bg-red-100 text-red-700",
    REVIEW: "bg-purple-100 text-purple-700",
    DONE: "bg-green-100 text-green-700",
    ARCHIVED: "bg-gray-100 text-gray-500"
  };

  const key = (status || "NO_STATUS") as StoryStatusValue | "NO_STATUS";
  return (
    <span className={clsx("px-2 py-1 text-xs rounded-md font-medium", colors[key])}>
      {STATUS_LABELS[key]}
    </span>
  );
}

function StatusSelect({
  value,
  onChange
}: {
  value: StoryStatusValue | null;
  onChange: (status: StoryStatusValue | null) => void;
}) {
  return (
    <select
      value={value || "NO_STATUS"}
      onChange={(e) => {
        const val = e.target.value === "NO_STATUS" ? null : (e.target.value as StoryStatusValue);
        onChange(val);
      }}
      className="px-2 py-1 text-xs rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
      onClick={(e) => e.stopPropagation()}
    >
      <option value="NO_STATUS">No Status</option>
      <option value="BACKLOG">Backlog</option>
      <option value="READY">Ready</option>
      <option value="IN_PROGRESS">In progress</option>
      <option value="BLOCKED">Blocked</option>
      <option value="REVIEW">In review</option>
      <option value="DONE">Done</option>
      <option value="ARCHIVED">Archived</option>
    </select>
  );
}

function AssigneeSelect({
  value,
  users,
  onChange
}: {
  value: User[];
  users: User[];
  onChange: (users: User[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleUser = (user: User) => {
    const isSelected = value.some((u) => u.id === user.id);
    if (isSelected) {
      onChange(value.filter((u) => u.id !== user.id));
    } else {
      onChange([...value, user]);
    }
  };

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50"
      >
        {value.length === 0 ? (
          <span className="text-gray-400">Unassigned</span>
        ) : (
          <div className="flex -space-x-1">
            {value.slice(0, 3).map((user) => (
              <div
                key={user.id}
                className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center border-2 border-white"
                title={user.name || user.email}
              >
                {(user.name || user.email).charAt(0).toUpperCase()}
              </div>
            ))}
            {value.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-700 text-xs flex items-center justify-center border-2 border-white">
                +{value.length - 3}
              </div>
            )}
          </div>
        )}
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0" onClick={() => setIsOpen(false)} />
          <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[200px]">
            <div className="max-h-60 overflow-y-auto p-1">
              {users.map((user) => {
                const isSelected = value.some((u) => u.id === user.id);
                return (
                  <button
                    key={user.id}
                    onClick={() => toggleUser(user)}
                    className={clsx(
                      "w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-50 flex items-center gap-2",
                      isSelected && "bg-blue-50"
                    )}
                  >
                    <input type="checkbox" checked={isSelected} readOnly className="rounded" />
                    <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                      {(user.name || user.email).charAt(0).toUpperCase()}
                    </div>
                    <span>{user.name || user.email}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EffortInput({
  value,
  onChange
}: {
  value: number | null;
  onChange: (effort: number | null) => void;
}) {
  return (
    <input
      type="number"
      min="0"
      value={value || ""}
      onChange={(e) => {
        const val = e.target.value === "" ? null : parseInt(e.target.value, 10);
        onChange(val);
      }}
      onClick={(e) => e.stopPropagation()}
      placeholder="0"
      className="w-16 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}

function SortableRow({
  story,
  users,
  onUpdate,
  onRowClick,
  onAddChild,
  isExpanded,
  onToggleExpand
}: {
  story: StoryRow;
  users: User[];
  onUpdate: (id: string, updates: Partial<StoryRow>) => void;
  onRowClick: (story: StoryRow) => void;
  onAddChild: (parentId: string) => void;
  isExpanded: boolean;
  onToggleExpand: (storyId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: story.id
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const hasChildren = story.children.length > 0;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={clsx(
        "border-b border-gray-200 hover:bg-gray-50 group cursor-pointer",
        isDragging && "opacity-50"
      )}
      onClick={() => onRowClick(story)}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(story.id);
              }}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-4 h-4" />
          )}
          <button
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(story.id);
            }}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded p-1 transition-colors"
            title="Add child story"
          >
            <Plus className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={story.title}
            onChange={(e) => onUpdate(story.id, { title: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 px-2 py-1 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          />
          {hasChildren && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {story.children.length}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <StatusSelect
          value={story.status}
          onChange={(status) => onUpdate(story.id, { status })}
        />
      </td>
      <td className="px-4 py-3 text-center">
        <AssigneeSelect
          value={story.assignees}
          users={users}
          onChange={(assignees) => onUpdate(story.id, { assignees })}
        />
      </td>
      <td className="px-4 py-3 text-center">
        <EffortInput value={story.effort} onChange={(effort) => onUpdate(story.id, { effort })} />
      </td>
      <td className="px-4 py-3 text-center">
        <button className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

function ChildStoryRow({
  story,
  users,
  onUpdate,
  onRowClick
}: {
  story: StoryRow;
  users: User[];
  onUpdate: (id: string, updates: Partial<StoryRow>) => void;
  onRowClick: (story: StoryRow) => void;
}) {
  return (
    <tr
      className="border-b border-gray-100 hover:bg-blue-50/30 group cursor-pointer bg-blue-50/10"
      onClick={() => onRowClick(story)}
    >
      <td className="px-4 py-2">
        <div className="flex items-center gap-2 pl-12">
          <div className="w-4 h-4 border-l-2 border-b-2 border-gray-300 -mt-2 mr-1" />
          <input
            type="text"
            value={story.title}
            onChange={(e) => onUpdate(story.id, { title: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 px-2 py-1 text-sm border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          />
        </div>
      </td>
      <td className="px-4 py-2 text-center">
        <StatusSelect
          value={story.status}
          onChange={(status) => onUpdate(story.id, { status })}
        />
      </td>
      <td className="px-4 py-2 text-center">
        <AssigneeSelect
          value={story.assignees}
          users={users}
          onChange={(assignees) => onUpdate(story.id, { assignees })}
        />
      </td>
      <td className="px-4 py-2 text-center">
        <EffortInput value={story.effort} onChange={(effort) => onUpdate(story.id, { effort })} />
      </td>
      <td className="px-4 py-2 text-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Could add delete functionality here
          }}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

function GroupHeader({
  label,
  count,
  estimate,
  isCollapsed,
  onToggle
}: {
  label: string;
  count: number;
  estimate: number;
  isCollapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <tr className="bg-gray-50 border-b border-gray-200">
      <td colSpan={5} className="px-4 py-2">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <span>{label}</span>
          <span className="text-xs font-normal text-gray-500 ml-2">{count}</span>
          <span className="text-xs font-normal text-gray-400 ml-auto">Estimate: {estimate}</span>
        </button>
      </td>
    </tr>
  );
}

export function BacklogTable({ initialStories, users }: BacklogTableProps) {
  const mapStoryToRow = (s: any): StoryRow => ({
    id: s.id,
    title: s.title,
    description: s.description || null,
    status: s.status,
    assignees: s.assignees || [],
    effort: s.effort || null,
    priority: s.priority,
    position: s.position,
    children: (s.children || []).map(mapStoryToRow),
    createdAt: s.createdAt,
    updatedAt: s.updatedAt
  });

  const [stories, setStories] = useState<StoryRow[]>(() =>
    initialStories.map(mapStoryToRow)
  );

  const [groupBy, setGroupBy] = useState<GroupBy>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("backlog-groupBy");
      return (saved as GroupBy) || "priority";
    }
    return "priority";
  });

  const [sortBy, setSortBy] = useState<SortBy>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("backlog-sortBy");
      return (saved as SortBy) || "priority";
    }
    return "priority";
  });

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedStory, setSelectedStory] = useState<StoryRow | null>(null);
  const [addingChildForStoryId, setAddingChildForStoryId] = useState<string | null>(null);
  const [expandedStories, setExpandedStories] = useState<Set<string>>(new Set());

  // Persist groupBy and sortBy to localStorage
  useEffect(() => {
    localStorage.setItem("backlog-groupBy", groupBy);
  }, [groupBy]);

  useEffect(() => {
    localStorage.setItem("backlog-sortBy", sortBy);
  }, [sortBy]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const updateStory = useMutation({
    mutationFn: async ({ storyId, updates }: { storyId: string; updates: Partial<StoryRow> }) => {
      const response = await fetch(`/api/stories/${storyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error("Failed to update story");
      return response.json();
    },
    onMutate: async ({ storyId, updates }) => {
      setStories((prev) => prev.map((s) => (s.id === storyId ? { ...s, ...updates } : s)));
    }
  });

  const handleUpdate = (id: string, updates: Partial<StoryRow>) => {
    updateStory.mutate({ storyId: id, updates });
  };

  const handleRowClick = (story: StoryRow) => {
    setSelectedStory(story);
  };

  const handleClosePanel = () => {
    setSelectedStory(null);
  };

  const handleAddChildInline = (parentId: string) => {
    setAddingChildForStoryId(parentId);
  };

  const handleToggleExpand = (storyId: string) => {
    setExpandedStories((prev) => {
      const next = new Set(prev);
      if (next.has(storyId)) {
        next.delete(storyId);
      } else {
        next.add(storyId);
      }
      return next;
    });
  };

  const handleCreateChild = async (parentId: string, title: string) => {
    try {
      const response = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, parentId })
      });

      if (!response.ok) throw new Error("Failed to create child story");

      const result = await response.json();
      const newChild = result.story;

      // Create a full StoryRow object for the new child
      const childStoryRow: StoryRow = {
        id: newChild.id,
        title: newChild.title,
        description: newChild.description || null,
        status: newChild.status,
        assignees: [],
        effort: newChild.effort,
        priority: newChild.priority,
        position: newChild.position,
        children: [],
        createdAt: newChild.createdAt,
        updatedAt: newChild.updatedAt
      };

      // Update the parent story's children
      setStories((prev) =>
        prev.map((s) =>
          s.id === parentId
            ? {
                ...s,
                children: [...s.children, childStoryRow]
              }
            : s
        )
      );

      // Update selected story if it's the parent
      if (selectedStory?.id === parentId) {
        setSelectedStory((prev) =>
          prev
            ? {
                ...prev,
                children: [...prev.children, childStoryRow]
              }
            : null
        );
      }

      // Auto-expand the parent to show the new child
      setExpandedStories((prev) => {
        const next = new Set(prev);
        next.add(parentId);
        return next;
      });

      setAddingChildForStoryId(null);
    } catch (error) {
      console.error("Error creating child story:", error);
    }
  };

  const handleDeleteChild = async (childId: string) => {
    try {
      const response = await fetch(`/api/stories/${childId}`, {
        method: "DELETE"
      });

      if (!response.ok) throw new Error("Failed to delete child story");

      // Remove child from all stories
      setStories((prev) =>
        prev.map((s) => ({
          ...s,
          children: s.children.filter((c) => c.id !== childId)
        }))
      );

      // Update selected story
      if (selectedStory) {
        setSelectedStory({
          ...selectedStory,
          children: selectedStory.children.filter((c) => c.id !== childId)
        });
      }
    } catch (error) {
      console.error("Error deleting child story:", error);
    }
  };

  const handlePanelUpdate = (id: string, updates: Partial<StoryRow>) => {
    // Update local state
    setStories((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));

    // Update selected story
    if (selectedStory?.id === id) {
      setSelectedStory((prev) => (prev ? { ...prev, ...updates } : null));
    }

    // Persist to server
    updateStory.mutate({ storyId: id, updates });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    setStories((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      
      // Update positions
      const updatedItems = newItems.map((item, index) => ({ ...item, position: index }));

      // Update position on server
      updateStory.mutate({
        storyId: active.id as string,
        updates: { position: newIndex }
      });

      return updatedItems;
    });

    setActiveId(null);
  };

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  const groupedStories = useMemo(() => {
    // First, sort the stories
    const sortedStories = [...stories].sort((a, b) => {
      switch (sortBy) {
        case "priority":
          return a.priority - b.priority;
        case "position":
          return a.position - b.position;
        case "effort":
          return (a.effort || 0) - (b.effort || 0);
        case "status": {
          const statusOrder: Record<string, number> = {
            BACKLOG: 0,
            READY: 1,
            IN_PROGRESS: 2,
            BLOCKED: 3,
            REVIEW: 4,
            DONE: 5,
            ARCHIVED: 6,
            NO_STATUS: 7
          };
          const aStatus = a.status || "NO_STATUS";
          const bStatus = b.status || "NO_STATUS";
          return statusOrder[aStatus] - statusOrder[bStatus];
        }
        default:
          return 0;
      }
    });

    if (groupBy === "none") {
      return { Ungrouped: sortedStories };
    }

    const groups: Record<string, StoryRow[]> = {};

    sortedStories.forEach((story) => {
      let key = "";
      if (groupBy === "status") {
        key = story.status || "NO_STATUS";
      } else if (groupBy === "priority") {
        key = story.priority.toString();
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(story);
    });

    return groups;
  }, [stories, groupBy, sortBy]);

  const activeStory = activeId ? stories.find((s) => s.id === activeId) : null;

  return (
    <div className="flex h-full">
      <div className={clsx("flex-1 bg-white border border-gray-200 rounded-lg overflow-hidden transition-all", selectedStory ? "mr-4" : "")}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="none">No Grouping</option>
              <option value="priority">Group by Priority</option>
              <option value="status">Group by Status</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="priority">Sort by Priority</option>
              <option value="position">Sort by Position</option>
              <option value="effort">Sort by Effort</option>
              <option value="status">Sort by Status</option>
            </select>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Add item
          </button>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Assignees
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Effort
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedStories).map(([groupKey, groupStories]) => {
                const isCollapsed = collapsedGroups.has(groupKey);
                const estimate = groupStories.reduce((sum, s) => sum + (s.effort || 0), 0);

                let groupLabel = groupKey;
                if (groupBy === "status") {
                  groupLabel = STATUS_LABELS[groupKey as keyof typeof STATUS_LABELS] || groupKey;
                } else if (groupBy === "priority") {
                  groupLabel = PRIORITY_LABELS[parseInt(groupKey)] || `Priority ${groupKey}`;
                }

                return (
                  <SortableContext
                    key={groupKey}
                    items={groupStories.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {groupBy !== "none" && (
                      <GroupHeader
                        label={groupLabel}
                        count={groupStories.length}
                        estimate={estimate}
                        isCollapsed={isCollapsed}
                        onToggle={() => toggleGroup(groupKey)}
                      />
                    )}
                    {!isCollapsed &&
                      groupStories.map((story) => {
                        const isExpanded = expandedStories.has(story.id);
                        return (
                          <Fragment key={story.id}>
                            <SortableRow
                              story={story}
                              users={users}
                              onUpdate={handleUpdate}
                              onRowClick={handleRowClick}
                              onAddChild={handleAddChildInline}
                              isExpanded={isExpanded}
                              onToggleExpand={handleToggleExpand}
                            />
                            {addingChildForStoryId === story.id && (
                              <InlineChildStoryForm
                                key={`child-form-${story.id}`}
                                parentId={story.id}
                                onSave={handleCreateChild}
                                onCancel={() => setAddingChildForStoryId(null)}
                              />
                            )}
                            {isExpanded &&
                              story.children.map((child) => (
                                <ChildStoryRow
                                  key={child.id}
                                  story={child}
                                  users={users}
                                  onUpdate={handleUpdate}
                                  onRowClick={handleRowClick}
                                />
                              ))}
                          </Fragment>
                        );
                      })}
                  </SortableContext>
                );
              })}
            </tbody>
          </table>

          <DragOverlay>
            {activeStory ? (
              <div className="bg-white border-2 border-blue-400 rounded shadow-lg p-3 opacity-90">
                <div className="text-sm font-medium">{activeStory.title}</div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {selectedStory && (
        <StoryDetailPanel
          story={selectedStory}
          users={users}
          onClose={handleClosePanel}
          onUpdate={handlePanelUpdate}
          onCreateChild={handleCreateChild}
          onDeleteChild={handleDeleteChild}
        />
      )}
    </div>
  );
}
