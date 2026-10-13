# Deploying north-express.app.rgpl.xyz

The site is the production build (`ng build`) served as static files by nginx on the rgpl VPS (`ssh rgpl`). CI only tests and builds; deploys are run by hand.

| Path on the VPS                             | What it is                                                                                                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/etc/nginx/sites-available/north-express`  | copy of `deploy/nginx/north-express.conf`, plus the TLS lines certbot adds                                                                                   |
| `/var/www/north-express/releases/<commit>/` | one build per deployed commit (newest three kept)                                                                                                            |
| `/var/www/north-express/current`            | symlink to the live release; nginx's `root`                                                                                                                  |
| `/var/www/north-express/previous`           | symlink to the release before it; nginx serves files missing from `current` from here, so tabs opened before a deploy can still load their lazy route chunks |
| `/var/www/north-express/deploy-history`     | one line per deploy: UTC time and commit                                                                                                                     |

## One-time setup

1. DNS (Namecheap): an `A` record, host `north-express.app`, value `45.249.91.118`. There is no wildcard record.
2. Install the site and check the config:

   ```bash
   scp deploy/nginx/north-express.conf rgpl:/etc/nginx/sites-available/north-express
   ssh rgpl 'ln -s /etc/nginx/sites-available/north-express /etc/nginx/sites-enabled/north-express && nginx -t && systemctl reload nginx'
   ```

3. First deploy (below), so `/var/www/north-express/current` exists.
4. TLS, once DNS resolves to the VPS:

   ```bash
   ssh rgpl 'certbot --nginx -d north-express.app.rgpl.xyz --non-interactive --agree-tos --redirect'
   ```

## Deploy

From the repo root, with Node on `PATH` (the version in `.nvmrc`):

```bash
deploy/deploy.sh            # builds and publishes origin/main
deploy/deploy.sh <commit>   # any commit already on origin/main
```

The script refuses commits that are not on `origin/main`, builds from a clean `git archive` (no local changes or `node_modules`), and switches the `current` symlink in one rename, so visitors never see a half-copied release.

## Roll back

Point `current` at an earlier release; no rebuild needed:

```bash
ssh rgpl 'ls -1t /var/www/north-express/releases; tail -3 /var/www/north-express/deploy-history'
ssh rgpl 'cd /var/www/north-express && ln -sfn releases/<commit> current.next && mv -Tf current.next current'
```

## Check a deploy

```bash
curl -sI https://north-express.app.rgpl.xyz/ | grep -iE '^(HTTP|content-security-policy|strict-transport-security|cache-control)'
curl -so /dev/null -w '%{http_code}\n' https://north-express.app.rgpl.xyz/departures/trains   # 200: a route the app knows
curl -so /dev/null -w '%{http_code}\n' https://north-express.app.rgpl.xyz/missing             # 404, still the app's not-found page
curl -so /dev/null -w '%{http_code} %{redirect_url}\n' http://north-express.app.rgpl.xyz/   # 301 to https
```
