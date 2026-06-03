export function createMockReq({ method = "GET", body = {}, query = {}, cookies = {}, headers = {} } = {}) {
  return { method, body, query, cookies, headers };
}

export function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(data) {
      res.body = data;
      return res;
    },
    setHeader(key, value) {
      res.headers[key] = value;
      return res;
    },
    writeHead(code, headers) {
      res.statusCode = code;
      Object.assign(res.headers, headers);
      return res;
    },
    write(data) {
      if (!res.written) res.written = [];
      res.written.push(data);
      return res;
    },
    end() {
      return res;
    },
  };
  return res;
}
