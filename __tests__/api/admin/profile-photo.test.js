import { createMockReq, createMockRes } from "../../helpers";

const mockGet = jest.fn();
const mockRun = jest.fn();
const mockPrepare = jest.fn(() => ({ get: mockGet, run: mockRun }));
const mockUpload = jest.fn();
const mockDestroy = jest.fn();

jest.mock("cloudinary", () => ({
  __esModule: true,
  default: {
    v2: {
      config: jest.fn(),
      uploader: {
        upload: (...args) => mockUpload(...args),
        destroy: (...args) => mockDestroy(...args),
      },
    },
  },
}));

jest.mock("../../../lib/db", () => ({
  __esModule: true,
  default: { prepare: (...args) => mockPrepare(...args) },
}));

jest.mock("../../../lib/session", () => ({
  getCurrentUser: jest.fn(),
  respondUnauthorized: jest.fn((res) => res.status(401).json({ status: "error" })),
}));

import handler from "../../../pages/api/admin/profile-photo";
import { getCurrentUser } from "../../../lib/session";

describe("profile-photo API", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLOUDINARY_CLOUD_NAME = "cloud";
    process.env.CLOUDINARY_API_KEY = "key";
    process.env.CLOUDINARY_API_SECRET = "secret";
    getCurrentUser.mockReturnValue({ id: 7 });
    mockGet.mockReturnValue({ avatar_public_id: "" });
  });

  afterAll(() => {
    process.env = { ...originalEnv };
  });

  it("requires an authenticated user", async () => {
    getCurrentUser.mockReturnValue(null);
    const res = createMockRes();
    await handler(createMockReq({ method: "POST" }), res);
    expect(res.statusCode).toBe(401);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("rejects an image whose content does not match its declared type", async () => {
    const res = createMockRes();
    await handler(createMockReq({
      method: "POST",
      body: { image: `data:image/png;base64,${Buffer.from("not an image").toString("base64")}` },
    }), res);
    expect(res.statusCode).toBe(400);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("uploads a validated image and stores its Cloudinary identity", async () => {
    const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    mockUpload.mockResolvedValue({
      secure_url: "https://res.cloudinary.com/cloud/image/upload/avatar.png",
      public_id: "society-exe/profile-photos/avatar",
    });
    const res = createMockRes();
    await handler(createMockReq({
      method: "POST",
      body: { image: `data:image/png;base64,${pngHeader.toString("base64")}` },
    }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.avatarUrl).toContain("https://");
    expect(mockRun).toHaveBeenCalledWith(
      "https://res.cloudinary.com/cloud/image/upload/avatar.png",
      "society-exe/profile-photos/avatar",
      7,
    );
  });

  it("removes the stored image when the user removes their photo", async () => {
    mockGet.mockReturnValue({ avatar_public_id: "society-exe/profile-photos/avatar" });
    mockDestroy.mockResolvedValue({ result: "ok" });
    const res = createMockRes();
    await handler(createMockReq({ method: "DELETE" }), res);

    expect(res.statusCode).toBe(200);
    expect(mockDestroy).toHaveBeenCalledWith("society-exe/profile-photos/avatar", expect.any(Object));
    expect(mockRun).toHaveBeenCalledWith(7);
  });
});
