/**
 * campaign-editor.ts — TipTap WYSIWYG editor for the campaign composer.
 *
 * Bundled by Astro/Vite (imported from a processed <script> in
 * new.astro), so it can pull in the @tiptap/* npm modules — unlike the
 * page's other `is:inline` scripts.
 *
 * Outputs clean, email-compatible HTML via editor.getHTML(). That HTML
 * is mirrored into a hidden <textarea name="body_html"> on every change
 * so the existing form-submit logic (save draft / preview / send) keeps
 * working with zero changes to the API contract: formatBodyAsHtml in
 * lib/campaign.ts already passes real HTML through untouched.
 *
 * Toolbar: bold, italic, underline, H2/H3, bullet + ordered lists, text
 * color, link, image upload, and a curated EMAIL-SAFE font dropdown.
 *
 * Image upload posts to /api/admin/campaigns/image (admin-gated,
 * same-origin) and inserts the returned public URL with an inline
 * email-safe max-width:100% so it never overflows an inbox column.
 */
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { TextStyle, Color, FontFamily } from '@tiptap/extension-text-style';

/** Email-safe fonts only — these render reliably across Gmail / Apple
 *  Mail / Outlook. The brand font (Barlow Condensed) is offered with a
 *  web-safe fallback stack so it degrades gracefully where unsupported. */
export const EMAIL_SAFE_FONTS: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'Default (sans-serif)', value: '' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
  { label: 'Trebuchet MS', value: "'Trebuchet MS', Helvetica, sans-serif" },
  { label: 'Tiny Seed brand (Barlow)', value: "'Barlow Condensed', Arial, sans-serif" },
];

export interface CampaignEditorHandle {
  editor: Editor;
  /** Replace the entire document with new HTML (used by template load). */
  setHTML(html: string): void;
  /** Current HTML. */
  getHTML(): string;
}

interface InitOptions {
  /** Element the editor mounts into. */
  mount: HTMLElement;
  /** Hidden textarea the HTML is mirrored to (the form field). */
  hiddenField: HTMLTextAreaElement;
  /** Toolbar container (holds [data-cmd] buttons + the font/upload UI). */
  toolbar: HTMLElement;
  /** Initial HTML content. */
  initialHTML: string;
  /** Image upload endpoint. */
  imageUploadUrl: string;
}

/**
 * Initialize the editor + wire the toolbar. Returns a handle the page
 * uses to set content (template load) and read content (not strictly
 * needed since we mirror to the hidden field, but handy).
 */
export function initCampaignEditor(opts: InitOptions): CampaignEditorHandle {
  const editor = new Editor({
    element: opts.mount,
    extensions: [
      StarterKit.configure({
        // Email bodies don't need code blocks / blockquote chrome; keep
        // the schema lean so getHTML() stays email-clean.
        codeBlock: false,
        // StarterKit v3 bundles Link — we configure our own below, so
        // disable the bundled one to avoid a duplicate-extension warning.
        link: false,
      }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          // Inline brand-green link styling so it survives into the email
          // (email clients strip <style>, so inline is the only reliable
          // path).
          style: 'color:#166534;font-weight:600;text-decoration:underline',
          rel: 'noopener noreferrer',
        },
      }),
      Image.configure({
        inline: false,
        HTMLAttributes: {
          style: 'max-width:100%;height:auto;border-radius:8px',
        },
      }),
    ],
    content: opts.initialHTML || '<p></p>',
    editorProps: {
      attributes: {
        // Tailwind utility classes for the editable surface.
        class:
          'prose-campaign min-h-[260px] w-full rounded-b-ts-md border border-t-0 border-ts-border bg-ts-bg-base px-3 py-3 text-base leading-relaxed text-ts-text outline-none focus:border-ts-primary',
        'aria-label': 'Campaign body editor',
      },
    },
    onUpdate({ editor: ed }) {
      mirror(ed);
      refreshActiveStates(ed);
    },
    onSelectionUpdate({ editor: ed }) {
      refreshActiveStates(ed);
    },
  });

  function mirror(ed: Editor) {
    // If the doc is effectively empty, write '' so the required-field
    // validation on the form fires (an empty <p></p> would pass length).
    const text = ed.getText().trim();
    opts.hiddenField.value = text.length === 0 ? '' : ed.getHTML();
    // Dispatch input so any listeners on the hidden field react.
    opts.hiddenField.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // ── Toolbar wiring ───────────────────────────────────────────────
  const buttons = Array.from(
    opts.toolbar.querySelectorAll<HTMLButtonElement>('[data-cmd]')
  );

  function refreshActiveStates(ed: Editor) {
    for (const btn of buttons) {
      const cmd = btn.getAttribute('data-cmd');
      let active = false;
      switch (cmd) {
        case 'bold': active = ed.isActive('bold'); break;
        case 'italic': active = ed.isActive('italic'); break;
        case 'underline': active = ed.isActive('underline'); break;
        case 'h2': active = ed.isActive('heading', { level: 2 }); break;
        case 'h3': active = ed.isActive('heading', { level: 3 }); break;
        case 'bulletList': active = ed.isActive('bulletList'); break;
        case 'orderedList': active = ed.isActive('orderedList'); break;
        case 'link': active = ed.isActive('link'); break;
        default: active = false;
      }
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      btn.classList.toggle('bg-ts-primary/15', active);
      btn.classList.toggle('text-ts-primary', active);
      btn.classList.toggle('border-ts-primary/40', active);
    }
  }

  for (const btn of buttons) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cmd = btn.getAttribute('data-cmd');
      const chain = editor.chain().focus();
      switch (cmd) {
        case 'bold': chain.toggleBold().run(); break;
        case 'italic': chain.toggleItalic().run(); break;
        case 'underline': chain.toggleUnderline().run(); break;
        case 'h2': chain.toggleHeading({ level: 2 }).run(); break;
        case 'h3': chain.toggleHeading({ level: 3 }).run(); break;
        case 'bulletList': chain.toggleBulletList().run(); break;
        case 'orderedList': chain.toggleOrderedList().run(); break;
        case 'link': {
          const prev = editor.getAttributes('link').href as string | undefined;
          const url = window.prompt('Link URL (https://…):', prev || 'https://');
          if (url === null) { chain.run(); break; }
          const trimmed = url.trim();
          if (trimmed === '') {
            chain.extendMarkRange('link').unsetLink().run();
          } else {
            chain.extendMarkRange('link').setLink({ href: trimmed }).run();
          }
          break;
        }
        case 'unlink': chain.unsetLink().run(); break;
        default: chain.run();
      }
    });
  }

  // ── Font family dropdown ─────────────────────────────────────────
  const fontSelect = opts.toolbar.querySelector<HTMLSelectElement>('[data-font-select]');
  if (fontSelect) {
    fontSelect.addEventListener('change', () => {
      const v = fontSelect.value;
      if (v === '') {
        editor.chain().focus().unsetFontFamily().run();
      } else {
        editor.chain().focus().setFontFamily(v).run();
      }
    });
  }

  // ── Text color ───────────────────────────────────────────────────
  const colorInput = opts.toolbar.querySelector<HTMLInputElement>('[data-color-input]');
  if (colorInput) {
    colorInput.addEventListener('input', () => {
      editor.chain().focus().setColor(colorInput.value).run();
    });
  }
  const colorClear = opts.toolbar.querySelector<HTMLButtonElement>('[data-color-clear]');
  if (colorClear) {
    colorClear.addEventListener('click', (e) => {
      e.preventDefault();
      editor.chain().focus().unsetColor().run();
    });
  }

  // ── Image upload (file-pick + drag-drop) ─────────────────────────
  const fileInput = opts.toolbar.querySelector<HTMLInputElement>('[data-image-input]');
  const uploadStatus = opts.toolbar.querySelector<HTMLElement>('[data-upload-status]');

  function setUploadStatus(msg: string, isError: boolean) {
    if (!uploadStatus) return;
    uploadStatus.textContent = msg;
    uploadStatus.classList.toggle('text-ts-danger', isError);
    uploadStatus.classList.toggle('text-ts-text-muted', !isError);
  }

  async function uploadAndInsert(file: File): Promise<void> {
    if (!file.type.startsWith('image/')) {
      setUploadStatus('Only image files can be inserted.', true);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadStatus('Image is over 5 MB — please use a smaller file.', true);
      return;
    }
    setUploadStatus('Uploading image…', false);
    const fd = new FormData();
    fd.append('image', file);
    try {
      const res = await fetch(opts.imageUploadUrl, {
        method: 'POST',
        credentials: 'same-origin',
        body: fd,
      });
      const body = await res.json();
      if (res.ok && body.ok && body.url) {
        editor.chain().focus().setImage({ src: body.url }).run();
        setUploadStatus('Image inserted.', false);
      } else {
        setUploadStatus('Upload failed: ' + (body.error || 'unknown error') + '.', true);
      }
    } catch {
      setUploadStatus('Network error uploading image.', true);
    }
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      const f = fileInput.files?.[0];
      if (f) void uploadAndInsert(f);
      fileInput.value = ''; // allow re-selecting the same file
    });
  }

  // Drag-drop onto the editor surface.
  opts.mount.addEventListener('dragover', (e) => {
    if (e.dataTransfer?.types.includes('Files')) {
      e.preventDefault();
      opts.mount.classList.add('ring-2', 'ring-ts-primary/40');
    }
  });
  opts.mount.addEventListener('dragleave', () => {
    opts.mount.classList.remove('ring-2', 'ring-ts-primary/40');
  });
  opts.mount.addEventListener('drop', (e) => {
    opts.mount.classList.remove('ring-2', 'ring-ts-primary/40');
    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      e.preventDefault();
      void uploadAndInsert(file);
    }
  });

  // Initial mirror + active-state paint.
  mirror(editor);
  refreshActiveStates(editor);

  return {
    editor,
    setHTML(html: string) {
      editor.commands.setContent(html || '<p></p>', { emitUpdate: false });
      mirror(editor);
      refreshActiveStates(editor);
    },
    getHTML() {
      return editor.getHTML();
    },
  };
}
