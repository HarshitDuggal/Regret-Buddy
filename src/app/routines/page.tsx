"use client";

import { useEffect, useState } from "react";
import { useTaskStore } from "@/store/taskStore";
import type { TaskList } from "@/types/task";
import RoutineCard from "@/components/RoutineCard";
import CreateRoutineModal from "@/components/CreateRoutineModal";
import RoutineTaskList from "@/components/RoutineTaskList";

export default function RoutinesPage() {
  const { taskLists, initialize, isLoading } = useTaskStore();
  const [showCreate, setShowCreate] = useState(false);
  const [editingList, setEditingList] = useState<TaskList | null>(null);
  const [viewingList, setViewingList] = useState<TaskList | null>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <main style={{ padding: "var(--space-md)", maxWidth: 640, margin: "0 auto" }}>
        <p style={{ color: "var(--color-text-muted)", textAlign: "center", marginTop: 100 }}>
          Loading routines...
        </p>
      </main>
    );
  }

  // Viewing a specific routine's tasks
  if (viewingList) {
    return (
      <main style={{ padding: "var(--space-md)", maxWidth: 640, margin: "0 auto" }}>
        <div style={{ paddingTop: "var(--space-sm)" }}>
          <RoutineTaskList
            taskListId={viewingList.id}
            listName={`${viewingList.emoji} ${viewingList.name}`}
            onBack={() => setViewingList(null)}
          />
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: "var(--space-md)", maxWidth: 640, margin: "0 auto" }}>
      <header style={{ marginBottom: 24, paddingTop: "var(--space-sm)" }}>
        <h1 style={{ margin: "0 0 4px" }}>Routines</h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: 14, margin: 0 }}>
          Build your systems. Apply them daily.
        </p>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {taskLists.map((list) => (
          <RoutineCard
            key={list.id}
            list={list}
            onEdit={(l) => setEditingList(l)}
            onViewTasks={(l) => setViewingList(l)}
          />
        ))}
      </div>

      {/* Create routine button */}
      <button
        className="btn btn-primary btn-full"
        onClick={() => setShowCreate(true)}
        style={{ marginTop: 16 }}
        id="create-routine-btn"
      >
        + Create New Routine
      </button>

      {/* Create modal */}
      {showCreate && (
        <CreateRoutineModal close={() => setShowCreate(false)} />
      )}

      {/* Edit modal */}
      {editingList && (
        <CreateRoutineModal
          close={() => setEditingList(null)}
          editingList={editingList}
        />
      )}
    </main>
  );
}
