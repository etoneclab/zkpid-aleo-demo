'use client'
 
import { useSearchParams } from 'next/navigation'

import { useEffect, useState } from 'react';
import  KycFrame   from '../components/kycframe'
import { robo700, robo500 } from '../../styles/fonts'
import { getKyciFrameUrl } from '../actions'

export default function Kyc() {
  const searchParams = useSearchParams()
  const walletAddress = searchParams.get('address');
  const [iframeUrl, setIframeUrl] = useState("");
  const [kycDone, setKycDone] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if(walletAddress) {
      getKyciFrameUrl(walletAddress)
        .then(url => {
          setIframeUrl(url as string);
          setReady(true);
        })
        .catch((e) => console.log("no frame"))
    }
    window.addEventListener("message", receiveMessage, false);
    function receiveMessage(event: any) {
      console.log(event);
      if(event.data.status && (event.data.status == "approved")) {
        setKycDone(true)
      }
    }
  },[]);

    if(!ready) {
      return (
        <>
          <div className='h-screen grid content-center'>
            <div>
              <div className='grid justify-center'><h1 className={`${robo700.className} text-xl leading-normal`}>LOADING...</h1></div>
            </div>
          </div>          
        </>
      )
    }
    if(iframeUrl) {
    return (
  
      <main className='grid justify-items-center'>
        <KycFrame kycDone={kycDone} iFrameUrl={iframeUrl}/>
      </main>
    )} else {
      return (
        <>
        <div className='h-screen grid content-center'>
          <div>
            <div className='grid justify-center'><h1 className={`${robo700.className} text-xl leading-normal`}>Error!</h1></div>
            <div className='grid justify-center'><h1 className={`${robo700.className} text-xl leading-normal`}>Cannot Open KYC connection!</h1></div>
            <div className='grid justify-center mt-5'><p>You may now close this tab and restart your transaction.</p></div>
          </div>
        </div>
        </>
      )
    }
}