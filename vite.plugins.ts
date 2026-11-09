import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { IndexHtmlTransformContext, Plugin } from "vite";

/** Strips HTML comments from `index.html` at build time.
 *  Comments are for developers only and must never ship to production. */
export function stripHtmlComments(): Plugin {
  return {
    name: "strip-html-comments",
    apply: "build",
    transformIndexHtml(html) {
      return html.replace(/<!--[\s\S]*?-->/g, "");
    },
  };
}

/** Deletes the given files from the build output after all assets (including public/) are copied. */
export function excludeFromBuild(files: string[]): Plugin {
  let outDir = "dist";
  return {
    name: "exclude-from-build",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      for (const file of files) {
        const target = fileURLToPath(new URL(`${outDir}/${file}`, import.meta.url));
        if (fs.existsSync(target)) fs.unlinkSync(target);
      }
    },
  };
}

/**
 * Strips the `crossorigin` attribute Vite adds to built script/link tags.
 * `file:///` pages have a `null` origin, and `crossorigin` forces a
 * CORS-mode fetch that browsers reject for `null` — for a script this
 * leaves a blank page, for a stylesheet just that one resource silently
 * failing to load.
 *
 * `vite.file.config.ts`-only — the normal build (`vite.config.ts`) never
 * uses this. Those attributes are there on purpose for anything served over
 * real http(s), and browsers handle them fine there.
 */
export function stripCrossorigin(): Plugin {
  return {
    name: "strip-crossorigin",
    apply: "build",
    enforce: "post",
    transformIndexHtml(html) {
      return html.replace(/\s+crossorigin(="[^"]*")?/g, "");
    },
  };
}

/**
 * Inlines the built entry script directly into `index.html` instead of
 * loading it as an external file. `<script type="module">` always fetches
 * in CORS mode per spec (independent of the `crossorigin` attribute
 * `stripCrossorigin` above removes), and browsers reject CORS-mode fetches
 * to a `null` origin, which `file:///` pages always have — so an external
 * module script can never load there. An inline module script has no fetch
 * step of its own, so the CORS check never applies.
 *
 * `vite.file.config.ts`-only, same reasoning as `stripCrossorigin` — the
 * normal build serves the entry script as its own cacheable file on
 * purpose.
 *
 * Reads the entry chunk straight out of Rollup's own in-memory output
 * (`ctx.bundle`, available to `transformIndexHtml`'s object-form hook),
 * never back off disk, so there's no risk of this running before the file
 * actually exists. Deletes the chunk from the bundle afterward so Vite
 * never writes the now-unreferenced file to `dist-file/` at all.
 */
export function inlineEntryScript(): Plugin {
  return {
    name: "inline-entry-script",
    apply: "build",
    enforce: "post",
    transformIndexHtml: {
      order: "post",
      handler(html: string, ctx: IndexHtmlTransformContext) {
        const bundle = ctx.bundle;
        if (!bundle) return html;

        const entryFileName = Object.keys(bundle).find((fileName) => {
          const chunk = bundle[fileName];
          return chunk?.type === "chunk" && chunk.isEntry;
        });
        if (!entryFileName) return html;

        const entry = bundle[entryFileName]!;
        if (entry.type !== "chunk") return html;

        const escapedFileName = entryFileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const tagPattern = new RegExp(
          `<script[^>]*\\ssrc="[^"]*${escapedFileName}"[^>]*></script>`,
        );

        // The function form, not a plain replacement string — entry.code is
        // 400+KB of arbitrary minified JS, and a plain string passed to
        // replace() specially interprets $&/$`/$'/$1/$$ sequences within
        // it. A codebase this size, full of template-literal backticks
        // from every `${...}` pattern, reliably contains at least one
        // stray `$`` or `$'` — each one silently re-splices a chunk of the
        // ORIGINAL html (whatever preceded/followed the match) back into
        // the middle of the inlined script. Only the function form inserts
        // its return value verbatim, with no pattern interpretation at all.
        const inlined = html.replace(
          tagPattern,
          () => `<script type="module">\n${entry.code}\n</script>`,
        );

        delete bundle[entryFileName];

        return inlined;
      },
    },
  };
}
