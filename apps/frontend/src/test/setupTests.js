import "@testing-library/jest-dom/vitest";

if (!window.HTMLElement.prototype.scrollTo) {
  Object.defineProperty(window.HTMLElement.prototype, "scrollTo", {
    value: () => {},
    writable: true,
  });
}
