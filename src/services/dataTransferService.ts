/**
 * Data Transfer Service
 * Handles export and import of user data as ZIP files
 */

import JSZip from 'jszip';
import { Task } from '@/types/task';
import { Project } from '@/types/project';
import { Tag, TaskTagLink } from '@/types/tag';
import { getDataProvider } from '@/data';
import { toDomainProject, toDomainTag, toDomainTask, toLegacyProject, toLegacyTag, toLegacyTask } from '@/data/models';

// ============================================
// Type Definitions
// ============================================

export type ProgressCallback = (progress: number, message: string) => void;

export interface ExportOptions {
  onProgress?: ProgressCallback;
}

export interface ImportOptions {
  mode: 'merge' | 'replace';
  onProgress?: ProgressCallback;
}

export interface ExportResult {
  success: boolean;
  filename?: string;
  error?: string;
}

export interface ImportResult {
  success: boolean;
  stats?: {
    projects: number;
    tasks: number;
    tags: number;
  };
  error?: string;
}

export interface BackupManifest {
  version: string;
  createdAt: string;
  appVersion: string;
  counts: {
    projects: number;
    tasks: number;
    tags: number;
    taskTags: number;
  };
}

interface BackupData {
  manifest: BackupManifest;
  projects: Project[];
  tasks: Task[];
  tags: Tag[];
  taskTags: TaskTagLink[];
}

// ============================================
// Constants
// ============================================

const BACKUP_VERSION = '1.1';
const APP_VERSION = '1.0.0';

// ============================================
// Helper Functions
// ============================================

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Create backup ZIP without downloading (for testing)
 */
export async function createBackupBlob(options?: ExportOptions): Promise<{ blob: Blob; filename: string } | null> {
  const { onProgress } = options || {};
  
  try {
    onProgress?.(0, '开始导出...');
    
    const data = await collectAllData(onProgress);
    const blob = await createBackupZip(data, onProgress);
    const filename = `snailtodo-backup-${formatDate(new Date())}.zip`;
    
    onProgress?.(100, '导出完成');
    
    return { blob, filename };
  } catch (error) {
    console.error('Export failed:', error);
    return null;
  }
}


// ============================================
// Data Collection
// ============================================

async function collectAllData(onProgress?: ProgressCallback): Promise<BackupData> {
  const provider = getDataProvider();
  
  onProgress?.(10, '正在收集清单数据...');
  const projects = (await provider.projects.findAll()).map(toLegacyProject);
  
  onProgress?.(30, '正在收集任务数据...');
  const tasks = (await provider.tasks.findAll({ includeDeleted: true })).map(toLegacyTask);
  
  onProgress?.(50, '正在收集标签数据...');
  const tags = (await provider.tags.findAll()).map(toLegacyTag);
  
  onProgress?.(60, '正在收集标签关联...');
  const taskIds = tasks.map(t => t.id);
  const tagsByTask = await provider.tags.findByTaskIds(taskIds);
  
  // Convert tagsByTask to TaskTagLink array
  const taskTags: TaskTagLink[] = [];
  for (const [taskId, taskTagList] of Object.entries(tagsByTask)) {
    for (const tag of taskTagList) {
      taskTags.push({
        task_id: taskId,
        tag_id: tag.id,
      });
    }
  }
  
  const manifest: BackupManifest = {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    counts: {
      projects: projects.length,
      tasks: tasks.length,
      tags: tags.length,
      taskTags: taskTags.length,
    },
  };
  
  return { manifest, projects, tasks, tags, taskTags };
}

// ============================================
// Export Functions
// ============================================

async function createBackupZip(data: BackupData, onProgress?: ProgressCallback): Promise<Blob> {
  const zip = new JSZip();
  
  onProgress?.(70, '正在创建备份文件...');
  
  zip.file('manifest.json', JSON.stringify(data.manifest, null, 2));
  zip.file('projects.json', JSON.stringify(data.projects, null, 2));
  zip.file('tasks.json', JSON.stringify(data.tasks, null, 2));
  zip.file('tags.json', JSON.stringify(data.tags, null, 2));
  zip.file('task_tags.json', JSON.stringify(data.taskTags, null, 2));
  
  onProgress?.(80, '正在压缩数据...');
  
  const blob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    (metadata) => {
      const progress = 80 + (metadata.percent / 100) * 20;
      onProgress?.(Math.round(progress), '正在压缩数据...');
    }
  );
  
  return blob;
}

export async function exportData(options?: ExportOptions): Promise<ExportResult> {
  const { onProgress } = options || {};
  
  try {
    onProgress?.(0, '开始导出...');
    
    const data = await collectAllData(onProgress);
    const blob = await createBackupZip(data, onProgress);
    
    const filename = `snailtodo-backup-${formatDate(new Date())}.zip`;
    downloadBlob(blob, filename);
    
    onProgress?.(100, '导出完成');
    
    return { success: true, filename };
  } catch (error) {
    console.error('Export failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '导出失败，请稍后再试',
    };
  }
}


// ============================================
// Import Functions
// ============================================

export async function validateBackupFile(file: File): Promise<{ valid: boolean; error?: string; manifest?: BackupManifest }> {
  try {
    const zip = await JSZip.loadAsync(file);
    
    // Check required files
    const requiredFiles = ['manifest.json', 'projects.json', 'tasks.json', 'tags.json', 'task_tags.json'];
    for (const filename of requiredFiles) {
      if (!zip.file(filename)) {
        return { valid: false, error: `备份文件缺少必要文件: ${filename}` };
      }
    }
    
    // Parse and validate manifest
    const manifestContent = await zip.file('manifest.json')!.async('string');
    const manifest = JSON.parse(manifestContent) as BackupManifest;
    
    if (!manifest.version || !manifest.createdAt) {
      return { valid: false, error: '备份文件格式无效' };
    }
    
    return { valid: true, manifest };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { valid: false, error: '备份文件数据格式错误' };
    }
    return { valid: false, error: '无法读取备份文件，文件可能已损坏' };
  }
}

async function parseBackupZip(file: File): Promise<BackupData> {
  const zip = await JSZip.loadAsync(file);
  
  const manifestContent = await zip.file('manifest.json')!.async('string');
  const projectsContent = await zip.file('projects.json')!.async('string');
  const tasksContent = await zip.file('tasks.json')!.async('string');
  const tagsContent = await zip.file('tags.json')!.async('string');
  const taskTagsContent = await zip.file('task_tags.json')!.async('string');
  
  return {
    manifest: JSON.parse(manifestContent),
    projects: JSON.parse(projectsContent),
    tasks: JSON.parse(tasksContent),
    tags: JSON.parse(tagsContent),
    taskTags: JSON.parse(taskTagsContent),
  };
}

async function clearAllData(onProgress?: ProgressCallback): Promise<void> {
  const provider = getDataProvider();
  
  onProgress?.(15, '正在清除现有数据...');
  
  await provider.dataTransfer.clearOwnedData();
}

async function importProjects(projects: Project[], mode: 'merge' | 'replace', onProgress?: ProgressCallback): Promise<number> {
  const provider = getDataProvider();
  let imported = 0;
  
  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    const progress = 30 + (i / projects.length) * 20;
    onProgress?.(Math.round(progress), `正在导入清单 (${i + 1}/${projects.length})...`);
    
    if (mode === 'merge') {
      const existing = await provider.projects.findById(project.id);
      if (existing) {
        await provider.projects.upsert(toDomainProject(project));
      } else {
        await provider.projects.upsert(toDomainProject(project));
      }
    } else {
      await provider.projects.upsert(toDomainProject(project));
    }
    imported++;
  }
  
  return imported;
}

async function importTasks(tasks: Task[], mode: 'merge' | 'replace', onProgress?: ProgressCallback): Promise<number> {
  const provider = getDataProvider();
  let imported = 0;
  
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const progress = 50 + (i / tasks.length) * 25;
    onProgress?.(Math.round(progress), `正在导入任务 (${i + 1}/${tasks.length})...`);
    
    if (mode === 'merge') {
      const existing = await provider.tasks.findById(task.id);
      if (existing) {
        await provider.tasks.upsert(toDomainTask(task));
      } else {
        await provider.tasks.upsert(toDomainTask(task));
      }
    } else {
      await provider.tasks.upsert(toDomainTask(task));
    }
    imported++;
  }
  
  return imported;
}

async function importTags(tags: Tag[], taskTags: TaskTagLink[], mode: 'merge' | 'replace', onProgress?: ProgressCallback): Promise<number> {
  const provider = getDataProvider();
  let imported = 0;
  
  // Import tags
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];
    const progress = 75 + (i / tags.length) * 15;
    onProgress?.(Math.round(progress), `正在导入标签 (${i + 1}/${tags.length})...`);
    
    if (mode === 'merge') {
      const existing = await provider.tags.findById(tag.id);
      if (!existing) {
        await provider.tags.upsert(toDomainTag(tag));
      }
    } else {
      await provider.tags.upsert(toDomainTag(tag));
    }
    imported++;
  }
  
  // Import task-tag associations
  onProgress?.(90, '正在恢复标签关联...');
  for (const link of taskTags) {
    try {
      await provider.tags.attachToTask(link.task_id, link.tag_id);
    } catch {
      // Ignore errors for missing tasks/tags
    }
  }
  
  return imported;
}

export async function importData(file: File, options: ImportOptions): Promise<ImportResult> {
  const { mode, onProgress } = options;
  
  try {
    onProgress?.(0, '开始导入...');
    
    // Validate file
    onProgress?.(5, '正在验证备份文件...');
    const validation = await validateBackupFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    // Parse backup
    onProgress?.(10, '正在解析备份数据...');
    const data = await parseBackupZip(file);
    
    // Clear existing data if replace mode
    if (mode === 'replace') {
      await clearAllData(onProgress);
    }
    
    // Import data
    const projectCount = await importProjects(data.projects, mode, onProgress);
    const taskCount = await importTasks(data.tasks, mode, onProgress);
    const tagCount = await importTags(data.tags, data.taskTags, mode, onProgress);
    
    onProgress?.(100, '导入完成');
    
    return {
      success: true,
      stats: {
        projects: projectCount,
        tasks: taskCount,
        tags: tagCount,
      },
    };
  } catch (error) {
    console.error('Import failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '导入失败，请稍后再试',
    };
  }
}
