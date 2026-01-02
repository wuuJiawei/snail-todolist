import React, { useEffect, useRef } from "react";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import {
  Editor,
  defaultValueCtx,
  editorViewCtx,
  editorViewOptionsCtx,
  rootAttrsCtx,
  rootCtx,
  serializerCtx,
} from "@milkdown/kit/core";
import { history } from "@milkdown/kit/plugin/history";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { cursor } from "@milkdown/kit/plugin/cursor";
import { upload, uploadConfig } from "@milkdown/kit/plugin/upload";
import type { UploadOptions } from "@milkdown/kit/plugin/upload";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { replaceAll } from "@milkdown/kit/utils";
import { nord } from "@milkdown/theme-nord";
import nordThemeStyles from "@milkdown/theme-nord/style.css?raw";
import clsx from "clsx";
import { useToast } from "@/hooks/use-toast";
import type { TaskAttachment } from "@/types/task";
import type { EditorBridge } from "./TaskDetailContent";
import { gfm } from "@milkdown/kit/preset/gfm";
import { usePluginViewFactory, ProsemirrorAdapterProvider } from "@prosemirror-adapter/react";
import { tooltip, TooltipView } from "./milkdown/Tooltip";
import { codeBlockComponent, codeBlockConfig } from "@milkdown/kit/component/code-block";
import { languages } from "@codemirror/language-data";
import { basicSetup } from "codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { defaultKeymap } from "@codemirror/commands";
import { keymap } from "@codemirror/view";
import * as storageOps from "@/storage/operations";

const chevronDownIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
const searchIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;
const clearIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
const copyIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;

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
  const pluginViewFactory = usePluginViewFactory();

  const contentRef = useRef(content);
  const taskIdRef = useRef(taskId);
  const readOnlyRef = useRef(readOnly);
  const onChangeRef = useRef(onChange);
  const attachmentsRef = useRef<TaskAttachment[]>(attachments);
  const onAttachmentsChangeRef = useRef(onAttachmentsChange);
  const onEditorReadyRef = useRef(onEditorReady);
  const isProgrammaticChangeRef = useRef(false);
  const uploadHandlerRef = useRef<UploadOptions["uploader"]>();
  const lastAppliedTaskIdRef = useRef<string | undefined>(undefined);
  const isEditorReadyRef = useRef(false);
  const pendingTasksRef = useRef<(() => void)[]>([]);
  const isUnmountedRef = useRef(false);

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
    const result = await storageOps.uploadImage(file);
    if (!result) {
      throw new Error("上传失败");
    }
    return result.url;
  };

  const uploadNonImageFile = async (file: File): Promise<TaskAttachment | null> => {
    try {
      const result = await storageOps.uploadAttachment(taskIdRef.current || "temp", file);
      return result;
    } catch (error) {
      console.error("Non-image upload failed:", error);
      return null;
    }
  };

  useEffect(() => {
    uploadHandlerRef.current = async (files, schema, _ctx, _insertPos) => {
      const imageNode = schema.nodes.image;
      if (!files || files.length === 0) {
        return [];
      }

      const pendingImageAttachments: TaskAttachment[] = [];
      const pendingNonImageAttachments: TaskAttachment[] = [];
      const nodes: ReturnType<typeof imageNode.createAndFill>[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files.item(i);
        if (!file) continue;

        const isImage = file.type.startsWith("image/");

        if (isImage && imageNode) {
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

            pendingImageAttachments.push(attachment);

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
            console.error("Image upload failed:", error);
            toast({
              title: "图片上传失败",
              description: file?.name,
              variant: "destructive",
            });
          }
        } else {
          // Handle non-image files as attachments
          if (file.size > 10 * 1024 * 1024) {
            toast({
              title: "文件过大",
              description: `${file.name} 超过 10MB 限制`,
              variant: "destructive",
            });
            continue;
          }

          toast({
            title: "正在上传附件...",
            description: file.name,
          });

          const attachment = await uploadNonImageFile(file);
          if (attachment) {
            pendingNonImageAttachments.push(attachment);
            toast({
              title: "附件上传成功",
              description: file.name,
            });
          } else {
            toast({
              title: "附件上传失败",
              description: file.name,
              variant: "destructive",
            });
          }
        }
      }

      const allPendingAttachments = [...pendingImageAttachments, ...pendingNonImageAttachments];
      if (allPendingAttachments.length > 0 && onAttachmentsChangeRef.current) {
        const merged = [...attachmentsRef.current];
        allPendingAttachments.forEach((attachment) => {
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
            uploader: (files, schema, editorCtx, insertPos) =>
              uploadHandlerRef.current
                ? uploadHandlerRef.current(files, schema, editorCtx, insertPos)
                : Promise.resolve([]),
            enableHtmlFileUploader: true,
          }));
          // @ts-ignore - Type inference issue with tooltip.key
          ctx.set(tooltip.key, {
            view: pluginViewFactory({
              component: TooltipView,
            }),
          });
          // @ts-ignore - Type inference issue with codeBlockConfig.key
          ctx.update(codeBlockConfig.key, (defaultConfig) => ({
            ...defaultConfig,
            languages,
            extensions: [basicSetup, oneDark, keymap.of(defaultKeymap)],
            expandIcon: chevronDownIcon,
            searchIcon: searchIcon,
            clearSearchIcon: clearIcon,
            copyIcon: copyIcon,
            searchPlaceholder: "搜索语言...",
            noResultText: "无匹配结果",
            copyText: "",
          }));
          ctx.get(listenerCtx).mounted(() => {
            isEditorReadyRef.current = true;
            const tasks = pendingTasksRef.current;
            pendingTasksRef.current = [];
            tasks.forEach((task) => {
              setTimeout(() => {
                if (isUnmountedRef.current) return;
                requestAnimationFrame(() => {
                  if (isUnmountedRef.current) return;
                  requestAnimationFrame(() => {
                    if (!isUnmountedRef.current) task();
                  });
                });
              }, 0);
            });
          });
          ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
            if (isProgrammaticChangeRef.current) {
              return;
            }
            onChangeRef.current(markdown);
          });
        })
        // @ts-ignore - Type inference issue with nord theme
        .use(nord)
        .use(commonmark)
        .use(gfm)
        .use(history)
        .use(cursor)
        .use(listener)
        .use(upload)
        // @ts-ignore - Type inference issue with tooltip plugin
        .use(tooltip)
        // @ts-ignore - Type inference issue with codeBlockComponent
        .use(codeBlockComponent);
    },
    []
  );

  const editorInstance = editor.get();

  useEffect(() => {
    if (!editorInstance) {
      return;
    }

    onEditorReadyRef.current?.({
      blocksToMarkdownLossy: async () => {
        const inst = editor.get();
        if (!inst) return "";
        return inst.action((ctx) => {
          const serializer = ctx.get(serializerCtx);
          const view = ctx.get(editorViewCtx);
          return serializer(view.state.doc);
        });
      },
      focus: () => {
        const inst = editor.get();
        if (!inst) return;
        inst.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          view.focus();
        });
      },
      insertImage: (url: string, alt: string) => {
        const inst = editor.get();
        if (!inst) return;
        inst.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const { state } = view;
          const imageNode = state.schema.nodes.image;
          if (!imageNode) return;

          const node = imageNode.create({
            src: url,
            alt: alt,
            title: alt,
          });

          const endPos = state.doc.content.size;
          const tr = state.tr.insert(endPos, node);
          view.dispatch(tr);
        });
      },
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

    if (lastAppliedTaskIdRef.current === undefined) {
      lastAppliedTaskIdRef.current = taskIdRef.current;
      return;
    }

    lastAppliedTaskIdRef.current = taskIdRef.current;
    isProgrammaticChangeRef.current = true;
    const task = () => {
      const inst = editor.get();
      if (!inst) {
        isProgrammaticChangeRef.current = false;
        return;
      }
      inst.action(replaceAll(contentRef.current || "", true));
      requestAnimationFrame(() => {
        isProgrammaticChangeRef.current = false;
      });
    };
    if (isEditorReadyRef.current) {
      setTimeout(() => {
        if (isUnmountedRef.current) return;
        requestAnimationFrame(() => {
          if (isUnmountedRef.current) return;
          requestAnimationFrame(() => {
            if (!isUnmountedRef.current) task();
          });
        });
      }, 0);
    } else {
      pendingTasksRef.current.push(task);
    }
  }, [editorInstance, taskId]);

  useEffect(() => {
    if (!editorInstance) {
      return;
    }
    const task = () => {
      const inst = editor.get();
      if (!inst) return;
      inst.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        view.setProps({
          ...view.props,
          editable: () => !readOnlyRef.current,
        });
      });
    };
    if (isEditorReadyRef.current) {
      setTimeout(() => {
        if (isUnmountedRef.current) return;
        requestAnimationFrame(() => {
          if (isUnmountedRef.current) return;
          requestAnimationFrame(() => {
            if (!isUnmountedRef.current) task();
          });
        });
      }, 0);
    } else {
      pendingTasksRef.current.push(task);
    }
  }, [editorInstance, readOnly]);

  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      isEditorReadyRef.current = false;
      pendingTasksRef.current = [];
    };
  }, []);

  return (
    <div className="milkdown-editor h-full">
      <Milkdown />
    </div>
  );
};

const MilkdownEditor: React.FC<MilkdownEditorProps> = (props) => {
  return (
    <MilkdownProvider>
      <ProsemirrorAdapterProvider>
        <MilkdownEditorInner {...props} />
      </ProsemirrorAdapterProvider>
    </MilkdownProvider>
  );
};

export default MilkdownEditor;
