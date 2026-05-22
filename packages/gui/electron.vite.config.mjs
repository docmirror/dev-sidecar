import { defineConfig } from "electron-vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 读取 package.json 中的 dependencies 作为外部依赖
const pkg = JSON.parse(fs.readFileSync(resolve(__dirname, "package.json"), "utf8"));
const dependencies = Object.keys(pkg.dependencies || {});

// 复制 mitmproxy.js 到输出目录的插件
function copyMitmproxyPlugin() {
  return {
    name: "copy-mitmproxy",
    closeBundle() {
      const src = resolve(__dirname, "src/main/bridge/mitmproxy.js");
      const dest = resolve(__dirname, "out/main/mitmproxy.js");
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log("mitmproxy.js copied to out/main/");
      }
    },
  };
}

export default defineConfig({
  main: {
    build: {
      outDir: "out/main",
      rollupOptions: {
        external: [
          "electron",
          ...dependencies,
        ],
      },
    },
    plugins: [copyMitmproxyPlugin()],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src/main"),
      },
    },
    define: {
      "global.GENTLY": true,
    },
  },
  preload: {
    build: {
      outDir: "out/preload",
      lib: {
        entry: resolve(__dirname, "src/preload/index.js"),
        formats: ["cjs"],
        fileName: () => "index.js",
      },
      rollupOptions: {
        external: ["electron", ...dependencies],
      },
    },
    plugins: [],
  },
  renderer: {
    root: resolve(__dirname, "src/renderer"),
    base: "./",
    publicDir: resolve(__dirname, "public"),
    build: {
      outDir: resolve(__dirname, "out/renderer"),
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/renderer/index.html"),
        },
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (
                id.includes("vue") ||
                id.includes("vue-router") ||
                id.includes("ant-design-vue")
              ) {
                return "vendor";
              }
            }
          },
        },
      },
    },
    plugins: [vue(), vueJsx()],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src/renderer/src"),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {},
      },
    },
    define: {
      "global.GENTLY": true,
    },
    server: {
      port: 8080,
      open: false,
    },
  },
});
