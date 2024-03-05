'use server'

import {v4 as uuidv4} from 'uuid'; 
import axios from "axios";

export async function getKyciFrameUrl(address: string) {

    let body = {
        uid: uuidv4(),
        address,
        // dummyStatus: "APPROVED",
      };

      console.log("<<body>>", body);
  
      // Server Component to control kyc requests
      // For demo purposes we are using a customer id from an onboarded customer
      // whereas the 'customer' is owning the KYC process for the wallets
      // FIXME: move server urls, keys and ports to environemnt variables
      const authorization_key = process.env.AUTHORIZATION_KEY
      const secret_key        = process.env.SECRET_KEY
      const zkpID_auth_server = process.env.AUTH_SERVER
      const zkpID_server_port = process.env.AUTH_SERVER_PORT
      let response = await axios.post(`${zkpID_auth_server}:${zkpID_server_port}/papi/auth`,
        { customer_id: authorization_key, secret_key: secret_key}, 
        { headers: {
          "Content-Type": "application/json",
          'Accept': "*/*" }
        })

        if(!response.data.token) return;
      

      const auth_token = response.data.token
      const zkpID_api_server = process.env.ZKPID_SERVER
      const zkpID_api_port   = process.env.ZKPID_SERVER_PORT
      response = await axios.post(`${zkpID_api_server}:${zkpID_api_port}/v1/api/startkyc`,
        body,{
          headers: {
          "Content-Type": "application/json",
          'Accept': "*/*",
          'X-Token': auth_token
      }})
      
      const data = response.data;
      console.log("<<!>>", data);

      return (data.url);
}