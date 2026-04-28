import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Chatbot from "./Chatbot";
import { sendChatMessage } from "../../shared/utils/api";

vi.mock("framer-motion", async () => {
  const React = await import("react");
  const MockMotion = React.forwardRef(({ children, layout, ...props }, ref) => (
    <div ref={ref} {...props}>
      {children}
    </div>
  ));

  return {
    motion: new Proxy({}, { get: () => MockMotion }),
    AnimatePresence: ({ children }) => <>{children}</>,
  };
});

vi.mock("../../shared/utils/api", () => ({
  sendChatMessage: vi.fn(),
}));

vi.mock("../../shared/utils/auth", () => ({
  getAuthToken: vi.fn(() => ""),
}));

vi.mock("../symptoms/symptomContext", () => ({
  getSymptomChatContext: vi.fn(() => null),
}));

vi.mock("../mood/moodContext", () => ({
  getMoodChatContext: vi.fn(() => null),
}));

describe("Chatbot feature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends message and renders bot reply", async () => {
    sendChatMessage.mockResolvedValueOnce({
      reply: "Please rest and stay hydrated.",
    });

    render(
      <MemoryRouter>
        <Chatbot />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("Type your message"), {
      target: { value: "I have cramps" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(sendChatMessage).toHaveBeenCalledTimes(1);
    });

    expect(sendChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "I have cramps",
        sessionId: expect.any(String),
      }),
      undefined,
    );

    expect(await screen.findByText("Please rest and stay hydrated.")).toBeInTheDocument();
  });

  it("shows fallback message when API fails", async () => {
    sendChatMessage.mockRejectedValueOnce(new Error("network error"));

    render(
      <MemoryRouter>
        <Chatbot />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("Type your message"), {
      target: { value: "I feel low" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(
      await screen.findByText("I am having trouble responding right now. Please try again in a moment."),
    ).toBeInTheDocument();
  });
});
