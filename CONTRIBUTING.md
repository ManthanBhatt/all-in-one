# Contributing to Freelancer OS

Thanks for contributing.

## Before you start

- Read the [README](./README.md)
- Read the docs in [docs/](./docs/README.md)
- Keep the app offline-first
- Do not bypass repositories or facades with direct UI-to-Supabase calls

## Local setup

```bash
npm install
ionic serve
```

For Android:

```bash
npx cap sync android
npx cap open android
```

## Project rules

### Architecture

- UI pages should stay thin
- Feature logic belongs in facades
- Persistence belongs in repositories
- Shared contracts belong in `src/app/core/models`
- Sync behavior belongs in `src/app/core/sync`

### Data handling

- Write locally first
- Enqueue sync mutations after local writes
- Preserve `user_id`, sync metadata, and soft-delete behavior
- Be careful with invoice conflict behavior

### UI

- Preserve the dark visual direction
- Avoid reverting to default Ionic boilerplate styling
- Prefer modal create/edit flows where the app already uses them

## Pull request checklist

- Explain the user-facing change clearly
- Mention schema or migration changes explicitly
- Include screenshots for UI changes when relevant
- Run `npm run build`
- If native integrations changed, run `npx cap sync android`

## Commit style

Use concise, descriptive commit messages.

Examples:
- `Add recurring reminder scheduling`
- `Fix invoice sync conflict detection`
- `Polish task board drag state`

## Reporting security issues

Do not open a public issue for sensitive security problems. Contact the maintainer privately first.
