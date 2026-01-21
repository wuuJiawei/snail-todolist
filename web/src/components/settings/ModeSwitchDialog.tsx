import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { StorageMode } from "@/config/storage";

interface ModeSwitchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetMode: StorageMode;
  onConfirm: () => void;
}

const ModeSwitchDialog = ({
  open,
  onOpenChange,
  targetMode,
  onConfirm,
}: ModeSwitchDialogProps) => {
  const isToOffline = targetMode === "offline";
  const targetModeLabel = isToOffline ? "离线模式" : "在线模式";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>切换到{targetModeLabel}？</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              切换存储模式后，您的数据<strong>不会自动迁移</strong>。
            </p>
            <p>
              {isToOffline
                ? "离线模式的数据存储在本地浏览器中，与云端数据完全隔离。"
                : "在线模式的数据存储在云端，与本地数据完全隔离。"}
            </p>
            <p className="text-amber-600 dark:text-amber-400">
              建议：切换前先导出当前数据，切换后可通过导入功能恢复。
            </p>
            {!isToOffline && (
              <p className="text-muted-foreground">
                切换到在线模式后，您需要重新登录。
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            确认切换
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ModeSwitchDialog;
