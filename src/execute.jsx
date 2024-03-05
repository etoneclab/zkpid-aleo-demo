import {
  Transaction,
  WalletAdapterNetwork,
  WalletNotConnectedError,
} from "@demox-labs/aleo-wallet-adapter-base";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { LeoWalletAdapter } from "@demox-labs/aleo-wallet-adapter-leo";
import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import { useAleoWASM } from "./aleo-wasm-hook";
import { Account, PrivateKey } from '@aleohq/sdk'
import  sha3 from 'js-sha3';
import trailing from "./assets/trailing.svg";
import pending from "./assets/pending.svg";
import warning from "./assets/warning.svg";
import done from "./assets/done.svg";

export const ExecuteTransaction = ({}) => {
  const { wallet, publicKey } = useWallet();

  const [showPendingImage, setShowPendingImage] = useState(false);
  const [status, setStatus] = useState({
    text: "Not wallet connected.",
    img: trailing,
  });

  const [trID, setTrID] = useState();
  const [transaction, setTransaction] = useState();
  const [fields, setFields] = useState({
    address: "",
    amount: "",
  });
  const [accountOne, setAccountOne] = useState(null);
  const [accountTwo, setAccountTwo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [prgState, setPrgState] = useState('NULL')

  // FIXME: combine the KYC variables to state engine
  const [kycToken, setKycToken] = useState("");
  const [startKYC, setStartKYC] = useState(false);
  const [walletKyced, setWalletKyced] = useState(false);
  const [submitBtn, setSubmitBtn] = useState("Send");
  const [worker, setWorker] = useState(null);
  const [kycDone, setKycDone] = useState(false)
  const [kycPending, setKycPending] = useState(false)
  const [retry, setRetry] = useState(0)
  const [sigRecord, setSigRecord] = useState({})
  
  useEffect(() => {
    if (worker === null) {
      const spawnedWorker = spawnWorker();
      spawnedWorker.onmessage = (event) => {
        console.log("Event:", event.data);
      };
      spawnedWorker.onerror = (error) => {
        console.log("Error:", error);
      };
      setWorker(spawnedWorker);
      return () => {
        spawnedWorker.terminate();
      };
    }
  }, []);

  function spawnWorker() {
    return new Worker(new URL("workers/worker.js", import.meta.url), {
      type: "module",
    });
  }

  function postMessagePromise(worker, message) {
    return new Promise((resolve, reject) => {
      worker.onmessage = (event) => {
        resolve(event.data);
      };
      worker.onerror = (error) => {
        reject(error);
      };
      worker.postMessage(message);
    });
  }
  const fieldChanged = (field) => {
    setFields((prevFields) => ({ ...prevFields, [field.name]: field.value }));
  };

  const resetFields = () => {
    setFields({
      address: "",
      amount: "",
    });
  };

  useEffect(() => {
    if (publicKey) {
      setStatus({
        text: "Wallet connected.",
        img: trailing,
      });
      postMessagePromise(worker, {
        type: "ACCOUNT_BALANCE",
        publicKey: publicKey,
      }).then((result) => {
        if (result.type === "ERROR") {
          console.log("Error:", result.errorMessage);
        } else if (result.type === "BALANCE") {
          console.log(`Pub balance of ${publicKey}:`, result.message)
        }
      }).then(() => {      
        console.log('program check')
        const programmName = "escrow.zpkID";
        postMessagePromise(worker, {
          type: "ALEO_LOOKUP_PROGRAMM",
          programmName: programmName,
        }).then((result) => {
          if (result.type === "ERROR") {
            console.log(result.errorMessage);
          } else if (result.type === "PROGRAMM_EXISTS") {
            console.log(`Programm ${programmName} exists:`, result.message)
            if (result.message.exists) {
              setPrgState('DEPLOYED')
            } else {
              setPrgState('TO_BE_DEPLOYED')
            }
          }
        }).catch((e) => {
          console.log(e)
        })
      }).catch((e) => console.log(e));

    } else {
      setStatus({
        text: "No wallet connected.",
        img: trailing,
      })
    }
  }, [publicKey]);

  useEffect(() => {
    console.log('program state:', prgState)
    switch(prgState) {
      case 'NULL':
        break;
      case 'TO_BE_DEPLOYED':
        break;
      case 'DEPLOYED':
    }
  }, [prgState]) 

  useEffect(() => {
    // show loading image and periocally check loading state
    let intervalId;
    if (loading) {
      intervalId = setInterval(() => {
        setShowPendingImage((prev) => !prev);
      }, 500);
    } else {
      setShowPendingImage(false);
      if (intervalId) clearInterval(intervalId);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [loading]);

  async function getData() {
    // start kyc process in a separate browser tab. also, 
    // set kycPending to true triggering the check the 
    // zkpID backend if kyc was completed.
    const address = publicKey;

    if(!walletKyced) {
      const kyc_fe_url = `${import.meta.env.VITE_KYC_FRONTEND}:${import.meta.env.VITE_KYC_FRONTEND_PORT}/kyc?address=${address}`
      window.open(kyc_fe_url, "_blank", "noreferrer");
    }
    setKycPending(true);
  }

  useEffect(() => {
    // periodically checks if the Sender wallet is kyced
    // triggered by settting the kycPending state. If so 
    // then stop chekcing and set kycPending to false.
    if(startKYC && kycPending){
      console.log(import.meta.env.MODE)
      const lookup_url = `${import.meta.env.VITE_ZKPID_SERVER}:${import.meta.env.VITE_ZKPID_SERVER_PORT}/papi/lookup`
      const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: publicKey })
      };
      const intervall = setInterval(() => {
        fetch(lookup_url, requestOptions)
        .then(async (response) => {
          const data = await response.json();
          console.log(data)
          if (data) {
            setWalletKyced(data.kyc);
            if (data.kyc === true) {
              setStatus({
                text: "KYC status for Wallet Address is GOOD.",
                img: trailing,
              });
              clearInterval(intervall);
              setKycPending(false)
              setStartKYC(false)
              setSubmitBtn("Send")
              setRetry(0)
              /**************************************************
               * sign the response with the escrow key. For demo
               * purposes the key is stored in the local storage. 
               * We are fetching the key and use it for signing the
               * address to indicate that kyc was done.
               * This should be part of the KYC/Escrow service 
              ***************************************************/
              const key = localStorage.getItem('key')
              if (key) {
                const accounts = JSON.parse(key)
                const escrowAcc = new Account({ privateKey: accounts.escrowSkey })
                const sha3_hash = sha3.sha3_256(wallet_address);
                console.log('address hash', sha3_hash.toString())
                const signature = escrowAcc.sign(Uint8Array.from(sha3_hash))
                const signed_record = { 
                  address_hash: sha3_hash.to_string(),
                  signee: escrowAcc.address().to_string(),
                  signature: signature.to_string(), 
                }
                console.log("Escrow signature: ", signed_record.signature)
                console.log("signed account:", signed_record.address)
                console.log("signee:", signed_record.signee)
                setSigRecord(signed_record);
              }
            }
          }});
          setRetry(retry+1);
          if(retry==100) {
            clearInterval(intervall);
            setKycPending(false)
            setRetry(0)
          }
        }, 3000)
    }
  }, [kycPending])

  const handleBlur = () => {
    const amountNumber = parseFloat(fields.amount);
    console.log(amountNumber);
    if (amountNumber > 15) {
      return;
    }
    if (amountNumber <= 15 && !startKYC) {
      return;
    }
    setStartKYC(false);
    setSubmitBtn("Send");
  };

  async function execute() {
    if (!fields.address || !fields.amount) {
      setStatus({
        text: "Please fill in all the fields.",
        img: warning,
      });
      return;
    } else {
      setStatus({ text: "Your funds are being sent.", img: pending });
    }
    const amountNumber = parseFloat(fields.amount);
    if (amountNumber > 15) {
      console.log('wallet:', publicKey)
      const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: publicKey })
      };
      
      try {
        console.log(import.meta.env.MODE)
        const lookup_url = `${import.meta.env.VITE_ZKPID_SERVER}:${import.meta.env.VITE_ZKPID_SERVER_PORT}/papi/lookup`
        const response = await fetch(lookup_url, requestOptions);
        const data = await response.json();
        if (data) {
          setWalletKyced(data.kyc);
          if (data.kyc === true) {
            setStatus({
              text: "KYC status for Wallet Address is GOOD.",
              img: trailing,
            });
          } else {
            setStatus({
              text: "Your transfer exceeds the threshold amount (15 Aleo) and thus requires a KYC verification.",
              img: warning,
            });
            setStartKYC(true);
            setSubmitBtn("Start KYC");
            return;
          }
        }
      } catch (e) {
        console.log(e);
        setStatus({
          text: "There was an issue with connecting to check KYC. Try again.",
          img: warning,
        });
        setSubmitBtn("Try again");
        resetFields(); // Reset fields to empty
        return
      }
    }

    console.log("KYC status for Wallet Address is GOOD.");


    setLoading(true);
    try {
      if (!publicKey) throw new WalletNotConnectedError();

      const aleoTransaction = Transaction.createTransaction(
        publicKey,
        WalletAdapterNetwork.Testnet,
        "escrow.aleo",
        "move_verified″",
        [fields["address"], parseFloat(fields["amount"])*1_000_000 + "u64"],
        350_000,
        false
      );

      const txId =
        (await (wallet?.adapter).requestTransaction(
          aleoTransaction
        )) || "";

      console.log("TRX:", aleoTransaction, txId);

      if(txId) {
          setTrID(txId);
          setTransaction(aleoTransaction);
          setStatus({
            text: "Your funds were sent successfully.",
            img: done,
          });
          resetFields();
          setSubmitBtn("Done");
      }
    } catch (error) {
        console.log(error)
        setStatus({
          text: "There was an issue with your transaction. Try again.",
          img: warning,
        });
        setSubmitBtn("Try again");
        resetFields(); // Reset fields to empty
        return;
    } finally {
      setLoading(false);
    }
  }

  const handleClick = async () => {
    if (!startKYC) {
      await execute();
    } else {
      await getData();
    }
  };

  const getTransactionStatus = async (txId) => {
    const status = await (
      wallet?.adapter 
    ).transactionStatus(txId);
    setStatus(status);

    const req = await (wallet?.adapter ).getExecution(txId);

    console.log("Status", req, status);
  };

  const onClick = useCallback(async () => {
    if (!publicKey) throw new WalletNotConnectedError();

    const aleoTransaction = Transaction.createTransaction(
      publicKey,
      WalletAdapterNetwork.Testnet,
      "credits.aleo",
      "transfer_public",
      [fields["address"], fields["amount"] + "u64"],
      1_000_000,
      false
    );

    const txId =
      (await (wallet?.adapter).requestTransaction(
        aleoTransaction
      )) || "";
    setTrID(txId);
    setTransaction(aleoTransaction);
    console.log("TRX:", aleoTransaction, txId);
  }, [wallet, publicKey]);

  return (
    <>
      <div className="text">
        <p>"You will be sending a private payment now. Once you cross an amount threshold set by the provider, you will be asked to perform KYC verification."</p>
      </div>
        <>
          <div className="fields">
            <div className="field">
              <label>Amount</label>
              <input
                name="amount"
                type="text"
                value={fields.amount}
                onChange={(e) => fieldChanged(e.target)}
                onBlur={handleBlur}
              />
            </div>
            <div className="field">
              <label>To</label>
              <input
                name="address"
                type="text"
                value={fields.address}
                onChange={(e) => fieldChanged(e.target)}
              />
            </div>
          </div>
          <div className="description">
            <div className="image">
              {loading && showPendingImage && (
                <img src={pending} alt="Pending" />
              )}
              {!loading && <img src={status.img} alt="Status" />}
            </div>
            <div className="text">
              <p className="statusBar">{status.text} </p>
            </div>
          </div>
          <button
            className="sendbutton"
            onClick={handleClick}
            disabled={!publicKey || loading}
          >
            {submitBtn}
          </button>
        </>
    </>
  );
};
