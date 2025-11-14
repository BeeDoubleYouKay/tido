"use client";

import { useState } from "react";
import { X } from "lucide-react";

type InlineChildStoryFormProps = {
  parentId: string;
  onSave: (parentId: string, title: string) => void;
  onCancel: () => void;
};

export function InlineChildStoryForm({ parentId, onSave, onCancel }: InlineChildStoryFormProps) {
  const [title, setTitle] = useState("");

  const handleSave = () => {
    if (title.trim()) {
      onSave(parentId, title.trim());
      setTitle("");
    }
  };

  return (
    <tr className="bg-blue-50 border-b border-blue-200">
      <td colSpan={5} className="px-4 py-3">
        <div className="flex items-center gap-2 pl-8">
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") onCancel();
              }}
              placeholder="Enter child story title..."
              autoFocus
              className="flex-1 px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
            >
              Add
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}
