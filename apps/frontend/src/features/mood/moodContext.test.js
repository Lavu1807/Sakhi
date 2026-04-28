import { beforeEach, describe, expect, it } from "vitest";
import { clearMoodChatContext, getMoodChatContext, saveMoodChatContext } from "./moodContext";

describe("moodContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves and restores mood chat context", () => {
    const payload = {
      latestMood: "happy",
      latestMoodIntensity: 4,
      latestMoodDate: "2026-04-27",
    };

    saveMoodChatContext(payload);
    expect(getMoodChatContext()).toEqual(payload);
  });

  it("returns null for invalid stored data", () => {
    localStorage.setItem("sakhi_mood_chat_context", "{bad-json");
    expect(getMoodChatContext()).toBeNull();
  });

  it("clears stored context", () => {
    saveMoodChatContext({ latestMood: "sad" });
    clearMoodChatContext();
    expect(getMoodChatContext()).toBeNull();
  });
});
