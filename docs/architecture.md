# Architecture

```text
Tauri desktop shell
-> filesystem and system commands
-> metadata JSON and raw binary IPC
-> typed search reports and byte payloads
-> React workspace coordinator
-> viewer registry
-> lazy format loaders
-> discriminated preview content
```

The viewer registry is the frontend source of truth for extension resolution, editing, and lazy loaders. Backend MIME and search classification are owned by `formats.rs`; the frontend does not duplicate a searchable capability flag. Tabs store only viewer IDs so navigation state does not retain executable registry snapshots. Each loader returns a discriminated preview content model, and the preview surface renders that model exhaustively.

Heavy format libraries are loaded only when their format family is opened. Preview-owned object URLs are revoked when content changes or an obsolete request finishes. HTML sanitization is fail-closed and the Tauri window has an explicit content security policy.

File metadata and file bytes use separate commands. Metadata is serialized as JSON, while content uses Tauri raw IPC responses and remains `Uint8Array` throughout the frontend. Saving writes once and then reuses the canonical read path.

The `vendor/vscode-office` submodule is an upstream reference and capability input, not the runtime implementation. Generated upstream declarations remain separate from local runtime viewer behavior and must not be presented as an implementation boundary.

## Boundaries

- `src-tauri/src/formats.rs`: extension, MIME, and backend search classification.
- `src-tauri/src/filesystem.rs`: directory access, metadata, raw byte responses, saving, and on-demand hashing.
- `src-tauri/src/system.rs`: system open and file-manager reveal actions.
- `src-tauri/src/lib.rs`: structured search and Tauri composition.
- `src/viewers/registry.ts`: viewer capabilities and lazy loading.
- `src/viewers/archiveRenderer.ts`: bounded archive listing and entry previews.
- `src/viewers/previewTypes.ts`: exhaustive preview content contract.
- `src/viewers/Preview.tsx`: preview presentation.
- `src/App.tsx`: workspace state coordination.
