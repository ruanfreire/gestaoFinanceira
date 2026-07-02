import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SkipToContent } from "./skip-to-content";

describe("SkipToContent", () => {
  it("renderiza link para o conteúdo principal", () => {
    render(<SkipToContent targetId="main-content" />);
    const link = screen.getByRole("link", { name: /pular para o conteúdo/i });
    expect(link.getAttribute("href")).toBe("#main-content");
  });
});
