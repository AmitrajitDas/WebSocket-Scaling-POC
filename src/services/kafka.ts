import { Consumer, Kafka, KafkaMessage, Producer } from "kafkajs";
import dotenv from "dotenv";
import { readFileSync } from "fs";
import { resolve } from "path";
import prismaClient from "./prisma";

dotenv.config();

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

export const createProducer = async (): Promise<Producer> => {
  if (producer) return producer;
  const _producer: Producer = kafka.producer();
  await _producer.connect();
  producer = _producer;
  return producer;
};

export const produceMessage = async (message: string): Promise<boolean> => {
  const producer: Producer = await createProducer();
  await producer.send({
    messages: [{ key: `message-${Date.now()}`, value: message }],
    topic: "MESSAGES",
  });
  return true;
};

export const consumeMessages = async (): Promise<void> => {
  console.log("Kafka consumer is running...");
  const consumer: Consumer = kafka.consumer({ groupId: "default" });
  await consumer.connect();
  await consumer.subscribe({ topic: "MESSAGES", fromBeginning: true });

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
      console.log("New message recieved...");
      try {
        await prismaClient.message.create({
          data: { text: message.value.toString() },
        });
      } catch (err) {
        console.log("Something unexpected happened");
        pause();
        setTimeout(() => {
          consumer.resume([{ topic: "MESSAGES" }]);
        }, 60 * 1000);
      }
    },
  });
};

export default kafka;
