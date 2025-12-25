import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon-park";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { exportData, importData, validateBackupFile } from "@/services/dataTransferService";
import ProgressDialog, { ProgressStatus } from "./ProgressDialog";
import ImportModeDialog, { ImportMode } from "./ImportModeDialog";
import { useProjectContext } from "@/contexts/ProjectContext";
import { useTaskContext } from "@/contexts/task";
import { toast } from "@/hooks/use-toast";

const DataManagementSettings = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { refreshProjects } = useProjectContext();
  const { refreshTasks } = useTaskContext();

  // Export state
  const [exportProgress, setExportProgress] = useState(0);
  const [exportMessage, setExportMessage] = useState("");
  const [exportStatus, setExportStatus] = useState<ProgressStatus>("loading");
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportError, setExportError] = useState<string>();
  const [exportSuccess, setExportSuccess] = useState<string>();

  // Import state
  const [importProgress, setImportProgress] = useState(0);
  const [importMessage, setImportMessage] = useState("");
  const [importStatus, setImportStatus] = useState<ProgressStatus>("loading");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importError, setImportError] = useState<string>();
  const [importSuccess, setImportSuccess] = useState<string>();

  // Import mode dialog state
  const [showModeDialog, setShowModeDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleExport = async () => {
    setExportProgress(0);
    setExportMessage("准备导出...");
    setExportStatus("loading");
    setExportError(undefined);
    setExportSuccess(undefined);
    setShowExportDialog(true);

    const result = await exportData({
      onProgress: (progress, message) => {
        setExportProgress(progress);
        setExportMessage(message);
      },
    });

    if (result.success) {
      setExportStatus("success");
      setExportSuccess(`数据已成功导出为 ${result.filename}`);
    } else {
      setExportStatus("error");
      setExportError(result.error || "导出失败");
    }
  };


  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file first
    const validation = await validateBackupFile(file);
    if (!validation.valid) {
      toast({
        title: "文件无效",
        description: validation.error,
        variant: "destructive",
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setSelectedFile(file);
    setShowModeDialog(true);
  };

  const handleImportConfirm = async (mode: ImportMode) => {
    if (!selectedFile) return;

    setShowModeDialog(false);
    setImportProgress(0);
    setImportMessage("准备导入...");
    setImportStatus("loading");
    setImportError(undefined);
    setImportSuccess(undefined);
    setShowImportDialog(true);

    const result = await importData(selectedFile, {
      mode,
      onProgress: (progress, message) => {
        setImportProgress(progress);
        setImportMessage(message);
      },
    });

    if (result.success) {
      setImportStatus("success");
      const stats = result.stats!;
      setImportSuccess(
        `成功导入 ${stats.projects} 个清单、${stats.tasks} 个任务、${stats.tags} 个标签`
      );
      // Refresh app state
      await refreshProjects();
      await refreshTasks();
    } else {
      setImportStatus("error");
      setImportError(result.error || "导入失败");
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setSelectedFile(null);
  };

  const handleModeDialogClose = () => {
    setShowModeDialog(false);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">数据管理</h1>

      <Alert>
        <Icon icon="info" className="h-4 w-4" />
        <AlertDescription>
          导出的数据包含您的所有清单、任务和标签。您可以使用导出的文件进行数据备份，或将数据迁移到其他设备。
        </AlertDescription>
      </Alert>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon icon="download" className="h-5 w-5" />
            导出数据
          </CardTitle>
          <CardDescription>
            将所有数据导出为压缩包文件，可用于备份或迁移
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              导出内容包括：
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>所有清单及其设置</li>
                <li>所有任务（包括已完成和已删除的）</li>
                <li>所有标签及任务关联</li>
              </ul>
            </div>
            <Button onClick={handleExport}>
              <Icon icon="download" className="mr-2 h-4 w-4" />
              导出数据
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon icon="upload" className="h-5 w-5" />
            导入数据
          </CardTitle>
          <CardDescription>
            从备份文件中恢复数据
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              支持导入由本应用导出的 .zip 备份文件。导入时可选择：
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>合并</strong> - 保留现有数据，添加或更新备份中的数据</li>
                <li><strong>替换</strong> - 清除现有数据，完全使用备份数据</li>
              </ul>
            </div>
            <div>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleFileSelect}
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                仅支持 .zip 格式的备份文件
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Progress Dialog */}
      <ProgressDialog
        open={showExportDialog}
        title="导出数据"
        progress={exportProgress}
        message={exportMessage}
        status={exportStatus}
        canClose={exportStatus !== "loading"}
        onClose={() => setShowExportDialog(false)}
        errorMessage={exportError}
        successMessage={exportSuccess}
      />

      {/* Import Progress Dialog */}
      <ProgressDialog
        open={showImportDialog}
        title="导入数据"
        progress={importProgress}
        message={importMessage}
        status={importStatus}
        canClose={importStatus !== "loading"}
        onClose={() => setShowImportDialog(false)}
        errorMessage={importError}
        successMessage={importSuccess}
      />

      {/* Import Mode Selection Dialog */}
      <ImportModeDialog
        open={showModeDialog}
        onClose={handleModeDialogClose}
        onConfirm={handleImportConfirm}
        filename={selectedFile?.name}
      />
    </div>
  );
};

export default DataManagementSettings;
