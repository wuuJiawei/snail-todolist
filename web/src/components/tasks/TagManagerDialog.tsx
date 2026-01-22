import React from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TagSelector from "./TagSelector";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";

interface TagManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  projectId?: string | null;
}

const TagManagerDialog: React.FC<TagManagerDialogProps> = ({ open, onOpenChange, taskId, projectId }) => {
  const navigate = useNavigate();
  
  const handleGoToTagSettings = () => {
    onOpenChange(false); // Close this dialog
    navigate("/settings", { state: { activeTab: "tags" } });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>管理标签</DialogTitle>
        </DialogHeader>
        <div className="mt-2">
          <TagSelector taskId={taskId} projectId={projectId ?? undefined} inline />
        </div>
        <DialogFooter className="mt-4">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex gap-2 items-center" 
            onClick={handleGoToTagSettings}
          >
            <Settings className="w-4 h-4" />
            高级标签管理
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TagManagerDialog;


