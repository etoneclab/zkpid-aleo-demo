import { useEffect, useState, useMemo } from 'react'

import './App.css'
import { useAleoWASM } from './aleo-wasm-hook'
import { Account, PrivateKey } from '@aleohq/sdk'
import { Wallet } from './operation'
import '@demox-labs/aleo-wallet-adapter-reactui/styles.css'
import { WalletProvider } from '@demox-labs/aleo-wallet-adapter-react'
import { WalletModalProvider } from '@demox-labs/aleo-wallet-adapter-reactui'
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo'
import { WalletMultiButton } from '@demox-labs/aleo-wallet-adapter-reactui'
import {
  DecryptPermission,
  WalletAdapterNetwork
} from '@demox-labs/aleo-wallet-adapter-base'

function App () {
  const [aleoInstance, aleoLoading] = useAleoWASM()
  console.log('here')
  useEffect(() => {

    if (!aleoLoading) {
      const key = localStorage.getItem('key')
      console.log('Key', key)
      if (key) {
        const accounts = JSON.parse(key)
        const escrowAcc = new Account({ privateKey: accounts.escrowSkey })
        console.log('Escrow Acc Pkey:', escrowAcc.address().to_string())
      } else {
        const key = new PrivateKey()
        const escrowAcc = new Account({ privateKey: key.to_string() })
        console.log('Escrow Acc key', key)
        localStorage.setItem(
          'keys',
          JSON.stringify({ escrowSkey: key.to_string() })
        )
      }
    } 
  }, [aleoInstance])

  const wallets = useMemo(
    () => [
      new LeoWalletAdapter({
        appName: 'ZKP-ID KYC Demo'
      })
    ],
    []
  )

  return (
    <>
      <div className='container'>
        <WalletProvider
          wallets={wallets}
          decryptPermission={DecryptPermission.UponRequest}
          network={WalletAdapterNetwork.Localnet}
          autoConnect={false}
        >
          <WalletModalProvider>
            <div className='card'>
              <Wallet />
            </div>
          </WalletModalProvider>
        </WalletProvider>
      </div>
    </>
  )
}

export default App
