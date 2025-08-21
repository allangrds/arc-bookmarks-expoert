// ====== WRITE JSON ======
function writeJson(bookmarks, outputPath = null) {
  log("INFO", "Writing JSON...");
  let outputFile;
  if (outputPath) {
    outputFile = outputPath;
  } else {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "_");
    outputFile = `arc_bookmarks_${date}.json`;
  }
  fs.writeFileSync(outputFile, JSON.stringify(bookmarks, null, 2), "utf-8");
  log("DEBUG", `JSON written to ${outputFile}`);
}

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const os = require("os");

const Colors = {
  RESET: "\x1b[0m",
  BOLD: "\x1b[1m",
  UNDERLINE: "\x1b[4m",
  BLACK: "\x1b[30m",
  RED: "\x1b[31m",
  GREEN: "\x1b[32m",
  YELLOW: "\x1b[33m",
  BLUE: "\x1b[34m",
  MAGENTA: "\x1b[35m",
  CYAN: "\x1b[36m",
  WHITE: "\x1b[37m",
  GREY: "\x1b[90m",
  background: (color) => color.replace("[3", "[4")
};

function log(level, message) {
  const time = new Date().toTimeString().slice(0, 5);
  switch (level) {
    case "DEBUG":
      console.log(`${Colors.GREY}${time}${Colors.RESET} ${Colors.BOLD}${Colors.CYAN}DEBG${Colors.RESET} ${message}`);
      break;
    case "INFO":
      console.log(`${Colors.GREY}${time}${Colors.RESET} ${Colors.BOLD}${Colors.GREEN}INFO${Colors.RESET} ${message}`);
      break;
    case "WARN":
      console.log(`${Colors.GREY}${time}${Colors.RESET} ${Colors.BOLD}${Colors.YELLOW}WARN${Colors.RESET} ${message}`);
      break;
    case "ERROR":
      console.log(`${Colors.GREY}${time}${Colors.RESET} ${Colors.BOLD}${Colors.RED}ERRR${Colors.RESET} ${message}`);
      break;
    case "CRIT":
      console.log(`${Colors.GREY}${time}${Colors.RESET} ${Colors.BOLD}${Colors.background(Colors.RED)}CRIT${Colors.RESET} ${message}`);
      break;
  }
}

// ====== READ JSON ======
function readJson() {
  log("INFO", "Reading JSON...");
  const filename = "StorableSidebar.json";

  let libraryPath;
  if (os.platform() === "win32") {
    const basePath = path.join(os.homedir(), "AppData", "Local", "Packages");
    const arcDirs = fs.readdirSync(basePath).filter(f => f.startsWith("TheBrowserCompany.Arc"));
    if (arcDirs.length !== 1) throw new Error("Arc path not found");
    libraryPath = path.join(basePath, arcDirs[0], "LocalCache", "Local", "Arc", filename);
  } else {
    libraryPath = path.join(os.homedir(), "Library", "Application Support", "Arc", filename);
  }

  let data = {};
  if (fs.existsSync(filename)) {
    log("DEBUG", `Found ${filename} in current directory.`);
    data = JSON.parse(fs.readFileSync(filename, "utf-8"));
  } else if (fs.existsSync(libraryPath)) {
    log("DEBUG", `Found ${filename} in Library directory.`);
    data = JSON.parse(fs.readFileSync(libraryPath, "utf-8"));
  } else {
    log("CRIT", `File not found: ${filename}`);
    throw new Error("JSON file not found");
  }
  return data;
}

// ====== GET SPACES ======
function getSpaces(spaces) {
  log("INFO", "Getting spaces...");
  const spacesNames = { pinned: {}, unpinned: {} };
  let n = 1;

  spaces.forEach(space => {
    const title = space.title || `Space ${n++}`;
    if (space.newContainerIDs) {
      space.newContainerIDs.forEach((c, i) => {
        if (typeof c === "object") {
          if ("pinned" in c) spacesNames.pinned[String(space.newContainerIDs[i + 1])] = title;
          if ("unpinned" in c) spacesNames.unpinned[String(space.newContainerIDs[i + 1])] = title;
        }
      });
    }
  });

  return spacesNames;
}

// ====== CONVERT TO BOOKMARKS ======
function convertToBookmarks(spaces, items) {
  log("INFO", "Converting to bookmarks...");
  const bookmarks = { bookmarks: [] };
  const itemDict = {};
  items.forEach(item => { if (item && item.id) itemDict[item.id] = item; });

  function recurse(parentId) {
    const children = [];
    for (const id in itemDict) {
      const item = itemDict[id];
      if (item.parentID === parentId) {
        if (item.data?.tab) {
          children.push({
            title: item.title || item.data.tab.savedTitle || "",
            type: "bookmark",
            url: item.data.tab.savedURL || ""
          });
        } else if (item.title) {
          children.push({
            title: item.title,
            type: "folder",
            children: recurse(id)
          });
        }
      }
    }
    return children;
  }

  for (const [spaceId, spaceName] of Object.entries(spaces.pinned)) {
    bookmarks.bookmarks.push({
      title: spaceName,
      type: "folder",
      children: recurse(spaceId)
    });
  }

  return bookmarks;
}

// ====== CONVERT BOOKMARKS TO HTML ======
function convertBookmarksToHtml(bookmarks) {
  log("INFO", "Converting bookmarks to HTML...");
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bookmarks</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f6f7fb; color: #222; margin: 0; padding: 0; }
  .container { max-width: 100vw; overflow-x: auto; margin: 40px auto; background: #fff; border-radius: 16px; box-shadow: 0 4px 24px #0001; padding: 32px 24px; }
    h1 { text-align: center; color: #3a3a3a; margin-bottom: 32px; }
  ul.bookmarks, .folder > ul { list-style: none; padding-left: 0; margin: 0; }
    .folder { margin: 6px 0 6px 0; }
    .folder-title { cursor: pointer; display: flex; align-items: center; font-weight: 600; color: #2a4cff; border-radius: 8px; padding: 4px 8px; transition: background 0.2s; }
    .folder-title:hover { background: #f0f4ff; }
    .folder-arrow { display: inline-block; width: 18px; transition: transform 0.2s; margin-right: 4px; }
    .collapsed > .folder-title .folder-arrow { transform: rotate(-90deg); }
    .collapsed > ul { display: none; }
  .bookmark-link { display: block; color: #222; text-decoration: none; border-radius: 8px; margin: 2px 0; transition: background 0.2s, color 0.2s; font-weight: 500; }
  .bookmark-link:hover { background: #e6eaff; color: #2a4cff; }
  /* Indentação visual por nível */
  ul.bookmarks > li > .folder-title, ul.bookmarks > li > a.bookmark-link { padding-left: 8px; }
  ul.bookmarks > li > .folder-title { font-size: 1.18em; }
  ul.bookmarks a.bookmark-link { margin-bottom: 6px; }
  ul.bookmarks ul > li > .folder-title, ul.bookmarks ul > li > a.bookmark-link { padding-left: 32px; }
  ul.bookmarks ul ul > li > .folder-title, ul.bookmarks ul ul > li > a.bookmark-link { padding-left: 56px; }
  ul.bookmarks ul ul ul > li > .folder-title, ul.bookmarks ul ul ul > li > a.bookmark-link { padding-left: 80px; }
  ul.bookmarks ul ul ul ul > li > .folder-title, ul.bookmarks ul ul ul ul > li > a.bookmark-link { padding-left: 104px; }
  ul.bookmarks ul ul ul ul ul > li > .folder-title, ul.bookmarks ul ul ul ul ul > li > a.bookmark-link { padding-left: 128px; }
  ul.bookmarks ul ul ul ul ul ul > li > .folder-title, ul.bookmarks ul ul ul ul ul ul > li > a.bookmark-link { padding-left: 152px; }
  ul.bookmarks ul ul ul ul ul ul ul > li > .folder-title, ul.bookmarks ul ul ul ul ul ul ul > li > a.bookmark-link { padding-left: 176px; }
  ul.bookmarks ul ul ul ul ul ul ul ul > li > .folder-title, ul.bookmarks ul ul ul ul ul ul ul ul > li > a.bookmark-link { padding-left: 200px; }
  ul.bookmarks ul ul ul ul ul ul ul ul ul > li > .folder-title, ul.bookmarks ul ul ul ul ul ul ul ul ul > li > a.bookmark-link { padding-left: 224px; }
  ul.bookmarks ul ul ul ul ul ul ul ul ul ul > li > .folder-title, ul.bookmarks ul ul ul ul ul ul ul ul ul ul > li > a.bookmark-link { padding-left: 248px; }
  ul.bookmarks ul ul ul ul ul ul ul ul ul ul ul > li > .folder-title, ul.bookmarks ul ul ul ul ul ul ul ul ul ul ul > li > a.bookmark-link { padding-left: 272px; }
  ul.bookmarks ul ul ul ul ul ul ul ul ul ul ul ul > li > .folder-title, ul.bookmarks ul ul ul ul ul ul ul ul ul ul ul ul > li > a.bookmark-link { padding-left: 296px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Bookmarks</h1>
    <ul class="bookmarks">
`;

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, function (c) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'})[c];
    });
  }

  function traverse(items) {
    items.forEach(item => {
      if (item.type === "folder") {
        html += `<li class="folder">
          <div class="folder-title" onclick="toggleFolder(this.parentNode)">
            <span class="folder-arrow">▶</span>
            <span>${escapeHtml(item.title)}</span>
          </div>
          <ul>`;
        traverse(item.children);
        html += `</ul>
        </li>`;
      } else if (item.type === "bookmark") {
        html += `<li><a class="bookmark-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></li>`;
      }
    });
  }

  traverse(bookmarks.bookmarks);

  html += `
    </ul>
  </div>
  <script>
    function toggleFolder(folderElem) {
      folderElem.classList.toggle('collapsed');
    }
    // Inicialmente colapsar todas as subpastas
    document.addEventListener('DOMContentLoaded', function() {
      document.querySelectorAll('.folder ul').forEach(function(ul) {
        if(ul.parentNode.parentNode.classList.contains('bookmarks')) return; // não colapsar raiz
        ul.parentNode.classList.add('collapsed');
      });
    });
  </script>
</body>
</html>`;
  return html;
}

// ====== WRITE HTML ======
function writeHtml(htmlContent, outputPath = null) {
  log("INFO", "Writing HTML...");
  let outputFile;
  if (outputPath) {
    outputFile = outputPath;
  } else {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "_");
    outputFile = `arc_bookmarks_${date}.html`;
  }
  fs.writeFileSync(outputFile, htmlContent, "utf-8");
  log("DEBUG", `HTML written to ${outputFile}`);
}

// ====== MAIN ======
function main() {
  const args = process.argv.slice(2);
  let outputBase = "arc-bookmarks";
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === "-o" || args[i] === "--output") && args[i + 1]) {
      outputBase = args[i + 1];
      i++;
    }
  }

  const data = readJson();
  const containers = data.sidebar.containers;
  const targetIndex = containers.findIndex(c => "global" in c) + 1;
  if (!targetIndex) throw new Error("No container with 'global' found");

  const spaces = getSpaces(containers[targetIndex].spaces);
  const items = containers[targetIndex].items;
  const bookmarks = convertToBookmarks(spaces, items);
  const html = convertBookmarksToHtml(bookmarks);
  writeHtml(html, `${outputBase}.html`);
  writeJson(bookmarks, `${outputBase}.json`);

  // Export for browsers
  function flattenBookmarksForBrowser(items, browser) {
    let arr = [];
    items.forEach(item => {
      if (item.type === "folder") {
        if (browser === 'firefox') {
          arr.push({
            type: "folder",
            title: item.title,
            children: flattenBookmarksForBrowser(item.children, browser)
          });
        } else if (browser === 'chrome' || browser === 'edge') {
          arr.push({
            id: '',
            parentId: '',
            title: item.title,
            dateAdded: '',
            type: "folder",
            children: flattenBookmarksForBrowser(item.children, browser)
          });
        } else if (browser === 'safari') {
          arr.push({
            Title: item.title,
            Children: flattenBookmarksForBrowser(item.children, browser),
            WebBookmarkType: "WebBookmarkTypeList"
          });
        }
      } else if (item.type === "bookmark") {
        if (browser === 'firefox') {
          arr.push({ type: "bookmark", title: item.title, url: item.url });
        } else if (browser === 'chrome' || browser === 'edge') {
          arr.push({
            id: '',
            parentId: '',
            title: item.title,
            url: item.url,
            dateAdded: '',
            type: "url"
          });
        } else if (browser === 'safari') {
          arr.push({
            URIDictionary: { title: item.title },
            URLString: item.url,
            WebBookmarkType: "WebBookmarkTypeLeaf"
          });
        }
      }
    });
    return arr;
  }

  // Firefox
  const firefoxJson = { children: flattenBookmarksForBrowser(bookmarks.bookmarks, 'firefox') };
  writeJson(firefoxJson, `${outputBase}.firefox.json`);

  // Chrome
  const chromeJson = {
    roots: {
      bookmark_bar: { children: flattenBookmarksForBrowser(bookmarks.bookmarks, 'chrome') },
      other: { children: [] },
      synced: { children: [] }
    },
    version: 1
  };
  writeJson(chromeJson, `${outputBase}.chrome.json`);

  // Edge (mesmo formato do Chrome)
  writeJson(chromeJson, `${outputBase}.edge.json`);

  // Safari
  const safariJson = {
    Title: "Bookmarks",
    Children: flattenBookmarksForBrowser(bookmarks.bookmarks, 'safari'),
    WebBookmarkFileVersion: 1
  };
  writeJson(safariJson, `${outputBase}.safari.json`);
  log("INFO", "Done!");
}

main();