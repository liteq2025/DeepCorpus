import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LayoutProvider } from "./LayoutContext";
import { ListPane } from "./ListPane";

function withProvider(node: React.ReactNode) {
  return <LayoutProvider>{node}</LayoutProvider>;
}

describe("ListPane", () => {
  it("renders children when expanded (default)", () => {
    render(
      withProvider(
        <ListPane id="t" title="Sessions">
          <div>session-1</div>
        </ListPane>,
      ),
    );
    expect(screen.getByText("session-1")).toBeInTheDocument();
  });

  it("uses title as aria-label on the aside landmark", () => {
    render(
      withProvider(
        <ListPane id="t" title="Sessions">
          <div>x</div>
        </ListPane>,
      ),
    );
    expect(screen.getByRole("complementary", { name: "Sessions" })).toBeInTheDocument();
  });

  it("collapses children on chevron click", async () => {
    render(
      withProvider(
        <ListPane id="t" title="Sessions">
          <div>session-1</div>
        </ListPane>,
      ),
    );
    expect(screen.getByText("session-1")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Collapse Sessions" }),
    );
    expect(screen.queryByText("session-1")).not.toBeInTheDocument();
  });

  it("respects defaultCollapsed when provided", () => {
    render(
      withProvider(
        <ListPane id="default-collapsed" title="Sessions" defaultCollapsed>
          <div>hidden</div>
        </ListPane>,
      ),
    );
    expect(screen.queryByText("hidden")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Expand Sessions" }),
    ).toBeInTheDocument();
  });
});
