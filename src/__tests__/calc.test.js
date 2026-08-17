import { describe, it, expect } from "vitest";
import {
  rupiah,
  pct,
  jumlahItem,
  clampNonNeg,
  parseCSVText,
  importItemsFromRows,
  isUraianGenerik,
  buildDefaultItems,
  CATEGORIES,
  SKEMA,
  HARGA_ACUAN,
} from "../../rab-hibah.jsx";

describe("rupiah", () => {
  it("formats a number as Indonesian Rupiah", () => {
    expect(rupiah(1000000)).toBe("Rp 1.000.000");
  });
  it("treats missing/invalid values as zero", () => {
    expect(rupiah(undefined)).toBe("Rp 0");
    expect(rupiah(NaN)).toBe("Rp 0");
  });
});

describe("pct", () => {
  it("formats a fraction as a percentage with one decimal", () => {
    expect(pct(0.25)).toBe("25.0%");
  });
  it("falls back to 0.0% for non-finite input", () => {
    expect(pct(NaN)).toBe("0.0%");
  });
});

describe("jumlahItem", () => {
  it("multiplies vol * vol2 * harga", () => {
    expect(jumlahItem({ vol: 2, vol2: 8, harga: 100000 })).toBe(1600000);
  });
  it("defaults vol2 to 1 when absent", () => {
    expect(jumlahItem({ vol: 3, harga: 50000 })).toBe(150000);
  });
  it("treats missing numeric fields as 0", () => {
    expect(jumlahItem({})).toBe(0);
  });
});

describe("clampNonNeg", () => {
  it("returns the fallback for empty/undefined input", () => {
    expect(clampNonNeg(undefined, 5)).toBe(5);
    expect(clampNonNeg("", 5)).toBe(5);
  });
  it("clamps negative numbers to 0 (blocks manipulated imports)", () => {
    expect(clampNonNeg("-1000000", 1)).toBe(0);
  });
  it("passes through valid non-negative numbers", () => {
    expect(clampNonNeg("42", 1)).toBe(42);
  });
  it("falls back on non-numeric input", () => {
    expect(clampNonNeg("abc", 7)).toBe(7);
  });
});

describe("isUraianGenerik", () => {
  it("flags empty or very short labels as generic", () => {
    expect(isUraianGenerik("honor", "")).toBe(true);
    expect(isUraianGenerik("honor", "singkat")).toBe(true);
  });
  it("flags labels that still match the default template text", () => {
    expect(isUraianGenerik("honor", "Honorarium ketua peneliti")).toBe(true);
  });
  it("accepts a specific, detailed label", () => {
    expect(
      isUraianGenerik("honor", "Honorarium ketua peneliti (1 org x 8 OB, sesuai SBM Kemenkeu 2026)")
    ).toBe(false);
  });
});

describe("buildDefaultItems", () => {
  it("builds one row per template item for every category, priced from HARGA_ACUAN", () => {
    const items = buildDefaultItems("pfr");
    for (const cat of CATEGORIES) {
      expect(items[cat.id].length).toBeGreaterThan(0);
    }
    expect(items.honor[0].harga).toBe(HARGA_ACUAN.pfr.honor[0]);
  });
  it("falls back to the 'umum' template for an unknown skema id", () => {
    const items = buildDefaultItems("skema-tidak-ada");
    expect(items.honor[0].harga).toBe(HARGA_ACUAN.umum.honor[0]);
  });
});

describe("parseCSVText", () => {
  it("splits a simple CSV into rows/fields", () => {
    const rows = parseCSVText("a,b,c\n1,2,3\n");
    expect(rows).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });
  it("handles quoted fields containing commas and escaped quotes", () => {
    const rows = parseCSVText('"Honor, ketua","5.000""x"\n');
    expect(rows).toEqual([["Honor, ketua", '5.000"x']]);
  });
  it("strips a leading BOM", () => {
    const rows = parseCSVText("﻿a,b\n");
    expect(rows).toEqual([["a", "b"]]);
  });
});

describe("importItemsFromRows", () => {
  const header = ["Tahun", "Komponen", "No", "Uraian", "Vol", "Sat", "Vol2", "Sat2", "Harga Satuan (Rp)", "Jumlah (Rp)"];

  it("returns null when there is no recognizable header row", () => {
    expect(importItemsFromRows([["x", "y"]])).toBeNull();
  });

  it("imports a valid row into its matching category and negative numbers are clamped", () => {
    const dataRow = ["Tahun ke-1", CATEGORIES[0].title, "1", "Item impor spesifik", "1", "org", "-8", "OB", "-100000", "0"];
    const result = importItemsFromRows([header, dataRow]);
    expect(result).not.toBeNull();
    const imported = result[CATEGORIES[0].id][0];
    expect(imported.label).toBe("Item impor spesifik");
    // vol2 and harga were negative in the source row and must be clamped to 0.
    expect(imported.vol2).toBe(0);
    expect(imported.harga).toBe(0);
    // Every other category still gets a blank placeholder row.
    for (const cat of CATEGORIES.slice(1)) {
      expect(result[cat.id].length).toBe(1);
      expect(result[cat.id][0].label).toBe("");
    }
  });

  it("skips subtotal/total summary rows", () => {
    const realRow = ["Tahun ke-1", CATEGORIES[0].title, "1", "Item impor spesifik", "1", "org", "1", "OB", "100000", "100000"];
    const subtotalRow = ["Tahun ke-1", CATEGORIES[0].title, "", "Subtotal apapun", "", "", "", "", "", "1000"];
    const result = importItemsFromRows([header, realRow, subtotalRow]);
    expect(result[CATEGORIES[0].id]).toHaveLength(1);
    expect(result[CATEGORIES[0].id][0].label).toBe("Item impor spesifik");
  });
});
