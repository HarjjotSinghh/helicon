#!/bin/bash
# Checks what helicon-host-run hands to flatpak-spawn, with a stand-in flatpak-spawn that prints its arguments.
set -eu

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

mkdir "$work/bin" "$work/home"
cat >"$work/bin/flatpak-spawn" <<'EOF'
#!/bin/bash
printf '%s\n' "$@"
EOF
chmod +x "$work/bin/flatpak-spawn"
ln -s "$here/helicon-host-run" "$work/bin/muse"
ln -s "$here/helicon-host-run" "$work/bin/git"

failures=0
expect() {
  local label=$1 output=$2 line=$3
  if ! grep -qxF -- "$line" <<<"$output"; then
    echo "FAIL $label: missing line: $line"
    printf '    %s\n' "${output//$'\n'/$'\n    '}"
    failures=$((failures + 1))
  fi
}
refuse() {
  local label=$1 output=$2 prefix=$3
  if grep -q -- "^$prefix" <<<"$output"; then
    echo "FAIL $label: unexpected line starting with: $prefix"
    failures=$((failures + 1))
  fi
}

# Runs from a folder under HOME with muse settings set: the folder and the settings travel, other variables do not.
out=$(cd "$work/home" && HOME="$work/home" PATH="$work/bin:$PATH" MUSE_PROFILE=work GIT_TERMINAL_PROMPT=0 SECRET_SANDBOX_VAR=1 muse serve --port 4001)
expect "host flag" "$out" "--host"
expect "bus watch" "$out" "--watch-bus"
expect "working folder" "$out" "--directory=$work/home"
expect "muse env" "$out" "--env=MUSE_PROFILE=work"
expect "git env" "$out" "--env=GIT_TERMINAL_PROMPT=0"
refuse "other env" "$out" "--env=SECRET_SANDBOX_VAR"
expect "command name" "$out" "muse"
expect "first argument" "$out" "serve"
expect "second argument" "$out" "--port"
expect "third argument" "$out" "4001"

# The command name follows the link name.
out=$(cd "$work/home" && HOME="$work/home" PATH="$work/bin:$PATH" git status)
expect "git name" "$out" "git"

# A working folder the host does not share is left out, and arguments with spaces stay whole.
out=$(cd / && HOME="$work/home" PATH="$work/bin:$PATH" muse "two words")
refuse "unshared folder" "$out" "--directory="
expect "spaced argument" "$out" "two words"

if [ "$failures" -ne 0 ]; then
  echo "$failures check(s) failed"
  exit 1
fi
echo "helicon-host-run: all checks passed"
