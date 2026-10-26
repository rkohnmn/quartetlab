# Privacy and Local Data Handling Policy.

QuartetLab operates as a local-first static web app. Each calculation, file import, and code export runs inside your browser tab.

## 1. Zero External Telemetry or Network Transmission.

- **No Analytics Scripts**: QuartetLab loads zero third-party analytics, tracking pixels, or session recorders.
- **No Server Uploads**: Imported CSV or TSV numbers, custom variable names, and free-response prompts stay in browser memory. QuartetLab never sends your data to an external server.
- **Offline Operation**: Once the page loads, the workbench runs without an internet connection.

## 2. Browser Storage (`localStorage`) Behavior.

QuartetLab uses three keys in `window.localStorage` to save your work across page reloads.

- `quartetlab_active_session_v1`: Saves active coordinates, variable labels, and scenario text. Overwrites on edit and clears on reset.
- `quartetlab_saved_snapshots_v1`: Saves up to 20 user-named dataset snapshots until you delete them.
- `quartetlab_ui_prefs_v1`: Saves your chosen visual theme (`light` or `dark`).

If your browser blocks `localStorage` (such as in strict private windows or sandboxed iframes), QuartetLab catches the error and runs in memory without crashing.

## 3. Inspecting and Deleting Local Data.

Click **Snapshots & Privacy** in the top bar at any time to manage your data.

1. View the exact byte count and keys stored in your browser's `localStorage`.
2. Load or remove individual saved dataset snapshots.
3. Click **Delete All Local Browser Data** to erase all three `quartetlab_*` keys at once.

## 4. Shareable URL Links (`#state=...`).

When you click **Share Link**, QuartetLab encodes the active dataset into the URL hash fragment (`#state=...`) and copies the link. Browser hash fragments stay on the client side during standard HTTP requests, and anyone who opens your full link can view and edit the encoded dataset.
