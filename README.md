# Arc Bookmarks Export

<img width="663" height="402" alt="Captura de Tela 2025-08-20 às 21 46 13" src="https://github.com/user-attachments/assets/15632bca-60c1-4b2b-ba41-58eca03b2d08" />


## Table of Contents
- [Overview](#overview)
- [Requirements](#requirements)
- [Installation & Usage](#installation--usage)
- [How it Works](#how-it-works)
- [Features](#features)
- [Contributions](#contributions)
- [Support](#support)
- [License](#license)

## Overview
Easily export your Arc browser bookmarks to a beautiful, collapsible HTML page and a structured JSON file. This tool helps you visualize and backup your Arc bookmarks with a modern interface and flexible output options.

## Requirements
- Node.js (v20 or higher recommended)
- Arc browser installed (to access the bookmarks database)

## Installation & Usage
1. **Clone this repository:**
   ```sh
   git clone https://github.com/allangrds/arc-bookmarks-expoert.git
   cd arc-bookmarks-expoert
   ```
2. **Install dependencies:**
   (No dependencies required for basic usage)

3. **Run the exporter:**
   ```sh
   npm run build
   ```
   By default, this will generate `arc-bookmarks.html` and `arc-bookmarks.json` in the current directory.

4. **Custom output name:**
   ```sh
   npm run build -- -o mybookmarks
   # or
   npm run build -- --output mybookmarks
   ```
   This will generate `mybookmarks.html` and `mybookmarks.json`.

## How it Works
- Reads your Arc browser's bookmarks database (`StorableSidebar.json`)
- Converts the data into a hierarchical structure
- Generates both an HTML file (with collapsible folders and visual indentation) and a JSON file
- Output files are saved in the current directory with the specified or default name

## Features

- Generates a modern, collapsible HTML page for easy navigation of your bookmarks
- Exports a structured JSON file with the same hierarchy
- **Also exports JSON files ready for import in:**
  - Chrome (`.chrome.json`)
  - Firefox (`.firefox.json`)
  - Edge (`.edge.json`)
  - Safari (`.safari.json`)

## Contributions
Contributions are welcome! Feel free to open issues or submit pull requests to improve features, fix bugs, or suggest enhancements.

## Support
If you find this project useful, consider supporting it:

[![Buy Me a Coffee](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://buymeacoffee.com/allangrdse)

## License
MIT License. See [LICENSE](LICENSE) for details.

