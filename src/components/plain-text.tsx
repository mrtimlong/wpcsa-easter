/**
 * Renders plain text from the data: blank lines separate paragraphs, and lines starting with "- "
 * become a bullet list. Never interprets HTML, so data can't inject markup.
 */
export function PlainText({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\s*\n/)
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split('\n').map((line) => line.trim())
        const key = `${i}-${lines[0]}`
        return lines.every((line) => line.startsWith('- ')) ? (
          <ul key={key}>
            {lines.map((line) => (
              <li key={line}>{line.slice(2)}</li>
            ))}
          </ul>
        ) : (
          <p key={key}>
            {lines.map((line, j) => (
              <span key={`${j}-${line}`}>
                {j > 0 && <br />}
                {line}
              </span>
            ))}
          </p>
        )
      })}
    </>
  )
}
