# Deploying north-express.app.rgpl.xyz

The site is the production build (`ng build`) served as static files by nginx on the rgpl VPS (`ssh rgpl`). nginx also answers `/api/buses`, passing bus requests on to Digitransit with the API key. CI runs the tests and the build, then the e2e tests against the build under `nginx/north-express.conf`. Deploys are run by hand.

| Path on the VPS                             | What it is                                                                                                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/etc/nginx/sites-available/north-express`  | copy of `deploy/nginx/north-express.conf`, plus the TLS lines certbot adds                                                                                   |
| `/var/www/north-express/releases/<commit>/` | one build per deployed commit (newest three kept)                                                                                                            |
| `/var/www/north-express/current`            | symlink to the live release; nginx's `root`                                                                                                                  |
| `/var/www/north-express/previous`           | symlink to the release before it; nginx serves files missing from `current` from here, so tabs opened before a deploy can still load their lazy route chunks |
| `/var/www/north-express/deploy-history`     | one line per deploy: UTC time and commit                                                                                                                     |
| `/var/www/north-express/`                   | owned by the `deploy` account, which deploys log in as; it can write here and nowhere else                                                                   |
| `/etc/nginx/secrets/digitransit-key.conf`   | the Digitransit API key, as a `proxy_set_header` line nginx includes; root-only and never in the repo                                                        |
| `/usr/local/sbin/set-digitransit-key`       | copy of `deploy/set-digitransit-key`, which writes the key file                                                                                              |
| `/var/cache/north-express-buses`            | nginx's cache of Digitransit answers                                                                                                                         |

## One-time setup

1. DNS (Namecheap): an `A` record, host `north-express.app`, value `45.249.91.118`. There is no wildcard record.
2. Install the site and check the config:

   ```bash
   scp deploy/nginx/north-express.conf rgpl:/etc/nginx/sites-available/north-express
   ssh rgpl 'ln -s /etc/nginx/sites-available/north-express /etc/nginx/sites-enabled/north-express && nginx -t && systemctl reload nginx'
   ```

3. A deploy account, so deploys don't log in as root. It owns `/var/www/north-express` and nothing else, and takes one SSH key, without a terminal or forwarding. The account and key are shared with the other side project on the VPS, so skip what exists:

   ```bash
   ssh rgpl 'id deploy >/dev/null 2>&1 || useradd --create-home --shell /bin/bash --user-group deploy; install -d -o deploy -g deploy /var/www/north-express'
   ssh-keygen -t ed25519 -N "" -C "deploys to rgpl" -f ~/.ssh/rgpl-deploy
   { printf 'restrict '; cat ~/.ssh/rgpl-deploy.pub; } | ssh rgpl 'install -d -m 700 -o deploy -g deploy /home/deploy/.ssh && cat >> /home/deploy/.ssh/authorized_keys && chown deploy:deploy /home/deploy/.ssh/authorized_keys && chmod 600 /home/deploy/.ssh/authorized_keys'
   ```

   Then add an alias to `~/.ssh/config` on the machine that deploys:

   ```
   Host rgpl-deploy
       HostName 45.249.91.118
       User deploy
       IdentityFile ~/.ssh/rgpl-deploy
       IdentitiesOnly yes
   ```

4. First deploy (below), so `/var/www/north-express/current` exists.
5. TLS, once DNS resolves to the VPS:

   ```bash
   ssh rgpl 'certbot --nginx -d north-express.app.rgpl.xyz --non-interactive --agree-tos --redirect'
   ```

6. The Digitransit key, for buses. Register at the Digitransit API portal (portal-api.digitransit.fi) and subscribe to the routing API. Then install the script and run it from your own terminal, so the key goes into a hidden prompt and not into a command or this repo:

   ```bash
   scp deploy/set-digitransit-key rgpl:/usr/local/sbin/set-digitransit-key
   ssh rgpl 'chmod 700 /usr/local/sbin/set-digitransit-key'
   ssh -t rgpl set-digitransit-key
   ```

   The script checks the key against the API before saving it, then reloads nginx. Run it again to change the key.

## Changing the nginx config

`deploy.sh` publishes the build only. After a change to `nginx/north-express.conf`, copy it over, which drops the TLS lines certbot added, and have certbot add them back with the existing certificate. certbot tests the config and reloads nginx:

```bash
ssh rgpl 'cp /etc/nginx/sites-available/north-express /root/north-express.conf.bak'
scp deploy/nginx/north-express.conf rgpl:/etc/nginx/sites-available/north-express
ssh rgpl 'certbot install --nginx --cert-name north-express.app.rgpl.xyz --redirect -n'
```

If that fails, copy the backup back. nginx keeps the old config until a reload.

## Deploy

From the repo root, with Node on `PATH` (the version in `.nvmrc`):

```bash
deploy/deploy.sh            # builds and publishes origin/main
deploy/deploy.sh <commit>   # any commit already on origin/main
```

The script refuses commits that are not on `origin/main` and builds from a clean `git archive` (no local changes or `node_modules`). A release is unpacked outside `releases/`, moved in with one rename and never changed afterwards. A commit whose release is already on the server is switched to without rebuilding, so redeploying an earlier commit is a quick rollback. The `current` symlink also switches in one rename, so visitors never see a half-copied release.

## Roll back

Deploy the earlier commit. Its release is still on the server, so the script switches to it without rebuilding:

```bash
ssh rgpl-deploy 'ls -1t /var/www/north-express/releases; tail -3 /var/www/north-express/deploy-history'
deploy/deploy.sh <commit>
```

Or point `current` at a release by hand:

```bash
ssh rgpl-deploy 'cd /var/www/north-express && ln -sfn releases/<commit> current.next && mv -Tf current.next current'
```

## Check a deploy

```bash
curl -sI https://north-express.app.rgpl.xyz/ | grep -iE '^(HTTP|content-security-policy|strict-transport-security|cache-control)'
curl -so /dev/null -w '%{http_code}\n' https://north-express.app.rgpl.xyz/departures/trains   # 200: a route the app knows
curl -so /dev/null -w '%{http_code}\n' https://north-express.app.rgpl.xyz/missing             # 404, still the app's not-found page
curl -so /dev/null -w '%{http_code} %{redirect_url}\n' http://north-express.app.rgpl.xyz/   # 301 to https
curl -so /dev/null -w '%{http_code}\n' https://north-express.app.rgpl.xyz/api/buses/stations   # 200: the key works
E2E_BASE_URL=https://north-express.app.rgpl.xyz npm run e2e                                    # the e2e tests, against the live site
```
