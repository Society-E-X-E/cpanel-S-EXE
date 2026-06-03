import { createMockReq, createMockRes } from "../../helpers";
import handler from "../../../pages/api/admin/logout";

describe("pages/api/admin/logout", () => {
  it("returns 405 for non-POST methods", () => {
    const req = createMockReq({ method: "GET" });
    const res = createMockRes();
    handler(req, res);
    expect(res.statusCode).toBe(405);
  });

  it("clears authToken cookie and returns 200", () => {
    const req = createMockReq({ method: "POST" });
    const res = createMockRes();
    handler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.headers["Set-Cookie"]).toContain("authToken=");
    expect(res.headers["Set-Cookie"]).toContain("Max-Age=0");
  });
});
