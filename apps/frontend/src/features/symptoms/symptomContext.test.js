import { beforeEach, describe, expect, it } from "vitest";
import { clearSymptomChatContext, getSymptomChatContext, saveSymptomChatContext } from "./symptomContext";

describe("symptomContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves and restores symptom context", () => {
    const payload = {
      symptoms: ["cramps", "fatigue"],
      symptomAnalysis: {
        severity: "moderate",
      },
    };

    saveSymptomChatContext(payload);
    expect(getSymptomChatContext()).toEqual(payload);
  });

  it("returns null for invalid stored data", () => {
    localStorage.setItem("sakhi_symptom_chat_context", "{bad-json");
    expect(getSymptomChatContext()).toBeNull();
  });

  it("clears stored context", () => {
    saveSymptomChatContext({ symptoms: ["headache"] });
    clearSymptomChatContext();
    expect(getSymptomChatContext()).toBeNull();
  });
});
