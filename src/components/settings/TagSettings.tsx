import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTaskContext } from "@/contexts/task";
import { Tag } from "@/types/tag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Plus, Tag as TagIcon, Trash, RefreshCw } from "lucide-react";
import { useProjectContext } from "@/contexts/ProjectContext";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

const TagSettings = () => {
  const { projects } = useProjectContext();
  const { listAllTags, createTag, deleteTagPermanently, updateTagProject, renameTag, getAllTagUsageCounts, tagsVersion, refreshAllTags } = useTaskContext();

  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTagName, setNewTagName] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const usageCounts = getAllTagUsageCounts();
  const sortedTags = useMemo(() => [...tags].sort((a, b) => {
    if (a.project_id === null && b.project_id !== null) return -1;
    if (a.project_id !== null && b.project_id === null) return 1;
    const aProject = a.project_id ? projects.find((project) => project.id === a.project_id)?.name || "" : "";
    const bProject = b.project_id ? projects.find((project) => project.id === b.project_id)?.name || "" : "";
    return aProject.localeCompare(bProject) || a.name.localeCompare(b.name);
  }), [tags, projects]);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [tagBeingEdited, setTagBeingEdited] = useState<Tag | null>(null);
  const [editedTagName, setEditedTagName] = useState("");
  const [editedTagProject, setEditedTagProject] = useState<string | null>(null);

  const loadTags = useCallback(async () => {
    setLoading(true);
    try {
      setTags(await listAllTags(undefined));
    } catch (error) {
      console.error("Error loading tags:", error);
    } finally {
      setLoading(false);
    }
  }, [listAllTags]);

  const handleRefreshTags = useCallback(async () => {
    setRefreshing(true);
    try {
      const success = await refreshAllTags();
      toast(success ? {
        title: "刷新成功",
        description: "标签数据已更新",
      } : {
        title: "刷新失败",
        description: "无法刷新标签数据",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  }, [refreshAllTags]);

  useEffect(() => {
    void loadTags();
  }, [loadTags, tagsVersion]);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    await createTag(newTagName.trim());
    setNewTagName("");
  };

  const handleDeleteTag = async (tagId: string) => {
    await deleteTagPermanently(tagId);
  };

  const openEditDialog = (tag: Tag) => {
    setTagBeingEdited(tag);
    setEditedTagName(tag.name);
    setEditedTagProject(tag.project_id);
    setEditDialogOpen(true);
  };

  const handleUpdateTag = async () => {
    if (!tagBeingEdited || !editedTagName.trim()) return;

    if (editedTagName !== tagBeingEdited.name) {
      await renameTag(tagBeingEdited.id, editedTagName);
    }

    if (editedTagProject !== tagBeingEdited.project_id) {
      await updateTagProject(tagBeingEdited.id, editedTagProject);
    }

    setEditDialogOpen(false);
  };

  const getProjectName = (projectId: string | null) => {
    if (projectId === null) return "全局（所有项目）";
    const project = projects.find((item) => item.id === projectId);
    return project?.name || "未知项目";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">标签管理</h2>
          <p className="text-muted-foreground">
            管理所有标签及其关联的项目
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshTags}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          刷新标签数据
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Input
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          placeholder="输入新标签名称"
          onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
          className="max-w-xs"
        />
        <Button
          onClick={handleCreateTag}
          disabled={!newTagName.trim()}
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          创建标签
        </Button>
      </div>

      {loading ? (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标签名</TableHead>
                <TableHead>使用次数</TableHead>
                <TableHead>可见范围</TableHead>
                <TableHead className="w-24">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array(5).fill(0).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="flex items-center">
                      <Skeleton className="h-4 w-4 mr-2 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-12 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded-md" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标签名</TableHead>
                <TableHead>使用次数</TableHead>
                <TableHead>可见范围</TableHead>
                <TableHead className="w-24">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTags.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6">
                    没有创建任何标签
                  </TableCell>
                </TableRow>
              ) : (
                sortedTags.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell className="font-medium flex items-center">
                      <TagIcon className="w-4 h-4 mr-2 text-gray-500" />
                      {tag.name}
                    </TableCell>
                    <TableCell>
                      {usageCounts[tag.id] ? (
                        <Badge variant="secondary">{usageCounts[tag.id]}</Badge>
                      ) : (
                        <span className="text-gray-500 text-sm">未使用</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getProjectName(tag.project_id)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(tag)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>删除标签？</AlertDialogTitle>
                              <AlertDialogDescription>
                                {usageCounts[tag.id] && usageCounts[tag.id] > 0
                                  ? `该标签正在被 ${usageCounts[tag.id]} 个任务使用。是否强制删除？此操作会从所有相关任务中移除该标签。`
                                  : "此操作将删除该标签，是否继续？"}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteTag(tag.id)}>
                                删除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>编辑标签</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tagName" className="text-right">
                标签名
              </Label>
              <Input
                id="tagName"
                value={editedTagName}
                onChange={(e) => setEditedTagName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="projectScope" className="text-right">
                可见范围
              </Label>
              <Select
                value={editedTagProject === null ? "global" : editedTagProject}
                onValueChange={(value) => setEditedTagProject(value === "global" ? null : value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="选择项目" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">全局（所有项目）</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateTag} disabled={!editedTagName.trim()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TagSettings;