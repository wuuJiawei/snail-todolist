import React, { useEffect, useMemo, useRef } from "react";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import {
  Editor,
  defaultValueCtx,
  editorViewCtx,
  editorViewOptionsCtx,
  rootAttrsCtx,
  rootCtx,
  serializerCtx,
} from "@milkdown/core";
import { history } from "@milkdown/plugin-history";
import { listener, listenerCtx } from "@milkdown/plugin-listener";
import { cursor } from "@milkdown/plugin-cursor";
import { upload, uploadConfig } from "@milkdown/plugin-upload";
import type { UploadOptions } from "@milkdown/plugin-upload";
import { commonmark } from "@milkdown/preset-commonmark";
import { replaceAll } from "@milkdown/utils";
import { nord } from "@milkdown/theme-nord";
import nordThemeStyles from "@milkdown/theme-nord/style.css?raw";
import clsx from "clsx";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { TaskAttachment } from "@/types/task";
import { supabase } from "@/integrations/supabase/client";
import type { EditorBridge } from "./TaskDetailContent";

interface MilkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
  taskId?: string;
  onEditorReady?: (bridge: EditorBridge | null) => void;
  attachments?: TaskAttachment[];
  onAttachmentsChange?: (attachments: TaskAttachment[]) => void;
}

const MilkdownEditorInner: React.FC<MilkdownEditorProps> = ({
  content,
  onChange,
  readOnly = false,
  taskId,
  onEditorReady,
  attachments = [],
  onAttachmentsChange,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();

  const contentRef = useRef(content);
  const taskIdRef = useRef(taskId);
  const readOnlyRef = useRef(readOnly);
  const onChangeRef = useRef(onChange);
  const attachmentsRef = useRef<TaskAttachment[]>(attachments);
  const onAttachmentsChangeRef = useRef(onAttachmentsChange);
  const userRef = useRef(user);
  const onEditorReadyRef = useRef(onEditorReady);
  const isProgrammaticChangeRef = useRef(false);
  const uploadHandlerRef = useRef<UploadOptions["uploader"]>();
  const lastAppliedTaskIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    taskIdRef.current = taskId;
  }, [taskId]);

  useEffect(() => {
    readOnlyRef.current = readOnly;
  }, [readOnly]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    onAttachmentsChangeRef.current = onAttachmentsChange;
  }, [onAttachmentsChange]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    onEditorReadyRef.current = onEditorReady;
  }, [onEditorReady]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    if (document.getElementById("milkdown-nord-theme")) {
      return;
    }
    const style = document.createElement("style");
    style.id = "milkdown-nord-theme";
    style.textContent = nordThemeStyles;
    document.head.appendChild(style);
  }, []);

  const uploadFile = async (file: File): Promise<string> => {
    const currentUser = userRef.current;
    if (!currentUser) {
      throw new Error("用户未登录");
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from("task-attachments")
      .upload(fileName, file);

    if (error) {
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from("task-attachments")
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  useEffect(() => {
    uploadHandlerRef.current = async (files, schema) => {
      const imageNode = schema.nodes.image;
      if (!imageNode || !files || files.length === 0) {
        return [];
      }

      const pendingAttachments: TaskAttachment[] = [];
      const nodes: ReturnType<typeof imageNode.createAndFill>[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files.item(i);
        if (!file || !file.type.startsWith("image/")) {
          continue;
        }

        try {
          toast({
            title: "正在上传图片...",
            description: file.name,
          });

          const url = await uploadFile(file);

          const attachment: TaskAttachment = {
            id: crypto.randomUUID(),
            url,
            filename: file.name,
            original_name: file.name,
            type: file.type,
            size: file.size,
            uploaded_at: new Date().toISOString(),
          };

          pendingAttachments.push(attachment);

          const node = imageNode.createAndFill({
            src: url,
            alt: file.name,
            title: file.name,
          });

          nodes.push(node);

          toast({
            title: "图片上传成功",
            description: file.name,
          });
        } catch (error) {
          console.error("Upload failed:", error);
          toast({
            title: "图片上传失败",
            description: file?.name,
            variant: "destructive",
          });
        }
      }

      if (pendingAttachments.length > 0 && onAttachmentsChangeRef.current) {
        const merged = [...attachmentsRef.current];
        pendingAttachments.forEach((attachment) => {
          if (!merged.find((item) => item.url === attachment.url)) {
            merged.push(attachment);
          }
        });
        attachmentsRef.current = merged;
        onAttachmentsChangeRef.current(merged);
      }

      return nodes.filter(Boolean) as NonNullable<(typeof nodes)[number]>[];
    };
  }, [toast]);

  const editor = useEditor(
    (root) => {
      if (!root) {
        return;
      }

      return Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root);
          ctx.set(defaultValueCtx, contentRef.current || "");
          ctx.update(rootAttrsCtx, (prev) => ({
            ...prev,
            class: clsx(prev?.class, "milkdown-root"),
          }));
          ctx.update(editorViewOptionsCtx, (prev = {}) => ({
            ...prev,
            editable: () => !readOnlyRef.current,
          }));
          ctx.update(uploadConfig.key, (prev) => ({
            ...prev,
            uploader: (files, schema) =>
              uploadHandlerRef.current
                ? uploadHandlerRef.current(files, schema)
                : Promise.resolve([]),
            enableHtmlFileUploader: true,
          }));
          ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
            if (isProgrammaticChangeRef.current) {
              return;
            }
            onChangeRef.current(markdown);
          });
        })
        .use(nord)
        .use(commonmark)
        .use(history)
        .use(cursor)
        .use(listener)
        .use(upload);
    },
    []
  );

  const editorInstance = editor.get();

  useEffect(() => {
    if (!editorInstance) {
      return;
    }

    onEditorReadyRef.current?.({
      blocksToMarkdownLossy: async () =>
        editorInstance.action((ctx) => {
          const serializer = ctx.get(serializerCtx);
          const view = ctx.get(editorViewCtx);
          return serializer(view.state.doc);
        }),
    });

    return () => {
      onEditorReadyRef.current?.(null);
    };
  }, [editorInstance]);

  useEffect(() => {
    if (!editorInstance || !taskIdRef.current) {
      return;
    }

    if (lastAppliedTaskIdRef.current === taskIdRef.current) {
      return;
    }

    lastAppliedTaskIdRef.current = taskIdRef.current;
    isProgrammaticChangeRef.current = true;
    editorInstance.action(replaceAll(contentRef.current || "", true));
    requestAnimationFrame(() => {
      isProgrammaticChangeRef.current = false;
    });
  }, [editorInstance, taskId]);

  useEffect(() => {
    if (!editorInstance) {
      return;
    }
    editorInstance.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      view.setProps({
        ...view.props,
        editable: () => !readOnlyRef.current,
      });
    });
  }, [editorInstance, readOnly]);

  return (
    <div className="milkdown-editor h-full">
      <Milkdown />
    </div>
  );
};

const MilkdownEditor: React.FC<MilkdownEditorProps> = (props) => {
  return (
    <MilkdownProvider>
      <MilkdownEditorInner {...props} />
    </MilkdownProvider>
  );
};

export default MilkdownEditor;
