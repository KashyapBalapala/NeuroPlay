import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import Home from "@/app/page";

test("home page renders the NeuroPlay AI heading", () => {
  render(<Home />);

  expect(
    screen.getByRole("heading", { name: "NeuroPlay AI" }),
  ).toBeInTheDocument();
});
