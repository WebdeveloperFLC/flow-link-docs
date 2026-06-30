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
  plugins: [enoentGuardPlugin(), react(), publicHtmlGuidesPlugin(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("ag-grid-community") || id.includes("ag-grid-react")) return "ag-grid";
          if (id.includes("recharts")) return "recharts";
          if (id.includes("/src/accounting/")) return "accounting";
          if (id.includes("/src/hr-payroll/")) return "hr-payroll";
        },
      },
    },
  },
}));
