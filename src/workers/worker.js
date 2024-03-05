import * as aleo from "@aleohq/sdk";
console.log('In worker...')
await aleo.initThreadPool(8);
const defaultHost = "https://api.explorer.aleo.org/v1";
const keyProvider = new aleo.AleoKeyProvider();
const programManager = new aleo.ProgramManager(defaultHost, keyProvider, undefined);
const networkClient = new aleo.AleoNetworkClient(defaultHost);

keyProvider.useCache(true);

self.postMessage({
    type: "ALEO_WORKER_READY",
 });

let lastLocalProgram = null;
self.addEventListener("message", (ev) => {
    
    console.log('IN,,')
    switch(ev.data.type) {
        case "ALEO_LOOKUP_PROGRAMM": {
            // Escrow Code
            const { programmName } = ev.data;

            (async function () {
                try {
                    // const mappings = await networkClient.getProgram("credits.aleo");
                    // observation: the balance check worked once I called the line above
                    // and from then on I can comment the line above and it still works ?!
                    const escrowPubKey = "aleo1mjuw6xpt58fcej6k04u270hzxl3q0jzgw68zda8enkf6pjy9ks8qvg2qgh"
                    const escrowSecKey = "APrivateKey1zkp951CZZakVr8E4ENK5qrquhdE14Q4k2Use53H2s7Wu9vv"
                    
                    console.log(`lookup ${programmName} on chain`)
                    const result = await networkClient.getProgram(programmName)
                    self.postMessage({
                        type: "PROGRAMM_EXISTS",
                        message: { name: programmName, exists: true }
                    });
                } catch(error) {
                    self.postMessage({
                        type: "PROGRAMM_EXISTS",
                        message: { name: programmName, exists: false }
                    });
                }
            })()}
            break;
        case "ALEO_EXECUTE_PROGRAM_LOCAL": {
            const { localProgram, aleoFunction, inputs, privateKey } = ev.data;

            console.log("Web worker: Executing function locally...");
            let startTime = performance.now();

            (async function () {
                try {
                    // Ensure the program is valid and that it contains the function specified
                    const program = programManager.createProgramFromSource(localProgram);
                    const program_id = program.id();
                    if (!program.hasFunction(aleoFunction)) {
                        throw `Program ${program_id} does not contain function ${aleoFunction}`;
                    }
                    const cacheKey = `${program_id}:${aleoFunction}`;

                    // Get the program imports
                    const imports = programManager.networkClient.getProgramImports(localProgram);

                    // Get the proving and verifying keys for the function
                    if (lastLocalProgram !== localProgram) {
                        const keys = programManager.executionEngine.synthesizeKeypair(localProgram, aleoFunction);
                        programManager.keyProvider.cacheKeys(cacheKey, [keys.provingKey(), keys.verifyingKey()]);
                        lastLocalProgram = localProgram;
                    }

                    // Pass the cache key to the execute function
                    const keyParams = new aleo.AleoKeyProviderParams({"cacheKey": cacheKey});

                    // Execute the function locally
                    let response = await programManager.executeOffline(
                        localProgram,
                        aleoFunction,
                        inputs,
                        false,
                        imports,
                        keyParams,
                        undefined,
                        undefined,
                        aleo.PrivateKey.from_string(privateKey)
                    );

                    // Return the outputs to the main thread
                    console.log(`Web worker: Local execution completed in ${performance.now() - startTime} ms`);
                    const outputs = response.getOutputs();
                    let execution = response.getExecution();
                    if (execution) {
                        aleo.verifyFunctionExecution(execution, keyProvider.getKeys(cacheKey)[1], program, "hello");
                        execution = execution.toString();
                        console.log("Execution verified successfully: " + execution);
                    } else {
                        execution = "";
                    }

                    console.log(`Function execution response: ${outputs}`);
                    self.postMessage({
                        type: "OFFLINE_EXECUTION_COMPLETED",
                        outputs: {outputs: outputs, execution: execution}
                    });
                } catch (error) {
                    console.error(error);
                    self.postMessage({
                        type: "ERROR",
                        errorMessage: error.toString(),
                    });
                }
            })(); 
            }
            break;
        case "ALEO_EXECUTE_PROGRAM_ON_CHAIN": {
            const {
                remoteProgram,
                aleoFunction,
                inputs,
                privateKey,
                fee,
                feeRecord,
                url,
            } = ev.data;

            console.log("Web worker: Creating execution...");
            let startTime = performance.now();

            (async function () {
                try {
                    const account = new aleo.Account({privateKey: privateKey})
                    
                    // Create a new NetworkClient, KeyProvider, and RecordProvider using official Aleo record, key, and network providers
                    const networkClient = new aleo.AleoNetworkClient("https://vm.aleo.org/api");
                    const keyProvider = new aleo.AleoKeyProvider();
                    keyProvider.useCache = true;
                    const recordProvider = new aleo.NetworkRecordProvider(account, networkClient);
                    
                    // Initialize a program manager with the key provider to automatically fetch keys for executions
                    const programName = remoteProgram;
                    const programManager = new aleo.ProgramManager("https://vm.aleo.org/api", keyProvider, recordProvider);
                    const keySearchParams = { "cacheKey": "tx_verification_procedure:deposit" };
                    const tx_id = await programManager.execute(programName, "deposit", 0.020, false, ["500u64"], undefined, keySearchParams, undefined, undefined, undefined, account._privateKey);
                    console.log('Transaction', tx_id)
                    const transaction = await programManager.networkClient.getTransaction(tx_id);

                    self.postMessage({
                            type: "EXECUTION_TRANSACTION_COMPLETED",
                            executeTransaction: transaction,
                        });

                    // const privateKeyObject = aleo.PrivateKey.from_string(privateKey)
                    // // Ensure the program is valid and that it contains the function specified
                    // const program = await programManager.networkClient.getProgramObject(remoteProgram);
                    // console.log('here...')
                    // const program_id = program.id();
                    // if (!program.hasFunction(aleoFunction)) {
                    //     throw `Program ${program_id} does not contain function ${aleoFunction}`;
                    // }

                    // // Get the proving and verifying keys for the function
                    // const cacheKey = `${program_id}:${aleoFunction}`;
                    // if (!programManager.keyProvider.containsKeys(cacheKey)) {
                    //     console.log(`Web worker: Synthesizing proving & verifying keys for: '${program_id}:${aleoFunction}'`);
                    //     const keys = programManager.executionEngine.synthesizeKeypair(remoteProgram, aleoFunction);
                    //     programManager.keyProvider.cacheKeys(cacheKey, [keys.provingKey(), keys.verifyingKey()]);
                    // }

                    // // Pass the cache key to the execute function
                    // const keyParams = new aleo.AleoKeyProviderParams({"cacheKey": cacheKey})

                    // // Set the host to the provided URL if provided
                    // if (typeof url === "string") { programManager.setHost(url); }
                    // const transaction = await programManager.execute(
                    //     program_id,
                    //     aleoFunction,
                    //     fee,
                    //     inputs,
                    //     undefined,
                    //     keyParams,
                    //     feeRecord,
                    //     undefined,
                    //     undefined,
                    //     privateKeyObject
                    // );

                    // // Return the transaction id to the main thread
                    // console.log(`Web worker: On-chain execution transaction created in ${performance.now() - startTime} ms`);
                    // self.postMessage({
                    //     type: "EXECUTION_TRANSACTION_COMPLETED",
                    //     executeTransaction: transaction,
                    // });
                } catch (error) {
                    console.error(`Error creating execution transaction: ${error}`);
                    self.postMessage({
                        type: "ERROR",
                        errorMessage: error.toString(),
                    });
                } finally {
                    programManager.setHost(defaultHost);
                }
            })();}
            break;
        case "ALEO_ESTIMATE_EXECUTION_FEE": {
            const { remoteProgram, aleoFunction, inputs, url } =
                ev.data;

            console.log("Web worker: Estimating execution fee...");
            let startTime = performance.now();

            (async function () {
                try {
                    // Ensure the program is valid and that it contains the function specified
                    const program = await programManager.networkClient.getProgramObject(remoteProgram);
                    const program_id = program.id();
                    if (!program.getFunctions().includes(aleoFunction)) {
                        throw `Program ${program_id} does not contain function ${aleoFunction}`;
                    }
                    const cacheKey = `${program_id}:${aleoFunction}`;
                    const imports = await programManager.networkClient.getProgramImports(remoteProgram);

                    // Get the proving and verifying keys for the function
                    if (!programManager.keyProvider.containsKeys(cacheKey)) {
                        console.log(`Web worker: Synthesizing proving & verifying keys for: '${program_id}:${aleoFunction}'`);
                        const keys = programManager.executionEngine.synthesizeKeypair(remoteProgram, aleoFunction);
                        programManager.keyProvider.cacheKeys(cacheKey, [keys.provingKey(), keys.verifyingKey()]);
                    }

                    // Estimate the execution fee
                    const [provingKey, verifyingKey] = programManager.keyProvider.getKeys(cacheKey);
                    let executeFee = await programManager.executionEngine.estimateExecutionFee(
                        new aleo.PrivateKey(),
                        remoteProgram,
                        aleoFunction,
                        inputs,
                        url,
                        false,
                        imports,
                        provingKey,
                        verifyingKey,
                    );

                    // Return the execution fee estimate to the main thread
                    console.log(`Web worker: Execution fee estimated in ${performance.now() - startTime} ms`);
                    console.log(`Execution Fee Estimation: ${executeFee} microcrdits`);
                    self.postMessage({
                        type: "EXECUTION_FEE_ESTIMATION_COMPLETED",
                        executionFee: Number(executeFee) / 1000000 + 0.01,
                    });
                } catch (error) {
                    console.error(error);
                    self.postMessage({
                        type: "ERROR",
                        errorMessage: error.toString(),
                    });
                }
            })();}
            break;
        case "ALEO_ESTIMATE_DEPLOYMENT_FEE": {
            const { program, url } = ev.data;

            console.log("Web worker: Estimating deployment fee...");

            let startTime = performance.now();
            (async function () {
                try {
                    const imports = await programManager.networkClient.getProgramImports(program);
                    console.log("Estimating deployment fee..");
                    let deploymentFee =
                        await programManager.executionEngine.estimateDeploymentFee(
                            program,
                            false,
                            imports,
                        );

                    // Return the deployment fee estimate to the main thread
                    console.log(`Web worker: Deployment fee estimation completed in ${performance.now() - startTime} ms`);
                    console.log(`Deployment Fee Estimation: ${deploymentFee} microcredits`);
                    self.postMessage({
                        type: "DEPLOYMENT_FEE_ESTIMATION_COMPLETED",
                        deploymentFee: Number(deploymentFee) / 1000000 + 0.01,
                    });
                } catch (error) {
                    console.error(error);
                    self.postMessage({
                        type: "ERROR",
                        errorMessage: error.toString(),
                    });
                }
            })();} 
            break;
        case "ALEO_TRANSFER": {
            const {
                privateKey,
                amountCredits,
                recipient,
                transfer_type,
                amountRecord,
                fee,
                feeRecord,
                url,
            } = ev.data;

            console.log(
                `Web worker: Creating transfer of type ${transfer_type}...`,
            );
            let startTime = performance.now();

            (async function () {
                try {
                    // Set the host to the provided URL if provided
                    if (typeof url === "string") { programManager.setHost(url); }

                    // Create the transfer transaction and submit it to the network
                    const transaction = await programManager.transfer(
                        amountCredits,
                        recipient,
                        transfer_type,
                        fee,
                        undefined,
                        amountRecord,
                        feeRecord,
                        aleo.PrivateKey.from_string(privateKey)
                    );

                    // Return the transaction id to the main thread
                    console.log(`Web worker: Transfer transaction ${transaction} created in ${performance.now() - startTime} ms`);
                    self.postMessage({
                        type: "TRANSFER_TRANSACTION_COMPLETED",
                        transferTransaction: transaction,
                    });
                } catch (error) {
                    console.error(error);
                    self.postMessage({
                        type: "ERROR",
                        errorMessage: error.toString(),
                    });
                } finally {
                    programManager.setHost(defaultHost);
                }
            })();}
            break;
        case "ALEO_DEPLOY": {
            const { program, privateKey, fee, feeRecord, url } = ev.data;

            console.log("Web worker: Creating deployment...");

            let startTime = performance.now();
            (async function () {
                try {
                    // Set the network client host if specified
                    if (typeof url === "string") { programManager.setHost(url); }

                    // Check if the program is valid
                    const programObject = programManager.createProgramFromSource(program);

                    // Check if the program already exists on the network. If so, throw an error
                    let programExists = false;
                    try {
                        await programManager.networkClient.getProgram(programObject.id());
                        programExists = true;
                    } catch (e) {
                        console.log(
                            `Program not found on the Aleo Network - proceeding with deployment...`,
                        );
                    }

                    if (programExists) {
                        throw `Program ${programObject.id()} already exists on the network`;
                    }

                    console.log("fee is: ", fee);
                    // Create the deployment transaction and submit it to the network
                    let transaction = await programManager.deploy(
                        program,
                        fee,
                        undefined,
                        feeRecord,
                        aleo.PrivateKey.from_string(privateKey),
                    )

                    // Return the transaction id to the main thread
                    console.log(`Web worker: Deployment transaction ${transaction} created in ${performance.now() - startTime} ms`);
                    self.postMessage({
                        type: "DEPLOY_TRANSACTION_COMPLETED",
                        deployTransaction: transaction,
                    });
                } catch (error) {
                    console.log(error);
                    self.postMessage({
                        type: "ERROR",
                        errorMessage: error.toString(),
                    });
                } finally {
                    programManager.setHost(defaultHost);
                }
            })();} 
            break;
        case "ALEO_SPLIT": {
            const { splitAmount, record, privateKey, url } = ev.data;

            console.log("Web worker: Creating split...");

            let startTime = performance.now();
            (async function () {
                try {
                    // Set the network client host if specified
                    if (typeof url === "string") { programManager.setHost(url); }

                    // Create the split transaction and submit to the network
                    const transaction = await programManager.split(
                        splitAmount,
                        record,
                        aleo.PrivateKey.from_string(privateKey)
                    );

                    // Return the transaction id to the main thread
                    console.log(`Web worker: Split transaction ${transaction} created in ${performance.now() - startTime} ms`);
                    self.postMessage({
                        type: "SPLIT_TRANSACTION_COMPLETED",
                        splitTransaction: transaction,
                    });
                } catch (error) {
                    console.log(error);
                    self.postMessage({
                        type: "ERROR",
                        errorMessage: error.toString(),
                    });
                } finally {
                    programManager.setHost(defaultHost);
                }
            })();}
            break;
        case "ALEO_JOIN": {
            const { recordOne, recordTwo, fee, feeRecord, privateKey, url } =
                ev.data;

            console.log("Web worker: Creating join...");

            let startTime = performance.now();
            (async function () {

                try {
                    // Set the network client host if specified
                    if (typeof url === "string") { programManager.setHost(url); }

                    // Create the join transaction and submit it to the network
                    const transaction = await programManager.join(
                        recordOne,
                        recordTwo,
                        fee,
                        undefined,
                        feeRecord,
                        aleo.PrivateKey.from_string(privateKey),
                    );

                    // Return the transaction id to the main thread
                    console.log(`Web worker: Join transaction ${transaction} created in ${performance.now() - startTime} ms`);
                    self.postMessage({
                        type: "JOIN_TRANSACTION_COMPLETED",
                        joinTransaction: transaction,
                    });
                } catch (error) {
                    console.log(error);
                    self.postMessage({
                        type: "ERROR",
                        errorMessage: error.toString(),s
                    });
                } finally {
                    programManager.setHost(defaultHost);
                }
            })();} 
            break;
        case "ACCOUNT_BALANCE": {
            const { publicKey } = ev.data;
            
            (async function () {
            try {
                // const mappings = await networkClient.getProgram("credits.aleo");
                // observation: the balance check worked once I called the line above
                // and from then on I can comment the line above and it still works ?!
                console.log('PK:', publicKey)
                // program balance: 
                // let mappingValue = await programManager.networkClient.getProgramMappingValue("credits.aleo", "account", publicKey);
                const mappingValue = await networkClient.getProgramMappingValue("credits.aleo", "account", publicKey)
                self.postMessage({
                    type: "BALANCE",
                    message: mappingValue,
                });
            } catch(error) {
                self.postMessage({
                    type: "ERROR",
                    errorMessage: error.toString(),
                });
            }
            })()}
            break;
        case "UNSPENT": {
            const { privateKey } = ev.data;
            
            (async function () {
            try {
                let mappingValue = await programManager.networkClient.findUnspentRecords(150000, undefined, privateKey)
                self.postMessage({
                    type: "UNSPENT",
                    message: mappingValue,
                });
            } catch(error) {
                self.postMessage({
                    type: "ERROR",
                    errorMessage: error.toString(),
                });
            }
            })()}
            break;
        case "TRANSFER_PUBLIC": {
            const { privateKey, address } = ev.data;
            
            (async function () {
            try {
                console.log('in TRANSFER_PUBLIC')
                // const account = new aleo.Account({privateKey: privateKey})
                // // Create a new NetworkClient, KeyProvider, and RecordProvider using official Aleo record, key, and network providers
                // const networkClient = new aleo.AleoNetworkClient(defaultHost);
                // const keyProvider = new aleo.AleoKeyProvider();
                // console.log('Key 1',keyProvider)
                // keyProvider.useCache = false;
                // const recordProvider = new aleo.NetworkRecordProvider(account, networkClient);
                // const programManager = new aleo.ProgramManager(defaultHost, keyProvider, undefined);
                // console.log('Aleo  1',programManager)
                //let mappingValue = await programManager.transfer(1.0, address, "public", 0.2, false, undefined, undefined, undefined, aleo.PrivateKey.from_string(privateKey), undefined)
                // self.postMessage({
                //     type: "TRANSFER_PUBLIC_SUCCESS",
                //     message: mappingValue,
                // });
            } catch(error) {
                self.postMessage({
                    type: "ERROR",
                    errorMessage: error.toString(),
                });
            }
            })()}
            break;
    }
});
