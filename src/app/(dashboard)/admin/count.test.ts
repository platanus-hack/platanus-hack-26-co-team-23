import { describe, it, expect } from "vitest";
import { sanitizeCount, isValidCount, clampCount, MIN, MAX } from "./count";

describe("sanitizeCount", () => {
  it("deja escribir y deja vaciar el campo", () => {
    // Vaciar tiene que ser posible: si el vacío se convierte en 0, el input se planta en
    // "0" y la siguiente tecla produce "05". Ese era el comportamiento raro.
    expect(sanitizeCount("")).toBe("");
    expect(sanitizeCount("12")).toBe("12");
  });

  it("descarta lo que type=number deja pasar igual", () => {
    expect(sanitizeCount("1e5")).toBe("15");
    expect(sanitizeCount("-3")).toBe("3");
    expect(sanitizeCount("2.5")).toBe("25");
  });

  it("corta a dos dígitos: el rango no necesita más", () => {
    expect(sanitizeCount("1234")).toBe("12");
  });
});

describe("isValidCount", () => {
  it("acepta el rango y rechaza lo de fuera", () => {
    expect(isValidCount("5")).toBe(true);
    expect(isValidCount(String(MIN))).toBe(true);
    expect(isValidCount(String(MAX))).toBe(true);
    expect(isValidCount("0")).toBe(false);
    expect(isValidCount("99")).toBe(false);
  });

  // El campo vacío no es válido, pero tampoco debe romper: el botón se deshabilita.
  it("trata el vacío como inválido, no como cero", () => {
    expect(isValidCount("")).toBe(false);
  });
});

describe("clampCount", () => {
  it("encaja el valor en el rango al salir del campo", () => {
    expect(clampCount("99")).toBe("25");
    expect(clampCount("0")).toBe("1");
    expect(clampCount("")).toBe("1");
    expect(clampCount("7")).toBe("7");
  });
});
