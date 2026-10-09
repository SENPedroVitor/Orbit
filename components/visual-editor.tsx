"use client";

import { createContext, useContext, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { Extension, Node, type Editor } from "@tiptap/core";
import { EditorContent, NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor, useEditorState, type NodeViewProps } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockExtension from "@tiptap/extension-code-block";
import { TableKit } from "@tiptap/extension-table";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Plugin } from "@tiptap/pm/state";
import { Bold, Italic, ListChecks, List, ListOrdered, Quote, Table2, Code2, Network, Video, Undo2, Redo2, Link2, Check, X } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DiagramPreview, MarkdownPre } from "@/components/diagram-preview";
import { VideoPreview } from "@/components/video-preview";
import { parseVideo } from "@/lib/video";
import { documentToMarkdown, markdownToDocument } from "@/lib/visual-markdown";

export type VisualEditorHandle = { insertMarkdown: (value: string) => void };
type Props = {
  value: string;
  onChange: (value: string) => void;
  onDiagram: () => void;
  onVideo: () => void;
  onEditDiagram: (source: string, save: (source: string) => void) => void;
  onSource: () => void;
  ref?: Ref<VisualEditorHandle>;
};
const BlockActions = createContext<Pick<Props, "onEditDiagram" | "onSource"> | null>(null);

function DiagramBlock({ node, updateAttributes, selected }: NodeViewProps) {
  const actions = useContext(BlockActions);
  return <NodeViewWrapper className={selected ? "visual-block selected-block" : "visual-block"} contentEditable={false}>
    <DiagramPreview source={node.attrs.source} onEdit={() => actions?.onEditDiagram(node.attrs.source, source => updateAttributes({ source }))} />
  </NodeViewWrapper>;
}
function VideoBlock({ node, selected }: NodeViewProps) {
  const video = parseVideo(node.attrs.url);
  return <NodeViewWrapper className={selected ? "visual-block selected-block" : "visual-block"} contentEditable={false}>
    {video && <VideoPreview video={video} title={node.attrs.title} />}
  </NodeViewWrapper>;
}
function PreservedBlock({ node }: NodeViewProps) {
  const actions = useContext(BlockActions);
  return <NodeViewWrapper className="visual-preserved" contentEditable={false}>
    <Markdown remarkPlugins={[remarkGfm]} components={{ pre: MarkdownPre }}>{node.attrs.source}</Markdown>
    <button type="button" onClick={() => actions?.onSource()}><Code2 size={14} />Editar este bloco no Markdown</button>
  </NodeViewWrapper>;
}
function CodeBlock({ node }: NodeViewProps) {
  return <NodeViewWrapper className="visual-code-block">
    <div className="visual-code-label" contentEditable={false}><Code2 size={14} />{node.attrs.language || "Código"}</div>
    <pre><NodeViewContent<"code"> as="code" /></pre>
  </NodeViewWrapper>;
}
function blockNode(name: string, attributes: Record<string, { default: string }>, component: typeof DiagramBlock) {
  return Node.create({ name, group: "block", atom: true, addAttributes: () => Object.fromEntries(Object.entries(attributes).map(([key, value]) => [key, { ...value, parseHTML: (element: HTMLElement) => element.getAttribute(`data-orbit-${key}`) || value.default, renderHTML: (attrs: Record<string, string>) => ({ [`data-orbit-${key}`]: attrs[key] }) }])),
    parseHTML: () => [{ tag: `div[data-orbit-block="${name}"]` }],
    renderHTML: ({ HTMLAttributes }) => ["div", { ...HTMLAttributes, "data-orbit-block": name }],
    addNodeView: () => ReactNodeViewRenderer(component),
  });
}
const SourceMetadata = Extension.create({
  name: "sourceMetadata",
  addGlobalAttributes: () => [{
    types: ["doc", "paragraph", "heading", "bulletList", "orderedList", "taskList", "blockquote", "codeBlock", "horizontalRule", "table", "image", "diagram", "video", "preservedBlock"],
    attributes: Object.fromEntries(["sourceMarkdown", "sourceDocument", "sourcePrefix", "sourceSuffix"].map(key => [key, { default: null, rendered: false, keepOnSplit: false }])),
  }, { types: ["codeBlock"], attributes: { fenceInfo: { default: null, rendered: false } } }, {
    types: ["tableCell", "tableHeader"], attributes: { align: { default: null, parseHTML: element => element.style.textAlign || null, renderHTML: attrs => attrs.align ? { style: `text-align: ${attrs.align}` } : {} } },
  }, { types: ["link"], attributes: { title: { default: null, parseHTML: element => element.getAttribute("title"), renderHTML: attrs => attrs.title ? { title: attrs.title } : {} } } }],
});
const MarkdownLimit = Extension.create({
  name: "markdownLimit",
  addProseMirrorPlugins: () => [new Plugin({ filterTransaction: transaction => {
    if (!transaction.docChanged) return true;
    try { return documentToMarkdown(transaction.doc.toJSON()).length <= 200000; } catch { return false; }
  } })],
});

function safeLink(value: string) {
  return /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(value.trim());
}

export function VisualEditor({ value, onChange, onDiagram, onVideo, onEditDiagram, onSource, ref }: Props) {
  const latest = useRef(value);
  const change = useRef(onChange);
  change.current = onChange;
  const [language, setLanguage] = useState("typescript");
  const [initialDocument] = useState(() => markdownToDocument(value));
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ underline: false, link: { openOnClick: false }, codeBlock: false, trailingNode: false }),
      CodeBlockExtension.extend({ addNodeView: () => ReactNodeViewRenderer(CodeBlock) }),
      TableKit.configure({ table: { resizable: false } }), TaskList, TaskItem.configure({ nested: true, a11y: { checkboxLabel: (node, checked) => `${checked ? "Reabrir" : "Concluir"}: ${node.textContent || "tarefa"}` } }),
      Image.configure({ inline: true }), Placeholder.configure({ placeholder: "Comece a escrever sua ideia…" }),
      blockNode("diagram", { source: { default: "" } }, DiagramBlock),
      blockNode("video", { url: { default: "" }, title: { default: "Vídeo" } }, VideoBlock),
      blockNode("preservedBlock", { source: { default: "" } }, PreservedBlock), SourceMetadata, MarkdownLimit,
    ],
    content: initialDocument,
    editorProps: { attributes: { class: "prose visual-document", role: "textbox", "aria-label": "Conteúdo da página", "aria-multiline": "true", spellcheck: "true" } },
    onUpdate: ({ editor }) => { const markdown = documentToMarkdown(editor.getJSON()); latest.current = markdown; change.current(markdown); },
  });
  useEffect(() => {
    if (editor && value !== latest.current) {
      latest.current = value;
      const document = markdownToDocument(value);
      editor.chain().setContent(document, { emitUpdate: false }).command(({ tr }) => {
        for (const key of ["sourceMarkdown", "sourceDocument", "sourcePrefix", "sourceSuffix"]) tr.setDocAttribute(key, document.attrs?.[key] ?? null);
        return true;
      }).run();
    }
  }, [editor, value]);
  useImperativeHandle(ref, () => ({ insertMarkdown: text => {
    if (!editor) return;
    editor.chain().focus().insertContent(markdownToDocument(text).content || []).run();
  } }), [editor]);
  const state = useEditorState({ editor, selector: ({ editor }) => editor ? {
    bold: editor.isActive("bold"), italic: editor.isActive("italic"), quote: editor.isActive("blockquote"),
    task: editor.isActive("taskList"), bullet: editor.isActive("bulletList"), ordered: editor.isActive("orderedList"),
    table: editor.isActive("table"), code: editor.isActive("codeBlock"), codeLanguage: editor.getAttributes("codeBlock").language || "",
    heading: [1, 2, 3].find(level => editor.isActive("heading", { level })) || 0,
    undo: editor.can().undo(), redo: editor.can().redo(),
  } : null });
  const action = (name: string, icon: React.ReactNode, command: (editor: Editor) => void, active = false, disabled = false) =>
    <button type="button" title={name} aria-label={name} aria-pressed={active} className={active ? "active" : ""} disabled={!editor || disabled} onMouseDown={event => event.preventDefault()} onClick={() => editor && command(editor)}>{icon}</button>;
  return <div className="visual-editor">
    <div className="visual-toolbar" role="toolbar" aria-label="Formatação do texto">
      <select aria-label="Estilo do texto" value={state?.heading || 0} onChange={event => { const level = Number(event.target.value) as 1 | 2 | 3; if (level) editor?.chain().focus().setHeading({ level }).run(); else editor?.chain().focus().setParagraph().run(); }}>
        <option value="0">Texto</option><option value="1">Título 1</option><option value="2">Título 2</option><option value="3">Título 3</option>
      </select><span className="toolbar-divider" />
      {action("Negrito", <Bold size={16} />, editor => editor.chain().focus().toggleBold().run(), state?.bold)}
      {action("Itálico", <Italic size={16} />, editor => editor.chain().focus().toggleItalic().run(), state?.italic)}
      {action("Adicionar link", <Link2 size={16} />, editor => { setLink(editor.getAttributes("link").href || ""); setLinkOpen(value => !value); })}
      <span className="toolbar-divider" />
      {action("Lista", <List size={17} />, editor => editor.chain().focus().toggleBulletList().run(), state?.bullet)}
      {action("Lista numerada", <ListOrdered size={17} />, editor => editor.chain().focus().toggleOrderedList().run(), state?.ordered)}
      {action("Lista de tarefas", <ListChecks size={17} />, editor => editor.chain().focus().toggleTaskList().run(), state?.task)}
      {action("Citação", <Quote size={16} />, editor => editor.chain().focus().toggleBlockquote().run(), state?.quote)}
      {action("Tabela", <Table2 size={17} />, editor => editor.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run())}
      {action("Inserir diagrama", <Network size={17} />, onDiagram)}
      {action("Inserir vídeo", <Video size={17} />, onVideo)}
      {action("Inserir bloco de código", <Code2 size={17} />, editor => editor.chain().focus().toggleCodeBlock({ language }).run(), state?.code)}
      <select aria-label="Linguagem de código" value={state?.code ? state.codeLanguage : language} onChange={event => { setLanguage(event.target.value); if (state?.code) editor?.chain().focus().updateAttributes("codeBlock", { language: event.target.value }).run(); }}><option value="">Texto simples</option>{["typescript", "javascript", "python", "html", "css", "json", "bash", "sql", ...(state?.codeLanguage && !["typescript", "javascript", "python", "html", "css", "json", "bash", "sql"].includes(state.codeLanguage) ? [state.codeLanguage] : [])].map(value => <option key={value}>{value}</option>)}</select>
      <span className="toolbar-divider" />
      {action("Desfazer", <Undo2 size={16} />, editor => editor.chain().focus().undo().run(), false, !state?.undo)}
      {action("Refazer", <Redo2 size={16} />, editor => editor.chain().focus().redo().run(), false, !state?.redo)}
    </div>
    {linkOpen && <form className="visual-link-form" onSubmit={event => { event.preventDefault(); if (!editor || (link && !safeLink(link))) return; const chain = editor.chain().focus().extendMarkRange("link"); if (link.trim()) chain.setLink({ href: link.trim() }).run(); else chain.unsetLink().run(); setLinkOpen(false); }}><input autoFocus type="text" aria-label="Endereço do link" value={link} placeholder="https://…" onChange={event => setLink(event.target.value)} /><button type="submit" aria-label="Salvar link" disabled={!!link && !safeLink(link)}><Check size={16} /></button><button type="button" aria-label="Cancelar link" onClick={() => setLinkOpen(false)}><X size={16} /></button></form>}
    {state?.table && <div className="visual-table-tools"><button onClick={() => editor?.chain().focus().addRowAfter().run()}>Adicionar linha</button><button onClick={() => editor?.chain().focus().addColumnAfter().run()}>Adicionar coluna</button><button onClick={() => editor?.chain().focus().deleteRow().run()}>Excluir linha</button><button onClick={() => editor?.chain().focus().deleteColumn().run()}>Excluir coluna</button><button onClick={() => editor?.chain().focus().deleteTable().run()}>Excluir tabela</button></div>}
    <BlockActions.Provider value={{ onEditDiagram, onSource }}><EditorContent editor={editor} /></BlockActions.Provider>
  </div>;
}
