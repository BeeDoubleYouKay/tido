"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";

import type { StoryStatusValue } from "@/lib/story-validation";

type User = {
  id: string;
  email: string;
  name: string | null;
};

type ChildStory = {
  id: string;
  title: string;
  description: string | null;
  status: StoryStatusValue | null;
  assignees: User[];
  effort: number | null;
  priority: number;
  position: number;
  children: ChildStory[];
  createdAt: string;
  updatedAt: string;
};

type StoryDetails = {
  id: string;
  title: string;
  description: string | null;
  status: StoryStatusValue | null;
  priority: number;
  effort: number | null;
  assignees: User[];
  children: ChildStory[];
  createdAt: string;
  updatedAt: string;
};

type StoryDetailPanelProps = {
  story: StoryDetails;
  users: User[];
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<StoryDetails>) => void;
  onCreateChild: (parentId: string, title: string) => void;
  onDeleteChild: (childId: string) => void;
};

const STATUS_OPTIONS: { value: StoryStatusValue | "NO_STATUS"; label: string }[] = [
  { value: "NO_STATUS", label: "No Status" },
  { value: "BACKLOG", label: "Backlog" },
  { value: "READY", label: "Ready" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "REVIEW", label: "In Review" },
  { value: "DONE", label: "Done" },
  { value: "ARCHIVED", label: "Archived" }
];

const PRIORITY_OPTIONS = [
  { value: 1, label: "High" },
  { value: 2, label: "Medium" },
  { value: 3, label: "Normal" },
  { value: 4, label: "Low" }
];

export function StoryDetailPanel({
  story,
  users,
  onClose,
  onUpdate,
  onCreateChild,
  onDeleteChild
}: StoryDetailPanelProps) {
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [newChildTitle, setNewChildTitle] = useState("");

  const handleAddChild = () => {
    if (newChildTitle.trim()) {
      onCreateChild(story.id, newChildTitle.trim());
      setNewChildTitle("");
      setIsAddingChild(false);
    }
  };

  const handleAssigneeToggle = (user: User) => {
    const isAssigned = story.assignees.some((a) => a.id === user.id);
    const newAssignees = isAssigned
      ? story.assignees.filter((a) => a.id !== user.id)
      : [...story.assignees, user];
    onUpdate(story.id, { assignees: newAssignees });
  };

  return (
    <div className="w-96 h-full bg-white border-l border-gray-200 flex flex-col shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Story Details</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
            Title
          </label>
          <input
            type="text"
            value={story.title}
            onChange={(e) => onUpdate(story.id, { title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
            Description
          </label>
          <textarea
            value={story.description || ""}
            onChange={(e) => onUpdate(story.id, { description: e.target.value })}
            rows={4}
            placeholder="Add a description..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
            Status
          </label>
          <select
            value={story.status || "NO_STATUS"}
            onChange={(e) => {
              const val =
                e.target.value === "NO_STATUS" ? null : (e.target.value as StoryStatusValue);
              onUpdate(story.id, { status: val });
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
            Priority
          </label>
          <select
            value={story.priority}
            onChange={(e) => onUpdate(story.id, { priority: parseInt(e.target.value, 10) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Effort */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
            Effort (Story Points)
          </label>
          <input
            type="number"
            min="0"
            value={story.effort || ""}
            onChange={(e) => {
              const val = e.target.value === "" ? null : parseInt(e.target.value, 10);
              onUpdate(story.id, { effort: val });
            }}
            placeholder="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* Assignees */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
            Assignees
          </label>
          <div className="space-y-2">
            {users.map((user) => {
              const isAssigned = story.assignees.some((a) => a.id === user.id);
              return (
                <button
                  key={user.id}
                  onClick={() => handleAssigneeToggle(user)}
                  className={clsx(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md border transition-colors text-sm",
                    isAssigned
                      ? "bg-blue-50 border-blue-200 text-blue-900"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <input type="checkbox" checked={isAssigned} readOnly className="rounded" />
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center flex-shrink-0">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 text-left">{user.name || user.email}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Child Stories */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Child Stories ({story.children.length})
            </label>
            <button
              onClick={() => setIsAddingChild(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add Child
            </button>
          </div>

          <div className="space-y-2">
            {story.children.map((child) => (
              <div
                key={child.id}
                className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md group"
              >
                <div className="flex-1">
                  <div className="text-sm text-gray-900">{child.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    {child.status && (
                      <span className="text-xs text-gray-500">{child.status}</span>
                    )}
                    {child.effort && (
                      <span className="text-xs text-gray-500">{child.effort} pts</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onDeleteChild(child.id)}
                  className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {isAddingChild && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newChildTitle}
                  onChange={(e) => setNewChildTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddChild();
                    if (e.key === "Escape") {
                      setIsAddingChild(false);
                      setNewChildTitle("");
                    }
                  }}
                  placeholder="Child story title..."
                  autoFocus
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button
                  onClick={handleAddChild}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setIsAddingChild(false);
                    setNewChildTitle("");
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            )}

            {story.children.length === 0 && !isAddingChild && (
              <p className="text-sm text-gray-400 italic py-2">No child stories yet</p>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="pt-4 border-t border-gray-200 space-y-1 text-xs text-gray-500">
          <div>Created: {new Date(story.createdAt).toLocaleString()}</div>
          <div>Updated: {new Date(story.updatedAt).toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
