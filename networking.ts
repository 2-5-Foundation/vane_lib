import type { TxStateMachine } from "./primitives";

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 500;

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
    amount: number,
    token: string, 
    network: string
  ): Promise<void>;
 
  // sender confirmation function, last attestation before final transaction submission 
  senderConfirm(tx: TxStateMachine): Promise<void>;

  // receiver confirmation as the attestation on correct intented receiver address 
  receiverConfirm(tx: TxStateMachine): Promise<void>;
  
  // watching all incoming transaction updates throughout transaction lifecycle 
  watchTxUpdates(callback: (tx: TxStateMachine) => void): Promise<() => Promise<void>>;

  // fetch tx updates as an alternative to `watchTxUpdates`
  fetchPendingTxUpdates(): Promise<TxStateMachine[]>

  disconnect(): void 

}

export const createVaneClient = async(url?: string): Promise<VaneClientRpc> => { 
   let socket: WebSocket;
   let reconnectAttempts = 0;
   let isConnected = false;
   let txUpdateCallback: ((tx: TxStateMachine) => void) | null = null;
  
   if (!window.name) {
    window.name = crypto.randomUUID();
    }
    const instanceId = window.name;
    let key = `connectionUrl_${instanceId}`;

   if(url && url !== ""){
    localStorage.setItem(key,url);
   }

   const connect = async (): Promise<WebSocket> => {
       // Get URL from localStorage
       const savedUrl = localStorage.getItem(key);
       if (!savedUrl) {
           throw new Error('No connection URL found');
       }

       socket = new WebSocket(savedUrl);
       
       socket.addEventListener("open", () => {
           console.log("ws open");
           isConnected = true;
           reconnectAttempts = 0;
           
           if (txUpdateCallback) {
               setupTxUpdatesSubscription(txUpdateCallback);
           }
       });

       socket.addEventListener("close", async () => {
           console.log("ws close");
           isConnected = false;
           
           if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
               reconnectAttempts++;
               console.log(`Reconnecting attempt ${reconnectAttempts}...`);
               await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY));
               await connect();
           } else {
               console.error("Max reconnection attempts reached");
           }
       });

       socket.addEventListener("error", event => {
           console.log("ws error", event);
       });

       return socket;
   };

   const waitForConnection = (socket: WebSocket): Promise<void> => {
       return new Promise((resolve, reject) => {
           if (socket.readyState === WebSocket.OPEN) {
               resolve();
               return;
           }

           socket.addEventListener('open', () => resolve());
           socket.addEventListener('error', (error) => reject(error));
           
           setTimeout(() => reject(new Error('Connection timeout')), 5000);
       });
   };

   const setupTxUpdatesSubscription = async (callback: (tx: TxStateMachine) => void) => {
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
       return async () => {
        socket.removeEventListener("message", handler);
    };
   };

   const callReturnValue = async (method: string, params: any[]): Promise<TxStateMachine[]> => {
      if (!isConnected) {
          await waitForConnection(socket);
      }
      const id = 1;
      socket.send(JSON.stringify({
          jsonrpc: "2.0",
          method,
          params,
          id
      }));
      return new Promise<TxStateMachine[]>((resolve, reject) => {
          const handler = (event: MessageEvent) => {
              const response = JSON.parse(event.data);
              if (response.id === id) {
                  socket.removeEventListener("message", handler);
                  if (response.error) {
                      reject(response.error);
                  } else {
                      resolve(response.result);  // Return the result data
                  }
              }
          };
          socket.addEventListener("message", handler);
      });
   };

   const call = async (method: string, params: any[]): Promise<void> => {
       if (!isConnected) {
           await waitForConnection(socket);
       }

       const id = 1;
       socket.send(JSON.stringify({
           jsonrpc: "2.0",
           method,
           params,
           id
       }));

       return new Promise<void>((resolve, reject) => {
           const handler = (event: MessageEvent) => {
               const response = JSON.parse(event.data);
               if (response.id === id) {
                   socket.removeEventListener("message", handler);
                   if (response.error) {
                       reject(response.error);
                   } else {
                       resolve();
                   }
               }
           };
           socket.addEventListener("message", handler);
       });
   };

   // Initial connection
   socket = await connect();
   await waitForConnection(socket);

   return {
      register: (name: string, accountId: string, network: string) => 
          call("register", [name, accountId, network]),

      initiateTransaction: (sender: string, receiver: string, amount: number, token: string, network: string) => 
          call("initiateTransaction", [sender, receiver, amount, token, network]),

      senderConfirm: (tx: TxStateMachine) => 
          call("senderConfirm", [tx]),

      receiverConfirm: (tx: TxStateMachine) =>
          call("receiverConfirm", [tx]),

      watchTxUpdates: async (callback) => {
        txUpdateCallback = callback;
        return await setupTxUpdatesSubscription(callback);
      },

      fetchPendingTxUpdates: () => 
          callReturnValue("fetchPendingTxUpdates",[]),

       // Optional: Add method to manually disconnect
      disconnect: () => {
           if (socket.readyState === WebSocket.OPEN) {
               socket.close();
           }
           localStorage.removeItem('connectionUrl');
      }
   };
};

// Helper functions
export const initializeWebSocket = async () => {
   const savedUrl = localStorage.getItem('connectionUrl');
   
   if (savedUrl) {
       try {
           const client = await createVaneClient(savedUrl);
           return client;
       } catch (error) {
           console.error("Failed to initialize WebSocket:", error);
           throw error;
       }
   } else {
       console.error("No connection URL found");
       return null;
   }
};

export const clearWebSocketConnection = () => {
   localStorage.removeItem('connectionUrl');
};
