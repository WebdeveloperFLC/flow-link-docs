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

/** Serve public/specimens/checklists/*.html without requiring .html in the URL (dev server). */
function specimenChecklistsPlugin(): Plugin {
  return {
    name: "specimen-checklists-static",
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
  plugins: [enoentGuardPlugin(), react(), specimenChecklistsPlugin(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
