// Generates a unique token for the message
// So the node knows whether it received it before or not

export class GenericMessage {
  public token: string;
  public content: string;

  constructor(content: string, token?: string) {
    this.content = content;
    this.token = token ?? crypto.randomUUID();
  }

  public toJson(): string {
    return JSON.stringify({
      token: this.token,
      content: this.content,
    });
  }
}
