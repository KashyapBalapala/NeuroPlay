import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import CameraCheckPage from "@/app/camera-check/page";
import { installMediaDevices } from "@/features/camera/testing";

test("renders the Start button without requesting the camera", () => {
  const mediaDevices = installMediaDevices();

  render(<CameraCheckPage />);

  expect(
    screen.getByRole("button", { name: "Start camera" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("The camera is off.");
  expect(mediaDevices.getUserMedia).not.toHaveBeenCalled();
});
