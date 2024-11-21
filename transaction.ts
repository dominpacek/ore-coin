class Transaction {
    type: string;
    data: {
        inputs: [];
        outputs: [];
    }

    constructor(){
        this.type = 'regular';
        this.data = {
            inputs: [],
            outputs: []
        }
    }

    static fromJson(transaction: any) {
        const newTransaction = new Transaction();
        newTransaction.type = transaction.type;
        newTransaction.data = transaction.data;
        return newTransaction;
      }
}

export {Transaction}