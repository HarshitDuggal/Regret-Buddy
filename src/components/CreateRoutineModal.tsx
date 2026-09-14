"use client";

import { useState } from "react";
import { useTaskStore } from "@/store/taskStore";
import type { TaskList } from "@/types/task";
import { v4 as uuid } from "uuid";
import BottomSheet from "./BottomSheet";

const EMOJI_PRESETS = [
  "📋", "🏠", "🏖️", "💼", "📚", "🎵", "💪", "🧘", "🎯",
  "⚡", "🔥", "🌙", "☀️", "🎮", "🧠", "❤️", "🚀", "🌿",
  "🎓", "🛠️",
];

export default function CreateRoutineModal({
  close,
  editingList,
}: {
  close: () => void;
  editingList?: TaskList | null;
}) {
  const { createTaskList, updateTaskList } = useTaskStore();

  const [name, setName] = useState(editingList?.name || "");
  const [emoji, setEmoji] = useState(editingList?.emoji || "📋");
  const [description, setDescription] = useState(editingList?.description || "");
  const [error, setError] = useState("");

  const isEditing = !!editingList;

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Give your routine a name. Even procrastination needs a label.");
      return;
    }

    const now = new Date().toISOString();

    if (isEditing && editingList) {
      await updateTaskList({
        ...editingList,
        name: name.trim(),
        emoji,
        description: description.trim(),
        updatedAt: now,
      });
    } else {
      await createTaskList({
        id: uuid(),
        name: name.trim(),
        emoji,
        description: description.trim(),
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    close();
  };

  return (
    <BottomSheet onClose={close}>
      <h2 style={{ margin: "0 0 20px", fontSize: 20 }}>
        {isEditing ? "Edit Routine" : "Create Routine"}
      </h2>

      {/* Emoji picker */}
      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            fontSize: 13,
            color: "var(--color-text-muted)",
            display: "block",
            marginBottom: 8,
          }}
        >
          Pick an icon
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {EMOJI_PRESETS.map((e) => (
            <button
              key={e}
              className={`chip ${emoji === e ? "active" : ""}`}
              onClick={() => setEmoji(e)}
              style={{ fontSize: 20, padding: "8px 12px" }}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            fontSize: 13,
            color: "var(--color-text-muted)",
            display: "block",
            marginBottom: 8,
          }}
        >
          Routine Name
        </label>
        <input
          className="input"
          placeholder='e.g. "Vacation Mode", "Exam Week"'
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          id="routine-name-input"
        />
      </div>

      {/* Description */}
      <div style={{ marginBottom: 20 }}>
        <label
          style={{
            fontSize: 13,
            color: "var(--color-text-muted)",
            display: "block",
            marginBottom: 8,
          }}
        >
          Description (optional)
        </label>
        <textarea
          className="input"
          placeholder="What's this routine for?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ minHeight: 60 }}
        />
      </div>

      {/* Error */}
      {error && (
        <p
          style={{
            color: "var(--color-danger)",
            fontSize: 13,
            margin: "0 0 12px",
            fontWeight: 500,
          }}
        >
          {error}
        </p>
      )}

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button className="btn btn-success btn-full" onClick={handleSubmit}>
          {isEditing ? "Save Changes ✓" : "Create Routine ✓"}
        </button>
        <button
          className="btn btn-ghost btn-full"
          onClick={close}
          style={{ fontSize: 13 }}
        >
          Cancel
        </button>
      </div>
    </BottomSheet>
  );
}
