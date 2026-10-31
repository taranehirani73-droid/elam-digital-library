# Architecture

The Android application bundles the React interface locally through Capacitor. It never downloads executable JavaScript from the content repository. Vite builds the owner editor separately; the Android bundle does not include the editor.

`content/catalog.json` is the editable source catalog. `content/categories.json` defines every category, hierarchy and cover. Markdown files live in articles, books, stories and videos. Images carry attribution and license metadata on their catalog records. A literary story must carry `رواية أدبية`.

`scripts/content.ts` validates the complete source, checks file existence, omits drafts and generates a public catalog and SHA-256 manifest. Version is derived from published file hashes, not an arbitrary counter. It creates `build/pages/content` for Pages and `public/content` for the bundled first-run fallback. There is no change to Android code when publishing new content.

At runtime `src/lib/sync.ts` fetches the manifest, validates its schema, compares the version, retrieves the catalog, categories and all referenced Markdown and image files, verifies hashes and data limits, then commits one snapshot into IndexedDB. Reads retain the prior snapshot until the entire replacement transaction succeeds. Unchanged versions only require a manifest request. Downloads use timeouts and omit credentials. Relative paths prohibit traversal and executable file extensions. Manifest hashes detect inconsistent or corrupt transfers; the configured HTTPS source remains the trust boundary, not a cryptographic publisher identity.

The reader renders sanitized Markdown; executable HTML and remote embedded images are removed. YouTube is supported through validated external links. Bookmarks, source URL, theme and font preference remain local. The app refreshes manually and when returning to the foreground. The optional `elamlibrary://read/ID` deep link opens a cached or currently available item.

The editor accepts a local content directory, provides Arabic metadata and category forms, validates data using the same model as the reader, and exports a UTF-8 ZIP with JSON, Markdown and images. It has no GitHub write implementation and stores no credentials. Its changes are session-local until exported.

GitHub Actions validates, tests and stages Pages output before deployment. An invalid input fails before the deploy job. The separate manual Android workflow builds a debug APK when application code changes.

Limits: 2,000 items/categories per list, 5 MB per image, 2 MB per text/index file, 60 MB per downloaded snapshot. This MVP loads the complete public snapshot for straightforward offline behavior; it does not implement partial-download books or video files. Published source pages may be in languages other than Arabic; the app bodies are Arabic editorial summaries.
