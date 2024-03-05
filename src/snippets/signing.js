// This is the example for creating a signature with teh SDK and an existing account
// The programme is for illustration purposes and part of it is in the src/execute.tsx
// For the signature the message is converted to a sha3 hash and then to a field to 
// fit the requirements of the signature function in the aleo programme 
import { Account } from '@aleohq/sdk';
import  sha3 from 'js-sha3';

const account = new Account({privateKey: "APrivateKey1zkp951CZZakVr8E4ENK5qrquhdE14Q4k2Use53H2s7Wu9vv"});

const privateKey = account.privateKey();
const publicKey = account.publicKey;
const viewKey = account.viewKey();
const signee_address = account.address();

console.log('signee address:', signee_address.to_string());

const wallet_address = "aleo17ayphxegw9xq4yrnnhghsdtpew5vuf2d9pesgk6dmj3k667k7uysd2qgvq"
const sha3_hash = sha3.sha3_256(wallet_address);
console.log('hash', sha3_hash.toString())
const hash_field = "848871699548091202627371581709527714622638632597151033713246006141319157392field"
console.log('field', hash_field)
const message = new Uint8Array(sha3_hash)

const signature = account.sign(message)
const p_sig = signature.to_string();
// console.log(`signature: ${p_sig.substring(0,30)}..${p_sig.substring(p_sig.length-30,p_sig.length)}` )
console.log(`signature: ${p_sig}`)

// test verify
const validation = signature.verify(signee_address, message)
console.log('signature validation:', validation)