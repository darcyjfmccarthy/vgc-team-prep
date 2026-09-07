function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function inline(value: string): string {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, url: string) => {
      const decoded = url.replaceAll("&amp;", "&");
      return /^(https?:\/\/|mailto:)/i.test(decoded)
        ? `<a href="${url}" rel="noreferrer noopener">${label}</a>`
        : label;
    });
}

export function renderSafeMarkdown(markdown: string): string {
  const output: string[] = [];
  let inList = false;
  for (const line of markdown.replaceAll("\r\n", "\n").split("\n")) {
    const item = /^\s*[-*]\s+(.+)$/.exec(line);
    if (item) {
      if (!inList) output.push("<ul>");
      inList = true;
      output.push(`<li>${inline(item[1]!)}</li>`);
      continue;
    }
    if (inList) {
      output.push("</ul>");
      inList = false;
    }
    if (line.trim()) output.push(`<p>${inline(line.trim())}</p>`);
  }
  if (inList) output.push("</ul>");
  return output.join("");
}
