# Wire Tracker

A phone-friendly notebook for what you see inside a switch box, outlet, light, or panel. Every wire field can stay blank. **Not sure** is a real choice, and those items collect on the To-do tab so you can finish them later.

Your notes stay in the browser on that phone or computer. Nothing is uploaded. Use **Backup** to export a file or load one on another device.

## Use it on an iPhone

1. Open the site in Safari.
2. Tap the Share button.
3. Tap **Add to Home Screen**.

The icon name is **Wires**. After the first online visit, the app shell also works offline. The notes themselves are stored on the phone either way.

## Safety

Turn the breaker off before you open a box, then check with a non-contact voltage tester. If it beeps, stop. This app only stores notes. It cannot tell you a wire is safe.

## GitHub Pages

The site is the `wire-tracker/` folder, deployed by `.github/workflows/deploy-wire-tracker.yml` when that folder changes on `main`.

This repository is public, so GitHub Pages can host it on the free plan. The **app** is public. Your wire notes are not part of the site. Do not commit a backup file to the repo.

After this is merged:

1. Open the repo on GitHub → **Settings** → **Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. If the **Deploy Wire Tracker** action failed before that setting existed, open **Actions**, select that run, and choose **Re-run**.
4. When the action is green, the site is at <https://mkonneck.github.io/Code1/>.

You can also run it locally from this folder:

```bash
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173/`.
