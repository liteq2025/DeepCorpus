import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookOpen } from "lucide-react";

import { EmptyState } from "./EmptyState";
import { Button } from "@/components/ui/button";

describe("EmptyState", () => {
  it("renders title as a heading", () => {
    render(<EmptyState title="No notebooks yet" />);
    expect(
      screen.getByRole("heading", { name: "No notebooks yet" }),
    ).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(
      <EmptyState
        title="No notebooks yet"
        description="Create your first one"
      />,
    );
    expect(screen.getByText("Create your first one")).toBeInTheDocument();
  });

  it("renders the action node", () => {
    render(
      <EmptyState
        title="No notebooks yet"
        action={<Button>Create</Button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });

  it("hides icon container from screen readers", () => {
    const { container } = render(
      <EmptyState title="No notebooks yet" icon={BookOpen} />,
    );
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});
