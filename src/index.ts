import http from "http";
import SocketService from "./services/socket";
import dotenv from "dotenv";

dotenv.config();

const init = (async (): Promise<void> => {
  const htttpServer: http.Server<
    typeof http.IncomingMessage,
    typeof http.ServerResponse
  > = http.createServer();
  const PORT: string | number = process.env.PORT ? process.env.PORT : 8000;

  const socketService: SocketService = new SocketService();
  socketService.io.attach(htttpServer);

  htttpServer.listen(PORT, () =>
    console.log(`HTTP server started at PORT:${PORT}`)
  );

  socketService.initListeners();
})();
