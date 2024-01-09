import http from "http";
import SocketService from "./services/socket";
import dotenv from "dotenv";
import { consumeMessages } from "./services/kafka";

dotenv.config();

const init = (async (): Promise<void> => {
  // Consume messages from Kafka
  consumeMessages();

  // Create an HTTP server
  const htttpServer: http.Server<
    typeof http.IncomingMessage,
    typeof http.ServerResponse
  > = http.createServer();

  // Define the PORT for the server to listen on
  const PORT: string | number = process.env.PORT ? process.env.PORT : 8000;

  // Create an instance of the SocketService
  const socketService: SocketService = new SocketService();

  // Attach Socket.io to the HTTP server
  socketService.io.attach(htttpServer);

  // Start the HTTP server
  htttpServer.listen(PORT, () =>
    console.log(`HTTP server started at PORT:${PORT}`)
  );

  // Initialize Socket.io event listeners
  socketService.initListeners();
})();
