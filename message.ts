// Temporary stand-in class
// Later will be split to Block and Transaction

export class Message {
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
