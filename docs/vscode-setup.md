# VS Code setup on first launch

Everything the editor asks you once, and what silently degrades if you dismiss it.

The container configures itself — the toolchain, the extensions and their settings all come from [`.devcontainer/devcontainer.json`](../.devcontainer/devcontainer.json) and are identical for everyone. The prompts below are the exceptions: decisions VS Code will not make on your behalf, because they are per-user and per-workspace rather than per-repo.

None of them block you from writing code today. Each says what breaks if you skip it, and none of them is urgent enough to interrupt a first run at the app.

---

## 1. "Use the workspace TypeScript version?"

> **This workspace contains a TypeScript version. Would you like to use the workspace TypeScript version for TypeScript and JavaScript language features?**

**Click _Allow_.** The choice is remembered per workspace, and the prompt does not come back.

**Without it:** the editor keeps using the TypeScript that ships inside VS Code, while `pnpm typecheck`, `next build` and CI all use the one pinned in [`package.json`](../package.json). Everything looks fine until those two versions differ — then you get red squiggles for code that builds, or a clean editor for code CI rejects. The failure is not an error message; it is the editor and the build quietly disagreeing.

This prompt is deliberate. It exists because [`.vscode/settings.json`](../.vscode/settings.json) sets both of these:

```jsonc
"typescript.tsdk": "node_modules/typescript/lib",
"typescript.enablePromptUseWorkspaceTsdk": true,
```

The first tells VS Code a workspace TypeScript exists. It does **not** switch to it: VS Code treats a compiler supplied by a workspace as untrusted code — opening a repo would otherwise run its TypeScript on your machine — so activating it always requires an explicit human action. The second setting is what turns that requirement into a prompt instead of something you would have to know to go looking for.

You can also switch at any time without the prompt: `Cmd/Ctrl+Shift+P` → **TypeScript: Select TypeScript Version** → **Use Workspace Version**.

> **Why not just turn the prompt off?** Setting `enablePromptUseWorkspaceTsdk` to `false` silences it, but it does not select the workspace version — it leaves the editor on VS Code's bundled copy permanently. That decouples the editor from the pin, which is the one thing this repo is built not to do. Silence and correctness point in opposite directions here.
>
> As of VS Code 1.132 the bundled TypeScript happens to be the **same version this repo pins**, so today the choice changes nothing observable. That is a coincidence with a short shelf life — VS Code updates on its own schedule and the pin moves on Renovate's — which is exactly why it is worth clicking once now rather than debugging the mismatch later.

---

## 2. "Do you want to install the recommended extensions?"

**Click _Install_.** In Codespaces this usually happens on its own; locally you may be asked.

**Without it:** the editor still works, but the checks that run in CI stop running as you type — ESLint, Prettier-on-save, Tailwind class completion, Ruff, and SonarLint all live in extensions, not in the container.

The list lives in [`.vscode/extensions.json`](../.vscode/extensions.json) and is mirrored into [`.devcontainer/devcontainer.json`](../.devcontainer/devcontainer.json) so Codespaces installs it automatically. `pnpm verify:vscode` fails CI if the two ever drift, because a recommendation that only exists in one of them reaches half the people who open the repo.

One dependency inside that list is worth knowing about, because breaking it fails silently: **SonarLint's Java analysis requires the Java extension pack.** Sonar reads the Java classpath from it, and with the pack removed Sonar reports no Java problems at all rather than reporting that it cannot analyse. Removing extensions you do not need is fine; removing `vscjava.vscode-java-pack` while keeping SonarLint is the one combination that lies to you.

### Opting out of a single recommendation

The same file has an `unwantedRecommendations` array, which suppresses specific extension IDs without silencing the rest. This repo uses it for one:

```jsonc
"unwantedRecommendations": ["github.copilot", "rust-lang.rust"]
```

Both entries are tombstones, not preferences — each names an extension that was **superseded by one already in the list above**:

- `github.copilot` — the old ghost-text extension, **merged into `github.copilot-chat`** and deprecated. Copilot Chat now serves the inline completions it used to, so the two are one extension and installing both is installing a dead one.
- `rust-lang.rust` — the original Rust extension, superseded by **`rust-lang.rust-analyzer`**. It is still installable and still appears in searches for "rust", which is exactly why it is worth naming: picking it instead gets you a language server that has not been developed in years.

It is listed here rather than simply deleted because deleting an ID from `recommendations` only stops _this_ repo suggesting it. Anyone who still has it installed from before, or who picks it up as another extension's suggestion, keeps carrying it — and a deprecated extension does not announce itself. The entry makes the deprecation visible in the file where someone would otherwise be tempted to re-add it.

Add IDs here rather than reaching for the `extensions.ignoreRecommendations` setting — that one silences every recommendation for the whole workspace, including the ones carrying the lint and format tooling above, and it does so for everyone who clones the repo. If you want blanket silence for yourself, put that setting in your **user** settings, not here.

> Suppressing a recommendation is not the same as blocking an install: `unwantedRecommendations` governs what gets _suggested_, not what gets resolved. An extension pulled in as another extension's hard dependency still installs.

---

## 3. The JVM extensions take a minute on first open

Nothing to click. The first time you open a Java or Kotlin file, several things happen at once and the editor is briefly wrong about your code:

- **Java** starts the Eclipse JDT language server, which imports the project and builds an index. The status bar shows progress; until it settles you may see unresolved imports that are not really unresolved.
- **Gradle** forks a daemon on first build and downloads dependencies into `~/.gradle`. That cache **is** on a Docker named volume (`gradle-cache`), so it survives a container rebuild and only the very first build pays the download. To force a clean re-resolve, remove the volume with `docker compose -f .devcontainer/docker-compose.yml down -v` — note that also wipes the database.
- **Kotlin** support comes from JetBrains' official extension, which is **Alpha**. Expect core editing to work and rough edges elsewhere; Kotlin Multiplatform is not supported yet.

**Rust** behaves differently and needs nothing configured. rust-analyzer downloads its own server binary and finds `cargo` on `PATH`, which resolves through mise's shims — the Dockerfile registers a global default for `rust` precisely so that works when the extension host spawns `cargo` from outside the repo. `rust-src` is installed as a declared component in [`mise.toml`](../mise.toml); without it, hovering `Vec` or jumping into `Option` fails and rust-analyzer reports a sysroot error rather than a missing component.

Every JDK path the Java and Kotlin servers use is pinned to the container's GraalVM in [`.devcontainer/devcontainer.json`](../.devcontainer/devcontainer.json), including `JAVA_HOME` — so none of them download a JDK of their own, and none of them can drift from the version in [`.devcontainer/.env`](../.devcontainer/.env). If Java or Kotlin resolution ever looks wrong, that settings block is the place to look, and its comments explain what each path is for.

---

## 4. Python interpreter — already chosen

Nothing to click, but worth knowing where it points. [`.vscode/settings.json`](../.vscode/settings.json) sets the interpreter to `scripts/.venv/bin/python`, created by `uv` during `postCreateCommand`.

**If VS Code claims the interpreter is invalid**, the venv did not get created — which usually means a `postCreateCommand` step failed earlier and the error you are seeing is three steps downstream of the cause. Re-run the read-only checks to find the real one:

```bash
bash .devcontainer/scripts/devcontainer-phase.sh postcreate check
```

---

## 5. SonarLint connected mode — optional, needs a token

Analysis works out of the box with no account. **Connected mode** additionally binds the editor to your SonarCloud project so local warnings match the quality gate CI enforces.

That needs a SonarCloud project and a `SONAR_TOKEN`, which live outside this repo — see [`repository-setup.md`](repository-setup.md). Skip it until you have something worth gating.

---

## Where the settings actually live

Two files, and the split is deliberate rather than historical:

| File                                                                    | Holds                                                 | Why there                                                                                                                                                 |
| ----------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`.vscode/settings.json`](../.vscode/settings.json)                     | Editor behaviour — formatters, lint-on-save, excludes | Works on a host checkout and in the container alike                                                                                                       |
| [`.devcontainer/devcontainer.json`](../.devcontainer/devcontainer.json) | Absolute paths to JDKs, Node, interpreters            | Container-only. `/home/vscode/...` does not exist on a host machine, and a workspace setting would override the container's with a path resolving nowhere |

So: if a setting names a path under `/home/vscode`, it belongs in the devcontainer file. If it would make sense to someone who cloned the repo without Docker, it belongs in `.vscode/`.
