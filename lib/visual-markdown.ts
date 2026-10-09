import type { JSONContent } from "@tiptap/core";
import type { Root } from "mdast";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import { gfmToMarkdown } from "mdast-util-gfm";
import { parseVideo } from "./video";

type MarkdownNode = {
  type: string;
  value?: string;
  children?: MarkdownNode[];
  depth?: number;
  url?: string;
  title?: string | null;
  alt?: string | null;
  lang?: string | null;
  meta?: string | null;
  ordered?: boolean;
  start?: number | null;
  checked?: boolean | null;
  spread?: boolean;
  align?: ("left" | "right" | "center" | null)[];
  position?: { start: { offset?: number }; end: { offset?: number } };
};

const parser = unified().use(remarkParse).use(remarkGfm);
const markdownOptions = { extensions: [gfmToMarkdown()], bullet: "-" as const, fences: true, listItemIndent: "one" as const };
const nullish = (value: unknown) => value ?? null;

function semanticChildren(nodes: JSONContent[]): unknown[] {
  const result: Record<string, unknown>[] = [];
  for (const node of nodes) {
    const current = semantic(node) as Record<string, unknown>;
    const previous = result[result.length - 1];
    if (previous?.type === "text" && current.type === "text" && JSON.stringify(previous.marks ?? []) === JSON.stringify(current.marks ?? [])) previous.text = String(previous.text ?? "") + String(current.text ?? "");
    else result.push(current);
  }
  return result;
}

// Compare only the attributes represented by Markdown. Editor defaults such as
// a link's target or a table's column widths must not dirty an untouched page.
function semantic(node: JSONContent): unknown {
  const attrs = node.attrs ?? {};
  let meaningful: Record<string, unknown> | undefined;
  switch (node.type) {
    case "heading": meaningful = { level: attrs.level ?? 1 }; break;
    case "orderedList": meaningful = { start: attrs.start ?? 1 }; break;
    case "taskItem": meaningful = { checked: attrs.checked === true }; break;
    case "codeBlock": meaningful = { language: nullish(attrs.language), fenceInfo: nullish(attrs.fenceInfo) }; break;
    case "tableCell": case "tableHeader": meaningful = { align: nullish(attrs.align), colspan: attrs.colspan ?? 1, rowspan: attrs.rowspan ?? 1 }; break;
    case "image": meaningful = { src: attrs.src ?? "", alt: nullish(attrs.alt), title: nullish(attrs.title) }; break;
    case "diagram": case "preservedBlock": meaningful = { source: attrs.source ?? "" }; break;
    case "video": meaningful = { url: attrs.url ?? "", title: nullish(attrs.title) }; break;
  }
  const marks = node.marks?.map(mark => mark.type === "link"
    ? { type: mark.type, attrs: { href: mark.attrs?.href ?? "", title: nullish(mark.attrs?.title) } }
    : { type: mark.type }).sort((a, b) => a.type.localeCompare(b.type));
  return {
    type: node.type,
    ...(meaningful ? { attrs: meaningful } : {}),
    ...(node.text !== undefined ? { text: node.text } : {}),
    ...(marks?.length ? { marks } : {}),
    ...(node.content?.length ? { content: semanticChildren(node.content) } : {}),
  };
}

function fingerprint(node: JSONContent) { return JSON.stringify(semantic(node)); }

function inline(nodes: MarkdownNode[], marks: NonNullable<JSONContent["marks"]> = []): JSONContent[] {
  return nodes.flatMap(node => {
    const children = node.children ?? [];
    switch (node.type) {
      case "text": return node.value ? [{ type: "text", text: node.value, ...(marks.length ? { marks } : {}) }] : [];
      case "strong": return inline(children, [...marks, { type: "bold" }]);
      case "emphasis": return inline(children, [...marks, { type: "italic" }]);
      case "delete": return inline(children, [...marks, { type: "strike" }]);
      case "inlineCode": return node.value ? [{ type: "text", text: node.value, marks: [...marks, { type: "code" }] }] : [];
      case "link": return inline(children, [...marks, { type: "link", attrs: { href: node.url ?? "", title: node.title ?? null } }]);
      case "image": return [{ type: "image", attrs: { src: node.url ?? "", alt: node.alt ?? null, title: node.title ?? null } }];
      case "break": return [{ type: "hardBreak" }];
      default: throw new Error(`Unsupported Markdown inline: ${node.type}`);
    }
  });
}

function block(node: MarkdownNode): JSONContent {
  const children = node.children ?? [];
  switch (node.type) {
    case "paragraph": {
      const link = children.length === 1 && children[0].type === "link" ? children[0] : null;
      if (link && !link.title && link.children?.every(child => child.type === "text") && parseVideo(link.url ?? "")) {
        return { type: "video", attrs: { url: link.url, title: link.children.map(child => child.value ?? "").join("") } };
      }
      return { type: "paragraph", content: inline(children) };
    }
    case "heading": return { type: "heading", attrs: { level: node.depth ?? 1 }, content: inline(children) };
    case "blockquote": return { type: "blockquote", content: children.map(block) };
    case "thematicBreak": return { type: "horizontalRule" };
    case "code": {
      if (node.lang === "mermaid" && !node.meta) return { type: "diagram", attrs: { source: node.value ?? "" } };
      return { type: "codeBlock", attrs: { language: node.lang ?? null, fenceInfo: [node.lang, node.meta].filter(Boolean).join(" ") || null }, content: node.value ? [{ type: "text", text: node.value }] : [] };
    }
    case "list": {
      const taskCount = children.filter(item => typeof item.checked === "boolean").length;
      if (taskCount && (taskCount !== children.length || node.ordered)) throw new Error("Mixed or ordered task list");
      const tasks = taskCount > 0;
      return {
        type: tasks ? "taskList" : node.ordered ? "orderedList" : "bulletList",
        ...(node.ordered ? { attrs: { start: node.start ?? 1 } } : {}),
        content: children.map(item => ({
          type: tasks ? "taskItem" : "listItem",
          ...(tasks ? { attrs: { checked: item.checked === true } } : {}),
          content: (item.children ?? []).map(block),
        })),
      };
    }
    case "table": return {
      type: "table", content: children.map((row, rowIndex) => ({
        type: "tableRow", content: (row.children ?? []).map((cell, column) => ({
          type: rowIndex === 0 ? "tableHeader" : "tableCell",
          attrs: { align: node.align?.[column] ?? null, colspan: 1, rowspan: 1 },
          content: [{ type: "paragraph", content: inline(cell.children ?? []) }],
        })),
      })),
    };
    default: throw new Error(`Unsupported Markdown block: ${node.type}`);
  }
}

export function markdownToDocument(content: string): JSONContent {
  const tree = parser.parse(content) as unknown as MarkdownNode;
  let end = 0;
  const blocks = (tree.children ?? []).map(node => {
    const start = node.position?.start.offset ?? end;
    const finish = node.position?.end.offset ?? start;
    const source = content.slice(start, finish);
    let result: JSONContent;
    try { result = block(node); }
    catch { result = { type: "preservedBlock", attrs: { source } }; }
    const originalFingerprint = fingerprint(result);
    result.attrs = { ...result.attrs, sourceMarkdown: source, sourceDocument: originalFingerprint, sourcePrefix: content.slice(end, start) };
    end = finish;
    return result;
  });
  if (!blocks.length) blocks.push({ type: "paragraph", attrs: { sourceMarkdown: "", sourceDocument: fingerprint({ type: "paragraph" }), sourcePrefix: "" }, content: [] });
  const document: JSONContent = { type: "doc", content: blocks };
  document.attrs = { sourceMarkdown: content, sourceDocument: fingerprint(document), sourceSuffix: content.slice(end) };
  return document;
}

function mdInline(nodes: JSONContent[]): MarkdownNode[] {
  return nodes.map(node => {
    if (node.type === "hardBreak") return { type: "break" };
    if (node.type === "image") return { type: "image", url: node.attrs?.src ?? "", alt: node.attrs?.alt ?? null, title: node.attrs?.title ?? null };
    if (node.type !== "text") throw new Error(`Unsupported editor inline: ${node.type}`);
    let result: MarkdownNode = { type: "text", value: node.text ?? "" };
    const marks = [...(node.marks ?? [])].sort((a, b) => (a.type === "code" ? -1 : 0) - (b.type === "code" ? -1 : 0));
    for (const mark of marks) {
      switch (mark.type) {
        case "code": result = { type: "inlineCode", value: node.text ?? "" }; break;
        case "bold": result = { type: "strong", children: [result] }; break;
        case "italic": result = { type: "emphasis", children: [result] }; break;
        case "strike": result = { type: "delete", children: [result] }; break;
        case "link": result = { type: "link", url: mark.attrs?.href ?? "", title: mark.attrs?.title ?? null, children: [result] }; break;
        default: throw new Error(`Unsupported editor mark: ${mark.type}`);
      }
    }
    return result;
  });
}

function mdBlock(node: JSONContent): MarkdownNode {
  const children = node.content ?? [];
  const attrs = node.attrs ?? {};
  switch (node.type) {
    case "paragraph": return { type: "paragraph", children: mdInline(children) };
    case "heading": return { type: "heading", depth: attrs.level ?? 1, children: mdInline(children) };
    case "horizontalRule": return { type: "thematicBreak" };
    case "blockquote": return { type: "blockquote", children: children.map(mdBlock) };
    case "codeBlock": {
      const language = typeof attrs.language === "string" && attrs.language ? attrs.language : null;
      const info = typeof attrs.fenceInfo === "string" ? attrs.fenceInfo.trim() : "";
      // Changing the selected language keeps any original metadata following it.
      const meta = info ? info.replace(/^\S+(?:\s+|$)/, "") || null : null;
      return { type: "code", lang: language, meta, value: children.map(child => child.text ?? "").join("") };
    }
    case "diagram": return { type: "code", lang: "mermaid", value: attrs.source ?? "" };
    case "video": return { type: "paragraph", children: [{ type: "link", url: attrs.url ?? "", children: [{ type: "text", value: attrs.title || "Vídeo" }] }] };
    case "bulletList": case "orderedList": case "taskList": return {
      type: "list", ordered: node.type === "orderedList", start: node.type === "orderedList" ? attrs.start ?? 1 : null, spread: false,
      children: children.map(item => ({ type: "listItem", spread: false, checked: node.type === "taskList" ? item.attrs?.checked === true : null, children: (item.content ?? []).map(mdBlock) })),
    };
    case "table": {
      if (children.some(row => row.content?.some(cell => (cell.attrs?.colspan ?? 1) !== 1 || (cell.attrs?.rowspan ?? 1) !== 1))) throw new Error("Mescle as células apenas no modo Markdown.");
      return {
        type: "table", align: children[0]?.content?.map(cell => cell.attrs?.align ?? null) ?? [],
        children: children.map(row => ({ type: "tableRow", children: (row.content ?? []).map(cell => {
          const paragraphs = cell.content ?? [];
          if (paragraphs.length > 1 || paragraphs.some(child => child.type !== "paragraph" || child.content?.some(inline => inline.type === "hardBreak"))) throw new Error("Use um parágrafo por célula da tabela.");
          return { type: "tableCell", children: mdInline(paragraphs[0]?.content ?? []) };
        }) })),
      };
    }
    case "preservedBlock": return { type: "html", value: attrs.source ?? "" };
    default: throw new Error(`Unsupported editor block: ${node.type}`);
  }
}

function serializeBlock(node: JSONContent): string {
  if (node.type === "preservedBlock") return node.attrs?.source ?? "";
  return toMarkdown({ type: "root", children: [mdBlock(node)] } as unknown as Root, markdownOptions).replace(/\n$/, "");
}

export function documentToMarkdown(document: JSONContent): string {
  const original = document.attrs?.sourceMarkdown;
  if (typeof original === "string" && document.attrs?.sourceDocument === fingerprint(document)) return original;
  const blocks = document.content ?? [];
  const output = blocks.map((node, index) => {
    const untouched = node.attrs?.sourceDocument === fingerprint(node) && typeof node.attrs?.sourceMarkdown === "string";
    const source = untouched ? node.attrs!.sourceMarkdown as string : serializeBlock(node);
    const savedPrefix = node.attrs?.sourcePrefix;
    const prefix = typeof savedPrefix === "string" && (savedPrefix || index === 0) ? savedPrefix : index ? "\n\n" : "";
    return prefix + source;
  }).join("");
  return output + (typeof document.attrs?.sourceSuffix === "string" ? document.attrs.sourceSuffix : output ? "\n" : "");
}
