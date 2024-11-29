import { expect, test, describe } from "bun:test";
import { createVaneClient } from "./networking";


describe("networking",()=> {

    test("register works",async ()=>{
        let client  = await createVaneClient("ws://192.168.1.177:48055");
        await client.register("Lukamba","0xA843D3634245E9117163025e633aB8f6C666e16F","Ethereum")
    });

    test("initiate transaction",async ()=>{
        // let client  = await createVaneClient("ws://192.168.1.177:19248");
        // await client.initiateTransaction("0xA843D3634245E9117163025e633aB8f6C666e16F","0xA843D3634245E9117163025e633aB8f6C666e16F",10000,"Eth","Ethereum")
        // client.watchTxUpdates((tx)=> {
        //     console.log(tx)
        // })
    });

    test("receiver confirm",async ()=>{

    });

    test("sender confirm",async ()=>{

    });

    test("watch transactions updates",async ()=>{

    });

})

describe("wallets",()=> {

})

describe("balance & accounts management",()=> {

})