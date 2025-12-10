# How to Edit and Test the Twitch Overlay Extension (with Live Backend)

This document explains how to edit and test the **Twitch overlay extension** using the **live backend**. You’ll modify the HTML, JavaScript, and CSS files, package them into a ZIP, and deploy on Twitch to test your changes live.

## 1. Create or Access the Extension on Twitch
1. Visit the [Twitch Developer Console](https://dev.twitch.tv/console/extensions).
2. Click **Create Extension** (if you don’t already have one).
3. Fill in:
   - **Name:** A descriptive title, e.g. `Profile Extension Overlay`
   - **Type:** `Overlay`
   - **Version:** Start with `0.0.1`
4. Click **Create Extension** to continue to the management dashboard.

## 2. Download and Edit the Code
Download the provided source files. These files make up your extension:

### config.html
This file defines the **Configuration View**, which broadcasters see when they configure the extension.  
You can edit HTML here to update layout, form inputs, or configuration UI.

### config.js
Contains the configuration logic for the extension, including saving or retrieving broadcaster settings.  
You can modify event handlers or how data is stored.

### profile-extension.html
This is the **Overlay View** that appears on the Twitch stream itself.  
Adjust markup, containers, or dynamic elements that appear in the overlay.

### profile-extension.js
Controls overlay logic and Twitch API interactions.  
Here you can handle real-time data, UI updates, and communication with the backend.

### styles.css
Contains all visual styling for the overlay and configuration UI.  
Edit classes, colors, positioning, and responsive behavior here.

> These files are plain HTML, JavaScript, and CSS — no build or compile steps are required.

## 3. Package the Files
1. When you’re done editing, create a ZIP that includes **only** the five files listed above.  
2. **The ZIP structure should look like:**
```
   OverlayExtension.zip
    ├── config.html
    ├── config.js
    ├── profile-extension.html
    ├── profile-extension.js
    ├── temp.png
    └── styles.css
```
4. Ensure the files are at the **root level** — no nested directories.

## 4. Upload the New Version to Twitch
1. Open your extension on the [Twitch Developer Console](https://dev.twitch.tv/console/extensions).
2. Go to the **Files** tab.
3. Click **Upload Version in Assets** and select the ZIP you just created.
4. After it uploads, click:
- **Status**, then
- **Move To Hosted Test** to push your version to a live testing stage.

## 5. Test the Live Extension
1. Open your **Twitch Creator Dashboard**.
2. Navigate to **Extensions → My Extensions**.
3. Find your extension and click:
- **Activate → Set as Component 1**
4. In OBS, you can have zero visible layers — the overlay still loads and communicates with Twitch’s backend.
5. Go to your Twitch channel or stream preview to confirm the overlay loads correctly.

## 6. Iterate and Re-Test
Each time you make changes:
1. Edit any of the five files:
- `config.html`
- `config.js`
- `profile-extension.html`
- `profile-extension.js`
- `styles.css`
2. Recreate your ZIP (flat structure, no folders).
3. Upload as a **new version** in the **Versions** tab.
4. Promote that version to **Live** and retest.

## 7. Debugging
- Use `console.log()` in the `.js` files to track activity.
- Use browser **Developer Tools** (`Ctrl+Shift+I` / `Cmd+Opt+I`) to view:
- Console logs
- Network requests
- Errors or warnings

## Summary
- Only include the five files: `config.html`, `config.js`, `profile-extension.html`, `profile-extension.js`, and `styles.css` in your ZIP (temp.png is okay too, for now).
- Upload via the **Files** tab.  
- Test directly on your Twitch channel; OBS can be empty — the overlay still connects to the live backend.
