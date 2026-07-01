import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import fs from "fs";
import path from "path";
import { componentTagger } from "lovable-tagger";

/** Surface missing file paths before Vite's truncated ENOENT (Lovable build logs). */
function enoentGuardPlugin(): Plugin {
  const projectRoot = path.resolve(process.cwd());
  return {
    name: "enoent-guard",
    enforce: "pre",
    async load(id) {
      const cleanId = id.split("?")[0];
      if (cleanId.startsWith("\0") || cleanId.includes("virtual:")) return null;
      if (!path.isAbsolute(cleanId)) return null;
      // Ignore SPA route paths like /auth mistaken for absolute filesystem paths on Unix.
      const normalized = path.normalize(cleanId);
      if (normalized !== projectRoot && !normalized.startsWith(`${projectRoot}${path.sep}`)) return null;
      try {
        await fs.promises.access(cleanId);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") {
          throw new Error(`[vite build] Missing file for module id: ${id}`, { cause: err });
        }
      }
      return null;
    },
  };
}

/** Strip eager vendor preload from the tiny boot entry chunk (Lovable preview hang). */
function stripBootVendorPreloadPlugin(): Plugin {
  const patchEntry = (code: string) => {
    if (!code.includes("entry evaluated")) return code;
    return code
      .replace(/import"\.\/vendor-[^"]+\.js";/g, "")
      .replace(/import"\.\/ui-vendor-[^"]+\.js";/g, "")
      .replace(/import"\.\/react-vendor-[^"]+\.js";/g, "")
      .replace(/import{_ as \w+}from"\.\/docs-vendor-[^"]+\.js";/g, "")
      .replace(
        /\w+\(\(\)=>import\("([^"]+\.js)"\)(?:\.then\([^)]+\))?,\[\]\)/g,
        'import("$1")',
      );
  };

  return {
    name: "strip-boot-vendor-preload",
    closeBundle() {
      const assetsDir = path.join(process.cwd(), "dist/assets");
      if (!fs.existsSync(assetsDir)) return;
      for (const file of fs.readdirSync(assetsDir)) {
        if (!file.startsWith("index-") || !file.endsWith(".js")) continue;
        const fullPath = path.join(assetsDir, file);
        const code = fs.readFileSync(fullPath, "utf8");
        const patched = patchEntry(code);
        if (patched !== code) fs.writeFileSync(fullPath, patched);
      }
    },
  };
}

/** Serve public HTML guides without SPA swallowing (dev server). */
function publicHtmlGuidesPlugin(): Plugin {
  return {
    name: "public-html-guides-static",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const [pathname, search = ""] = (req.url ?? "").split("?");
        const query = search ? `?${search}` : "";

        if (pathname === "/specimens/checklists" || pathname === "/specimens/checklists/") {
          req.url = `/specimens/checklists/index.html${query}`;
          return next();
        }

        const slugMatch = pathname.match(/^\/specimens\/checklists\/([a-z0-9-]+)$/i);
        if (slugMatch) {
          const htmlPath = path.join(process.cwd(), "public", `${pathname}.html`);
          if (fs.existsSync(htmlPath)) {
            req.url = `${pathname}.html${query}`;
          }
        }

        const rootGuide = pathname.match(/^\/([a-z0-9-]+-free-guide\.html)$/i);
        if (rootGuide) {
          const htmlPath = path.join(process.cwd(), "public", rootGuide[1]);
          if (fs.existsSync(htmlPath)) {
            req.url = `/${rootGuide[1]}${query}`;
          }
        }

        const downloadMatch = pathname.match(
          /^\/content\/service-library\/([a-z0-9-]+)\/downloads\/([a-z0-9.-]+\.html)$/i,
        );
        if (downloadMatch) {
          const htmlPath = path.join(process.cwd(), "public", `${pathname}`);
          if (fs.existsSync(htmlPath)) {
            req.url = `${pathname}${query}`;
          }
        }

        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [enoentGuardPlugin(), stripBootVendorPreloadPlugin(), react(), publicHtmlGuidesPlugin(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    modulePreload: {
      polyfill: false,
      resolveDependencies() {
        return [];
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("ag-grid-community") || id.includes("ag-grid-react")) return "ag-grid";
          if (id.includes("recharts")) return "recharts";
          if (id.includes("@supabase")) return "supabase";
          if (
            id.includes("react-dom") ||
            id.includes("react-router") ||
            id.includes("/react/") ||
            id.includes("scheduler/")
          ) {
            return "react-vendor";
          }
          if (id.includes("@radix-ui") || id.includes("@tanstack")) return "ui-vendor";
          if (id.includes("pdfjs") || id.includes("jspdf") || id.includes("xlsx") || id.includes("exceljs")) {
            return "docs-vendor";
          }
          return "vendor";
        },
      },
    },
  },
}));
