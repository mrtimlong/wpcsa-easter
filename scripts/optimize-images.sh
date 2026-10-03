#!/usr/bin/env bash
# Generates mobile-friendly versions of every image in images/originals/:
# several widths, each as AVIF (small, modern browsers) plus a progressive JPEG fallback.
#
#   images/originals/visit/boulders.jpg
#     -> public/images/generated/visit/boulders-{480,800,1200}.{avif,jpg}
#     -> entry "visit/boulders" in src/generated/images.json (used by <Picture>)
#
# Requires ImageMagick 7 (`brew install imagemagick`). Skips outputs that are up to date;
# pass --force to regenerate everything.
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="images/originals"
OUT="public/images/generated"
MANIFEST="src/generated/images.json"
WIDTHS=(480 800 1200 1600)
AVIF_QUALITY=55 # 45 visibly smears fine line art; 55 is indistinguishable at phone sizes
JPEG_QUALITY=78

force=false
[[ "${1:-}" == "--force" ]] && force=true

mkdir -p "$OUT" "$(dirname "$MANIFEST")"
entries=()

while IFS= read -r -d '' file; do
  rel="${file#"$SRC"/}"
  name="${rel%.*}"
  read -r width height < <(magick identify -format '%w %h\n' "$file")

  # Every standard width smaller than the original, plus the original width (capped at the largest).
  sizes=()
  for w in "${WIDTHS[@]}"; do ((w < width)) && sizes+=("$w"); done
  largest=${WIDTHS[${#WIDTHS[@]} - 1]} # (macOS bash 3.2 has no negative indexes)
  max=$((width < largest ? width : largest))
  [[ " ${sizes[*]} " == *" $max "* ]] || sizes+=("$max")

  mkdir -p "$OUT/$(dirname "$name")"
  for w in "${sizes[@]}"; do
    for ext in avif jpg; do
      target="$OUT/$name-$w.$ext"
      if $force || [[ ! -f "$target" || "$file" -nt "$target" ]]; then
        if [[ "$ext" == avif ]]; then
          magick "$file" -resize "${w}x" -strip -quality "$AVIF_QUALITY" "$target"
        else
          magick "$file" -resize "${w}x" -strip -sampling-factor 4:2:0 -interlace JPEG \
            -quality "$JPEG_QUALITY" "$target"
        fi
      fi
    done
  done

  widths_json=$(printf '%s\n' "${sizes[@]}" | jq -s '.')
  entries+=("$(jq -n --arg name "$name" --argjson w "$width" --argjson h "$height" \
    --argjson widths "$widths_json" '{($name): {width: $w, height: $h, widths: $widths}}')")
  echo "$name: ${sizes[*]}"
done < <(find "$SRC" -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \) -print0 | sort -z)

printf '%s\n' "${entries[@]}" | jq -s 'add // {} | to_entries | sort_by(.key) | from_entries' >"$MANIFEST"
echo "Wrote $MANIFEST ($(jq length "$MANIFEST") images); output in $OUT ($(du -sh "$OUT" | cut -f1))"
