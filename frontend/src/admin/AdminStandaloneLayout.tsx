import { Outlet } from "react-router-dom";

export default function AdminStandaloneLayout() {
  return (
    <div className="min-h-dvh w-full bg-ns-bg text-ns-text">
      <Outlet />
    </div>
  );
}
