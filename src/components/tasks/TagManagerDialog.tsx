import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TagSelector from "./TagSelector";

interface TagManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  projectId?: string | null;
}

const TagManagerDialog: React.FC<TagManagerDialogProps> = ({ open, onOpenChange, taskId, projectId }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>管理标签</DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          <TagSelector taskId={taskId} projectId={projectId ?? undefined} inline />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TagManagerDialog;


