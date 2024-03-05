import { v4 as uuidv4 } from 'uuid';
import { Account } from '@aleohq/sdk'
var hex = "0x" + uuidv4().replace(/-/g, "");
var decimal = BigInt(hex).toString(); // don't convert this to a number.
console.log(decimal)

const addr = "aleo17ayphxegw9xq4yrnnhghsdtpew5vuf2d9pesgk6dmj3k667k7uysd2qgvq";
const msg = Uint8Array.from(addr);
const escrowAcc = new Account({ privateKey: "APrivateKey1zkp7KcVAEW1VP2tGfAvBTBTFGUub1QuWzkkXYmEKTHggQk1" })
const signature = escrowAcc.sign(msg)
const signed_record = { 
    address: addr,
    signee: escrowAcc.address().to_string(),
    signature: signature.to_string(), 
  }
console.log("Escrow signature: ", signature.to_string())
console.log("signed account:", signed_record.address)
console.log("signee:", signed_record.signee)