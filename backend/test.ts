import { performance } from "perf_hooks";
import supertest from "supertest";
import { buildApp } from "./app";
import { equal } from 'assert'

const app = supertest(buildApp());

async function basicLatencyTest() {
    await app.post("/reset").expect(204);
    const start = performance.now();
    await app.post("/charge").expect(200);
    await app.post("/charge").expect(200);
    await app.post("/charge").expect(200);
    await app.post("/charge").expect(200);
    await app.post("/charge").expect(200);
    console.log(`Latency: ${performance.now() - start} ms`);
}

async function parallelRequestsTest() {
    await app.post("/reset").send({account: "test"}).expect(204);
    const start = performance.now();
    let calls = []
    let accepted = 0
    for(let i = 0; i < 10; ++i) {
        let call = app.post("/charge").send({
            account: "test",
            charges: 51
        }).expect(200)
        .then( (resp) => {
            if (resp.body.isAuthorized == true) {
                accepted += 1;
            }
        })
        calls.push(call);
    }
    for(let i = 0; i < 10; ++i) {
        await calls[i];
    }
    equal(1, accepted);
    console.log("Accepted requests: " + accepted);
    console.log(`Latency: ${performance.now() - start} ms`);
}


async function testCorrectCharge() {
    await app.post("/reset").send({account: "test"}).expect(204);

    await app.post("/charge").send({
        account: "test",
        charges: 51
    }).expect(200)
    .expect((response) => {
        if (response.body.isAuthorized !== true) throw new Error("Expected authorized request")
        if (response.body.remainingBalance !== 49) throw new Error("Expected remainig charge 49")
    });

    await app.post("/charge").send({
        account: "test",
        charges: 51
    }).expect(200)
    .expect((response) => {
        if (response.body.isAuthorized !== false) throw new Error("Expected not authorized request")
        if (response.body.remainingBalance !== 49) throw new Error("Expected remainig charge 49")
    });


    await app.post("/reset").send({account: "test2"}).expect(204);
    await app.post("/charge").send({
        account: "test2",
        charges: 51
    }).expect(200)
    .expect((response) => {
        if (response.body.isAuthorized !== true) throw new Error("Expected authorized request")
        if (response.body.remainingBalance !== 49) throw new Error("Expected remainig charge 49")
    });
}


async function runTests() {
    await basicLatencyTest();
    await parallelRequestsTest();
    await testCorrectCharge();
}

runTests().catch(console.error);
