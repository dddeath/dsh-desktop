const targets = await fetch("http://127.0.0.1:9223/json").then((response) => response.json());
const page = targets.find((target) => target.type === "page" && target.url.startsWith("http://127.0.0.1:3080"));
if (!page) throw new Error("DSH desktop debug page not found");
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
const reply = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("CDP status read timed out")), 5000);
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id !== 1) return;
    clearTimeout(timer);
    resolve(message);
  });
});
socket.send(JSON.stringify({
  id: 1,
  method: "Runtime.evaluate",
  params: {
    expression: "document.documentElement.getAttribute('data-dsh-desktop-status')",
    returnByValue: true,
  },
}));
const message = await reply;
console.log(message.result?.result?.value || "");
socket.close();
