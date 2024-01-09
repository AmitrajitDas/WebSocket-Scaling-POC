import { Kafka, Producer } from "kafkajs";

const kafka: Kafka = new Kafka({
  brokers: [],
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

export default kafka;
