import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/ui/icon-park";

export type ImportMode = 'merge' | 'replace';

interface ImportModeDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (mode: ImportMode) => void;
  filename?: string;
}

const ImportModeDialog: React.FC<ImportModeDialogProps> = ({
  open,
  onClose,
  onConfirm,
  filename,
}) => {
  const [selectedMode, setSelectedMode] = useState<ImportMode>('merge');

  const handleConfirm = () => {
    onConfirm(selectedMode);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>选择导入模式</DialogTitle>
          <DialogDescription>
            {filename && (
              <span className="block mt-1 text-sm">
                文件: <span className="font-medium">{filename}</span>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup
            value={selectedMode}
            onValueChange={(value) => setSelectedMode(value as ImportMode)}
            className="space-y-4"
          >
            <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer"
                 onClick={() => setSelectedMode('merge')}>
              <RadioGroupItem value="merge" id="merge" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="merge" className="flex items-center gap-2 cursor-pointer font-medium">
                  <Icon icon="merge" className="h-4 w-4 text-blue-500" />
                  合并数据
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  保留现有数据，将备份中的数据合并进来。相同 ID 的记录会被更新，新记录会被添加。
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 cursor-pointer"
                 onClick={() => setSelectedMode('replace')}>
              <RadioGroupItem value="replace" id="replace" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="replace" className="flex items-center gap-2 cursor-pointer font-medium">
                  <Icon icon="refresh" className="h-4 w-4 text-orange-500" />
                  替换数据
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  清除所有现有数据，完全使用备份中的数据替换。
                  <span className="text-orange-600 font-medium"> 此操作不可撤销！</span>
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleConfirm}>
            开始导入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportModeDialog;
