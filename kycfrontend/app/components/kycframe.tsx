import { robo700, robo500 } from '../../styles/fonts'

export default function KycFrame ({
    kycDone, iFrameUrl,
    }: {
      kycDone: boolean;
      iFrameUrl: string;
    }) {
      console.log(iFrameUrl);
      if(!kycDone) { return (
        <>
        <div className='mt-10 mb-5'>
            <h1 className={`${robo700.className} text-xl leading-normal`}>Welcome to KYC check!</h1>
          </div>
          <div className={`${robo500.className} text-m leading-normal`}>
            <p>Please complete the KYC verification in the window below.</p>
          </div>
          <div className='flex justify-center items-center bg-white rounded-xl mt-10 ' style={{width: '534px', height: '820px'}}>
            <iframe id='iframe' 
              style={{width: '90%', height: '800px'}}
              src={iFrameUrl}
              allow="camera">
            </iframe>
            <p id='display'></p>
          </div>
        </>
      )
    } else {
      return (
        <>
        <div className='h-screen grid content-center'>
          <div>
            <div className='grid justify-center'><h1 className={`${robo700.className} text-xl leading-normal`}>Congrats!</h1></div>
            <div className='grid justify-center'><h1 className={`${robo700.className} text-xl leading-normal`}>Your KYC check was sucessful!</h1></div>
            <div className='grid justify-center mt-5'><p>You may now close this tab and continue with your transaction.</p></div>
          </div>
        </div>
        </>
      )
    }
};