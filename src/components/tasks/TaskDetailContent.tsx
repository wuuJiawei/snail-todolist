import React, { useRef } from "react";
import MilkdownEditor from "./MilkdownEditor";
import TaskAttachments from "./TaskAttachments";
import type { TaskAttachment } from "@/types/task";

export type EditorBridge = {
  blocksToMarkdownLossy: () => Promise<string>;
  focus: () => void;
};

export interface TaskDetailContentProps {
  taskId: string;
  editorContent: string;
  isTaskInTrash: boolean;
  isEditorUpdating: boolean;
  onEditorChange: (content: string) => void;
  onEditorReady: (bridge: EditorBridge | null) => void;
  attachments: TaskAttachment[];
  onAttachmentsChange: (attachments: TaskAttachment[]) => void;
}

const TaskDetailContent: React.FC<TaskDetailContentProps> = ({
  taskId,
  editorContent,
  isTaskInTrash,
  isEditorUpdating,
  onEditorChange,
  onEditorReady,
  attachments,
  onAttachmentsChange,
}) => {
  const editorBridgeRef = useRef<EditorBridge | null>(null);

  const handleEditorReady = (bridge: EditorBridge | null) => {
    editorBridgeRef.current = bridge;
    onEditorReady(bridge);
  };

  const handleShellClick = () => {
    editorBridgeRef.current?.focus?.();
  };
  return (
    <div className="task-editor-shell flex-1 flex flex-col gap-4" onClick={handleShellClick}>
      <div className="w-full flex-1 overflow-visible relative">
        {!isEditorUpdating && (
          <MilkdownEditor
            taskId={taskId}
            content={editorContent}
            onChange={onEditorChange}
            readOnly={isTaskInTrash}
            onEditorReady={handleEditorReady}
            attachments={attachments}
            onAttachmentsChange={onAttachmentsChange}
          />
        )}
        {isTaskInTrash && (
          <div className="mt-4 p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
            <p>此任务已在垃圾桶中，无法编辑。如需编辑，请先恢复任务。</p>
          </div>
        )}
      </div>
      <TaskAttachments
        attachments={attachments}
        onAttachmentsChange={onAttachmentsChange}
        readOnly={isTaskInTrash}
      />
    </div>
  );
};

export default TaskDetailContent;
