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
}

export {Transaction}