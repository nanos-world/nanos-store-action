# nanos-store-action

## Usage

```yaml
name: EGUI publish to store.nanos.world

on:
  release:
    types: [published]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    name: Publish package
    steps:
      - uses: actions/checkout@v2
      - name: Nanos Store Action
        uses: nanos-world/nanos-store-action@v1.0
        with:
          folder: ''
          name: 'name-of-the-package-or-asset'
          changelog: 'My Changelog'
          token: ${{ secrets.STORE_SECRET }}
```

The secret can be obtained at: https://store.nanos.world/settings/tokens/

*Do not put the secret direclty into the Github Action workflow.* Put the token under `Settings` -> `Secrets` -> `Actions` and create a new secret with the name `STORE_SECRET`.

## Building

https://docs.github.com/en/actions/creating-actions/creating-a-javascript-action#commit-tag-and-push-your-action-to-github


```
npm i -g @vercel/ncc
ncc build index.js --license licenses.txt
```