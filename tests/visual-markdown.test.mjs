import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { Extension, Node, getSchema } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import CodeBlock from '@tiptap/extension-code-block';
import { TableKit } from '@tiptap/extension-table';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import { Fragment } from '@tiptap/pm/model';

// Node's TypeScript loader does not resolve extensionless app imports. Compile
// this small, browser-free bridge and resolve its imports just for these tests.
const file = new URL('../lib/visual-markdown.ts', import.meta.url);
const compiled = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const executable = compiled.replace(/from "([^"]+)"/g, (_, specifier) => `from ${JSON.stringify(specifier === './video' ? new URL('../lib/video.ts', import.meta.url).href : import.meta.resolve(specifier))}`);
const { markdownToDocument, documentToMarkdown } = await import(`data:text/javascript;base64,${Buffer.from(executable).toString('base64')}`);

const metadata = Extension.create({ name: 'sourceMetadata', addGlobalAttributes: () => [
  { types: ['doc', 'paragraph', 'heading', 'bulletList', 'orderedList', 'taskList', 'blockquote', 'codeBlock', 'horizontalRule', 'table', 'image', 'diagram', 'video', 'preservedBlock'], attributes: Object.fromEntries(['sourceMarkdown', 'sourceDocument', 'sourcePrefix', 'sourceSuffix'].map(key => [key, { default: null, rendered: false, keepOnSplit: false }])) },
  { types: ['codeBlock'], attributes: { fenceInfo: { default: null, rendered: false } } },
  { types: ['tableCell', 'tableHeader'], attributes: { align: { default: null } } },
  { types: ['link'], attributes: { title: { default: null } } },
] });
const atom = (name, attributes) => Node.create({ name, group: 'block', atom: true, addAttributes: () => attributes });
const schema = getSchema([
  StarterKit.configure({ underline: false, codeBlock: false, trailingNode: false }), CodeBlock,
  TableKit.configure({ table: { resizable: false } }), TaskList, TaskItem.configure({ nested: true }), Image.configure({ inline: true }),
  atom('diagram', { source: { default: '' } }), atom('video', { url: { default: '' }, title: { default: 'Vídeo' } }),
  atom('preservedBlock', { source: { default: '' } }), metadata,
]);
const normalize = source => schema.nodeFromJSON(markdownToDocument(source)).toJSON();

const complex = [
  '# Um documento',
  '',
  'Um **texto forte**, _itálico_, ~~riscado~~ e `const x = 1`.',
  '',
  '> Uma citação',
  '> com duas linhas.',
  '',
  '- [ ] Uma tarefa',
  '- [x] Outra tarefa',
  '',
  '| Esquerda | Centro | Direita |',
  '| :--- | :---: | ---: |',
  '| A | **B** | C |',
  '',
  '````typescript title="exemplo"',
  'const fence = "```";',
  '  const espaços = "preservados";',
  '````',
  '',
  '```mermaid',
  'flowchart TD',
  '  A[Ideia] --> B[Projeto]',
  '```',
  '',
  '[Aula](https://youtu.be/dQw4w9WgXcQ?t=90)',
  '',
  '[Vídeo privado](https://vimeo.com/123456789/abc123)',
  '',
  '![Uma figura](https://example.com/image.svg "Título da figura")',
  '',
  '[Um link][ref]',
  '',
  '[ref]: https://example.com "Título de referência"',
  '',
  '<aside>Um bloco de HTML preservado.</aside>',
  '',
].join('\n');

test('opening and reserializing imported Markdown is byte-exact, including CRLF and unsupported blocks', () => {
  for (const source of ['', '  \r\n', complex, complex.replaceAll('\n', '\r\n')]) {
    const document = markdownToDocument(source);
    assert.equal(documentToMarkdown(document), source);
  }
  const document = markdownToDocument(complex);
  assert.ok(document.content.some(node => node.type === 'diagram'));
  assert.equal(document.content.filter(node => node.type === 'video').length, 2);
  assert.ok(document.content.some(node => node.type === 'preservedBlock' && node.attrs.source.includes('[Um link][ref]')));
  assert.ok(document.content.some(node => node.type === 'preservedBlock' && node.attrs.source.includes('<aside>')));
});

test('the actual TipTap schema preserves source after normalizing defaults and mark attributes', () => {
  for (const source of ['', '  \r\n', complex, complex.replaceAll('\n', '\r\n'), '[Documentação](https://example.com "Um título")\n']) {
    const document = normalize(source);
    assert.equal(documentToMarkdown(document), source);
  }
  const document = normalize(complex);
  document.content[1].content = [{ type: 'text', text: 'Revisado no editor', marks: [{ type: 'italic' }] }];
  const saved = documentToMarkdown(document);
  for (const block of document.content.filter(node => ['codeBlock', 'diagram', 'video', 'preservedBlock'].includes(node.type))) assert.ok(saved.includes(block.attrs.sourceMarkdown));
  assert.equal(normalize(saved).content[1].content[0].text, 'Revisado no editor');

  const links = normalize('Antes\n\n[Documentação](https://example.com "Um título")\n');
  links.content[0].content[0].text = 'Antes revisado';
  assert.ok(documentToMarkdown(links).includes('[Documentação](https://example.com "Um título")'));
  assert.equal(normalize(documentToMarkdown(links)).content[1].content[0].marks[0].attrs.title, 'Um título');
});

test('ProseMirror merging adjacent text with identical marks preserves the original source', () => {
  const first = '[Primeiro](https://example.com "Título")[Segundo](https://example.com "Título")';
  const source = `${first}\n\nDepois\n`;
  const original = schema.nodeFromJSON(markdownToDocument(source));
  const paragraphs = [];
  original.forEach(node => {
    const children = [];
    node.forEach(child => children.push(child));
    paragraphs.push(node.copy(Fragment.fromArray(children)));
  });
  const document = original.copy(Fragment.fromArray(paragraphs)).toJSON();
  assert.equal(document.content[0].content.length, 1);
  assert.equal(documentToMarkdown(document), source);
  document.content[1].content[0].text = 'Depois revisado';
  assert.ok(documentToMarkdown(document).startsWith(first));
});

test('editor presentation defaults do not dirty existing Markdown', () => {
  const source = 'Um [link](https://example.com "Título").\n\n| A | B |\n| --- | ---: |\n| C | D |\n';
  const document = markdownToDocument(source);
  const link = document.content[0].content.find(node => node.marks?.some(mark => mark.type === 'link'));
  Object.assign(link.marks[0].attrs, { target: '_blank', rel: 'noopener noreferrer nofollow', class: null });
  for (const row of document.content[1].content) for (const cell of row.content) Object.assign(cell.attrs, { colwidth: null });
  assert.equal(documentToMarkdown(document), source);
});

test('editing a paragraph keeps exact neighboring code, diagrams, video URLs and opaque Markdown', () => {
  const document = markdownToDocument(complex);
  document.content[1].content = [{ type: 'text', text: 'Uma ideia revisada', marks: [{ type: 'bold' }] }];
  const updated = documentToMarkdown(document);
  assert.match(updated, /\*\*Uma ideia revisada\*\*/);
  for (const block of document.content.filter(node => ['codeBlock', 'diagram', 'video', 'preservedBlock'].includes(node.type))) {
    assert.ok(updated.includes(block.attrs.sourceMarkdown), `${block.type} source changed`);
  }
  const loaded = markdownToDocument(updated);
  assert.deepEqual(loaded.content[1].content, [{ type: 'text', text: 'Uma ideia revisada', marks: [{ type: 'bold' }] }]);
  assert.equal(loaded.content.filter(node => node.type === 'video')[0].attrs.url, 'https://youtu.be/dQw4w9WgXcQ?t=90');
  assert.equal(loaded.content.filter(node => node.type === 'video')[1].attrs.url, 'https://vimeo.com/123456789/abc123');
});

test('formatted text escapes literal Markdown and keeps link titles and image descriptions', () => {
  const text = '*literal* [colchetes] `crase` \\ barra';
  const document = { type: 'doc', content: [{ type: 'paragraph', content: [
    { type: 'text', text, marks: [{ type: 'bold' }] },
    { type: 'text', text: ' documentação', marks: [{ type: 'link', attrs: { href: 'https://example.com/a(b)', title: 'A documentação' } }] },
    { type: 'image', attrs: { src: 'https://example.com/a.svg', alt: 'Descrição', title: 'Figura' } },
  ] }] };
  const loaded = markdownToDocument(documentToMarkdown(document));
  assert.deepEqual(loaded.content[0].content, document.content[0].content);
});

test('task states, nested lists and table alignment survive a visual change', () => {
  const source = '- [ ] Uma tarefa\n- [x] Outra tarefa\n\n3. Primeiro\n   - Dentro\n4. Segundo\n\n| A | B | C |\n| :--- | :---: | ---: |\n| X | Y | Z |\n';
  const document = markdownToDocument(source);
  document.content[0].content[0].attrs.checked = true;
  document.content[2].content[1].content[1].content[0].content[0].text = 'Atualizado';
  const loaded = markdownToDocument(documentToMarkdown(document));
  assert.equal(loaded.content[0].content[0].attrs.checked, true);
  assert.equal(loaded.content[1].attrs.start, 3);
  assert.equal(loaded.content[1].content[0].content[1].type, 'bulletList');
  assert.deepEqual(loaded.content[2].content[0].content.map(cell => cell.attrs.align), ['left', 'center', 'right']);
  assert.equal(loaded.content[2].content[1].content[1].content[0].content[0].text, 'Atualizado');
});

test('changing code and diagrams chooses safe fences and preserves source text and code metadata', () => {
  const document = markdownToDocument(complex);
  const code = document.content.find(node => node.type === 'codeBlock');
  code.content = [{ type: 'text', text: 'const fence = "````";\n  console.log(fence);\n' }];
  const diagram = document.content.find(node => node.type === 'diagram');
  diagram.attrs.source = 'flowchart TD\n  A["``` dentro"] --> B[Final]';
  const loaded = markdownToDocument(documentToMarkdown(document));
  const loadedCode = loaded.content.find(node => node.type === 'codeBlock');
  assert.equal(loadedCode.content[0].text, code.content[0].text);
  assert.equal(loadedCode.attrs.language, 'typescript');
  assert.equal(loadedCode.attrs.fenceInfo, 'typescript title="exemplo"');
  assert.equal(loaded.content.find(node => node.type === 'diagram').attrs.source, diagram.attrs.source);
});

test('mixed task and ordinary lists remain available verbatim rather than dropping ordinary items', () => {
  const source = 'Antes\n\n- [ ] Com checkbox\n- Sem checkbox\n\nDepois\n';
  const document = markdownToDocument(source);
  assert.equal(document.content[1].type, 'preservedBlock');
  document.content[0].content[0].text = 'Antes revisado';
  assert.ok(documentToMarkdown(document).includes('- [ ] Com checkbox\n- Sem checkbox'));
});

test('unsupported visual table structures are rejected instead of silently losing content', () => {
  const source = '| A |\n| --- |\n| B |\n';
  const document = normalize(source);
  const cell = document.content[0].content[1].content[0];
  cell.content.push({ type: 'paragraph', content: [{ type: 'text', text: 'Outra linha' }] });
  assert.throws(() => documentToMarkdown(document), /um parágrafo por célula/i);
  cell.content.pop();
  cell.content[0].content.push({ type: 'hardBreak' }, { type: 'text', text: 'Outra linha' });
  assert.throws(() => documentToMarkdown(document), /um parágrafo por célula/i);
  cell.content[0].content.splice(1);
  cell.attrs.colspan = 2;
  assert.throws(() => documentToMarkdown(document), /células/i);
});
