import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sparkles } from "lucide-react";

import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("renders title as h1", () => {
    render(<PageHeader title="Settings" />);
    const h1 = screen.getByRole("heading", { level: 1, name: "Settings" });
    expect(h1).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(
      <PageHeader title="Settings" description="Manage your preferences" />,
    );
    expect(screen.getByText("Manage your preferences")).toBeInTheDocument();
  });

  it("renders the icon when provided (decorative, aria-hidden parent)", () => {
    const { container } = render(
      <PageHeader title="Skills" icon={Sparkles} />,
    );
    // The icon container is aria-hidden; the underlying <svg> has aria-hidden.
    const ariaHidden = container.querySelector('[aria-hidden="true"]');
    expect(ariaHidden).not.toBeNull();
  });

  it("renders actions and meta side-by-side with title", () => {
    render(
      <PageHeader
        title="Sessions"
        meta={<span>3</span>}
        actions={<button type="button">New</button>}
      />,
    );
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New" })).toBeInTheDocument();
  });
});
