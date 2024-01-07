import { Server } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

class SocketService {
  private _io: Server;

  constructor() {
    console.log("Init Socket Service...");
    this._io = new Server({
      cors: {
        allowedHeaders: ["*"],
        origin: "*",
      },
    });
  }

  get io(): Server {
    return this._io;
  }

  public initListeners(): void {
    console.log("Init Socket Listeners...");
    const io: Server = this.io;
    io.on("connect", (socket) => {
      console.log(`New socket connected with connection id: ${socket.id}`);
      socket.on("event:message", async ({ message }: { message: string }) => {
        console.log(`New message recieved: ${message}`);
      });
    });
  }
}

export default SocketService;
