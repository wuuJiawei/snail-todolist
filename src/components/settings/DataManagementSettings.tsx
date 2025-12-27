import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon-park";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { exportData, importData, validateBackupFile } from "@/services/dataTransferService";
import ProgressDialog, { ProgressStatus } from "./ProgressDialog";
import ImportModeDialog, { ImportMode } from "./ImportModeDialog";
import ModeSwitchDialog from "./ModeSwitchDialog";
import { useProjectContext } from "@/contexts/ProjectContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { getStorageConfig, setStorageMode, type StorageMode } from "@/config/storage";
import { useAuth } from "@/contexts/AuthContext";
import { Cloud, HardDrive } from "lucide-react";
import { navigateWithReload } from "@/utils/runtime";

const DataManagementSettings = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { refreshProjects } = useProjectContext();
  const queryClient = useQueryClient();
  const { signOut } = useAuth();

  // Storage mode state
  const currentConfig = getStorageConfig();
  const [showModeSwitchDialog, setShowModeSwitchDialog] = useState(false);
  const [targetMode, setTargetMode] = useState<StorageMode>("supabase");

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
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
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

  const handleModeChange = (newMode: string) => {
    if (newMode === currentConfig.mode) return;
    setTargetMode(newMode as StorageMode);
    setShowModeSwitchDialog(true);
  };

  const handleConfirmModeSwitch = async () => {
    setShowModeSwitchDialog(false);
    
    // If switching from online to offline, sign out first
    if (currentConfig.mode === "supabase" && targetMode === "offline") {
      await signOut();
    }
    
    // Set the new mode
    setStorageMode(targetMode);
    
    // Show toast and reload
    toast({
      title: "存储模式已切换",
      description: "页面将重新加载以应用新设置",
    });
    
    // Reload to apply new storage mode
    setTimeout(() => {
      navigateWithReload("/");
    }, 500);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">数据管理</h1>

      {/* Storage Mode Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentConfig.isOfflineMode ? (
              <HardDrive className="h-5 w-5" />
            ) : (
              <Cloud className="h-5 w-5" />
            )}
            存储模式
          </CardTitle>
          <CardDescription>
            选择数据存储位置。切换模式后数据不会自动迁移。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={currentConfig.mode}
            onValueChange={handleModeChange}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="supabase" id="mode-online" />
              <Label htmlFor="mode-online" className="flex items-center gap-2 cursor-pointer">
                <Cloud className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="font-medium">在线模式</div>
                  <div className="text-sm text-muted-foreground">
                    数据存储在云端，支持多设备同步
                  </div>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="offline" id="mode-offline" />
              <Label htmlFor="mode-offline" className="flex items-center gap-2 cursor-pointer">
                <HardDrive className="h-4 w-4 text-green-500" />
                <div>
                  <div className="font-medium">离线模式</div>
                  <div className="text-sm text-muted-foreground">
                    数据存储在本地浏览器，无需登录
                  </div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

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

      {/* Mode Switch Confirmation Dialog */}
      <ModeSwitchDialog
        open={showModeSwitchDialog}
        onOpenChange={setShowModeSwitchDialog}
        targetMode={targetMode}
        onConfirm={handleConfirmModeSwitch}
      />
    </div>
  );
};

export default DataManagementSettings;
