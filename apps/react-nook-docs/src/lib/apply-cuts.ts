export function applyCuts(code: string): string {
  const cutBeforeMarker = '// ---cut-before---';
  const cutAfterMarker = '// ---cut-after---';

  let start = code.indexOf(cutBeforeMarker);
  if (start >= 0) {
    start += cutBeforeMarker.length;
  } else {
    start = 0;
  }

  let end = code.indexOf(cutAfterMarker);
  if (end === -1) {
    end = code.length;
  }

  return code.slice(start, end);
}
