# Bundle update guide

This repo uses a ZIP bundle as a bootstrap/update mechanism. Git history remains the backup and review trail.

## Bundle structure

```text
FURSA_BOOTSTRAP_BUNDLE.zip
├── manifest.json
└── payload/
    ├── README.md
    ├── docs/ENGINEERING_SOURCE_OF_TRUTH.md
    └── ...
```

`manifest.json` has:

- `replace`: exact repository-relative paths to create or overwrite from the matching `payload/` files.
- `delete`: exact repository-relative paths to delete. Keep this empty unless removal is intentional.

The bundle workflow rejects unsafe paths, Git internals, payload symlinks, manifest/payload mismatches, self-replacement of the ZIP, and replacement/deletion of the updater workflow. It does not remove files merely because they are absent from a bundle. Files not listed in `replace` or `delete` remain untouched.

## Important: GitHub Actions workflow files

Do not include files under `.github/workflows/` in an automatic bundle. The repository's standard `GITHUB_TOKEN` can write normal repository contents, but GitHub rejects pushes that create or update workflow files unless the pushing credential also has the `workflows` permission. This bootstrap bundle therefore supplies the CI workflow separately for manual addition in GitHub. Keep edits to workflow YAML manual unless the updater has been intentionally configured to use a trusted token with workflow permission.

To remove an obsolete non-workflow file in a future bundle, list its exact path in `manifest.delete` and ensure it is not also in `manifest.replace`. Check the Actions result and resulting commit after each application.
