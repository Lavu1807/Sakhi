import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Education from "./Education";
import { getMyths, sendMythFeedback } from "../../shared/utils/api";

vi.mock("framer-motion", async () => {
  const React = await import("react");
  const MockMotion = React.forwardRef(({ children, ...props }, ref) => (
    <div ref={ref} {...props}>
      {children}
    </div>
  ));

  return {
    motion: new Proxy({}, { get: () => MockMotion }),
  };
});

vi.mock("../../shared/utils/api", () => ({
  getMyths: vi.fn(),
  sendMythFeedback: vi.fn(),
}));

vi.mock("../cycle/cycleUtils", () => ({
  readCycleData: vi.fn(() => ({})),
}));

vi.mock("../symptoms/symptomContext", () => ({
  getSymptomChatContext: vi.fn(() => null),
}));

describe("Education feature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("loads myths on initial render", async () => {
    getMyths.mockResolvedValueOnce({
      myths: [
        {
          id: 1,
          myth: "Periods stop in water.",
          fact: "Flow may slow in water, but does not fully stop.",
          category: "Menstruation",
          source: "NHS",
        },
      ],
    });

    render(
      <MemoryRouter>
        <Education />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Periods stop in water.")).toBeInTheDocument();
    expect(getMyths).toHaveBeenCalledWith("All", expect.any(Object));
  });

  it("submits myth feedback", async () => {
    getMyths.mockResolvedValueOnce({
      myths: [
        {
          id: 1,
          myth: "Periods stop in water.",
          fact: "Flow may slow in water, but does not fully stop.",
          category: "Menstruation",
          source: "NHS",
        },
      ],
    });
    sendMythFeedback.mockResolvedValueOnce({
      message: "Feedback received. Thank you!",
    });

    render(
      <MemoryRouter>
        <Education />
      </MemoryRouter>,
    );

    await screen.findByText("Periods stop in water.");

    fireEvent.click(screen.getByText("Periods stop in water."));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "👍 Helpful" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "👍 Helpful" }));

    await waitFor(() => {
      expect(sendMythFeedback).toHaveBeenCalledWith({
        mythId: 1,
        feedbackType: "helpful",
      });
    });
  });
});
