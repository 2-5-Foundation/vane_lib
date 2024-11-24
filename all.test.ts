import { expect, test, describe } from "bun:test";
import { createVaneClient } from "./networking";


describe("networking",()=> {

    test("register works",async ()=>{
        let client  = await createVaneClient();
        await client.register("Mrisho","0x4690152131E5399dE5E76801Fc7742A087829F00","Ethereum")
    });

    test("initiate transaction",async ()=>{

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