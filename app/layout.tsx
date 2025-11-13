import { Metadata } from "next";
import "./global.css";

export const metadata: Metadata = {
    title: "F1Bot",
    description: "The place to find out about the latest F1 news and updates",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <header className="app-header">
                    <div className="header-left">
                        <h2 className="brand-name">F1Bot</h2>
                    </div>
                    <nav className="header-nav">
                        <a href="#" className="nav-link">How we work</a>
                        <a href="#" className="nav-link">Pricing</a>
                        <a href="#" className="nav-link">FAQs</a>
                        <button className="sign-up-btn">Sign up</button>
                    </nav>
                </header>
                {children}
            </body>
        </html>
    );
}
