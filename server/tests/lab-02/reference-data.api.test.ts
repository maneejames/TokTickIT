import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("Reference Data API", () => {
  // REF-API-01: Fetch active categories
  describe("REF-API-01: GET /api/categories", () => {
    it("returns 200 OK and only active categories (isActive = true)", async () => {
      const res = await request(app).get("/api/categories");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(4);

      for (const cat of res.body) {
        expect(cat).toHaveProperty("id");
        expect(cat).toHaveProperty("name");
        expect(cat.isActive).toBe(true);
      }

      const names = res.body.map((c: { name: string }) => c.name);
      expect(names).toContain("Account and Access");
      expect(names).toContain("Hardware");
      expect(names).toContain("Software");
      expect(names).toContain("Network");
    });
  });

  // REF-API-02: Fetch active related systems
  describe("REF-API-02: GET /api/related-systems", () => {
    it("returns 200 OK and only active related systems (isActive = true)", async () => {
      const res = await request(app).get("/api/related-systems");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(6);

      for (const sys of res.body) {
        expect(sys).toHaveProperty("id");
        expect(sys).toHaveProperty("name");
        expect(sys).toHaveProperty("description");
      }

      const names = res.body.map((s: { name: string }) => s.name);
      expect(names).toContain("Email");
      expect(names).toContain("Campus Wi-Fi");
      expect(names).toContain("VPN");
      expect(names).toContain("LEB2 App");
      expect(names).toContain("Grade Submission App");
      expect(names).toContain("Printer");
      expect(names).toContain("Corporate Laptop");
    });
  });
});
