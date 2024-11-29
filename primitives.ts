export enum ChainSupported {
    Ethereum = "Ethereum",
    Polkadot = "Polkadot"
   }
   
// For status that contains data
interface TxStatusData {
    FailedToSubmitTxn: { reason: string };
    TxSubmissionPassed: { hash: Uint8Array };
   }
   
export type TxStatus = 
    | { type: "Genesis" }
    | { type: "ReceiverNotRegistered" }
    | { type: "RecvAddrConfirmed" }
    | { type: "RecvAddrConfirmationPassed" }
    | { type: "NetConfirmed" }
    | { type: "SenderConfirmed" }
    | { type: "SenderConfirmationfailed" }
    | { type: "RecvAddrFailed" }
    | { type: "FailedToSubmitTxn", data: TxStatusData["FailedToSubmitTxn"] }
    | { type: "TxSubmissionPassed", data: TxStatusData["TxSubmissionPassed"] }

export interface TxStateMachine {

    senderAddress: string;
    receiverAddress: string;
    multiId: string; // H256 as hex string
    recvSignature?: Uint8Array;
    network: ChainSupported;
    status: TxStatus;
    amount: bigint; // For u128
    signedCallPayload?: Uint8Array;
    callPayload?: Uint8Array; // Fixed 32 bytes
    inboundReqId?: number; // u64
    outboundReqId?: number; // u64
    txNonce: number
}

export class TxStateMachineManager {
    private tx: TxStateMachine;
   
    constructor(tx: TxStateMachine) {
      this.tx = tx;
    }
   
    setReceiverSignature(signature: Uint8Array): void {
      this.tx.recvSignature = signature;
    }
   
    setCallPayload(payload: Uint8Array): void {
      this.tx.callPayload = payload;
    }
   
    setSignedCallPayload(payload: Uint8Array): void {
      this.tx.signedCallPayload = payload;
    }
   
    updateStatus(status: TxStatus): void {
      this.tx.status = status;
    }
   
    setRequestIds(inbound?: number, outbound?: number): void {
      if (inbound) this.tx.inboundReqId = inbound;
      if (outbound) this.tx.outboundReqId = outbound;
    }
   
    // Utility methods
    isSignedByReceiver(): boolean {
      return !!this.tx.recvSignature;
    }
   
    hasCallPayload(): boolean {
      return !!this.tx.callPayload;
    }
   
    // Getters
    getTx(): TxStateMachine {
      return {...this.tx};
    }
   
    // Create new instance
    static create(
      senderAddress: string,
      receiverAddress: string,
      network: ChainSupported,
      amount: bigint
    ): TxStateMachineManager {
      return new TxStateMachineManager({
        senderAddress,
        receiverAddress,
        multiId: "", // Generate hash of sender+receiver
        network,
        status: {type: "Genesis"},
        amount,
        txNonce: 0
      });
    }
}



