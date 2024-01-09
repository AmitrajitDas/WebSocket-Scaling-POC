import { Server } from "socket.io";
import Redis from "ioredis";
import dotenv from "dotenv";
import { produceMessage } from "./kafka";

dotenv.config();

interface IRedisConfig {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
}

const redisConfig: IRedisConfig = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
};

const pub: Redis = new Redis(redisConfig);
const sub: Redis = new Redis(redisConfig);

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
    // subscribe to MESSAGES channel
    sub.subscribe("MESSAGES");
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
        // publish the message to redis
        pub.publish("MESSAGES", JSON.stringify(message));
      });

      sub.on(
        "message",
        async (channel: string, message: string): Promise<void> => {
          if (channel === "MESSAGES") {
            console.log(
              `New message from redis: ${message} from channel: ${channel}`
            );
            io.emit("message", message);
            await produceMessage(message);
            console.log("Message produced to Kafka broker");
          }
        }
      );
    });
  }
}

export default SocketService;
