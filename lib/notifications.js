const clients = new Set();

export function subscribe(res) {
  clients.add(res);
  res.on("close", () => {
    clients.delete(res);
  });
}

export function publish(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch (error) {
      clients.delete(res);
    }
  }
}

export function getClientCount() {
  return clients.size;
}
