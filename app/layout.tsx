import type { Metadata } from 'next';
import { Inter, Merriweather, Noto_Sans_TC, Noto_Serif_TC, Zen_Maru_Gothic, Cormorant_Garamond } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const merriweather = Merriweather({ weight: ['300', '400', '700'], subsets: ['latin'], variable: '--font-merriweather' });
const notoSansTC = Noto_Sans_TC({ weight: ['300', '400', '500', '700'], subsets: ['latin'], variable: '--font-noto-sans-tc' });
const notoSerifTC = Noto_Serif_TC({ weight: ['300', '400', '600', '700'], subsets: ['latin'], variable: '--font-noto-serif-tc' });
const zenMaruGothic = Zen_Maru_Gothic({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-zen-maru' });
const cormorantGaramond = Cormorant_Garamond({ weight: ['400', '600'], style: ['normal', 'italic'], subsets: ['latin'], variable: '--font-cormorant' });

export const metadata: Metadata = {
    title: 'OmniScribe - AI Book Architect',
    description: 'A professional AI writing assistant capable of generating 100,000+ word books through deep research, structured outlining, and recursive batch generation.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="zh-Hant" className={`${inter.variable} ${merriweather.variable} ${notoSansTC.variable} ${notoSerifTC.variable} ${zenMaruGothic.variable} ${cormorantGaramond.variable}`}>
            <body className="bg-stone-900 text-stone-200 antialiased h-screen overflow-hidden">
                {children}
            </body>
        </html>
    );
}
