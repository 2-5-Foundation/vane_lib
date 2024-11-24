import type { TxStateMachine } from "./primitives"


// a reconecting handler
const client_connect = async(): Promise<WebSocket> => {
    
    const socket = new WebSocket("ws://192.168.1.196:18325");
    
    // socket opened
    socket.addEventListener("open", event => {
        // TODO! add tracing
        console.log("ws open: "+ event)
    });

    // socket closed
    socket.addEventListener("close", event => {
        console.log("ws close: "+ event)
    });

    // error handler
    socket.addEventListener("error", event => {
        console.log("ws error: "+ event)
    });
    return socket
}

const waitForConnection = (socket: WebSocket): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (socket.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
   
      socket.addEventListener('open', () => resolve());
      socket.addEventListener('error', (error) => reject(error));
      
      // Optional timeout
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
};


// Client interface matching Rust RPC methods
export interface VaneClientRpc {

    // register to vane 
    register(
        name: string,
        accountId: string,
        network: string
    ): Promise<void>;

    // initiating transaction safety transaction lifecycle
    initiateTransaction(
      sender: string,
      receiver: string,
      amount: bigint,
      token: string, 
      network: string
    ): Promise<void>;
   
    // sender confirmation function, last attestation before final transaction submission 
    senderConfirm(tx: TxStateMachine): Promise<void>;

    // receiver confirmation as the attestation on correct intented receiver address 
    receiverConfirm(tx: TxStateMachine): Promise<void>;
    
    // watching all incoming transaction updates throughout transaction lifecycle 
    watchTxUpdates(callback: (tx: TxStateMachine) => void): () => void;

}

export const createVaneClient = async(): Promise<VaneClientRpc> => {
    let socket = await client_connect();
    await waitForConnection(socket);

    const call = async (method: string, params: any[]) => {
      const id = 1;
      socket.send(JSON.stringify({
        jsonrpc: "2.0",
        method,
        params,
        id
      }));
   
      return new Promise<void>((resolve) => {
        const handler = (event: MessageEvent) => {
          const response = JSON.parse(event.data);
          if (response.id === id) {
            socket.removeEventListener("message", handler);
            resolve();
          }
        };
        socket.addEventListener("message", handler);
      });
    };
   
    return {
        register: (name: string, accountId: string, network: string) => 
            call("register",[name, accountId, network]),

        initiateTransaction: (sender:string, receiver:string, amount:bigint, token:string, network:string) => 
            call("initiateTransaction", [sender, receiver, amount, token, network]),
    
        senderConfirm: (tx: TxStateMachine) => 
            call("senderConfirm", [tx]),
    
        receiverConfirm: (tx: TxStateMachine) =>
            call("receiverConfirm", [tx]),
    
        watchTxUpdates: (callback) => {
            const subId = 1;
            
            socket.send(JSON.stringify({
            jsonrpc: "2.0",
            method: "subscribeTxUpdates",
            params: [],
            id: subId
            }));
    
            const handler = (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            if (data.method === "subscribeTxUpdates") {
                callback(data.params.result);
            }
            };
    
            socket.addEventListener("message", handler);
            return () => socket.removeEventListener("message", handler);
        }
    };
};



