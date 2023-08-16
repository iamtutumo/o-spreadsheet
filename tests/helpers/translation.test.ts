import { _t } from "../../src/translation";

describe("Translations", () => {
  test("placeholders in string translation are replaced with their given value", () => {
    expect(_t("Hello %s", "World")).toBe("Hello World");
  });

  test("placeholder can be string Object instead of primitive", () => {
    expect(_t("Hello %s", new String("World"))).toBe("Hello World");
    expect(_t("Hello %s", _t("World"))).toBe("Hello World");
  });

  test("can have named placeholders", () => {
    expect(_t("%(x1)s %(thing)s", { x1: "Hello", thing: "World" })).toBe("Hello World");
  });
});
