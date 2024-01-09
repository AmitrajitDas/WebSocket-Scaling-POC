import { Consumer, Kafka, KafkaMessage, Producer } from "kafkajs";
import dotenv from "dotenv";
import { readFileSync } from "fs";
import { resolve } from "path";
import prismaClient from "./prisma";

dotenv.config();

// Create a Kafka instance with connection details
const kafka: Kafka = new Kafka({
  brokers: [process.env.KAFKA_BROKER ? process.env.KAFKA_BROKER : ""],
  ssl: {
    ca: [readFileSync(resolve("./ca.pem"), "utf-8")],
  },
  sasl: {
    username: process.env.KAFKA_USERNAME ? process.env.KAFKA_USERNAME : "",
    password: process.env.KAFKA_PASSWORD ? process.env.KAFKA_PASSWORD : "",
    mechanism: "plain",
  },
});

let producer: Producer | null = null;

// Function to create and return a Kafka producer
export const createProducer = async (): Promise<Producer> => {
  // Reuse existing producer if available
  if (producer) return producer;

  // Create a new Kafka producer and connect to the broker
  const _producer: Producer = kafka.producer();
  await _producer.connect();
  producer = _producer;
  return producer;
};

// Function to produce a message to the Kafka topic
export const produceMessage = async (message: string): Promise<boolean> => {
  // Create a Kafka producer
  const producer: Producer = await createProducer();

  // Send the message to the "MESSAGES" topic
  await producer.send({
    messages: [{ key: `message-${Date.now()}`, value: message }],
    topic: "MESSAGES",
  });

  return true;
};

// Function to consume messages from the Kafka topic
export const consumeMessages = async (): Promise<void> => {
  console.log("Kafka consumer is running...");

  // Create a Kafka consumer with a default consumer group ID
  const consumer: Consumer = kafka.consumer({ groupId: "default" });
  await consumer.connect();

  // Subscribe to the "MESSAGES" topic from the beginning
  await consumer.subscribe({ topic: "MESSAGES", fromBeginning: true });

  // Run the Kafka consumer to process incoming messages
  await consumer.run({
    autoCommit: true,
    eachMessage: async ({
      message,
      pause,
    }: {
      message: KafkaMessage;
      pause: () => () => void;
    }): Promise<void> => {
      if (!message.value) return;
      console.log("New message received...");
      try {
        // Save the message to the PostgreSQL database
        await prismaClient.message.create({
          data: { text: message.value.toString() },
        });
      } catch (err) {
        console.log("Something unexpected happened");
        // Pause the consumer and resume after a delay
        pause();
        setTimeout(() => {
          consumer.resume([{ topic: "MESSAGES" }]);
        }, 60 * 1000);
      }
    },
  });
};

export default kafka;
