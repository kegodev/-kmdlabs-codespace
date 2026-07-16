CodeSpace — KM Digital Labs

A single-file, browser-based multi-file code editor and live compiler. Write HTML, CSS, and JavaScript (plus assorted other file types) in an in-browser file tree, and see the result rendered instantly in a built-in preview pane with console output — no build step, no backend, no dependencies.

Built by KM Digital Labs.

Features


Multi-file virtual workspace — create, edit, and organize files and folders directly in the browser sidebar.
Live preview — an auto-run toggle recompiles index.html (with linked .css/.js) into a sandboxed <iframe> as you type, or trigger it manually with the Compile button (Ctrl/Cmd + Enter).
Responsive preview modes — switch the preview stage between desktop, tablet, and mobile viewport sizes, or pop the result out into a new browser tab.
Console panel — captures logs and errors from the running preview.
File upload & drag-and-drop — import individual files or entire folders (via webkitdirectory), including images and binary assets.
Syntax-aware file typing — recognizes HTML, CSS, JS/JSX, TS/TSX, JSON, Markdown, PHP, Python, YAML, XML, and image formats, each with its own accent color in the file tree.
Local persistence — the entire workspace (files, active file, folder state) is saved to localStorage so work isn't lost on refresh.
Download — export the currently active file back to disk.
Mobile-friendly layout — a bottom dock lets you switch between the Files, Editor, and Preview panes on small screens.


Tech stack


Plain HTML, CSS, and vanilla JavaScript — no frameworks, no build tools, no external JS libraries.
Fonts: Space Grotesk and JetBrains Mono via Google Fonts.
Runs entirely client-side; the live preview executes inside a sandboxed <iframe>.


Getting started

No installation or build step required.


Clone the repo:


bash   git clone <your-repo-url>


Open coding-space.html directly in a browser, or serve it with any static file server:


bash   npx serve .


Start writing code in the editor — the default workspace ships with a starter index.html, style.css, and script.js.


Usage


Use the + icon in the sidebar to create a new file, or drag files/folders into the sidebar to import them.
Toggle auto-run to have the preview recompile as you type, or click Compile to run manually.
Use the device icons in the preview toolbar to check desktop, tablet, and mobile layouts.
Click Download to save the currently open file to your machine.
Click Reset to clear the workspace back to its defaults.


Project structure

This project currently lives as a single self-contained HTML file (coding-space.html) with inline <style> and <script> blocks. If split into separate files, the structure is:

├── coding-space.html   # markup
├── style.css           # styles
└── script.js           # editor logic, virtual file system, preview compiler

License

© KM Digital Labs. All rights reserved unless otherwise noted.
