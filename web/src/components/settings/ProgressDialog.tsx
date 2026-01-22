import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Icon } from "@/components/ui/icon-park";
import { cn } from "@/lib/utils";

export type ProgressStatus = 'loading' | 'success' | 'error';

interface ProgressDialogProps {
  open: boolean;
  title: string;
  progress: number;
  message: string;
  onClose?: () => void;
  canClose: boolean;
  status: ProgressStatus;
  errorMessage?: string;
  successMessage?: string;
}

const ProgressDialog: React.FC<ProgressDialogProps> = ({
  open,
  title,
  progress,
  message,
  onClose,
  canClose,
  status,
  errorMessage,
  successMessage,
}) => {
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && canClose && onClose) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => !canClose && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {status === 'loading' && (
              <Icon icon="loading-one" className="h-5 w-5 animate-spin text-blue-500" />
            )}
            {status === 'success' && (
              <Icon icon="check-one" className="h-5 w-5 text-green-500" />
            )}
            {status === 'error' && (
              <Icon icon="close-one" className="h-5 w-5 text-red-500" />
            )}
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {status === 'loading' && (
            <>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{message}</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="rounded-full bg-green-100 p-3">
                <Icon icon="check-one" className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {successMessage || '操作完成'}
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="rounded-full bg-red-100 p-3">
                <Icon icon="close-one" className="h-8 w-8 text-red-600" />
              </div>
              <p className="text-center text-sm text-red-600">
                {errorMessage || '操作失败'}
              </p>
            </div>
          )}
        </div>

        {canClose && (
          <DialogFooter>
            <Button onClick={onClose} variant={status === 'error' ? 'destructive' : 'default'}>
              {status === 'error' ? '关闭' : '完成'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProgressDialog;
