#!/bin/sh
# Install/update ui-re from GitHub for Claude Code and Codex.
set -eu

repo='https://github.com/paoloanzn/ui-re.git'
branch='main'
skill_home=${UI_RE_INSTALL_HOME:-${HOME:?HOME must be set}}

fail() {
  printf 'ui-re: %s\n' "$*" >&2
  exit 1
}

[ "$#" -eq 0 ] || fail 'Usage: sh install.sh'
command -v git >/dev/null 2>&1 || fail 'Git is required. Install Git, then rerun this script.'
case "$skill_home" in
  /*) ;;
  *) fail 'The installation home must be an absolute path.' ;;
esac

# Check both destinations before updating either one.
for agent in .claude .agents; do
  destination="$skill_home/$agent/skills/ui-re"
  [ ! -L "$destination" ] || fail "Refusing to replace symlink: $destination"
  if [ -e "$destination" ]; then
    [ -d "$destination/.git" ] || fail "Existing path is not a ui-re Git checkout: $destination"
    origin=$(git -C "$destination" config --get remote.origin.url)
    case "$origin" in
      "$repo"|https://github.com/paoloanzn/ui-re|git@github.com:paoloanzn/ui-re.git) ;;
      *) fail "Unexpected Git origin at $destination: $origin" ;;
    esac
    [ "$(git -C "$destination" symbolic-ref --quiet --short HEAD)" = "$branch" ] ||
      fail "Expected branch $branch at $destination; switch branches manually."
    [ -z "$(git -C "$destination" status --porcelain --untracked-files=no)" ] ||
      fail "Local edits found at $destination; commit or stash them before updating."
  fi
done

for agent in .claude .agents; do
  destination="$skill_home/$agent/skills/ui-re"
  if [ -d "$destination/.git" ]; then
    git -C "$destination" fetch --quiet origin "$branch"
    git -C "$destination" merge --ff-only --no-edit FETCH_HEAD
    printf 'Updated %s\n' "$destination"
  else
    mkdir -p "$skill_home/$agent/skills"
    git clone --quiet --branch "$branch" --single-branch "$repo" "$destination"
    printf 'Installed %s\n' "$destination"
  fi
  [ -f "$destination/SKILL.md" ] || fail "Missing SKILL.md in $destination"
done

printf '\nui-re is installed for Claude Code and Codex. Rerun this command to update.\n'
printf 'Runtime setup is separate: follow the preflight/setup steps in the installed README.md.\n'
