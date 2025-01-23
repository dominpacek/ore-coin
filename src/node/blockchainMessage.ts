export class BlockchainMessage {
  // Used for requests that need to be rebroadcasted to peers
  
  public token: string;
  public content: string;
  
  constructor(content: string, token?: string) {
    // Generates a unique token for the message if not specified
    // So the node can keep track whether it has already seen the message
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
