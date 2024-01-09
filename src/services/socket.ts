import { Server } from "socket.io";
import Redis from "ioredis";
import dotenv from "dotenv";
import { produceMessage } from "./kafka";

dotenv.config();

// Configuration interface for Redis
interface IRedisConfig {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
}

// Redis configuration based on environment variables
const redisConfig: IRedisConfig = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
};

// Create Redis publisher and subscriber instances
const pub: Redis = new Redis(redisConfig);
const sub: Redis = new Redis(redisConfig);

// SocketService class for managing Socket.io functionality
class SocketService {
  private _io: Server;

  constructor() {
    console.log("Init Socket Service...");
    // Create a Socket.io server instance
    this._io = new Server({
      cors: {
        allowedHeaders: ["*"],
        origin: "*",
      },
    });
    // Subscribe to the "MESSAGES" channel in Redis
    sub.subscribe("MESSAGES");
  }

  get io(): Server {
    return this._io;
  }

  // Initialize Socket.io event listeners
  public initListeners(): void {
    console.log("Init Socket Listeners...");
    const io: Server = this.io;
    io.on("connect", (socket) => {
      console.log(`New socket connected with connection id: ${socket.id}`);

      // Listen for "event:message" from clients
      socket.on("event:message", async ({ message }: { message: string }) => {
        console.log(`New message received: ${message}`);
        // Publish the message to the "MESSAGES" channel in Redis
        pub.publish("MESSAGES", JSON.stringify(message));
      });

      // Listen for messages from the "MESSAGES" channel in Redis
      sub.on(
        "message",
        async (channel: string, message: string): Promise<void> => {
          if (channel === "MESSAGES") {
            console.log(
              `New message from Redis: ${message} from channel: ${channel}`
            );
            // Emit the message to all connected clients
            io.emit("message", message);
            // Produce the message to the Kafka broker
            await produceMessage(message);
            console.log("Message produced to Kafka broker");
          }
        }
      );
    });
  }
}

export default SocketService;
