import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ToastContainer from "./ToastContainer";
import ChatButton from "./ChatButton";
import MobileBottomNav from "./MobileBottomNav";

export default function Layout() {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const hideFooter = location.pathname.startsWith("/builder/wifi");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="ns-canvas ns-reduce-motion min-h-screen flex flex-col overflow-x-hidden">
      <Navbar />

      <main
        className={`relative z-10 flex-1 w-full min-w-0 ${
          isHome ? "" : "py-8 sm:py-12"
        } pb-safe-nav`}
      >
        {isHome ? (
          <Outlet />
        ) : (
          <div className="ns-container">
            <Outlet />
          </div>
        )}
      </main>

      {!hideFooter && (
        <div className="relative z-10">
          <Footer />
        </div>
      )}

      <ToastContainer />
      <ChatButton />
      <MobileBottomNav />
    </div>
  );
}
