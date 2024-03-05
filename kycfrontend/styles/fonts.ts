import { Roboto } from 'next/font/google'

const robo700 = Roboto({
    subsets: ['latin'],
    display: 'swap',
    weight: '700',
})

  const robo500 = Roboto({
    subsets: ['latin'],
    display: 'swap',
    weight: '500',
})

export { robo700, robo500 }