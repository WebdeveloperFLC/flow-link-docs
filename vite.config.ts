import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import fs from "fs";
import path from "path";
import { componentTagger } from "lovable-tagger";

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

/** Serve content/service-library/**/downloads/* HTML assets at /content/service-library/... (dev + build copy). */
function serviceLibraryDownloadsPlugin(): Plugin {
  const contentRoot = path.join(process.cwd(), "content/service-library");

  function resolveContentFile(pathname: string): string | null {
    const m = pathname.match(/^\/content\/service-library\/(.+)$/);
    if (!m) return null;
    const filePath = path.join(contentRoot, m[1]);
    if (!filePath.startsWith(contentRoot)) return null;
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile() ? filePath : null;
  }

  return {
    name: "service-library-downloads-static",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? "").split("?")[0] ?? "";
        const filePath = resolveContentFile(pathname);
        if (!filePath) return next();
        const ext = path.extname(filePath).toLowerCase();
        const type =
          ext === ".html"
            ? "text/html; charset=utf-8"
            : ext === ".css"
              ? "text/css"
              : "application/octet-stream";
        res.setHeader("Content-Type", type);
        fs.createReadStream(filePath).pipe(res);
      });
    },
    closeBundle() {
      const outRoot = path.join(process.cwd(), "dist/content/service-library");
      function copyDir(src: string, rel = "") {
        if (!fs.existsSync(src)) return;
        for (const name of fs.readdirSync(src)) {
          const srcPath = path.join(src, name);
          const relPath = rel ? `${rel}/${name}` : name;
          if (fs.statSync(srcPath).isDirectory()) {
            copyDir(srcPath, relPath);
          } else if (relPath.includes("/downloads/") || relPath.includes("\\downloads\\")) {
            const dest = path.join(outRoot, relPath);
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.copyFileSync(srcPath, dest);
          }
        }
      }
      copyDir(contentRoot);
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
  plugins: [react(), specimenChecklistsPlugin(), serviceLibraryDownloadsPlugin(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
