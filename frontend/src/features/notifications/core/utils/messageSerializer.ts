import { v4 as uuidv4 } from "uuid";

export interface Message {
  id?: string;
  type: string;
  payload: any;
}

export function serializeMessage(message: Message): string {
  const messageWithId = {
    id: uuidv4(),
    ...message,
  };
  return JSON.stringify(messageWithId);
}

export function deserializeMessage(data: string): Message {
  return JSON.parse(data);
}
