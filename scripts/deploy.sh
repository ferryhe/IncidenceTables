#!/usr/bin/env bash
set -euo pipefail
umask 022

site_dir=/srv/mort.aiactuary.cn
repo=https://github.com/ferryhe/IncidenceTables.git

mkdir -p "$site_dir/releases"
exec 9>"$site_dir/.deploy.lock"
flock -n 9 || { echo "Rate Atlas deployment is already running." >&2; exit 1; }

work=$(mktemp -d "$site_dir/.build.XXXXXXXX")
trap 'rm -rf -- "$work"' EXIT
git clone --depth 1 --branch main -- "$repo" "$work/source"
cd "$work/source"
revision=$(git rev-parse HEAD)
release="$site_dir/releases/$revision"

if [[ ! -d "$release" ]]; then
  npm ci --include=dev --no-audit --no-fund
  npm test
  npm run build
  test -s dist/index.html
  test -s dist/catalog.json
  mv -T -- dist "$release"
fi

test -s "$release/index.html"
test -s "$release/catalog.json"
ln -s "releases/$revision" "$work/current"
mv -Tf -- "$work/current" "$site_dir/current"
printf 'Deployed %s to %s/current\n' "$revision" "$site_dir"
