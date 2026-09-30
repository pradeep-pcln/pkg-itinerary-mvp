# How to Add a New Runtime

When a vibe coder wants to use a language other than Node.js/TypeScript, create a new runtime reference file and the corresponding asset templates.

---

## Steps

1. **Create `references/runtimes/<runtime-name>.md`** following the template below.
2. **Add a GitHub Actions template** at `assets/github-actions/<runtime-name>.yml`.
3. **Add a Dockerfile template** at `assets/docker/<runtime-name>.Dockerfile`.
4. **Update `SKILL.md`** — add a line in the "Using a Different Runtime" section pointing to the new file.

---

## Reference Doc Template

Use this structure when writing a new runtime doc:

```markdown
# Runtime: <Language> + <Framework/Toolchain>

Brief description of when to use this runtime.

---

## Project Structure

(directory tree with explanations)

---

## Package/Dependency File

(equivalent of package.json — pyproject.toml, go.mod, etc.)
Include all required build scripts or make targets.

---

## Build Command Mapping

Explain what maps to the three CI build steps:
- clean equivalent
- build:ext equivalent (compilation/packaging step)
- build-deps equivalent (dependency bundling for the container)

---

## Minimal Server

(smallest working HTTP server, listens on PORT env var, has /health endpoint)

---

## .gitignore

(standard ignores for this runtime)

---

## Environment Variables

(how to handle secrets and config for this runtime)
```

---

## GitHub Actions Notes

The shared reusable workflow `pcln/.github/.github/workflows/javascript-npm-release.yaml@javascript-v1` is Node.js specific. For other runtimes, you will need a different shared workflow or a standalone workflow. Check with the mobility team (`#mobility-vibes` in Slack) about which shared workflow to use for the target language before writing the actions file.

---

## Docker Notes

All Priceline apps use internal base images from `gcr.io/pcln-pl-gcr-prod/`. Check the available base images for your runtime with the team. The pattern is:
- `gcr.io/pcln-pl-gcr-prod/pcln-rockylinux-node24:latest` (Node 24)
- Similar images exist for other runtimes — ask in `#mobility-vibes` or check the internal image registry.

The container must:
- Listen on the `PORT` environment variable
- Have a `/health` endpoint
- Run as the `eng` user (for COPY `--chown=eng:engadmin`)
