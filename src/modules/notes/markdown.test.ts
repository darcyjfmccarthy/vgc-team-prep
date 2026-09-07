import { describe, expect, it } from "vitest";
import { renderSafeMarkdown } from "./markdown";

describe("renderSafeMarkdown", () => {
  it("renders supported formatting", () => {
    expect(
      renderSafeMarkdown(
        "**Plan**\n- use `Protect`\n- [Replay](https://example.test)",
      ),
    ).toBe(
      '<p><strong>Plan</strong></p><ul><li>use <code>Protect</code></li><li><a href="https://example.test" rel="noreferrer noopener">Replay</a></li></ul>',
    );
  });
  it("escapes HTML and rejects unsafe links", () => {
    const result = renderSafeMarkdown(
      "<script>x</script> [bad](javascript:alert(1))",
    );
    expect(result).toContain("&lt;script&gt;");
    expect(result).not.toContain('href="javascript:');
  });
});
