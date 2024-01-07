import http from "http";
import SocketService from "./services/socket";

const init = (async () => {
  const htttpServer = http.createServer();
  const PORT = process.env.PORT ? process.env.PORT : 8000;

  const socketService = new SocketService();
  socketService.io.attach(htttpServer);

  htttpServer.listen(PORT, () =>
    console.log(`HTTP server started at PORT:${PORT}`)
  );
})();
